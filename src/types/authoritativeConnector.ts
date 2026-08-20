/**
 * Authoritative Connector Registry Types
 */

export type ConnectorCategory =
  | 'SEARCH_LOCAL'
  | 'MESSAGING'
  | 'EMAIL'
  | 'HOSTING'
  | 'CODE_VCS'
  | 'PAYMENT'
  | 'ACCOUNTING'
  | 'FIELD_SERVICE'
  | 'SOCIAL_MEDIA'
  | 'MARKETPLACE'
  | 'STORAGE_MEDIA'
  | 'AI_INFERENCE';

export type AuthoritativeConnectorType =
  | 'OFFICIAL_API'
  | 'APPROVED_PARTNER'
  | 'DRAFT_ONLY'
  | 'UNSUPPORTED';

export type AuthoritativeAuthMethod =
  | 'OAUTH2'
  | 'API_KEY'
  | 'WEBHOOK_SECRET'
  | 'SERVICE_ACCOUNT'
  | 'NONE';

export type ConnectionState =
  | 'DISCONNECTED'
  | 'CONFIGURED_UNVERIFIED'
  | 'VERIFIED'
  | 'REVOKED'
  | 'ERROR';

export interface ConnectorOperationDefinition {
  name: string;
  description: string;
  mode: 'READ' | 'WRITE';
  requiresHumanApproval: boolean;
  rateLimitWeight?: number;
  idempotent: boolean;
  requiredScopes?: string[];
}

export interface AuthoritativeConnectorMetadata {
  id: string;
  provider: string;
  displayName: string;
  category: ConnectorCategory;
  connectorType: AuthoritativeConnectorType;
  authMethod: AuthoritativeAuthMethod;
  capabilities: string[];
  readOperations: string[];
  writeOperations: string[];
  approvalRequirements: string[];
  rateLimitHandling: {
    requestsPerMinute: number;
    backoffStrategy: 'EXPONENTIAL' | 'LINEAR' | 'FIXED';
    retryAfterSupported: boolean;
  };
  tokenRefreshSupport: {
    supported: boolean;
    autoRefreshWindowSeconds: number;
  };
  verificationMethod: string;
  docUrl: string;
  safetyPolicies: string[];
}

export interface TenantConnectorInstance {
  id: string;
  tenantId: string;
  provider: string;
  category: ConnectorCategory;
  connectorType: AuthoritativeConnectorType;
  connectionState: ConnectionState;
  authMethod: AuthoritativeAuthMethod;
  configuredBy: string;
  credentialsMasked: {
    hasApiKey?: boolean;
    apiKeyFingerprint?: string;
    oauthEmail?: string;
    scopesGranted?: string[];
    expiresAt?: string;
  };
  lastVerificationAt?: string;
  lastVerificationStatus?: 'SUCCESS' | 'FAILED';
  lastVerificationMessage?: string;
  lastSuccessfulRequestAt?: string;
  lastFailureAt?: string;
  lastFailureMessage?: string;
  enabledOperations: string[];
  pausedOperations: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ConnectorVerificationProbeResult {
  provider: string;
  status: 'VERIFIED' | 'FAILED';
  connectionState: ConnectionState;
  sanitizedMessage: string;
  latencyMs: number;
  scopesGranted: string[];
  scopesMissing: string[];
  probedAt: string;
  evidenceRef: string;
}
