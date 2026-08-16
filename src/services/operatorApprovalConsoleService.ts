import { getDatabase } from '../db/database';
import { durableApprovalService, DurableWorkflowRecord } from './durableApprovalService';
import { DurableExecutionQueueService } from './durableExecutionQueueService';
import { ConnectorRegistryService } from './connectorRegistryService';
import { LocationIntelligenceService } from './locationIntelligenceService';
import { LaunchAuditService } from './launchAuditService';
import { EvidenceGraphService } from './evidenceGraphService';

export interface OperatorConsoleView {
  approvalId: string;
  workflowType: string;
  tenantId: string;
  status: string;
  proposerId: string;
  proposerRole: string;
  payload: any;
  contentHash: string;
  requestedAction: string;
  destinationChannel: string;
  consentEvidencePresent: boolean;
  authorizationEvidencePresent: boolean;
  locationJurisdictionSummary?: string;
  connectorInfo?: {
    id: string;
    provider: string;
    capability: string;
    authenticationState: string;
    executionMode: string;
    healthStatus: string;
  };
  expectedSideEffect: string;
  policyFindings: {
    ruleId: string;
    passed: boolean;
    description: string;
  }[];
  supportingEvidenceRefs: string[];
  createdAt: string;
  expiresAt: string;
}

export class OperatorApprovalConsoleService {
  private static instance: OperatorApprovalConsoleService;
  private queueService: DurableExecutionQueueService;
  private connectorRegistry: ConnectorRegistryService;
  private locationService: LocationIntelligenceService;
  private auditService: LaunchAuditService;
  private evidenceGraph: EvidenceGraphService;

  private constructor() {
    this.queueService = DurableExecutionQueueService.getInstance();
    this.connectorRegistry = ConnectorRegistryService.getInstance();
    this.locationService = LocationIntelligenceService.getInstance();
    this.auditService = LaunchAuditService.getInstance();
    this.evidenceGraph = EvidenceGraphService.getInstance();
  }

  public static getInstance(): OperatorApprovalConsoleService {
    if (!OperatorApprovalConsoleService.instance) {
      OperatorApprovalConsoleService.instance = new OperatorApprovalConsoleService();
    }
    return OperatorApprovalConsoleService.instance;
  }

  public getConsoleItem(tenantId: string, approvalId: string): OperatorConsoleView | null {
    const wf = durableApprovalService.getWorkflow(tenantId, approvalId);
    if (!wf) {
      return null;
    }

    let payload: any = {};
    try {
      payload = JSON.parse(wf.payloadJson || '{}');
    } catch {}

    let connectorInfo: OperatorConsoleView['connectorInfo'] | undefined;

    if (payload.connectorId) {
      const conn = this.connectorRegistry.getConnector(tenantId, payload.connectorId);
      if (conn) {
        connectorInfo = {
          id: conn.id,
          provider: conn.provider,
          capability: conn.capability,
          authenticationState: conn.authenticationState,
          executionMode: conn.executionMode,
          healthStatus: conn.healthStatus
        };
      }
    }

    const consentEvidencePresent = !!(payload.consentRecordId || payload.consentEvidence || payload.evidenceRefs?.length > 0);
    const authorizationEvidencePresent = !!(payload.authorizationGrantId || payload.grantId || payload.evidenceRefs?.length > 0);

    let locationJurisdictionSummary = 'Not specified';
    if (payload.address || payload.city || payload.locationContext) {
      locationJurisdictionSummary = `${payload.city || 'Local Area'}, ${payload.stateProvince || 'MA'} (${payload.serviceAreaStatus || 'RESOLVED'})`;
    }

    return {
      approvalId: wf.workflowId,
      workflowType: wf.workflowType,
      tenantId: wf.tenantId,
      status: wf.status,
      proposerId: wf.proposerId,
      proposerRole: wf.proposerRole,
      payload,
      contentHash: wf.payloadHash,
      requestedAction: wf.actionTitle || wf.workflowType,
      destinationChannel: payload.destination || payload.channel || payload.provider || 'LOCAL_DISPATCH',
      consentEvidencePresent,
      authorizationEvidencePresent,
      locationJurisdictionSummary,
      connectorInfo,
      expectedSideEffect: payload.expectedSideEffect || `Execute ${wf.workflowType} side effect on target ${payload.target || payload.customerPhone || 'recipient'}`,
      policyFindings: payload.policyFindings || [
        { ruleId: 'POLICY_SOD', passed: true, description: 'Segregation of Duties enforcement active' },
        { ruleId: 'POLICY_CONSENT', passed: consentEvidencePresent, description: 'Explicit opt-in customer consent evidence' },
        { ruleId: 'POLICY_CONNECTOR', passed: connectorInfo?.authenticationState === 'AUTHENTICATED', description: 'Connector verified and authenticated' }
      ],
      supportingEvidenceRefs: payload.evidenceRefs || [],
      createdAt: wf.createdAt,
      expiresAt: wf.expiresAt
    };
  }

  public listPendingApprovals(tenantId: string): OperatorConsoleView[] {
    const list = durableApprovalService.listPendingWorkflows(tenantId);
    const results: OperatorConsoleView[] = [];
    for (const r of list) {
      const item = this.getConsoleItem(tenantId, r.workflowId);
      if (item) results.push(item);
    }
    return results;
  }

  public async approveAction(params: {
    tenantId: string;
    approvalId: string;
    approverId: string;
    approverRole: string;
    resumptionToken?: string;
    notes?: string;
  }): Promise<{ success: boolean; queueItemId?: string; message: string }> {
    const wf = durableApprovalService.getWorkflow(params.tenantId, params.approvalId);
    if (!wf) {
      throw new Error(`APPROVAL_NOT_FOUND: ${params.approvalId}`);
    }

    if (wf.proposerId === params.approverId) {
      throw new Error(`SEGREGATION_OF_DUTIES_VIOLATION: Proposer (${wf.proposerId}) cannot approve their own action.`);
    }

    const token = params.resumptionToken || wf.resumptionToken;
    const resumeRes = durableApprovalService.resumeWorkflow({
      tenantId: params.tenantId,
      workflowId: params.approvalId,
      resumptionToken: token,
      approverId: params.approverId,
      approverRole: params.approverRole,
      decision: 'APPROVE',
      reason: params.notes || 'Approved by operator via Console'
    });

    if (!resumeRes.success) {
      throw new Error(`APPROVAL_FAILED: ${resumeRes.reason}`);
    }

    const db = getDatabase();
    const queueRow = db.prepare(`
      SELECT id FROM durable_execution_queue 
      WHERE tenant_id = ? AND approval_id = ? AND status = 'AWAITING_APPROVAL'
    `).get(params.tenantId, params.approvalId) as any;

    if (queueRow) {
      this.queueService.updateItemStatus(params.tenantId, queueRow.id, 'APPROVED');
      await this.queueService.executeQueueItem(params.tenantId, queueRow.id);
      return {
        success: true,
        queueItemId: queueRow.id,
        message: `Action ${params.approvalId} approved and executed successfully.`
      };
    }

    return {
      success: true,
      message: `Action ${params.approvalId} approved successfully.`
    };
  }

  public rejectAction(params: {
    tenantId: string;
    approvalId: string;
    rejecterId: string;
    rejecterRole: string;
    reason: string;
  }): { success: boolean; message: string } {
    const wf = durableApprovalService.getWorkflow(params.tenantId, params.approvalId);
    if (!wf) {
      throw new Error(`APPROVAL_NOT_FOUND: ${params.approvalId}`);
    }

    const resumeRes = durableApprovalService.resumeWorkflow({
      tenantId: params.tenantId,
      workflowId: params.approvalId,
      resumptionToken: wf.resumptionToken,
      approverId: params.rejecterId,
      approverRole: params.rejecterRole,
      decision: 'REJECT',
      reason: params.reason
    });

    if (!resumeRes.success) {
      throw new Error(`REJECTION_FAILED: ${resumeRes.reason}`);
    }

    const db = getDatabase();
    const queueRow = db.prepare(`
      SELECT id FROM durable_execution_queue 
      WHERE tenant_id = ? AND approval_id = ?
    `).get(params.tenantId, params.approvalId) as any;

    if (queueRow) {
      this.queueService.updateItemStatus(params.tenantId, queueRow.id, 'CANCELED', {
        lastError: `Rejected by operator: ${params.reason}`,
        lastErrorClassification: 'OPERATOR_REJECTED'
      });
    }

    return {
      success: true,
      message: `Action ${params.approvalId} rejected: ${params.reason}`
    };
  }
}
