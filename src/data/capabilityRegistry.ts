import { AgentCapabilityRecord } from '../types/capabilityRegistry';

export interface CanonicalAgentIdentity {
  agentId: string;
  canonicalName: string;
  roleDescription: string;
  historicalAliases: string[];
}

export const CANONICAL_BUZ_AGENTS: CanonicalAgentIdentity[] = [
  {
    agentId: 'agent-dispatch',
    canonicalName: 'Aria',
    roleDescription: 'Speed-to-Lead and Electrical Dispatch',
    historicalAliases: ['Aria']
  },
  {
    agentId: 'agent-strategist',
    canonicalName: 'Kaelen',
    roleDescription: 'Revenue and Partnership Strategy',
    historicalAliases: ['Kaelen']
  },
  {
    agentId: 'agent-seo',
    canonicalName: 'Nexus',
    roleDescription: 'Google Business Profile and Local SEO',
    historicalAliases: ['Marcus', 'Nexus']
  },
  {
    agentId: 'agent-rebate',
    canonicalName: 'Vortex',
    roleDescription: 'Mass Save Rebates and Incentives',
    historicalAliases: ['Jax', 'Vortex']
  },
  {
    agentId: 'agent-brand',
    canonicalName: 'Sentinella',
    roleDescription: 'Massachusetts Compliance Guard',
    historicalAliases: ['Chloe', 'Sentinella']
  }
];

export function resolveAgentCanonicalName(query: string): string | null {
  const q = query.trim().toLowerCase();
  for (const agent of CANONICAL_BUZ_AGENTS) {
    if (
      agent.agentId.toLowerCase() === q ||
      agent.canonicalName.toLowerCase() === q ||
      agent.historicalAliases.some((a) => a.toLowerCase() === q)
    ) {
      return agent.canonicalName;
    }
  }
  return null;
}

export const CANONICAL_CAPABILITY_REGISTRY: AgentCapabilityRecord[] = [
  // Aria - Speed-to-Lead Agent
  {
    capabilityId: 'aria-lead-intake',
    agentId: 'agent-dispatch',
    capabilityName: 'Electrical Lead Intake & Validation',
    description: 'Receives lead inputs, validates tenant isolation, checks consent, and checks opt-out suppression lists.',
    implementationStatus: 'LOCALLY_TESTED',
    executionMode: 'APPROVAL_REQUIRED',
    provider: 'Local Engine (AriaDispatchService)',
    lastTestedAt: '2026-08-13T00:00:00.000Z',
    lastProviderVerifiedAt: null,
    evidenceArtifact: 'src/services/ariaDispatchService.ts',
    blocker: null,
    humanApprovalRequired: true,
    tenantId: 'tenant-reis-electric',
    environment: 'development'
  },
  {
    capabilityId: 'aria-hazard-triage',
    agentId: 'agent-dispatch',
    capabilityName: 'Emergency Hazard & Safety Triage',
    description: 'Detects fire, smoke, arcing, or shock hazards and emits conservative safety warnings and human escalation.',
    implementationStatus: 'LOCALLY_TESTED',
    executionMode: 'APPROVAL_REQUIRED',
    provider: 'Local Engine (AriaDispatchService)',
    lastTestedAt: '2026-08-13T00:00:00.000Z',
    lastProviderVerifiedAt: null,
    evidenceArtifact: 'src/services/ariaDispatchService.ts',
    blocker: null,
    humanApprovalRequired: true,
    tenantId: 'tenant-reis-electric',
    environment: 'development'
  },
  {
    capabilityId: 'aria-hash-approval-dispatch',
    agentId: 'agent-dispatch',
    capabilityName: 'Content-Hash Bound Response Approval & DRY_RUN Dispatch',
    description: 'Generates response drafts, binds approval to SHA-256 draft hash, and dispatches in DRY_RUN mode.',
    implementationStatus: 'LOCALLY_TESTED',
    executionMode: 'DRY_RUN',
    provider: 'Local Engine (AriaDispatchAdapter)',
    lastTestedAt: '2026-08-13T00:00:00.000Z',
    lastProviderVerifiedAt: null,
    evidenceArtifact: 'src/tests/buzAgentSuite.test.ts',
    blocker: null,
    humanApprovalRequired: true,
    tenantId: 'tenant-reis-electric',
    environment: 'development'
  },
  {
    capabilityId: 'aria-live-sms-dispatch',
    agentId: 'agent-dispatch',
    capabilityName: 'Live Carrier SMS Dispatch',
    description: 'Executes live outbound SMS delivery through carrier messaging APIs.',
    implementationStatus: 'BLOCKED',
    executionMode: 'LIVE',
    provider: 'Twilio / Carrier Gateway (Unverified)',
    lastTestedAt: null,
    lastProviderVerifiedAt: null,
    evidenceArtifact: null,
    blocker: 'Awaiting provider credentials, A2P 10DLC registration, and owner authorization.',
    humanApprovalRequired: true,
    tenantId: 'tenant-reis-electric',
    environment: 'production'
  },

  // Kaelen - Revenue & Strategy Agent
  {
    capabilityId: 'kaelen-margin-modeling',
    agentId: 'agent-strategist',
    capabilityName: 'Margin Modeling & Campaign Architecture',
    description: 'UI profile for modeling job margins and planning commercial campaign cadences.',
    implementationStatus: 'UI_CONFIGURED',
    executionMode: 'DEMO',
    provider: 'UI Seed Configuration',
    lastTestedAt: null,
    lastProviderVerifiedAt: null,
    evidenceArtifact: null,
    blocker: 'Requires live CRM and accounting dataset integration.',
    humanApprovalRequired: true,
    tenantId: 'tenant-reis-electric',
    environment: 'development'
  },

  // Nexus - Google Business Profile & Local SEO Agent
  {
    capabilityId: 'gbp-guided-onboarding',
    agentId: 'agent-seo',
    capabilityName: 'Google Business Guided-Manual Onboarding',
    description: 'Guided manual intake, role attestation, private address segregation, and owner preparation packet generation.',
    implementationStatus: 'LOCALLY_TESTED',
    executionMode: 'DRY_RUN',
    provider: 'Local Engine (GBPConnectorService / GBPGovernanceService)',
    lastTestedAt: '2026-08-14T00:00:00.000Z',
    lastProviderVerifiedAt: null,
    evidenceArtifact: 'src/services/gbpGovernanceService.ts',
    blocker: null,
    humanApprovalRequired: true,
    tenantId: 'tenant-reis-electric',
    environment: 'development'
  },
  {
    capabilityId: 'gbp-duplicate-research-checklist',
    agentId: 'agent-seo',
    capabilityName: 'Duplicate-Profile Research Checklist',
    description: 'Guided manual research checklist to prevent duplicate Google listings without scraping or querying Google automatically.',
    implementationStatus: 'LOCALLY_TESTED',
    executionMode: 'GUIDED_MANUAL' as any,
    provider: 'Local Guided Manual Engine',
    lastTestedAt: '2026-08-14T00:00:00.000Z',
    lastProviderVerifiedAt: null,
    evidenceArtifact: 'src/services/gbpGovernanceService.ts',
    blocker: null,
    humanApprovalRequired: true,
    tenantId: 'tenant-reis-electric',
    environment: 'development'
  },
  {
    capabilityId: 'gbp-profile-draft-generator',
    agentId: 'agent-seo',
    capabilityName: 'Profile-Information Draft Generator',
    description: 'Generates structured profile drafts bound by content hash for owner review; never represents draft as published.',
    implementationStatus: 'LOCALLY_TESTED',
    executionMode: 'DRY_RUN',
    provider: 'Local Engine (GBPConnectorService)',
    lastTestedAt: '2026-08-14T00:00:00.000Z',
    lastProviderVerifiedAt: null,
    evidenceArtifact: 'src/services/gbpConnectorService.ts',
    blocker: null,
    humanApprovalRequired: true,
    tenantId: 'tenant-reis-electric',
    environment: 'development'
  },
  {
    capabilityId: 'gbp-google-oauth-connection',
    agentId: 'agent-seo',
    capabilityName: 'Google OAuth 2.0 Connection',
    description: 'Live Google OAuth 2.0 token acquisition and management.',
    implementationStatus: 'BLOCKED',
    executionMode: 'APPROVAL_REQUIRED',
    provider: 'Google Identity Services (Unconfigured)',
    lastTestedAt: null,
    lastProviderVerifiedAt: null,
    evidenceArtifact: null,
    blocker: 'BLOCKED: Requires Google Cloud project, OAuth consent configuration, API approval, secure token storage, and owner sign-in.',
    humanApprovalRequired: true,
    tenantId: 'tenant-reis-electric',
    environment: 'production'
  },
  {
    capabilityId: 'gbp-google-api-execution',
    agentId: 'agent-seo',
    capabilityName: 'Google Business Profile API Execution',
    description: 'Direct programmatic profile creation, verification check, and automated updates via Google My Business API.',
    implementationStatus: 'BLOCKED',
    executionMode: 'APPROVAL_REQUIRED',
    provider: 'Google Business Profile API (Unapproved)',
    lastTestedAt: null,
    lastProviderVerifiedAt: null,
    evidenceArtifact: null,
    blocker: 'BLOCKED: Requires verified active profile eligibility, valid public website, API approval, policy review, and controlled live-integration test.',
    humanApprovalRequired: true,
    tenantId: 'tenant-reis-electric',
    environment: 'production'
  },
  {
    capabilityId: 'gbp-google-verification',
    agentId: 'agent-seo',
    capabilityName: 'Google Business Profile Verification',
    description: 'Google profile postcard/video/phone verification handling.',
    implementationStatus: 'BLOCKED',
    executionMode: 'APPROVAL_REQUIRED',
    provider: 'Google Verification Flow (Owner-Only)',
    lastTestedAt: null,
    lastProviderVerifiedAt: null,
    evidenceArtifact: null,
    blocker: 'OWNER_ACTION_REQUIRED: Relay cannot perform or bypass Google verification. Must be completed directly by business owner.',
    humanApprovalRequired: true,
    tenantId: 'tenant-reis-electric',
    environment: 'production'
  },
  {
    capabilityId: 'gbp-automated-posts-reviews',
    agentId: 'agent-seo',
    capabilityName: 'Automated GBP Posts, Review Responses & Edits',
    description: 'Autonomous publishing of posts or automated responses to customer Google reviews.',
    implementationStatus: 'BLOCKED',
    executionMode: 'APPROVAL_REQUIRED',
    provider: 'Autonomous Dispatch Engine (Blocked)',
    lastTestedAt: null,
    lastProviderVerifiedAt: null,
    evidenceArtifact: null,
    blocker: 'BLOCKED: Requires separate purpose-specific authorization, unbundled permissions, and human content approval for each publication.',
    humanApprovalRequired: true,
    tenantId: 'tenant-reis-electric',
    environment: 'production'
  },
  {
    capabilityId: 'nexus-gbp-map-ranking',
    agentId: 'agent-seo',
    capabilityName: 'Google Business Profile Audit & Geotag Drops',
    description: 'UI profile for Google Maps local ranking optimization and post drops.',
    implementationStatus: 'UI_CONFIGURED',
    executionMode: 'DEMO',
    provider: 'UI Seed Configuration',
    lastTestedAt: null,
    lastProviderVerifiedAt: null,
    evidenceArtifact: null,
    blocker: 'Requires verified Google Business Profile OAuth connection.',
    humanApprovalRequired: true,
    tenantId: 'tenant-reis-electric',
    environment: 'development'
  },

  // Vortex - Mass Save Rebate Agent
  {
    capabilityId: 'vortex-rebate-lookup',
    agentId: 'agent-rebate',
    capabilityName: 'Mass Save & Utility Incentive Query',
    description: 'Queries verified utility rebate records for EV chargers and panel upgrades.',
    implementationStatus: 'UI_CONFIGURED',
    executionMode: 'DEMO',
    provider: 'Local Rebate Knowledge Registry',
    lastTestedAt: null,
    lastProviderVerifiedAt: null,
    evidenceArtifact: null,
    blocker: 'Requires official Mass Save source URL review and date-bound verification.',
    humanApprovalRequired: true,
    tenantId: 'tenant-reis-electric',
    environment: 'development'
  },

  // Sentinella - MA Board Compliance Guard
  {
    capabilityId: 'sentinella-compliance-guard',
    agentId: 'agent-brand',
    capabilityName: 'MA Board 237 CMR Compliance Check',
    description: 'Verifies required license disclaimers and checks A1 Business License verification requirements.',
    implementationStatus: 'UI_CONFIGURED',
    executionMode: 'DEMO',
    provider: 'Local Compliance Engine',
    lastTestedAt: null,
    lastProviderVerifiedAt: null,
    evidenceArtifact: null,
    blocker: 'Awaiting official mass.gov ePlace A1 Business License verification.',
    humanApprovalRequired: true,
    tenantId: 'tenant-reis-electric',
    environment: 'development'
  }
];

export function getCapabilitiesForAgent(agentId: string): AgentCapabilityRecord[] {
  return CANONICAL_CAPABILITY_REGISTRY.filter((c) => c.agentId === agentId);
}

export function hasVerifiedRuntime(agentId: string): boolean {
  const caps = getCapabilitiesForAgent(agentId);
  return caps.some(
    (c) => c.implementationStatus === 'PROVIDER_VERIFIED' || c.implementationStatus === 'LIVE_PRODUCTION'
  );
}
