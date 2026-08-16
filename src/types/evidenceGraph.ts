// Evidence Graph, Execution Evidence, Outcome Tracking, Attribution, and ROI Types for Relay v2.0

export type EvidenceNodeType =
  | 'business'
  | 'tenant'
  | 'lead'
  | 'prospect'
  | 'customer'
  | 'opportunity'
  | 'communication'
  | 'consent_evidence'
  | 'recommendation'
  | 'ai_decision'
  | 'authorization'
  | 'approval'
  | 'task'
  | 'execution'
  | 'campaign'
  | 'source'
  | 'referral'
  | 'website_visit'
  | 'phone_call'
  | 'form_submission'
  | 'appointment'
  | 'estimate'
  | 'booked_job'
  | 'completed_job'
  | 'invoice'
  | 'payment'
  | 'revenue_event'
  | 'cost_event'
  | 'attribution_claim'
  | 'audit_event'
  | 'location'
  | 'service_area'
  | 'jurisdiction';

export type EvidenceStatus = 'OBSERVED' | 'REPORTED' | 'INFERRED' | 'VERIFIED' | 'UNKNOWN';

export type EvidenceEdgeType =
  | 'ORIGINATED_FROM'
  | 'TRIGGERED'
  | 'RECOMMENDED'
  | 'AUTHORIZED_BY'
  | 'APPROVED_BY'
  | 'EXECUTED_AS'
  | 'RESULTED_IN'
  | 'BOOKED_AS'
  | 'INVOICED_AS'
  | 'PAID_AS'
  | 'SUPPORTED_BY'
  | 'ATTRIBUTED_TO'
  | 'ASSISTED_BY'
  | 'CONTRADICTS'
  | 'SUPERSEDES'
  | 'LOCATED_AT'
  | 'SERVICED_BY'
  | 'GOVERNED_BY'
  | 'JURISDICTION_OF';

export interface NodeProvenance {
  sourceSystem: string;
  rawRecordId?: string;
  ingestedAt: string;
  verificationMethod: string;
  verifierActorId?: string;
  fingerprintHash?: string;
}

export interface EvidenceNode {
  id: string;
  tenantId: string;
  type: EvidenceNodeType;
  label: string;
  timestamp: string;
  source: string;
  evidenceStatus: EvidenceStatus;
  actor: string;
  metadata: Record<string, any>;
  provenance: NodeProvenance;
  auditLinkId?: string;
  auditHash?: string;
}

export interface EvidenceEdge {
  id: string;
  tenantId: string;
  sourceNodeId: string;
  targetNodeId: string;
  edgeType: EvidenceEdgeType;
  weight: number; // 0.0 to 1.0
  confidence: number; // 0.0 to 1.0
  provenance: NodeProvenance;
  createdAt: string;
}

export interface EvidenceGraphData {
  tenantId: string;
  nodes: EvidenceNode[];
  edges: EvidenceEdge[];
  generatedAt: string;
}

// ---------------------------------------------------------------------------
// Build 2: Execution Evidence
// ---------------------------------------------------------------------------
export type ExecutionMode =
  | 'DRY_RUN'
  | 'DRAFT_ONLY'
  | 'APPROVED_PENDING_EXECUTION'
  | 'EXECUTED'
  | 'FAILED'
  | 'BLOCKED';

export type ApprovalState = 'PENDING' | 'APPROVED' | 'REJECTED' | 'NOT_REQUIRED';

export type ConnectorAuthStatus =
  | 'SIMULATED_NO_CREDENTIALS'
  | 'LIVE_AUTHENTICATED'
  | 'MOCK'
  | 'UNAUTHENTICATED';

export type ResultStatus = 'SUCCESS' | 'FAILED' | 'BLOCKED' | 'SIMULATED';

export interface ExecutionEvidenceRecord {
  id: string;
  tenantId: string;
  actor: string;
  agentName: string;
  triggeringLeadOrOpportunityId: string;
  actionType: string;
  executionMode: ExecutionMode;
  timestamp: string;
  approvalState: ApprovalState;
  approvalId?: string;
  authorizationGrantId?: string;
  consentEvidenceRef?: string;
  inputFingerprint: string;
  outputFingerprint: string;
  targetSystemOrChannel: string;
  connectorType: string;
  connectorAuthStatus: ConnectorAuthStatus;
  resultStatus: ResultStatus;
  failureReason?: string;
  immutableAuditReference: string;
  metadata: Record<string, any>;
}

// ---------------------------------------------------------------------------
// Build 3: Structured Outcome Tracking
// ---------------------------------------------------------------------------
export type PipelineStage =
  | 'contacted'
  | 'responded'
  | 'qualified'
  | 'appointment_requested'
  | 'appointment_scheduled'
  | 'estimate_scheduled'
  | 'estimate_delivered'
  | 'job_booked'
  | 'job_started'
  | 'job_completed'
  | 'invoice_issued'
  | 'payment_received'
  | 'lost'
  | 'canceled';

export type OutcomeEvidenceType =
  | 'VERIFIED_PAYMENT'
  | 'BANK_DEPOSIT'
  | 'INVOICE_RECEIPT'
  | 'CUSTOMER_CONFIRMATION'
  | 'DISPATCH_RECORD'
  | 'CRM_STATUS_CHANGE'
  | 'PHONE_LOG'
  | 'SMS_LOG';

export interface StructuredOutcome {
  id: string;
  tenantId: string;
  stage: PipelineStage;
  timestamp: string;
  actorOrSource: string;
  evidenceType: OutcomeEvidenceType;
  evidenceStatus: EvidenceStatus;
  confidence: number; // 0.0 to 1.0
  relatedLeadId: string;
  relatedCustomerId?: string;
  relatedJobId?: string;
  pipelineValue: number;
  quotedValue: number;
  bookedValue: number;
  invoicedValue: number;
  collectedRevenue: number;
  supportingEvidenceRefs: string[];
  notes?: string;
}

// ---------------------------------------------------------------------------
// Build 4 & 5: Attribution Engine & Confidence Scoring
// ---------------------------------------------------------------------------
export type AttributionClassification =
  | 'DIRECT'
  | 'ASSISTED'
  | 'INFLUENCED'
  | 'UNATTRIBUTED'
  | 'DISPUTED';

export type AttributionConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT';

export interface AttributionConfidenceAssessment {
  score: number; // 0.0 to 1.0
  level: AttributionConfidenceLevel;
  positiveEvidence: string[];
  negativeEvidence: string[];
  unresolvedQuestions: string[];
}

export interface ExplainableAttributionRecord {
  id: string;
  tenantId: string;
  businessId: string;
  leadId: string;
  opportunityOrJobId: string;
  revenueEventId: string;
  candidateContributingActions: Array<{
    actionId: string;
    actionType: string;
    timestamp: string;
    actor: string;
    contributionWeight: number;
  }>;
  attributionClassification: AttributionClassification;
  confidenceScore: number;
  confidenceLevel: AttributionConfidenceLevel;
  evidenceReferences: string[];
  conflictingEvidence: string[];
  explanation: string;
  calculationMethod: string;
  attributedAmount: number;
  timestamp: string;
  modelVersion: string;
  auditHashReference: string;
}

// ---------------------------------------------------------------------------
// Build 6: ROI Engine
// ---------------------------------------------------------------------------
export interface TrackedCosts {
  advertisingSpend: number;
  channelCost: number;
  communicationCost: number;
  modelApiCost: number;
  automationExecutionCost: number;
  directJobMaterialsCost: number;
  directJobPermitCost: number;
  directJobLaborCost: number;
  operationalCost: number;
  totalExecutionCost: number;
  totalDirectJobCost: number;
}

export interface DefensibleROIMetrics {
  tenantId: string;
  leadsCount: number;
  qualifiedLeadsCount: number;
  appointmentsCount: number;
  bookedJobsCount: number;
  completedJobsCount: number;
  totalQuotedValue: number;
  totalBookedValue: number;
  totalCollectedRevenue: number;
  attributedGrossRevenue: number;
  assistedRevenue: number;
  influencedRevenue: number;
  unattributedRevenue: number;
  disputedRevenue: number;
  trackedCosts: TrackedCosts;
  attributableGrossProfit: number;
  totalRelayExecutionCost: number;
  netRoiPercent: number | null;
  netRoiDisplay: string;
  averagePaybackDays: number | null;
  paybackDisplay: string;
  costPerLead: number | null;
  costPerQualifiedLead: number | null;
  costPerBooking: number | null;
  costPerAcquiredCustomer: number | null;
  revenuePerLead: number | null;
  bookingConversionRate: number; // e.g. 85.5%
  isSimulated: boolean;
  dataClassification: string;
  calculatedAt: string;
}

// ---------------------------------------------------------------------------
// Build 8: Outcome Reconciliation
// ---------------------------------------------------------------------------
export type ReconciliationSeverity = 'CRITICAL' | 'WARNING' | 'INFO';

export interface ReconciliationAnomaly {
  id: string;
  code:
    | 'PAYMENT_WITHOUT_INVOICE'
    | 'INVOICE_WITHOUT_JOB'
    | 'JOB_WITHOUT_LEAD'
    | 'REVENUE_ATTRIBUTED_NO_ACTION'
    | 'DUPLICATE_PAYMENT_ATTRIBUTION'
    | 'DUPLICATE_LEAD_COUNT'
    | 'CANCELED_JOB_COUNTED_AS_BOOKED'
    | 'DISPUTED_ATTRIBUTION_IN_ROI'
    | 'FAILED_ACTION_COUNTED_AS_EXECUTED'
    | 'CROSS_TENANT_LINKAGE_DETECTED'
    | 'ORPHANED_EVIDENCE_NODE';
  severity: ReconciliationSeverity;
  description: string;
  affectedEntityId: string;
  affectedEntityType: string;
  remediationAdvice: string;
  detectedAt: string;
}

export interface ReconciliationReport {
  tenantId: string;
  scannedAt: string;
  totalNodesScanned: number;
  totalEdgesScanned: number;
  totalRevenueScanned: number;
  integrityScore: number; // 0 to 100
  status: 'CLEAN' | 'WARNINGS_DETECTED' | 'CRITICAL_INCONSISTENCIES';
  anomalies: ReconciliationAnomaly[];
  summary: string;
}
