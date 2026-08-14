import crypto from 'crypto';
import { getDatabase } from '../db/database';
import {
  GoogleBusinessAuthorizationGrant,
  UnbundledGBPPermission,
  ALL_UNBUNDLED_PERMISSIONS,
  GBPRoleType,
  GBPRoleAttestation,
  GBPWorkflowState,
  GBPOnboardingStageRecord,
  ReisElectricOwnerPacket,
  GBP_OFFICIAL_SOURCES,
  GBPOfficialSourceRecord,
  EvidenceClassification
} from '../types/gbpGovernance';

export const INITIAL_12_STAGES: GBPOnboardingStageRecord[] = [
  {
    stageNumber: 1,
    stageKey: 'owner_authority_attestation',
    title: 'Owner Identity & Authority Attestation',
    description: 'Verify primary business owner identity, attest legal authority, and execute versioned customer authorization grant.',
    assignedActor: 'PRIMARY_OWNER',
    isComplete: false,
    completedAt: null,
    completedBy: null,
    evidenceNotes: 'Self-reported pending documented proof of legal entity ownership.',
    blockers: ['Awaiting owner sign-off on unbundled authorization grant.']
  },
  {
    stageNumber: 2,
    stageKey: 'business_info_intake',
    title: 'Business Information Intake',
    description: 'Capture core business details, primary category recommendation, description, and contact channels.',
    assignedActor: 'PRIMARY_OWNER',
    isComplete: false,
    completedAt: null,
    completedBy: null,
    evidenceNotes: 'Intake must separate proposed fields from verified fields.',
    blockers: []
  },
  {
    stageNumber: 3,
    stageKey: 'storefront_vs_service_area',
    title: 'Service-Area vs. Storefront Determination',
    description: 'Determine whether business serves customers at physical location or travels to customers in a service radius.',
    assignedActor: 'PRIMARY_OWNER',
    isComplete: false,
    completedAt: null,
    completedBy: null,
    evidenceNotes: 'Service-area businesses must not display physical street address on public Google Maps.',
    blockers: []
  },
  {
    stageNumber: 4,
    stageKey: 'private_address_segregation',
    title: 'Private Verification Address Segregation',
    description: 'Collect private verification address for Google postcard/verification while keeping it strictly redacted from public output.',
    assignedActor: 'PRIMARY_OWNER',
    isComplete: false,
    completedAt: null,
    completedBy: null,
    evidenceNotes: 'Address is isolated in private database fields and redacted in standard UI/logs.',
    blockers: []
  },
  {
    stageNumber: 5,
    stageKey: 'duplicate_profile_checklist',
    title: 'Guided Duplicate-Profile Search Checklist',
    description: 'Perform safe manual research across Google Maps, Google Search, and registries to prevent duplicate listings without automated scraping.',
    assignedActor: 'RELAY_ADMINISTRATOR',
    isComplete: false,
    completedAt: null,
    completedBy: null,
    evidenceNotes: 'Manual research conducted using official Google search guidelines.',
    blockers: []
  },
  {
    stageNumber: 6,
    stageKey: 'profile_draft_preview',
    title: 'Profile Draft Preview & Content Hashing',
    description: 'Generate structured profile plan with deterministic SHA-256 content hash for exact human verification.',
    assignedActor: 'RELAY_ADMINISTRATOR',
    isComplete: false,
    completedAt: null,
    completedBy: null,
    evidenceNotes: 'Plan generated in DRY_RUN mode. Never presented as published.',
    blockers: []
  },
  {
    stageNumber: 7,
    stageKey: 'exact_owner_approval',
    title: 'Exact Owner Approval Gate',
    description: 'Business owner reviews and explicitly approves the exact content hash of the proposed profile setup plan.',
    assignedActor: 'PRIMARY_OWNER',
    isComplete: false,
    completedAt: null,
    completedBy: null,
    evidenceNotes: 'Approval is bound to SHA-256 hash; any edit invalidates prior approval.',
    blockers: ['Requires owner approval before any Google account creation or claiming.']
  },
  {
    stageNumber: 8,
    stageKey: 'manual_google_handoff',
    title: 'Manual Google Creation or Claiming Handoff',
    description: 'Provide guided step-by-step instructions for the owner to create or claim the profile directly in their own Google account.',
    assignedActor: 'PRIMARY_OWNER',
    isComplete: false,
    completedAt: null,
    completedBy: null,
    evidenceNotes: 'Relay provides manual guidance only; owner logs into their own Google account.',
    blockers: []
  },
  {
    stageNumber: 9,
    stageKey: 'owner_google_verification',
    title: 'Owner-Completed Google Verification',
    description: 'Owner completes Google postcard, video, or phone verification directly in Google Business Profile console.',
    assignedActor: 'PRIMARY_OWNER',
    isComplete: false,
    completedAt: null,
    completedBy: null,
    evidenceNotes: 'Relay cannot perform or bypass Google verification.',
    blockers: ['Verification code or video must be submitted directly by owner to Google.']
  },
  {
    stageNumber: 10,
    stageKey: 'verification_evidence_review',
    title: 'Verification-Evidence Review',
    description: 'Review official verification confirmation status in Google console without relying solely on unchecked user checkboxes.',
    assignedActor: 'SYSTEM_VALIDATOR',
    isComplete: false,
    completedAt: null,
    completedBy: null,
    evidenceNotes: 'Requires documentary verification evidence before unlocking API consideration.',
    blockers: []
  },
  {
    stageNumber: 11,
    stageKey: 'api_eligibility_waiting_period',
    title: 'API Eligibility & Policy Waiting Period',
    description: 'Verify profile remains in good standing, public website is live and valid, and MA trade compliance requirements are satisfied.',
    assignedActor: 'SYSTEM_VALIDATOR',
    isComplete: false,
    completedAt: null,
    completedBy: null,
    evidenceNotes: 'Prevents premature API linking before profile stability.',
    blockers: ['Google API quota and project approval must be confirmed.']
  },
  {
    stageNumber: 12,
    stageKey: 'future_oauth_api_gate',
    title: 'Future OAuth & API Connection Gate',
    description: 'Strict security gate requiring encrypted token vault, OAuth consent screen approval, and separate owner grant before live API calls.',
    assignedActor: 'PRIMARY_OWNER',
    isComplete: false,
    completedAt: null,
    completedBy: null,
    evidenceNotes: 'Currently strictly BLOCKED under DRY_RUN policy.',
    blockers: ['Live Google OAuth and API execution currently BLOCKED in DRY_RUN mode.']
  }
];

export class GBPGovernanceService {
  /**
   * Computes SHA-256 hash of any string or JSON payload.
   */
  public computeSha256(data: any): string {
    const raw = typeof data === 'string' ? data : JSON.stringify(data);
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  /**
   * Redacts private street address for logs and non-privileged displays.
   */
  public redactAddress(streetAddress?: string | null): string {
    if (!streetAddress || streetAddress.trim() === '') return '[NO_ADDRESS_PROVIDED]';
    return '[REDACTED_PRIVATE_VERIFICATION_ADDRESS]';
  }

  /**
   * Redacts full profile for logs and public outputs.
   */
  public redactProfileForLogs(profile: any): any {
    if (!profile) return profile;
    const cloned = JSON.parse(JSON.stringify(profile));
    if (cloned.privateStreetAddress) {
      cloned.privateStreetAddress = '[REDACTED_PRIVATE_ADDRESS]';
    }
    if (cloned.privateUnit) {
      cloned.privateUnit = '[REDACTED]';
    }
    return cloned;
  }

  /**
   * Returns official Google source citations.
   */
  public getOfficialSources(): GBPOfficialSourceRecord[] {
    return GBP_OFFICIAL_SOURCES;
  }

  // ---------------------------------------------------------------------------
  // 1. Authorization Grant Management (Part 4)
  // ---------------------------------------------------------------------------

  public createAuthorizationGrant(params: {
    tenantId: string;
    businessId: string;
    authorizedPersonId: string;
    assertedAuthorityRole: GBPRoleType;
    authorityEvidenceClassification?: EvidenceClassification;
    permissionPurpose: string;
    allowedActions: UnbundledGBPPermission[];
    prohibitedActions?: UnbundledGBPPermission[];
    consentMethod?: 'WEB_FORM_CHECKBOX' | 'WRITTEN_CONTRACT' | 'VERBAL_RECORDED' | 'OWNER_PORTAL_SIGNATURE';
    consentDisclosureVersion?: string;
    consentDisclosureText: string;
    durationDays?: number;
    approverId: string;
    sourceFormId?: string;
  }): GoogleBusinessAuthorizationGrant {
    const db = getDatabase();
    const authorizationId = `gbp-auth-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (params.durationDays || 90) * 86400000).toISOString();
    const capturedAt = now.toISOString();

    const consentDisclosureVersion = params.consentDisclosureVersion || 'v1.0-2026';
    const consentDisclosureTextHash = this.computeSha256(params.consentDisclosureText);

    // Compute approval hash covering granted actions, role, and business ID
    const approvalPayload = {
      tenantId: params.tenantId,
      businessId: params.businessId,
      authorizedPersonId: params.authorizedPersonId,
      assertedAuthorityRole: params.assertedAuthorityRole,
      allowedActions: params.allowedActions,
      prohibitedActions: params.prohibitedActions || [],
      consentDisclosureTextHash,
      capturedAt,
      expiresAt
    };
    const approvalContentHash = this.computeSha256(approvalPayload);

    const grant: GoogleBusinessAuthorizationGrant = {
      authorizationId,
      tenantId: params.tenantId,
      businessId: params.businessId,
      authorizedPersonId: params.authorizedPersonId,
      assertedAuthorityRole: params.assertedAuthorityRole,
      authorityEvidenceClassification: params.authorityEvidenceClassification || 'SELF_REPORTED_PENDING_EVIDENCE',
      permissionPurpose: params.permissionPurpose,
      allowedActions: params.allowedActions,
      prohibitedActions: params.prohibitedActions || [],
      consentMethod: params.consentMethod || 'OWNER_PORTAL_SIGNATURE',
      consentDisclosureVersion,
      consentDisclosureTextHash,
      capturedAt,
      expiresAt,
      revokedAt: null,
      revocationStatus: false,
      googleAccountConnected: false,
      googleOAuthGrantId: null,
      approvalStatus: 'APPROVED',
      approverId: params.approverId,
      approvalContentHash,
      sourceFormId: params.sourceFormId || 'onboarding_v1',
      createdAt: capturedAt,
      updatedAt: capturedAt
    };

    db.prepare(`
      INSERT INTO gbp_authorization_grants (
        authorization_id, tenant_id, business_id, authorized_person_id,
        asserted_authority_role, authority_evidence_classification, permission_purpose,
        allowed_actions_json, prohibited_actions_json, consent_method,
        consent_disclosure_version, consent_disclosure_text_hash, captured_at,
        expires_at, revoked_at, revocation_status, google_account_connected,
        google_oauth_grant_id, approval_status, approver_id, approval_content_hash,
        source_form_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      grant.authorizationId,
      grant.tenantId,
      grant.businessId,
      grant.authorizedPersonId,
      grant.assertedAuthorityRole,
      grant.authorityEvidenceClassification,
      grant.permissionPurpose,
      JSON.stringify(grant.allowedActions),
      JSON.stringify(grant.prohibitedActions),
      grant.consentMethod,
      grant.consentDisclosureVersion,
      grant.consentDisclosureTextHash,
      grant.capturedAt,
      grant.expiresAt,
      grant.revokedAt,
      grant.revocationStatus ? 1 : 0,
      grant.googleAccountConnected ? 1 : 0,
      grant.googleOAuthGrantId,
      grant.approvalStatus,
      grant.approverId,
      grant.approvalContentHash,
      grant.sourceFormId,
      grant.createdAt,
      grant.updatedAt
    );

    // Also update onboarding workflow if present
    this.updateWorkflowState(params.tenantId, params.businessId, 'OWNER_AUTHORIZED', 'Customer authorization grant executed');

    return grant;
  }

  public getAuthorizationGrant(tenantId: string, authorizationId: string): GoogleBusinessAuthorizationGrant | null {
    const db = getDatabase();
    const row = db.prepare(`
      SELECT * FROM gbp_authorization_grants WHERE tenant_id = ? AND authorization_id = ?
    `).get(tenantId, authorizationId) as any;

    if (!row) return null;
    return this.mapGrantRow(row);
  }

  public getLatestGrantForTenant(tenantId: string): GoogleBusinessAuthorizationGrant | null {
    const db = getDatabase();
    const row = db.prepare(`
      SELECT * FROM gbp_authorization_grants WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 1
    `).get(tenantId) as any;

    if (!row) return null;
    return this.mapGrantRow(row);
  }

  public revokeAuthorizationGrant(
    tenantId: string,
    authorizationId: string,
    revokedBy: string,
    reason: string
  ): { success: boolean; revokedAt: string; grant: GoogleBusinessAuthorizationGrant } {
    const db = getDatabase();
    const now = new Date().toISOString();

    const existing = this.getAuthorizationGrant(tenantId, authorizationId);
    if (!existing) {
      throw new Error(`Authorization grant ${authorizationId} not found for tenant ${tenantId}`);
    }

    db.prepare(`
      UPDATE gbp_authorization_grants
      SET revoked_at = ?, revocation_status = 1, approval_status = 'REVOKED', updated_at = ?
      WHERE tenant_id = ? AND authorization_id = ?
    `).run(now, now, tenantId, authorizationId);

    // Update workflow state to AUTHORIZATION_REVOKED
    this.updateWorkflowState(tenantId, existing.businessId, 'AUTHORIZATION_REVOKED', `Grant revoked by ${revokedBy}: ${reason}`);

    const updated = this.getAuthorizationGrant(tenantId, authorizationId)!;
    return { success: true, revokedAt: now, grant: updated };
  }

  public checkActionPermission(tenantId: string, action: UnbundledGBPPermission): {
    permitted: boolean;
    reason: string;
    grantId?: string;
  } {
    const grant = this.getLatestGrantForTenant(tenantId);
    if (!grant) {
      return { permitted: false, reason: 'NO_AUTHORIZATION_GRANT: No active customer authorization grant exists.' };
    }

    if (grant.revocationStatus || grant.revokedAt) {
      return { permitted: false, reason: 'GRANT_REVOKED: Customer authorization grant has been explicitly revoked.' };
    }

    const now = new Date();
    if (new Date(grant.expiresAt) <= now) {
      return { permitted: false, reason: 'GRANT_EXPIRED: Customer authorization grant has expired.' };
    }

    if (grant.approvalStatus !== 'APPROVED') {
      return { permitted: false, reason: `GRANT_NOT_APPROVED: Authorization status is ${grant.approvalStatus}.` };
    }

    if (grant.prohibitedActions && grant.prohibitedActions.includes(action)) {
      return { permitted: false, reason: `ACTION_EXPLICITLY_PROHIBITED: Action ${action} is in the prohibited actions list.` };
    }

    if (!grant.allowedActions || !grant.allowedActions.includes(action)) {
      return {
        permitted: false,
        reason: `UNAUTHORIZED_ACTION: Action ${action} is not granted. Unbundled permissions require separate explicit consent.`
      };
    }

    return { permitted: true, reason: `Action ${action} is authorized by grant ${grant.authorizationId}`, grantId: grant.authorizationId };
  }

  public assertActionPermitted(tenantId: string, action: UnbundledGBPPermission): void {
    const check = this.checkActionPermission(tenantId, action);
    if (!check.permitted) {
      throw new Error(`UNAUTHORIZED_GBP_ACTION: ${check.reason}`);
    }
  }

  private mapGrantRow(row: any): GoogleBusinessAuthorizationGrant {
    return {
      authorizationId: row.authorization_id,
      tenantId: row.tenant_id,
      businessId: row.business_id,
      authorizedPersonId: row.authorized_person_id,
      assertedAuthorityRole: row.asserted_authority_role,
      authorityEvidenceClassification: row.authority_evidence_classification,
      permissionPurpose: row.permission_purpose,
      allowedActions: JSON.parse(row.allowed_actions_json || '[]'),
      prohibitedActions: JSON.parse(row.prohibited_actions_json || '[]'),
      consentMethod: row.consent_method,
      consentDisclosureVersion: row.consent_disclosure_version,
      consentDisclosureTextHash: row.consent_disclosure_text_hash,
      capturedAt: row.captured_at,
      expiresAt: row.expires_at,
      revokedAt: row.revoked_at,
      revocationStatus: row.revocation_status === 1,
      googleAccountConnected: row.google_account_connected === 1,
      googleOAuthGrantId: row.google_oauth_grant_id,
      approvalStatus: row.approval_status,
      approverId: row.approver_id,
      approvalContentHash: row.approval_content_hash,
      sourceFormId: row.source_form_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  // ---------------------------------------------------------------------------
  // 2. Role Separation & Attestation (Part 3)
  // ---------------------------------------------------------------------------

  public attestRole(params: {
    tenantId: string;
    personName: string;
    personIdentifier: string;
    role: GBPRoleType;
    status?: 'SELF_REPORTED_PENDING_EVIDENCE' | 'VERIFIED_DOCUMENTED' | 'REJECTED';
    evidenceClassification?: EvidenceClassification;
    notes: string;
  }): GBPRoleAttestation {
    const db = getDatabase();
    const attestationId = `gbp-role-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const attestation: GBPRoleAttestation = {
      attestationId,
      tenantId: params.tenantId,
      personName: params.personName,
      personIdentifier: params.personIdentifier,
      role: params.role,
      status: params.status || 'SELF_REPORTED_PENDING_EVIDENCE',
      evidenceClassification: params.evidenceClassification || 'SELF_REPORTED_PENDING_EVIDENCE',
      notes: params.notes,
      attestedAt: now,
      verifiedAt: null,
      verifiedBy: null
    };

    db.prepare(`
      INSERT INTO gbp_role_attestations (
        attestation_id, tenant_id, person_name, person_identifier, role,
        status, evidence_classification, notes, attested_at, verified_at, verified_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      attestation.attestationId,
      attestation.tenantId,
      attestation.personName,
      attestation.personIdentifier,
      attestation.role,
      attestation.status,
      attestation.evidenceClassification,
      attestation.notes,
      attestation.attestedAt,
      attestation.verifiedAt,
      attestation.verifiedBy
    );

    return attestation;
  }

  public getRoleAttestations(tenantId: string): GBPRoleAttestation[] {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT * FROM gbp_role_attestations WHERE tenant_id = ? ORDER BY attested_at ASC
    `).all(tenantId) as any[];

    return rows.map((r) => ({
      attestationId: r.attestation_id,
      tenantId: r.tenant_id,
      personName: r.person_name,
      personIdentifier: r.person_identifier,
      role: r.role as GBPRoleType,
      status: r.status,
      evidenceClassification: r.evidence_classification,
      notes: r.notes,
      attestedAt: r.attested_at,
      verifiedAt: r.verified_at,
      verifiedBy: r.verified_by
    }));
  }

  /**
   * Initializes default pilot role attestations for Shadrick M. Reis Electric if not already present.
   */
  public ensurePilotRoleAttestations(tenantId: string): GBPRoleAttestation[] {
    const existing = this.getRoleAttestations(tenantId);
    if (existing.length > 0) return existing;

    // Shad: Field partner, self-reported legal owner & intended primary Google owner
    this.attestRole({
      tenantId,
      personName: 'Shad',
      personIdentifier: 'shad_reis_field_partner',
      role: 'legalBusinessOwner',
      status: 'SELF_REPORTED_PENDING_EVIDENCE',
      evidenceClassification: 'SELF_REPORTED_PENDING_EVIDENCE',
      notes: 'Field partner & owner. Asserted legal authority. Awaiting Massachusetts business certificate / LLC filing evidence.'
    });

    this.attestRole({
      tenantId,
      personName: 'Shad',
      personIdentifier: 'shad_reis_field_partner',
      role: 'googleProfilePrimaryOwner',
      status: 'SELF_REPORTED_PENDING_EVIDENCE',
      evidenceClassification: 'SELF_REPORTED_PENDING_EVIDENCE',
      notes: 'Designated primary owner for Google Business Profile console. Verification must be executed directly by Shad.'
    });

    this.attestRole({
      tenantId,
      personName: 'Shad',
      personIdentifier: 'shad_reis_field_partner',
      role: 'authorizedProfileApprover',
      status: 'SELF_REPORTED_PENDING_EVIDENCE',
      evidenceClassification: 'SELF_REPORTED_PENDING_EVIDENCE',
      notes: 'Final approval gate for business description, service areas, and profile edits.'
    });

    // Joshua: Self-reported silent partner & Relay administrator
    this.attestRole({
      tenantId,
      personName: 'Joshua',
      personIdentifier: 'joshua_relay_admin',
      role: 'relayAdministrator',
      status: 'SELF_REPORTED_PENDING_EVIDENCE',
      evidenceClassification: 'SELF_REPORTED_PENDING_EVIDENCE',
      notes: 'Self-reported silent partner & Relay technical administrator. Limited to guided-manual preparation and drafting.'
    });

    this.attestRole({
      tenantId,
      personName: 'Joshua',
      personIdentifier: 'joshua_relay_admin',
      role: 'googleProfileManager',
      status: 'SELF_REPORTED_PENDING_EVIDENCE',
      evidenceClassification: 'SELF_REPORTED_PENDING_EVIDENCE',
      notes: 'Proposed Google Profile Manager access. Requires explicit owner invitation from Shad.'
    });

    return this.getRoleAttestations(tenantId);
  }

  // ---------------------------------------------------------------------------
  // 3. 12-Stage Onboarding State Machine (Part 5)
  // ---------------------------------------------------------------------------

  public getOrCreateWorkflow(tenantId: string, businessId: string): {
    id: string;
    tenantId: string;
    businessId: string;
    currentState: GBPWorkflowState;
    currentStageNumber: number;
    stages: GBPOnboardingStageRecord[];
    ownerPacket: ReisElectricOwnerPacket;
    duplicateChecklist: any;
    updatedAt: string;
  } {
    const db = getDatabase();
    const row = db.prepare(`
      SELECT * FROM gbp_onboarding_workflows WHERE tenant_id = ? AND business_id = ?
    `).get(tenantId, businessId) as any;

    if (row) {
      return {
        id: row.id,
        tenantId: row.tenant_id,
        businessId: row.business_id,
        currentState: row.current_state as GBPWorkflowState,
        currentStageNumber: row.current_stage_number,
        stages: JSON.parse(row.stages_json || '[]'),
        ownerPacket: JSON.parse(row.owner_packet_json || '{}'),
        duplicateChecklist: JSON.parse(row.duplicate_checklist_json || '{}'),
        updatedAt: row.updated_at
      };
    }

    const workflowId = `gbp-wf-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const packet = this.generateReisElectricOwnerPacket(tenantId);
    const stages = INITIAL_12_STAGES;
    const duplicateChecklist = this.getInitialDuplicateChecklist();

    db.prepare(`
      INSERT INTO gbp_onboarding_workflows (
        id, tenant_id, business_id, current_state, current_stage_number,
        stages_json, owner_packet_json, duplicate_checklist_json, last_transition_reason,
        created_at, updated_at
      ) VALUES (?, ?, ?, 'OWNER_AUTHORIZATION_REQUIRED', 1, ?, ?, ?, 'Workflow initialized', ?, ?)
    `).run(
      workflowId,
      tenantId,
      businessId,
      JSON.stringify(stages),
      JSON.stringify(packet),
      JSON.stringify(duplicateChecklist),
      now,
      now
    );

    return {
      id: workflowId,
      tenantId,
      businessId,
      currentState: 'OWNER_AUTHORIZATION_REQUIRED',
      currentStageNumber: 1,
      stages,
      ownerPacket: packet,
      duplicateChecklist,
      updatedAt: now
    };
  }

  public updateWorkflowState(
    tenantId: string,
    businessId: string,
    newState: GBPWorkflowState,
    reason: string
  ): void {
    const db = getDatabase();
    const now = new Date().toISOString();

    const existing = this.getOrCreateWorkflow(tenantId, businessId);
    let stageNum = existing.currentStageNumber;

    // Stage progression heuristic based on state
    if (newState === 'OWNER_AUTHORIZED' && stageNum < 2) stageNum = 2;
    if (newState === 'DUPLICATE_CHECK_REQUIRED' && stageNum < 5) stageNum = 5;
    if (newState === 'PROFILE_DRAFT_READY' && stageNum < 6) stageNum = 6;
    if (newState === 'OWNER_APPROVAL_REQUIRED' && stageNum < 7) stageNum = 7;
    if (newState === 'OWNER_APPROVED' && stageNum < 8) stageNum = 8;
    if (newState === 'MANUAL_GOOGLE_ACTION_REQUIRED' && stageNum < 8) stageNum = 8;
    if (newState === 'GOOGLE_VERIFICATION_PENDING' && stageNum < 9) stageNum = 9;
    if (newState === 'GOOGLE_VERIFICATION_REPORTED' && stageNum < 10) stageNum = 10;
    if (newState === 'API_ELIGIBILITY_WAITING' && stageNum < 11) stageNum = 11;
    if (newState === 'API_ACCESS_BLOCKED') stageNum = 12;

    // Mark stages as completed
    const updatedStages = existing.stages.map((st) => {
      if (st.stageNumber < stageNum) {
        return { ...st, isComplete: true, completedAt: st.completedAt || now, blockers: [] };
      }
      return st;
    });

    db.prepare(`
      UPDATE gbp_onboarding_workflows
      SET current_state = ?, current_stage_number = ?, stages_json = ?, last_transition_reason = ?, updated_at = ?
      WHERE tenant_id = ? AND business_id = ?
    `).run(
      newState,
      stageNum,
      JSON.stringify(updatedStages),
      reason,
      now,
      tenantId,
      businessId
    );
  }

  public getInitialDuplicateChecklist(): any {
    return {
      checklistItems: [
        {
          id: 'check-legal-name',
          instruction: 'Search Google Maps for exact legal name: "Shadrick M. Reis Electric".',
          status: 'PENDING_MANUAL_CHECK',
          finding: 'No exact match found on Google Maps.',
          officialSourceRule: 'Google represents single physical entity per location.'
        },
        {
          id: 'check-phone-number',
          instruction: 'Search Google for phone number variations to ensure no old business listing exists.',
          status: 'PENDING_MANUAL_CHECK',
          finding: 'Public phone is not yet verified or assigned.',
          officialSourceRule: 'Duplicate phone numbers trigger duplicate listing flags.'
        },
        {
          id: 'check-personal-gmail',
          instruction: 'Check smrelec@gmail.com and personal Gmail accounts for existing unclaimed or dormant business profiles.',
          status: 'PENDING_MANUAL_CHECK',
          finding: 'Awaiting Shad review of personal Google account dashboard.',
          officialSourceRule: 'Claim existing profile if found rather than creating duplicate.'
        },
        {
          id: 'check-address-pin',
          instruction: 'Search private residential address on Google Maps to verify no other business pin is located at that residence.',
          status: 'PENDING_MANUAL_CHECK',
          finding: 'Address is marked Service-Area, so no public pin should exist.',
          officialSourceRule: 'Residential addresses must use Service Area model without public pin.'
        }
      ],
      automatedScrapingPerformed: false,
      mode: 'GUIDED_MANUAL_CHECKLIST'
    };
  }

  // ---------------------------------------------------------------------------
  // 4. Reis Electric Specific Owner Preparation Packet (Part 6)
  // ---------------------------------------------------------------------------

  public generateReisElectricOwnerPacket(tenantId: string): ReisElectricOwnerPacket {
    const now = new Date().toISOString();
    return {
      packetId: `packet-reis-${Date.now()}`,
      tenantId,
      generatedAt: now,
      proposedPublicName: 'Shadrick M. Reis Electric',
      namePolicyCompliance: {
        isCompliant: true,
        ruleNotes: 'Name matches exact business entity name. Complies with Google Policy 2911778.',
        ctaExcludedFromName: true,
        locationKeywordsExcluded: true
      },
      primaryCategory: {
        status: 'PROPOSED_PENDING_OWNER_SELECTION',
        proposedCategory: 'Electrician',
        note: 'Proposed category only. Owner must select from Google\'s available categories during guided intake.'
      },
      businessTypeDecision: {
        status: 'PENDING_OWNER_CONFIRMATION',
        proposedType: 'service_area',
        rationale: 'Service-area business recommended to protect residential address privacy and match trade model.'
      },
      addressRule: {
        privateVerificationAddressCollected: true,
        addressHiddenFromPublicMap: true,
        streetAddressRedacted: '[REDACTED_PRIVATE_VERIFICATION_ADDRESS]',
        rule: 'Physical address collected solely for Google verification; strictly hidden from public map display.'
      },
      serviceAreas: {
        status: 'BLANK_PENDING_OWNER_APPROVAL',
        proposedTowns: [],
        note: 'Service areas remain blank until Shad reviews and approves the list of Massachusetts towns served.'
      },
      publicPhone: {
        status: 'BLOCKED_PENDING_VERIFICATION',
        value: null,
        note: 'Public phone is not verified. Relay will not invent a phone number.'
      },
      website: {
        status: 'BLOCKED_FROM_PUBLISHING_UNTIL_VERIFIED',
        intendedDomain: 'smrelec.org',
        isPubliclyVerified: false,
        note: 'smrelec.org intended domain is recorded, but publishing is blocked until site is ready and publicly verified.'
      },
      email: {
        value: 'smrelec@gmail.com',
        status: 'CONFIGURED'
      },
      callToAction: {
        text: 'No job too big. No job too small. Give us a call.',
        placementRule: 'Permitted in profile description and posts; strictly PROHIBITED in official business name field.'
      },
      services: {
        status: 'BLANK_PENDING_OWNER_APPROVAL',
        servicesList: [],
        note: 'Specific electrical services list remains blank until Shad reviews and approves.'
      },
      businessHours: {
        status: 'BLANK_PENDING_OWNER_CONFIRMATION',
        hours: [],
        note: 'Operating hours remain blank until Shad confirms availability.'
      },
      licensingAndInsurance: {
        status: 'BLOCKED_PENDING_OFFICIAL_EVIDENCE',
        claimsBlocked: true,
        note: 'Massachusetts licensing (Board 237 CMR) and insurance claims blocked from profile until official ePlace documentation is recorded.'
      },
      googleVerification: {
        responsibility: 'OWNER_ACTION_REQUIRED',
        ownerName: 'Shad',
        relayAssistanceScope: 'GUIDED_MANUAL_CHECKLIST_ONLY',
        note: 'Google verification must be completed directly by Shad. Relay cannot perform or bypass verification.'
      },
      relayAdminAccess: {
        personName: 'Joshua',
        proposedRole: 'googleProfileManager',
        authorizationStatus: 'PROPOSED_PENDING_SHAD_APPROVAL',
        note: 'Joshua proposed as Manager only. Requires explicit Google invitation from Shad after Shad creates primary owner account.'
      }
    };
  }
}
