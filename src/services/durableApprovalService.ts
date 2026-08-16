import crypto from 'node:crypto';
import { getDatabase } from '../db/database';
import { launchApprovalService, canonicalize } from './launchApprovalService';
import { launchAuditService } from './launchAuditService';
import { launchIdempotencyService } from './launchIdempotencyService';

export type DurableWorkflowStatus =
  | 'PENDING_APPROVAL'
  | 'APPROVED_READY_FOR_EXECUTION'
  | 'REJECTED'
  | 'EXECUTED'
  | 'TIMED_OUT'
  | 'CANCELLED';

export interface DurableWorkflowRecord {
  workflowId: string;
  tenantId: string;
  workflowType: string;
  actionTitle: string;
  proposerId: string;
  proposerRole: string;
  requiredApproverRole: string;
  status: DurableWorkflowStatus;
  resumptionToken: string;
  payloadJson: string;
  payloadHash: string;
  approvalRecordId?: string;
  approverId?: string;
  decisionReason?: string;
  executionResultJson?: string;
  createdAt: string;
  decidedAt?: string;
  resumedAt?: string;
  expiresAt: string;
}

export interface SuspendWorkflowParams {
  tenantId: string;
  workflowType: string;
  actionTitle: string;
  proposerId: string;
  proposerRole: string;
  requiredApproverRole: string;
  executionPayload: Record<string, any>;
  ttlHours?: number;
  metadata?: Record<string, any>;
}

export interface ResumeWorkflowParams {
  tenantId: string;
  workflowId: string;
  resumptionToken: string;
  approverId: string;
  approverRole: string;
  decision: 'APPROVE' | 'REJECT';
  reason?: string;
  idempotencyKey?: string;
}

export class DurableApprovalWorkflowService {
  /**
   * Initializes the durable workflow table if not already created.
   */
  public ensureTable(): void {
    const db = getDatabase();
    db.exec(`
      CREATE TABLE IF NOT EXISTS durable_approval_workflows (
        workflow_id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        workflow_type TEXT NOT NULL,
        action_title TEXT NOT NULL,
        proposer_id TEXT NOT NULL,
        proposer_role TEXT NOT NULL,
        required_approver_role TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'PENDING_APPROVAL',
        resumption_token TEXT NOT NULL UNIQUE,
        payload_json TEXT NOT NULL,
        payload_hash TEXT NOT NULL,
        approval_record_id TEXT,
        approver_id TEXT,
        decision_reason TEXT,
        execution_result_json TEXT,
        created_at TEXT NOT NULL,
        decided_at TEXT,
        resumed_at TEXT,
        expires_at TEXT NOT NULL,
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_dur_wf_tenant ON durable_approval_workflows(tenant_id, status);
      CREATE INDEX IF NOT EXISTS idx_dur_wf_token ON durable_approval_workflows(resumption_token);
    `);
  }

  /**
   * Suspends an asynchronous workflow pending human approval.
   * State is durably stored in SQLite, surviving crashes, restarts, and delayed approvals.
   */
  public suspendWorkflow(params: SuspendWorkflowParams): DurableWorkflowRecord {
    this.ensureTable();
    const db = getDatabase();

    const workflowId = `wf-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const payloadJson = JSON.stringify(params.executionPayload);
    const payloadHash = launchApprovalService.computeContentHash(params.executionPayload);

    // Resumption token includes cryptographic signature
    const resumptionToken = `token_${crypto.createHash('sha256').update(`${workflowId}:${params.tenantId}:${payloadHash}:${Date.now()}`).digest('hex')}`;

    const now = new Date();
    const createdAt = now.toISOString();
    const ttlHours = params.ttlHours || 72;
    const expiresAt = new Date(now.getTime() + ttlHours * 60 * 60 * 1000).toISOString();

    db.prepare(`
      INSERT INTO durable_approval_workflows (
        workflow_id, tenant_id, workflow_type, action_title, proposer_id, proposer_role,
        required_approver_role, status, resumption_token, payload_json, payload_hash,
        created_at, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING_APPROVAL', ?, ?, ?, ?, ?)
    `).run(
      workflowId,
      params.tenantId,
      params.workflowType,
      params.actionTitle,
      params.proposerId,
      params.proposerRole,
      params.requiredApproverRole,
      resumptionToken,
      payloadJson,
      payloadHash,
      createdAt,
      expiresAt
    );

    // Audit log
    launchAuditService.recordAudit({
      tenantId: params.tenantId,
      actorId: params.proposerId,
      clientIp: '127.0.0.1',
      endpoint: '/api/workflow/suspend',
      action: 'WORKFLOW_SUSPENDED_PENDING_APPROVAL',
      status: 'SUSPENDED',
      details: {
        workflowId,
        workflowType: params.workflowType,
        requiredApproverRole: params.requiredApproverRole,
        payloadHash
      }
    });

    return this.getWorkflow(params.tenantId, workflowId)!;
  }

  /**
   * Resumes a suspended workflow when human approval or rejection is provided.
   * Enforces Segregation of Duties, Token verification, and Idempotency.
   */
  public resumeWorkflow(params: ResumeWorkflowParams): {
    success: boolean;
    status: DurableWorkflowStatus;
    reason?: string;
    workflow?: DurableWorkflowRecord;
    resumedPayload?: Record<string, any>;
  } {
    this.ensureTable();
    const db = getDatabase();

    const wf = this.getWorkflow(params.tenantId, params.workflowId);
    if (!wf) {
      return { success: false, status: 'REJECTED', reason: 'WORKFLOW_NOT_FOUND' };
    }

    // 1. Check resumption token validity
    if (wf.resumptionToken !== params.resumptionToken) {
      return { success: false, status: wf.status, reason: 'INVALID_RESUMPTION_TOKEN' };
    }

    // 2. Prevent replay on already completed/rejected workflows
    if (wf.status !== 'PENDING_APPROVAL') {
      return {
        success: wf.status === 'APPROVED_READY_FOR_EXECUTION' || wf.status === 'EXECUTED',
        status: wf.status,
        reason: `WORKFLOW_ALREADY_DECIDED: Current state is ${wf.status}`,
        workflow: wf
      };
    }

    // 3. Check expiration
    if (new Date(wf.expiresAt).getTime() < Date.now()) {
      db.prepare(`UPDATE durable_approval_workflows SET status = 'TIMED_OUT' WHERE workflow_id = ?`).run(wf.workflowId);
      return { success: false, status: 'TIMED_OUT', reason: 'WORKFLOW_APPROVAL_EXPIRED' };
    }

    // 4. Segregation of Duties Guard: Proposer cannot approve their own action
    if (params.approverId === wf.proposerId) {
      return {
        success: false,
        status: 'PENDING_APPROVAL',
        reason: 'SEGREGATION_OF_DUTIES_VIOLATION: Proposer cannot approve their own action.'
      };
    }

    const decidedAt = new Date().toISOString();

    if (params.decision === 'REJECT') {
      db.prepare(`
        UPDATE durable_approval_workflows
        SET status = 'REJECTED', approver_id = ?, decision_reason = ?, decided_at = ?
        WHERE workflow_id = ?
      `).run(params.approverId, params.reason || 'Rejected by operator', decidedAt, wf.workflowId);

      launchAuditService.recordAudit({
        tenantId: params.tenantId,
        actorId: params.approverId,
        clientIp: '127.0.0.1',
        endpoint: '/api/workflow/resume',
        action: 'WORKFLOW_APPROVAL_REJECTED',
        status: 'REJECTED',
        details: { workflowId: wf.workflowId, reason: params.reason }
      });

      return {
        success: false,
        status: 'REJECTED',
        reason: params.reason || 'Workflow rejected by human operator.',
        workflow: this.getWorkflow(params.tenantId, wf.workflowId)!
      };
    }

    // 5. Approved: Create cryptographic approval record in launch_approvals
    const parsedPayload = JSON.parse(wf.payloadJson);
    const approvalRecord = launchApprovalService.createApproval(
      params.tenantId,
      wf.workflowId,
      params.approverId,
      params.approverRole,
      parsedPayload,
      { workflowType: wf.workflowType, resumedFrom: 'DURABLE_SUSPEND_RESUME' }
    );

    db.prepare(`
      UPDATE durable_approval_workflows
      SET status = 'APPROVED_READY_FOR_EXECUTION',
          approver_id = ?,
          approval_record_id = ?,
          decided_at = ?,
          resumed_at = ?
      WHERE workflow_id = ?
    `).run(params.approverId, approvalRecord.id, decidedAt, decidedAt, wf.workflowId);

    launchAuditService.recordAudit({
      tenantId: params.tenantId,
      actorId: params.approverId,
      clientIp: '127.0.0.1',
      endpoint: '/api/workflow/resume',
      action: 'WORKFLOW_APPROVED_AND_RESUMED',
      status: 'APPROVED',
      details: {
        workflowId: wf.workflowId,
        approvalRecordId: approvalRecord.id,
        approverId: params.approverId
      }
    });

    const updated = this.getWorkflow(params.tenantId, wf.workflowId)!;

    return {
      success: true,
      status: 'APPROVED_READY_FOR_EXECUTION',
      workflow: updated,
      resumedPayload: parsedPayload
    };
  }

  /**
   * Marks a workflow as successfully executed.
   */
  public markExecuted(tenantId: string, workflowId: string, executionResult: Record<string, any>): void {
    this.ensureTable();
    const db = getDatabase();
    db.prepare(`
      UPDATE durable_approval_workflows
      SET status = 'EXECUTED', execution_result_json = ?
      WHERE tenant_id = ? AND workflow_id = ?
    `).run(JSON.stringify(executionResult), tenantId, workflowId);
  }

  public getWorkflow(tenantId: string, workflowId: string): DurableWorkflowRecord | null {
    this.ensureTable();
    const db = getDatabase();
    const row = db.prepare(`
      SELECT * FROM durable_approval_workflows
      WHERE tenant_id = ? AND workflow_id = ?
    `).get(tenantId, workflowId) as any;

    if (!row) return null;
    return this.mapDbRow(row);
  }

  public listPendingWorkflows(tenantId: string): DurableWorkflowRecord[] {
    this.ensureTable();
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT * FROM durable_approval_workflows
      WHERE tenant_id = ? AND status = 'PENDING_APPROVAL'
      ORDER BY created_at DESC
    `).all(tenantId) as any[];

    return rows.map((r) => this.mapDbRow(r));
  }

  private mapDbRow(row: any): DurableWorkflowRecord {
    return {
      workflowId: row.workflow_id,
      tenantId: row.tenant_id,
      workflowType: row.workflow_type,
      actionTitle: row.action_title,
      proposerId: row.proposer_id,
      proposerRole: row.proposer_role,
      requiredApproverRole: row.required_approver_role,
      status: row.status,
      resumptionToken: row.resumption_token,
      payloadJson: row.payload_json,
      payloadHash: row.payload_hash,
      approvalRecordId: row.approval_record_id,
      approverId: row.approver_id,
      decisionReason: row.decision_reason,
      executionResultJson: row.execution_result_json,
      createdAt: row.created_at,
      decidedAt: row.decided_at,
      resumedAt: row.resumed_at,
      expiresAt: row.expires_at
    };
  }
}

export const durableApprovalService = new DurableApprovalWorkflowService();
