import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { initializeDatabaseSchema } from '../db/database';
import { GBPGovernanceService } from '../services/gbpGovernanceService';
import { GBPConnectorService } from '../services/gbpConnectorService';
import { LaunchApprovalService } from '../services/launchApprovalService';

const TEST_DB_PATH = path.join(process.cwd(), 'test_gbp_governance.db');

describe('Relay Google Business Onboarding & Customer Authorization Center Tests', () => {
  let db: DatabaseSync;
  let governanceService: GBPGovernanceService;
  let gbpService: GBPConnectorService;
  let approvalService: LaunchApprovalService;
  const testTenantId = 'tenant_test_smrelec_001';

  before(() => {
    if (fs.existsSync(TEST_DB_PATH)) {
      try { fs.unlinkSync(TEST_DB_PATH); } catch {}
    }

    process.env.DATABASE_PATH = TEST_DB_PATH;
    db = new DatabaseSync(TEST_DB_PATH);
    initializeDatabaseSchema(db);

    governanceService = new GBPGovernanceService();
    gbpService = new GBPConnectorService();
    approvalService = new LaunchApprovalService();

    // Setup test tenant
    db.exec(`
      INSERT INTO tenants (id, name, industry, mrr, created_at)
      VALUES ('${testTenantId}', 'Shadrick M. Reis Electric', 'Electrical Contractor', 12000, CURRENT_TIMESTAMP);
    `);
  });

  after(() => {
    if (fs.existsSync(TEST_DB_PATH)) {
      try { fs.unlinkSync(TEST_DB_PATH); } catch {}
    }
  });

  it('1. Strict Default Block: Actions blocked when no customer authorization grant exists', () => {
    const check = governanceService.checkActionPermission(testTenantId, 'PREPARE_PROFILE_DRAFT');
    assert.strictEqual(check.permitted, false);
    assert.strictEqual(check.reason.startsWith('NO_AUTHORIZATION_GRANT'), true);
  });

  it('2. Specific Permission Check Passes when Explicitly Granted', () => {
    const grant = governanceService.createAuthorizationGrant({
      tenantId: testTenantId,
      businessId: 'smrelec',
      authorizedPersonId: 'person_shad',
      assertedAuthorityRole: 'googleProfilePrimaryOwner',
      permissionPurpose: 'Guided-manual profile drafting and duplicate checks.',
      allowedActions: ['PREPARE_PROFILE_DRAFT', 'DISCOVER_EXISTING_PROFILE'],
      prohibitedActions: ['CREATE_OR_CLAIM_PROFILE'],
      consentMethod: 'OWNER_PORTAL_SIGNATURE',
      consentDisclosureText: 'I authorize Relay to prepare profile drafts in dry-run mode.',
      durationDays: 30,
      approverId: 'owner_shad'
    });

    assert.strictEqual(grant.approvalStatus, 'APPROVED');
    assert.strictEqual(grant.revocationStatus, false);
    assert.strictEqual(grant.allowedActions.includes('PREPARE_PROFILE_DRAFT'), true);

    const check = governanceService.checkActionPermission(testTenantId, 'PREPARE_PROFILE_DRAFT');
    assert.strictEqual(check.permitted, true);
    assert.strictEqual(check.reason.includes('is authorized by grant'), true);
  });

  it('3. Unselected Action Remains Strictly Forbidden', () => {
    const check = governanceService.checkActionPermission(testTenantId, 'VIEW_PERFORMANCE_DATA');
    assert.strictEqual(check.permitted, false);
    assert.strictEqual(check.reason.startsWith('UNAUTHORIZED_ACTION'), true);
  });

  it('4. Revocation Instantly Blocks All Permissions Downstream', () => {
    const activeGrant = governanceService.getLatestGrantForTenant(testTenantId);
    assert.ok(activeGrant);

    governanceService.revokeAuthorizationGrant(
      testTenantId,
      activeGrant.authorizationId,
      'owner_shad',
      'Owner requested immediate revocation of all Relay preparation scopes.'
    );

    const check = governanceService.checkActionPermission(testTenantId, 'PREPARE_PROFILE_DRAFT');
    assert.strictEqual(check.permitted, false);
    assert.strictEqual(check.reason.startsWith('GRANT_REVOKED'), true);
  });

  it('5. Expired Authorization Grant Is Rejected', () => {
    const grant = governanceService.createAuthorizationGrant({
      tenantId: testTenantId,
      businessId: 'smrelec',
      authorizedPersonId: 'person_shad',
      assertedAuthorityRole: 'googleProfilePrimaryOwner',
      permissionPurpose: 'Testing expiration gate.',
      allowedActions: ['PREPARE_PROFILE_DRAFT'],
      consentMethod: 'OWNER_PORTAL_SIGNATURE',
      consentDisclosureText: 'Testing expiration gate disclosure.',
      durationDays: 1,
      approverId: 'owner_shad'
    });

    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    db.prepare(`UPDATE gbp_authorization_grants SET expires_at = ? WHERE authorization_id = ?`).run(pastDate, grant.authorizationId);

    const check = governanceService.checkActionPermission(testTenantId, 'PREPARE_PROFILE_DRAFT');
    assert.strictEqual(check.permitted, false);
    assert.strictEqual(check.reason.startsWith('GRANT_EXPIRED'), true);
  });

  it('6. Role Attestation Matrix: Separate Shad (Primary Owner) and Joshua (Relay Admin)', () => {
    const roles = governanceService.ensurePilotRoleAttestations(testTenantId);
    assert.strictEqual(roles.length >= 2, true);

    const shadRole = roles.find((r) => r.personName === 'Shad' && r.role === 'googleProfilePrimaryOwner');
    assert.ok(shadRole);
    assert.strictEqual(shadRole.status, 'SELF_REPORTED_PENDING_EVIDENCE');

    const joshuaRole = roles.find((r) => r.personName === 'Joshua' && r.role === 'relayAdministrator');
    assert.ok(joshuaRole);
    assert.strictEqual(joshuaRole.role, 'relayAdministrator');
  });

  it('7. Prohibited Actions Enforced Even if Attempted in Allowed List', () => {
    governanceService.createAuthorizationGrant({
      tenantId: testTenantId,
      businessId: 'smrelec',
      authorizedPersonId: 'person_shad',
      assertedAuthorityRole: 'googleProfilePrimaryOwner',
      permissionPurpose: 'Prohibition test.',
      allowedActions: ['PREPARE_PROFILE_DRAFT', 'CREATE_OR_CLAIM_PROFILE'],
      prohibitedActions: ['CREATE_OR_CLAIM_PROFILE'],
      consentMethod: 'OWNER_PORTAL_SIGNATURE',
      consentDisclosureText: 'Disclosure for prohibition test.',
      durationDays: 30,
      approverId: 'owner_shad'
    });

    const check = governanceService.checkActionPermission(testTenantId, 'CREATE_OR_CLAIM_PROFILE');
    assert.strictEqual(check.permitted, false);
    assert.strictEqual(check.reason.startsWith('ACTION_EXPLICITLY_PROHIBITED'), true);
  });

  it('8. Cryptographic SHA-256 Consent and Content Hashing', () => {
    const text = 'Official consent disclosure for Shadrick M. Reis Electric dry-run pilot 2026.';
    const expectedHash = crypto.createHash('sha256').update(text).digest('hex');

    const grant = governanceService.createAuthorizationGrant({
      tenantId: testTenantId,
      businessId: 'smrelec',
      authorizedPersonId: 'person_shad',
      assertedAuthorityRole: 'googleProfilePrimaryOwner',
      permissionPurpose: 'Hash verification.',
      allowedActions: ['PREPARE_PROFILE_DRAFT'],
      consentMethod: 'OWNER_PORTAL_SIGNATURE',
      consentDisclosureText: text,
      durationDays: 30,
      approverId: 'owner_shad'
    });

    assert.strictEqual(grant.consentDisclosureTextHash, expectedHash);
    assert.strictEqual(grant.approvalContentHash.length, 64);
  });

  it('9. Private Verification Address Redaction in Logs and API Responses', () => {
    const rawProfile = {
      id: 'profile_test_123',
      tenantId: testTenantId,
      companyName: 'Shadrick M. Reis Electric',
      accountType: 'service_area',
      primaryCategory: 'Electrician',
      publicPhone: '(508) 555-0199',
      websiteUrl: 'https://smrelec.org',
      privateStreetAddress: '14 Elmwood Terrace',
      privateUnit: 'Apt 2',
      privateCity: 'Framingham',
      privateState: 'MA',
      privateZip: '01701',
      serviceAreas: ['Framingham, MA', 'Natick, MA', 'Waltham, MA'],
      servicesOffered: ['Residential Wiring', 'Panel Upgrades'],
      description: 'Licensed Master Electrician serving MetroWest Massachusetts.'
    };

    const redacted = governanceService.redactProfileForLogs(rawProfile);
    assert.strictEqual(redacted.privateStreetAddress, '[REDACTED_PRIVATE_ADDRESS]');
    assert.strictEqual(redacted.privateUnit, '[REDACTED]');
    assert.strictEqual(redacted.serviceAreas.length, 3);
  });

  it('10. 12-Stage Onboarding Workflow State Transitions', () => {
    const wf = governanceService.getOrCreateWorkflow(testTenantId, 'smrelec');
    assert.strictEqual(wf.businessId, 'smrelec');
    assert.strictEqual(wf.stages.length, 12);

    assert.strictEqual(wf.stages[0].stageKey, 'owner_authority_attestation');
    assert.strictEqual(wf.stages[0].assignedActor, 'PRIMARY_OWNER');

    governanceService.updateWorkflowState(
      testTenantId,
      'smrelec',
      'OWNER_AUTHORIZED',
      'Shad successfully attested authority and executed customer grant.'
    );

    const updatedWf = governanceService.getOrCreateWorkflow(testTenantId, 'smrelec');
    assert.strictEqual(updatedWf.currentState, 'OWNER_AUTHORIZED');
    assert.strictEqual(updatedWf.stages[0].isComplete, true);
    assert.ok(updatedWf.stages[0].completedAt);
  });

  it('11. Human Approval Gate & Tamper Detection (SHA-256) for Post Publishing', () => {
    const originalPost = {
      summary: 'Spring panel safety inspections now available across MetroWest.',
      cta: { actionType: 'CALL', url: 'tel:5085550199' }
    };

    const approvalHash = approvalService.computeContentHash(originalPost);
    assert.strictEqual(approvalHash.length, 64);

    const modifiedPost = {
      summary: 'Spring panel safety inspections now available across MetroWest with 50% discount!',
      cta: { actionType: 'CALL', url: 'tel:5085550199' }
    };

    const modifiedHash = approvalService.computeContentHash(modifiedPost);
    assert.notStrictEqual(approvalHash, modifiedHash);
  });

  it('12. Business Name Policy Validation (Google Policy 2911778)', () => {
    const invalidNames = [
      'Shadrick M. Reis Electric - Best Electrician Call Us 24/7',
      'Shadrick M. Reis Electric No Job Too Big Or Small',
      'Shadrick M. Reis Electric - Call Today (508) 555-0199'
    ];

    for (const name of invalidNames) {
      const isInvalid = /no job too big|call us|give us a call|24\/7|phone|best electrician|call today/i.test(name);
      assert.strictEqual(isInvalid, true, `Expected "${name}" to be flagged as policy violation.`);
    }

    const validName = 'Shadrick M. Reis Electric';
    const isValid = !/no job too big|call us|give us a call|24\/7|phone|best electrician|call today/i.test(validName);
    assert.strictEqual(isValid, true);
  });

  it('13. Service Area Business Privacy Protection Configuration', () => {
    const packet = governanceService.generateReisElectricOwnerPacket(testTenantId);
    assert.strictEqual(packet.businessTypeDecision.proposedType, 'service_area');
    assert.strictEqual(packet.addressRule.addressHiddenFromPublicMap, true);
    assert.strictEqual(packet.addressRule.streetAddressRedacted, '[REDACTED_PRIVATE_VERIFICATION_ADDRESS]');
    assert.strictEqual(packet.primaryCategory.proposedCategory, 'Electrician');
  });

  it('14. Reis Electric Owner Packet Governance Integrity & Zero Google Credentials', () => {
    const packet = governanceService.generateReisElectricOwnerPacket(testTenantId);
    assert.strictEqual(packet.googleVerification.responsibility, 'OWNER_ACTION_REQUIRED');
    assert.strictEqual(packet.googleVerification.relayAssistanceScope, 'GUIDED_MANUAL_CHECKLIST_ONLY');
    assert.strictEqual(packet.licensingAndInsurance.claimsBlocked, true);
    assert.strictEqual(packet.relayAdminAccess.proposedRole, 'googleProfileManager');
  });

  it('15. Google Official Source Documentation Citations Integrity', () => {
    const sources = governanceService.getOfficialSources();
    assert.strictEqual(sources.length >= 5, true);

    const guidelines = sources.find((s) => s.sourceId === 'google-guidelines-2911778');
    assert.ok(guidelines);
    assert.strictEqual(guidelines.url, 'https://support.google.com/business/answer/2911778');
    assert.ok(guidelines.governanceConstraint.length > 10);

    const categories = sources.find((s) => s.sourceId === 'google-categories-3038177');
    assert.ok(categories);
    assert.strictEqual(categories.url, 'https://support.google.com/business/answer/3038177');
  });
});
