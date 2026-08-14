export type CapabilityStatus =
  | 'PLANNED'
  | 'UI_CONFIGURED'
  | 'LOCALLY_TESTED'
  | 'INTEGRATION_CONFIGURED'
  | 'PROVIDER_VERIFIED'
  | 'LIVE_PRODUCTION'
  | 'BLOCKED';

export type CapabilityExecutionMode = 'DEMO' | 'DRY_RUN' | 'APPROVAL_REQUIRED' | 'LIVE';

export interface AgentCapabilityRecord {
  capabilityId: string;
  agentId: string;
  capabilityName: string;
  description: string;
  implementationStatus: CapabilityStatus;
  executionMode: CapabilityExecutionMode;
  provider: string;
  lastTestedAt: string | null;
  lastProviderVerifiedAt: string | null;
  evidenceArtifact: string | null;
  blocker: string | null;
  humanApprovalRequired: boolean;
  tenantId: string;
  environment: string;
}

export interface AgentRuntimeStatusSummary {
  agentId: string;
  agentName: string;
  hasVerifiedRuntime: boolean;
  overallStatus: CapabilityStatus;
  capabilities: AgentCapabilityRecord[];
  warningMessage?: string;
}
