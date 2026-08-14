export type EvidenceClassification =
  | 'SELF_REPORTED_PENDING_EVIDENCE'
  | 'DOCUMENT_SUPPORTED'
  | 'OFFICIAL_GOVERNMENT_RECORD'
  | 'THIRD_PARTY_VERIFIED';

/**
 * Official Google Business Profile source documentation citations.
 */
export interface GBPOfficialSourceRecord {
  sourceId: string;
  title: string;
  url: string;
  retrievedDate: string;
  effectiveOrUpdatedDate: string;
  sourceVersion: string;
  keyRuleSummary: string;
  governanceConstraint: string;
}

export const GBP_OFFICIAL_SOURCES: GBPOfficialSourceRecord[] = [
  {
    sourceId: 'google-guidelines-2911778',
    title: 'Guidelines for representing your business on Google',
    url: 'https://support.google.com/business/answer/2911778',
    retrievedDate: '2026-08-14',
    effectiveOrUpdatedDate: '2026-01-15',
    sourceVersion: 'v2026.1',
    keyRuleSummary: 'Business name must accurately reflect real-world name. Do not add marketing tags, slogans, phone numbers, or URLs to the business name.',
    governanceConstraint: 'CTA ("No job too big...") and location keywords must NEVER be embedded in the official company name field.'
  },
  {
    sourceId: 'google-categories-3038177',
    title: 'How to choose a business category',
    url: 'https://support.google.com/business/answer/3038177',
    retrievedDate: '2026-08-14',
    effectiveOrUpdatedDate: '2025-11-20',
    sourceVersion: 'v2025.4',
    keyRuleSummary: 'Primary category must be chosen from predefined Google categories (e.g. "Electrician"). Secondary categories should be specific.',
    governanceConstraint: 'Primary category can only be proposed by Relay; owner must explicitly select and approve from valid Google category list.'
  },
  {
    sourceId: 'google-service-area-3403100',
    title: 'Service-area businesses on Google',
    url: 'https://support.google.com/business/answer/3403100',
    retrievedDate: '2026-08-14',
    effectiveOrUpdatedDate: '2026-02-01',
    sourceVersion: 'v2026.2',
    keyRuleSummary: 'If you do not serve customers at your business address, do not enter an address under Info tab. Leave address field blank and specify service area.',
    governanceConstraint: 'Private residential/mailing address collected for verification must be hidden from public map display for Service Area Businesses.'
  },
  {
    sourceId: 'google-dev-prereqs',
    title: 'Prerequisites for Google Business Profile API',
    url: 'https://developers.google.com/my-business/content/prereqs',
    retrievedDate: '2026-08-14',
    effectiveOrUpdatedDate: '2025-10-10',
    sourceVersion: 'v4.9-api',
    keyRuleSummary: 'Requires verified Google Cloud Project, organization verification, OAuth 2.0 client credentials, and approved API quota access.',
    governanceConstraint: 'API access remains strictly BLOCKED until Google Project Approval, verified domain, and owner sign-in are complete.'
  },
  {
    sourceId: 'google-dev-oauth',
    title: 'Google Business Profile OAuth 2.0 Implementation Guidelines',
    url: 'https://developers.google.com/my-business/content/implement-oauth',
    retrievedDate: '2026-08-14',
    effectiveOrUpdatedDate: '2025-09-18',
    sourceVersion: 'v2.1-oauth',
    keyRuleSummary: 'OAuth consent screen must show accurate scopes. Tokens must be refreshed securely. User must explicitly grant access.',
    governanceConstraint: 'No live OAuth tokens may be acquired or stored without full encryption, key rotation, and explicit owner consent.'
  },
  {
    sourceId: 'google-dev-policies',
    title: 'Google Business Profile API Policies & Best Practices',
    url: 'https://developers.google.com/my-business/content/policies',
    retrievedDate: '2026-08-14',
    effectiveOrUpdatedDate: '2026-03-01',
    sourceVersion: 'v2026.3',
    keyRuleSummary: 'Third parties must not post content or respond to reviews without explicit customer authorization. Prohibition against deceptive practices.',
    governanceConstraint: 'Every post, reply, and profile edit requires unbundled, purpose-specific authorization and exact content approval.'
  }
];

/**
 * Independent Role Definitions for Governance & Authority.
 */
export type GBPRoleType =
  | 'legalBusinessOwner'
  | 'googleProfilePrimaryOwner'
  | 'googleProfileManager'
  | 'relayAdministrator'
  | 'authorizedProfileApprover'
  | 'authorizedPostApprover'
  | 'authorizedReviewResponseApprover'
  | 'communicationsApprover'
  | 'licensedWorkApprover';

export interface GBPRoleAttestation {
  attestationId: string;
  tenantId: string;
  personName: string;
  personIdentifier: string; // e.g. "Shad" or "Joshua"
  role: GBPRoleType;
  status: 'SELF_REPORTED_PENDING_EVIDENCE' | 'VERIFIED_DOCUMENTED' | 'REJECTED';
  evidenceClassification: EvidenceClassification;
  notes: string;
  attestedAt: string;
  verifiedAt: string | null;
  verifiedBy: string | null;
}

/**
 * Unbundled Google Business Permissions.
 */
export type UnbundledGBPPermission =
  | 'DISCOVER_EXISTING_PROFILE'
  | 'PREPARE_PROFILE_DRAFT'
  | 'CREATE_OR_CLAIM_PROFILE'
  | 'EDIT_BUSINESS_INFORMATION'
  | 'UPLOAD_MEDIA'
  | 'PUBLISH_POST'
  | 'RESPOND_TO_REVIEW'
  | 'INVITE_MANAGER'
  | 'VIEW_PERFORMANCE_DATA';

export const ALL_UNBUNDLED_PERMISSIONS: UnbundledGBPPermission[] = [
  'DISCOVER_EXISTING_PROFILE',
  'PREPARE_PROFILE_DRAFT',
  'CREATE_OR_CLAIM_PROFILE',
  'EDIT_BUSINESS_INFORMATION',
  'UPLOAD_MEDIA',
  'PUBLISH_POST',
  'RESPOND_TO_REVIEW',
  'INVITE_MANAGER',
  'VIEW_PERFORMANCE_DATA'
];

/**
 * Versioned Customer Authorization Grant Model.
 */
export interface GoogleBusinessAuthorizationGrant {
  authorizationId: string;
  tenantId: string;
  businessId: string;
  authorizedPersonId: string;
  assertedAuthorityRole: GBPRoleType;
  authorityEvidenceClassification: EvidenceClassification;
  permissionPurpose: string;
  allowedActions: UnbundledGBPPermission[];
  prohibitedActions: UnbundledGBPPermission[];
  consentMethod: 'WEB_FORM_CHECKBOX' | 'WRITTEN_CONTRACT' | 'VERBAL_RECORDED' | 'OWNER_PORTAL_SIGNATURE';
  consentDisclosureVersion: string;
  consentDisclosureTextHash: string; // SHA-256
  capturedAt: string;
  expiresAt: string;
  revokedAt: string | null;
  revocationStatus: boolean;
  googleAccountConnected: boolean;
  googleOAuthGrantId: string | null;
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REVOKED' | 'EXPIRED';
  approverId: string;
  approvalContentHash: string; // SHA-256
  sourceFormId: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * 16 Workflow States for the 12-Stage Onboarding Center.
 */
export type GBPWorkflowState =
  | 'NOT_STARTED'
  | 'OWNER_AUTHORIZATION_REQUIRED'
  | 'OWNER_AUTHORIZED'
  | 'BUSINESS_INFO_INCOMPLETE'
  | 'DUPLICATE_CHECK_REQUIRED'
  | 'POSSIBLE_DUPLICATE_FOUND'
  | 'PROFILE_DRAFT_READY'
  | 'OWNER_APPROVAL_REQUIRED'
  | 'OWNER_APPROVED'
  | 'MANUAL_GOOGLE_ACTION_REQUIRED'
  | 'GOOGLE_VERIFICATION_PENDING'
  | 'GOOGLE_VERIFICATION_REPORTED'
  | 'GOOGLE_VERIFICATION_EVIDENCE_REQUIRED'
  | 'API_ELIGIBILITY_WAITING'
  | 'API_ACCESS_BLOCKED'
  | 'AUTHORIZATION_REVOKED';

export interface GBPOnboardingStageRecord {
  stageNumber: number;
  stageKey: string;
  title: string;
  description: string;
  assignedActor: 'PRIMARY_OWNER' | 'RELAY_ADMINISTRATOR' | 'SYSTEM_VALIDATOR';
  isComplete: boolean;
  completedAt: string | null;
  completedBy: string | null;
  evidenceNotes: string;
  blockers: string[];
}

/**
 * Reis Electric Specific Preparation Packet.
 */
export interface ReisElectricOwnerPacket {
  packetId: string;
  tenantId: string;
  generatedAt: string;
  proposedPublicName: string;
  namePolicyCompliance: {
    isCompliant: boolean;
    ruleNotes: string;
    ctaExcludedFromName: boolean;
    locationKeywordsExcluded: boolean;
  };
  primaryCategory: {
    status: 'PROPOSED_PENDING_OWNER_SELECTION';
    proposedCategory: string;
    note: string;
  };
  businessTypeDecision: {
    status: 'PENDING_OWNER_CONFIRMATION';
    proposedType: 'service_area';
    rationale: string;
  };
  addressRule: {
    privateVerificationAddressCollected: boolean;
    addressHiddenFromPublicMap: boolean;
    streetAddressRedacted: string;
    rule: string;
  };
  serviceAreas: {
    status: 'BLANK_PENDING_OWNER_APPROVAL';
    proposedTowns: string[];
    note: string;
  };
  publicPhone: {
    status: 'BLOCKED_PENDING_VERIFICATION';
    value: string | null;
    note: string;
  };
  website: {
    status: 'BLOCKED_FROM_PUBLISHING_UNTIL_VERIFIED';
    intendedDomain: string;
    isPubliclyVerified: boolean;
    note: string;
  };
  email: {
    value: string;
    status: 'CONFIGURED';
  };
  callToAction: {
    text: string;
    placementRule: string;
  };
  services: {
    status: 'BLANK_PENDING_OWNER_APPROVAL';
    servicesList: string[];
    note: string;
  };
  businessHours: {
    status: 'BLANK_PENDING_OWNER_CONFIRMATION';
    hours: any[];
    note: string;
  };
  licensingAndInsurance: {
    status: 'BLOCKED_PENDING_OFFICIAL_EVIDENCE';
    claimsBlocked: boolean;
    note: string;
  };
  googleVerification: {
    responsibility: 'OWNER_ACTION_REQUIRED';
    ownerName: string;
    relayAssistanceScope: 'GUIDED_MANUAL_CHECKLIST_ONLY';
    note: string;
  };
  relayAdminAccess: {
    personName: string;
    proposedRole: 'googleProfileManager';
    authorizationStatus: 'PROPOSED_PENDING_SHAD_APPROVAL';
    note: string;
  };
}
