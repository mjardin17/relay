import { getDatabase } from '../db/database';
import { ConnectorRegistryService } from './connectorRegistryService';
import { DurableExecutionQueueService } from './durableExecutionQueueService';
import { EmergencyControlService } from './emergencyControlService';
import { DeadLetterQueueService } from './deadLetterQueueService';
import { OperatorApprovalConsoleService } from './operatorApprovalConsoleService';
import { LocationIntelligenceService } from './locationIntelligenceService';
import { EvidenceGraphService } from './evidenceGraphService';
import { LaunchAuditService } from './launchAuditService';
import { AriaDispatchService } from './ariaDispatchService';
import { GovernancePolicyEngine } from './governancePolicyEngine';
import { ExecutionMode, ExecutionQueueItem } from '../types/connectorRegistry';
import { LocationRecord } from '../types/locationIntelligence';

export interface LeadLifecyclePipelineResult {
  leadId: string;
  tenantId: string;
  intakeSuccess: boolean;
  locationResolution: any;
  serviceAreaStatus: string;
  consentVerified: boolean;
  governanceDecision: any;
  queueItemId?: string;
  executionStatus: string;
  executionMode: ExecutionMode;
  evidenceRefs: string[];
  message: string;
}

export class ControlledLiveOperationsFacade {
  private static instance: ControlledLiveOperationsFacade;
  private connectorRegistry: ConnectorRegistryService;
  private queueService: DurableExecutionQueueService;
  private emergencyService: EmergencyControlService;
  private dlqService: DeadLetterQueueService;
  private operatorConsole: OperatorApprovalConsoleService;
  private locationService: LocationIntelligenceService;
  private evidenceGraph: EvidenceGraphService;
  private auditService: LaunchAuditService;
  private ariaDispatch: AriaDispatchService;
  private governanceEngine: GovernancePolicyEngine;

  private constructor() {
    this.connectorRegistry = ConnectorRegistryService.getInstance();
    this.queueService = DurableExecutionQueueService.getInstance();
    this.emergencyService = EmergencyControlService.getInstance();
    this.dlqService = DeadLetterQueueService.getInstance();
    this.operatorConsole = OperatorApprovalConsoleService.getInstance();
    this.locationService = LocationIntelligenceService.getInstance();
    this.evidenceGraph = EvidenceGraphService.getInstance();
    this.auditService = LaunchAuditService.getInstance();
    this.ariaDispatch = AriaDispatchService.getInstance();
    this.governanceEngine = GovernancePolicyEngine.getInstance();
  }

  public static getInstance(): ControlledLiveOperationsFacade {
    if (!ControlledLiveOperationsFacade.instance) {
      ControlledLiveOperationsFacade.instance = new ControlledLiveOperationsFacade();
    }
    return ControlledLiveOperationsFacade.instance;
  }

  /**
   * Process a real or pilot lead through the unbroken end-to-end pipeline:
   * 1. Ingestion & Lead Record
   * 2. Location Intelligence & Service Territory Verification
   * 3. Consent Validation
   * 4. Aria Recommendation & Safety Screening
   * 5. Declarative Governance Policy Evaluation
   * 6. Enqueue Execution / Approval Workflow
   */
  public async processLeadPipeline(params: {
    tenantId: string;
    leadData: {
      fullName: string;
      phone: string;
      email?: string;
      address?: string;
      city?: string;
      stateProvince?: string;
      postalCode?: string;
      serviceRequested: string;
      source: string;
      consentRecordId?: string;
      isEmergency?: boolean;
    };
    proposerId: string;
    proposerRole: string;
    targetConnectorId?: string;
    requestedExecutionMode?: ExecutionMode;
  }): Promise<LeadLifecyclePipelineResult> {
    const { tenantId, leadData, proposerId, proposerRole } = params;
    const db = getDatabase();
    const now = new Date().toISOString();

    // 1. Ingest Lead via Aria Dispatch
    const intakeResult = this.ariaDispatch.intakeLead({
      tenantId,
      idempotencyKey: `lead_intake_${tenantId}_${Date.now()}`,
      customerName: leadData.fullName,
      contactMethod: leadData.phone ? 'sms' : 'email',
      phone: leadData.phone,
      email: leadData.email,
      serviceAddress: leadData.address,
      zipCode: leadData.postalCode || '02740',
      problemDescription: leadData.serviceRequested,
      source: leadData.source || 'web_form',
      consentProvided: !!leadData.consentRecordId
    });

    // 2. Resolve Dynamic Location Context
    const customerLocation: LocationRecord = {
      id: `loc_${tenantId}_lead_${Date.now()}`,
      tenantId,
      label: leadData.fullName,
      type: 'CUSTOMER',
      streetAddress: leadData.address,
      city: leadData.city || 'New Bedford',
      municipality: leadData.city || 'New Bedford',
      stateProvince: leadData.stateProvince || 'MA',
      postalCode: leadData.postalCode || '02740',
      country: 'US',
      timezone: 'America/New_York',
      source: 'LEAD_FORM',
      confidence: 1.0,
      verificationState: 'SELF_REPORTED',
      evidenceRefs: [],
      metadata: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const locationContext = this.locationService.resolveActionLocationContext({
      tenantId,
      actionType: 'SCHEDULING',
      customerLocation
    });

    // 3. Evaluate Governance Policy
    const governancePolicyResult = this.governanceEngine.evaluateAction({
      tenantId,
      actionType: 'ARIA_LEAD_DISPATCH',
      actorId: proposerId,
      actorRole: (proposerRole as any) || 'RELAY_OPERATOR',
      isLiveExecution: params.requestedExecutionMode === 'LIVE',
      hasExplicitConsent: !!leadData.consentRecordId,
      isEmergencyHazard: !!leadData.isEmergency,
      serviceAreaStatus: locationContext.serviceAreaStatus as any
    });

    // Determine target connector
    let connector = params.targetConnectorId ? this.connectorRegistry.getConnector(tenantId, params.targetConnectorId) : null;
    if (!connector) {
      connector = this.connectorRegistry.getConnectorByCapability(tenantId, 'TWILIO_SMS', 'CUSTOMER_DISPATCH')
        || this.connectorRegistry.listConnectors(tenantId)[0];
    }
    if (!connector) {
      connector = this.connectorRegistry.registerConnector(tenantId, {
        id: `conn_${tenantId}_lead_dispatch`,
        provider: 'TWILIO_SMS',
        capability: 'CUSTOMER_DISPATCH',
        connectorType: 'LOCAL_FIXTURE',
        configurationState: 'CONFIGURED',
        authenticationState: 'AUTHENTICATED',
        healthStatus: 'HEALTHY',
        executionMode: 'DRY_RUN'
      });
    }
    const connectorId = connector.id;

    const execMode = params.requestedExecutionMode || 'DRY_RUN';

    // 4. Enqueue into Durable Queue
    const leadId = intakeResult.lead?.id || `lead_${Date.now()}`;
    const idempotencyKey = `lead_dispatch_${tenantId}_${leadId}`;
    const queueItem = this.queueService.enqueue({
      tenantId,
      connectorId,
      operation: 'DISPATCH_CUSTOMER_CONFIRMATION',
      target: leadData.phone,
      payload: {
        leadId,
        customerName: leadData.fullName,
        serviceRequested: leadData.serviceRequested,
        locationContext: {
          city: locationContext.municipality || 'New Bedford',
          state: locationContext.stateProvince || 'MA',
          serviceAreaStatus: locationContext.serviceAreaStatus
        },
        consentRecordId: leadData.consentRecordId,
        governanceDecision: governancePolicyResult.decision
      },
      idempotencyKey,
      proposerId,
      proposerRole,
      executionMode: execMode,
      initialStatus: governancePolicyResult.decision === 'DENY' ? 'BLOCKED' : 'QUEUED'
    });

    // If allowed and not blocked, execute queue item
    let executionStatus = queueItem.status;
    let finalMessage = 'Lead processed and enqueued successfully.';

    if (queueItem.status === 'QUEUED') {
      try {
        const executed = await this.queueService.executeQueueItem(tenantId, queueItem.id);
        executionStatus = executed.status;
        finalMessage = `Lead dispatched in ${execMode} mode.`;
      } catch (err: any) {
        executionStatus = 'RETRYABLE_FAILURE';
        finalMessage = `Enqueued but execution deferred: ${err.message}`;
      }
    } else if (queueItem.status === 'BLOCKED') {
      finalMessage = `Execution blocked by governance policy: ${governancePolicyResult.reason}`;
    }

    return {
      leadId,
      tenantId,
      intakeSuccess: intakeResult.success,
      locationResolution: locationContext,
      serviceAreaStatus: locationContext.serviceAreaStatus,
      consentVerified: !!leadData.consentRecordId,
      governanceDecision: governancePolicyResult,
      queueItemId: queueItem.id,
      executionStatus,
      executionMode: execMode,
      evidenceRefs: queueItem.evidenceRefs,
      message: finalMessage
    };
  }

  public runControlledPipeline(input: any) {
    return this.processLeadPipeline(input);
  }
}
