/**
 * Universal Action Engine Types — Core Execution Lifecycle & Governance
 */

export type UniversalActionState =
  | 'REQUESTED'
  | 'VALIDATED'
  | 'AUTHORIZE_FAILED'
  | 'AUTHORIZED'
  | 'PLANNED'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'QUEUED'
  | 'EXECUTING'
  | 'VERIFYING'
  | 'SUCCEEDED'
  | 'FAILED_CLOSED'
  | 'ROLLED_BACK';

export type UniversalApprovalState =
  | 'NOT_REQUIRED'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED';

export type UniversalActionType =
  | 'COMMUNICATION_OUTBOUND_SMS'
  | 'COMMUNICATION_OUTBOUND_EMAIL'
  | 'WEBSITE_DEPLOY_STATIC'
  | 'WEBSITE_PUBLISH_PAGE'
  | 'STATIC_WEBSITE_DRAFT'
  | 'GBP_UPDATE_POST'
  | 'GBP_REPLY_REVIEW'
  | 'PROFILE_UPDATE_HOURS'
  | 'SOCIAL_PUBLISH_POST'
  | 'MARKETPLACE_STAGE_LISTING'
  | 'MARKETPLACE_PUBLISH_LISTING'
  | 'FINANCIAL_CHARGE_PAYMENT'
  | 'PAYMENT_CAPTURE'
  | 'FIELD_SERVICE_SCHEDULE_JOB'
  | 'CODE_VCS_DEPLOY_COMMIT';

export interface UniversalActor {
  id: string;
  role: 'AI_AGENT' | 'OPERATOR' | 'OWNER' | 'ADMIN' | 'SYSTEM';
  name?: string;
  email?: string;
}

export interface UniversalActionRequest {
  tenantId: string;
  actor: UniversalActor;
  actionType: UniversalActionType;
  provider: string;
  input?: Record<string, any>;
  inputPayload?: Record<string, any>;
  idempotencyKey?: string;
  requiresApprovalOverride?: boolean;
  metadata?: Record<string, any>;
}

export interface UniversalActionRecord {
  id: string;
  tenantId: string;
  actorId: string;
  actorRole: string;
  actorName: string;
  actionType: UniversalActionType;
  provider: string;
  inputPayload: Record<string, any>;
  inputFingerprint: string;
  executionState: UniversalActionState;
  approvalState: UniversalApprovalState;
  approvalRequired: boolean;
  approvedBy?: string;
  approvedAt?: string;
  approvalReason?: string;
  approvalSignature?: string;
  policyVersion?: string;
  retryClassification?: string;
  nextRetryAt?: string;
  deadLetterId?: string;
  attemptCount: number;
  maxAttempts: number;
  resultPayload?: Record<string, any>;
  error?: {
    code: string;
    message: string;
    details?: any;
    failedClosed: boolean;
  };
  idempotencyKey: string;
  auditReference: string;
  requestedAt: string;
  validatedAt?: string;
  authorizedAt?: string;
  plannedAt?: string;
  queuedAt?: string;
  executedAt?: string;
  verifiedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UniversalActionExecutionResult {
  success: boolean;
  record: UniversalActionRecord;
  providerConfirmation?: Record<string, any>;
  auditHash: string;
  failedClosedMessage?: string;
}
