export type ConnectorType =
  | 'OFFICIAL_API'
  | 'APPROVED_PARTNER'
  | 'DRAFT_ONLY'
  | 'UPLOAD_PACKAGE'
  | 'UNSUPPORTED'
  | 'LOCAL_FIXTURE';

export type ConfigurationState =
  | 'UNCONFIGURED'
  | 'CONFIGURED'
  | 'MISCONFIGURED';

export type AuthenticationState =
  | 'NOT_APPLICABLE'
  | 'UNVERIFIED'
  | 'AUTHENTICATED'
  | 'AUTH_FAILED'
  | 'EXPIRED'
  | 'REVOKED';

export type ExecutionMode =
  | 'DISABLED'
  | 'DRY_RUN'
  | 'DRAFT_ONLY'
  | 'LIVE';

export type HealthStatus =
  | 'UNKNOWN'
  | 'HEALTHY'
  | 'DEGRADED'
  | 'FAILED';

export interface ConnectorRecord {
  id: string;
  tenantId: string;
  provider: string;
  capability: string;
  connectorType: ConnectorType;
  configurationState: ConfigurationState;
  authenticationState: AuthenticationState;
  executionMode: ExecutionMode;
  lastVerificationAt?: string;
  lastSuccessfulRequestAt?: string;
  permissions?: string[];
  scopes?: string[];
  healthStatus: HealthStatus;
  evidenceRefs: string[];
  metadata?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

export type VerificationFailureClassification =
  | 'AUTH_FAILED'
  | 'EXPIRED'
  | 'REVOKED'
  | 'RATE_LIMITED'
  | 'PROVIDER_UNAVAILABLE'
  | 'INSUFFICIENT_SCOPE'
  | 'MISCONFIGURED'
  | 'UNCONFIGURED'
  | 'TIMEOUT'
  | 'NETWORK_ERROR';

export interface ConnectorVerificationResult {
  connectorId: string;
  tenantId: string;
  success: boolean;
  status: AuthenticationState;
  healthStatus: HealthStatus;
  latencyMs: number;
  failureClassification?: VerificationFailureClassification;
  scopesGranted: string[];
  scopesMissing: string[];
  sanitizedMessage: string;
  evidenceRef?: string;
  verifiedAt: string;
}

export interface CredentialHealthReport {
  connectorId: string;
  tenantId: string;
  provider: string;
  capability: string;
  credentialConfigured: boolean;
  validationStatus: AuthenticationState;
  tokenExpiresAt?: string;
  scopesGranted: string[];
  scopesMissing: string[];
  lastSuccessfulAuth?: string;
  lastSuccessfulCall?: string;
  credentialFingerprint?: string; // SHA-256 hash prefix, never raw secret
  healthStatus: HealthStatus;
}

export type QueueItemStatus =
  | 'QUEUED'
  | 'AWAITING_APPROVAL'
  | 'APPROVED'
  | 'EXECUTING'
  | 'SUCCEEDED'
  | 'RETRYABLE_FAILURE'
  | 'TERMINAL_FAILURE'
  | 'DEAD_LETTERED'
  | 'CANCELED'
  | 'BLOCKED';

export interface ExecutionQueueItem<T = any> {
  id: string;
  tenantId: string;
  connectorId: string;
  operation: string;
  target: string;
  payload: T;
  payloadHash: string;
  idempotencyKey: string;
  executionMode: ExecutionMode;
  status: QueueItemStatus;
  approvalId?: string;
  proposerId: string;
  proposerRole: string;
  attempts: number;
  maxAttempts: number;
  nextRetryAt?: string;
  lastError?: string;
  lastErrorClassification?: string;
  resultPayload?: any;
  evidenceRefs: string[];
  auditLogRef?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DeadLetterRecord {
  id: string;
  queueItemId: string;
  tenantId: string;
  connectorId: string;
  operation: string;
  sanitizedFailureClassification: string;
  retryCount: number;
  lastAttemptAt: string;
  nextOperatorAction: 'INSPECT' | 'RETRY_AFTER_CORRECTION' | 'CANCEL' | 'SUPERSEDE';
  evidenceRefs: string[];
  auditLogRef: string;
  status: 'ACTIVE' | 'RETRIED' | 'CANCELLED' | 'SUPERSEDED';
  resolutionNotes?: string;
  createdAt: string;
  resolvedAt?: string;
}

export type EmergencyPauseScope = 'GLOBAL' | 'TENANT' | 'CONNECTOR' | 'CAPABILITY';

export interface EmergencyControlRecord {
  id: string;
  tenantId?: string | null;
  scope: EmergencyPauseScope;
  targetIdentifier?: string;
  isPaused: boolean;
  reason: string;
  pausedBy: string;
  auditLogRef: string;
  pausedAt: string;
  resumedAt?: string;
  resumedBy?: string;
}

export interface PilotReadinessItem {
  id: string;
  category: string;
  label: string;
  status: 'PASS' | 'BLOCKED' | 'WARNING';
  reason: string;
  evidenceRef?: string;
  isDeterministic: boolean;
}

export interface PilotReadinessReport {
  tenantId: string;
  businessName: string;
  operatingBase: string;
  readinessScore: number;
  overallStatus: 'READY_FOR_SIMULATED_PILOT' | 'BLOCKED_PENDING_EVIDENCE' | 'LIVE_READY';
  items: PilotReadinessItem[];
  generatedAt: string;
  evidenceGraphNodeCount: number;
  mandatoryDisclaimer: string;
}

export interface ExecutionObservabilityMetrics {
  tenantId: string;
  connectorAvailabilityPercent: number;
  authenticationFailureCount: number;
  executionSuccessRatePercent: number;
  retryCount: number;
  deadLetterCount: number;
  approvalLatencyAvgMinutes: number;
  queueDepth: number;
  averageExecutionLatencyMs: number;
  blockedActionCount: number;
  policyDenialsCount: number;
  idempotencyReplaysCount: number;
}
