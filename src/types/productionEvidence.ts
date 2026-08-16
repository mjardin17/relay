import { DataClassification } from './dataClassification';

export type DataEnvironment =
  | 'SYNTHETIC'
  | 'TEST'
  | 'DEMO'
  | 'PILOT'
  | 'PRODUCTION';

export type TenantPilotState =
  | 'NOT_CONFIGURED'
  | 'CONFIGURING'
  | 'DRY_RUN_READY'
  | 'PILOT_READY'
  | 'PILOT_ACTIVE'
  | 'PAUSED'
  | 'BLOCKED'
  | 'COMPLETED';

export type LeadSourceType =
  | 'MANUAL_OPERATOR'
  | 'AUTHENTICATED_CONNECTOR'
  | 'WEBSITE_FORM'
  | 'API_GATEWAY'
  | 'IMPORTED_BATCH';

export type ConsentState =
  | 'OPTED_IN'
  | 'OPTED_OUT'
  | 'PENDING_VERIFICATION'
  | 'EXPLICIT_WRITTEN'
  | 'VERIFIED_SMS_OPT_IN';

export type DuplicateStatus =
  | 'NEW'
  | 'POSSIBLE_DUPLICATE'
  | 'CONFIRMED_DUPLICATE'
  | 'MERGED'
  | 'DISTINCT';

export type IdentityResolutionResult =
  | 'NEW_PROSPECT'
  | 'EXISTING_CUSTOMER'
  | 'PREVIOUS_LEAD'
  | 'RETURNING_CUSTOMER'
  | 'UNKNOWN_IDENTITY';

export type PilotLeadLifecycleStatus =
  | 'LEAD_RECEIVED'
  | 'SOURCE_VERIFIED'
  | 'IDENTITY_RESOLVED'
  | 'LOCATION_RESOLVED'
  | 'SERVICE_AREA_CHECKED'
  | 'CONSENT_VERIFIED'
  | 'QUALIFIED'
  | 'PROPOSED'
  | 'APPROVED'
  | 'QUEUED'
  | 'EXECUTED'
  | 'PROVIDER_ACKNOWLEDGED'
  | 'CUSTOMER_RESPONDED'
  | 'ESTIMATE_SCHEDULED'
  | 'ESTIMATE_DELIVERED'
  | 'JOB_BOOKED'
  | 'JOB_COMPLETED'
  | 'INVOICE_SENT'
  | 'PAYMENT_REPORTED'
  | 'PAYMENT_VERIFIED'
  | 'ATTRIBUTION_CONFIRMED';

export type PaymentEvidenceState =
  | 'REPORTED'
  | 'INVOICE_MATCHED'
  | 'PROCESSOR_CONFIRMED'
  | 'BANK_CONFIRMED'
  | 'VERIFIED'
  | 'DISPUTED';

export type ManualOutcomeType =
  | 'CUSTOMER_CALLED_BACK'
  | 'ESTIMATE_SCHEDULED'
  | 'ESTIMATE_DELIVERED'
  | 'JOB_BOOKED'
  | 'JOB_LOST'
  | 'JOB_COMPLETED'
  | 'INVOICE_SENT'
  | 'PAYMENT_RECEIVED';

export interface IdentityResolutionRecord {
  tenantId: string;
  leadId: string;
  result: IdentityResolutionResult;
  matchedCustomerId?: string;
  matchedLeadId?: string;
  confidence: number;
  supportingEvidence: string[];
  conflictingEvidence: string[];
  fingerprint: string;
  resolvedAt: string;
}

export interface NormalizedContact {
  fullName: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone: string;
  streetAddress?: string;
  municipality: string;
  stateProvince: string;
  postalCode: string;
  country: string;
}

export interface LeadIntakeRecord {
  tenantId: string;
  leadId: string;
  source: string;
  sourceType: LeadSourceType;
  sourceEvidence: {
    rawPayload?: any;
    providerLeadId?: string;
    channel?: string;
    ipAddress?: string;
    userAgent?: string;
    capturedAt: string;
    evidenceRef?: string;
  };
  receivedAt: string;
  normalizedContact: NormalizedContact;
  serviceRequested: string;
  propertyType: 'Residential' | 'Commercial' | 'Industrial';
  dataEnvironment: DataEnvironment;
  consentState: ConsentState;
  consentEvidenceRef?: string;
  locationEvidence: {
    locationId?: string;
    coordinates?: { latitude: number; longitude: number };
    serviceAreaStatus: 'IN_SERVICE_AREA' | 'OUT_OF_SERVICE_AREA' | 'MANUAL_REVIEW_REQUIRED';
    jurisdictionId?: string;
    municipality?: string;
    stateProvince?: string;
  };
  deduplicationFingerprint: string;
  duplicateStatus: DuplicateStatus;
  duplicateDetails?: {
    matchedLeadId?: string;
    similarityScore?: number;
    reason?: string;
  };
  identityResolution?: IdentityResolutionRecord;
  qualificationStatus: 'UNQUALIFIED' | 'QUALIFIED' | 'DISQUALIFIED' | 'REVIEW_REQUIRED';
  lifecycleStatus: PilotLeadLifecycleStatus;
  estimatedValue: number;
  auditRef: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductionApprovalPayload {
  id: string;
  tenantId: string;
  leadId: string;
  proposedAction: string;
  actionPayload: any;
  canonicalPayloadHash: string;
  ariaReasoning: string;
  connectorId: string;
  recipient: string;
  consentEvidenceRef: string;
  authorizationEvidenceRef: string;
  jurisdictionContext: string;
  expectedExternalEffect: string;
  executionMode: 'DRY_RUN' | 'LIVE_PRODUCTION';
  policyFindings: string[];
  proposerId: string;
  proposerRole: string;
  approvedBy?: string;
  approverId?: string;
  approvedAt?: string;
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REAPPROVAL_REQUIRED';
  decision?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REAPPROVAL_REQUIRED';
}

export interface ProductionIdempotencyRecord {
  tenantId: string;
  connectorId: string;
  capability: string;
  operation: string;
  target: string;
  idempotencyKey: string;
  canonicalRequestHash: string;
  result: any;
  executionId: string;
  createdAt: string;
}

export interface PilotTimelineEvent {
  id: string;
  tenantId: string;
  leadId: string;
  timestamp: string;
  stage: PilotLeadLifecycleStatus;
  title: string;
  description: string;
  actorOrSource: string;
  evidenceRef?: string;
  auditRef: string;
  dataEnvironment: DataEnvironment;
  metadata?: Record<string, any>;
}

export interface ManualOutcomeRecord {
  id: string;
  tenantId: string;
  leadId: string;
  outcomeType: ManualOutcomeType;
  status: 'OPERATOR_REPORTED' | 'VERIFIED' | 'DISPUTED';
  verificationStatus?: 'OPERATOR_REPORTED' | 'VERIFIED' | 'DISPUTED';
  operatorId: string;
  operatorRole: string;
  amount?: number;
  confidence: number;
  notes: string;
  evidenceAttachmentRef?: string;
  paymentEvidenceState?: PaymentEvidenceState;
  recordedAt: string;
  auditEventId: string;
}

export interface PilotReadinessGateCheck {
  gateId: string;
  name: string;
  category: string;
  status: 'PASS' | 'FAIL' | 'BLOCKED' | 'WARNING';
  reason: string;
  isMandatory: boolean;
  evidenceRef?: string;
}

export interface PilotReadinessReportV2 {
  tenantId: string;
  overallState: TenantPilotState;
  isPilotReady: boolean;
  canActivate: boolean;
  evaluatedAt: string;
  gates: PilotReadinessGateCheck[];
  blockers: string[];
  warnings: string[];
  mandatoryDisclaimer: string;
}

export interface ProductionFinancialMetrics {
  dataEnvironment: DataEnvironment;
  quotedValue: number;
  bookedValue: number;
  invoicedValue: number;
  collectedRevenue: number;
  verifiedRevenue: number;
  reportedUnverifiedRevenue: number;
  attributedRevenue: number;
  attributableGrossProfit: number;
  evidenceCount: number;
}

export interface PilotAuditPackage {
  tenantId: string;
  leadId: string;
  generatedAt: string;
  leadSummary: any;
  identityResolutionEvidence: any;
  locationEvidence: any;
  consentEvidence: any;
  recommendation: any;
  approvalRecord: any;
  policyDecision: any;
  connectorVerification: any;
  executionEvidence: any;
  outcomeRecords: any[];
  paymentEvidence: any[];
  attributionAnalysis: any;
  defensibleROI: any;
  auditChainValidation: {
    isChainValid: boolean;
    totalNodes: number;
    totalEdges: number;
    cryptographicHash: string;
  };
  auditHash?: string;
  timelineEvents?: any[];
  verifiedAt?: string;
  sanitizedDisclaimer: string;
}
