import { test, describe, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import express, { Express } from 'express';
import { authMiddleware, requirePermission } from '../middleware/authMiddleware';
import { growthRouter } from '../routes/growthApi';
import { ariaRouter } from '../routes/ariaApi';
import { gbpLaunchRouter } from '../routes/gbpLaunchApi';
import { getDatabase } from '../db/database';
import { seedDatabaseIfEmpty } from '../db/seed';
import { zeroNetworkGuard } from '../utils/zeroNetworkGuard';
import { ariaDispatchService } from '../services/ariaDispatchService';
import { gbpGovernanceService } from '../services/gbpGovernanceService';
import { launchIdempotencyService } from '../services/launchIdempotencyService';
import { launchAuditService } from '../services/launchAuditService';

describe('API Security, Authorization, Tenant Isolation, and Dry-Run Test Suite', () => {
  let app: Express;

  before(() => {
    seedDatabaseIfEmpty();
    zeroNetworkGuard.activate();

    app = express();
    app.use(express.json());
    app.use('/api/growth', growthRouter);
    app.use('/api/aria', ariaRouter);
    app.use('/api/gbp-launch', gbpLaunchRouter);
  });

  test('1. Requests missing Authorization header are strictly rejected with 401', async () => {
    const res = await fetch('http://127.0.0.1:3000/api/growth/dashboard', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    }).catch(() => null);

    // If server is not listening on 3000 during test runner, we test middleware directly
    const req: any = { headers: {} };
    let status = 0;
    let jsonBody: any = null;
    const mockRes: any = {
      status: (s: number) => {
        status = s;
        return mockRes;
      },
      json: (b: any) => {
        jsonBody = b;
        return mockRes;
      },
    };

    let nextCalled = false;
    authMiddleware(req, mockRes, () => {
      nextCalled = true;
    });

    assert.equal(status, 401, 'Should return 401 Unauthorized');
    assert.equal(nextCalled, false, 'Next middleware should not be called');
    assert.equal(jsonBody.error, 'UNAUTHORIZED');
  });

  test('2. Header injection (x-tenant-id) is completely ignored; tenant is derived from session', () => {
    const req: any = {
      headers: {
        authorization: 'Bearer token-shad',
        'x-tenant-id': 'malicious-injected-tenant-999',
      },
    };
    let nextCalled = false;
    authMiddleware(req, {} as any, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, true);
    assert.equal(req.tenantId, 'default', 'Tenant must be derived from verified session token');
    assert.equal(req.userId, 'user-shad');
    assert.notEqual(req.tenantId, 'malicious-injected-tenant-999');
  });

  test('3. Role permissions enforcement blocks unauthorized actions with 403', () => {
    const req: any = {
      tenantId: 'default',
      userId: 'user-viewer',
      userRole: 'viewer',
      userPermissions: ['growth:read', 'launch:read'],
    };

    let status = 0;
    let jsonBody: any = null;
    const mockRes: any = {
      status: (s: number) => {
        status = s;
        return mockRes;
      },
      json: (b: any) => {
        jsonBody = b;
        return mockRes;
      },
    };

    let nextCalled = false;
    const guard = requirePermission('growth:write');
    guard(req, mockRes, () => {
      nextCalled = true;
    });

    assert.equal(status, 403, 'Viewer cannot access growth:write');
    assert.equal(nextCalled, false);
    assert.equal(jsonBody.error, 'FORBIDDEN');
  });

  test('4. Segregation of Duties: Claimant cannot review their own role attestation', () => {
    const tenantId = `tenant-sod-${Date.now()}`;
    const attestation = gbpGovernanceService.recordRoleAttestation(tenantId, {
      personName: 'Shadrick M. Reis',
      personIdentifier: 'user-shad',
      role: 'legalBusinessOwner',
      notes: 'Initial claim',
    });

    assert.equal(attestation.verificationStatus, 'UNVERIFIED', 'Role must start in UNVERIFIED state');

    // Attempt self-review
    const selfReview = gbpGovernanceService.reviewRoleAttestation(
      tenantId,
      attestation.attestationId,
      'user-shad', // same as personIdentifier
      'VERIFIED_DOCUMENTED',
      'Self approving'
    );

    assert.equal(selfReview.success, false);
    assert.equal(selfReview.error, 'SEGREGATION_OF_DUTIES_VIOLATION');

    // Proper review by independent reviewer
    const validReview = gbpGovernanceService.reviewRoleAttestation(
      tenantId,
      attestation.attestationId,
      'user-independent-auditor',
      'VERIFIED_DOCUMENTED',
      'Official documentation reviewed and verified'
    );

    assert.equal(validReview.success, true);
    assert.equal(validReview.attestation?.verificationStatus, 'VERIFIED_DOCUMENTED');
  });

  test('5. Segregation of Duties: Authorized person cannot approve their own authorization grant', () => {
    const tenantId = `tenant-sod-grant-${Date.now()}`;
    const grant = gbpGovernanceService.assertAuthorizationGrant(tenantId, {
      businessId: 'smrelec',
      authorizedPersonId: 'user-operator',
      assertedAuthorityRole: 'authorizedProfileApprover',
      permissionPurpose: 'Manage Google Profile info',
      allowedActions: ['update_business_hours'],
      prohibitedActions: ['request_ownership_transfer'],
      consentMethod: 'OWNER_PORTAL_SIGNATURE',
      consentDisclosureVersion: 'v1.0',
      consentDisclosureTextHash: 'a'.repeat(64),
      sourceFormId: 'form-01',
    });

    assert.equal(grant.grantStatus, 'PENDING_REVIEW');

    // Attempt self-approval
    const selfApprove = gbpGovernanceService.approveAuthorizationGrant(
      tenantId,
      grant.authorizationId,
      'user-operator' // same as authorizedPersonId
    );

    assert.equal(selfApprove.success, false);
    assert.equal(selfApprove.error, 'SEGREGATION_OF_DUTIES_VIOLATION');

    // Proper approval by business owner
    const validApprove = gbpGovernanceService.approveAuthorizationGrant(
      tenantId,
      grant.authorizationId,
      'user-owner'
    );

    assert.equal(validApprove.success, true);
    assert.equal(validApprove.grant?.grantStatus, 'APPROVED');
  });

  test('6. Aria Dispatch strictly rejects boolean consent without versioned consent evidence', () => {
    const tenantId = `tenant-aria-consent-${Date.now()}`;

    // Dispatch without evidence record
    const result = ariaDispatchService.processLeadIntake({
      tenantId,
      customerName: 'Jane Smith',
      phone: '5085551234',
      problemDescription: 'Need service panel upgrade',
      serviceType: 'panel_upgrade',
      hasConsent: true as any, // boolean only
      idempotencyKey: `idem-key-${Date.now()}`,
    });

    assert.equal(result.success, false);
    assert.equal(result.error, 'CONSENT_EVIDENCE_MANDATORY');
  });

  test('7. Aria Dispatch enforces DRY_RUN and never calls external providers', () => {
    const tenantId = `tenant-aria-dryrun-${Date.now()}`;

    const result = ariaDispatchService.processLeadIntake({
      tenantId,
      customerName: 'Jane Smith',
      phone: '5085551234',
      problemDescription: 'Need standard electrical estimate',
      serviceType: 'estimate',
      consentEvidence: {
        consentMethod: 'WEB_FORM_CHECKBOX',
        disclosureVersion: 'v1.0',
        disclosureTextHash: 'b'.repeat(64),
        consentTimestamp: new Date().toISOString(),
        recordedBy: 'web_portal',
      },
      idempotencyKey: `idem-key-dryrun-${Date.now()}`,
    });

    assert.equal(result.success, true);
    assert.equal(result.dryRunFlags.executionMode, 'DRY_RUN');
    assert.equal(result.dryRunFlags.providerCalled, false);
    assert.equal(result.dryRunFlags.customerContacted, false);
    assert.equal(result.dryRunFlags.externalMutationCreated, false);
    assert.equal(result.lead?.dispatchStatus, 'DRAFT_PENDING_APPROVAL');
  });

  test('8. Fail-closed zeroNetworkGuard intercepts and throws on outbound network requests', async () => {
    let errorCaught: any = null;
    try {
      await fetch('https://example.com/api/test');
    } catch (err: any) {
      errorCaught = err;
    }

    assert.notEqual(errorCaught, null, 'Outbound fetch should be blocked by zeroNetworkGuard');
    assert.match(
      errorCaught.message,
      /ZERO_NETWORK_GUARD_BLOCKED|Egress blocked/,
      'Should indicate zero-network containment'
    );
  });

  test('9. Audit Hash Chain maintains cryptographic integrity across recorded events', () => {
    const tenantId = `tenant-audit-${Date.now()}`;
    const audit1 = launchAuditService.recordAudit({
      tenantId,
      actorId: 'user-1',
      clientIp: '127.0.0.1',
      endpoint: '/api/test/1',
      action: 'ACTION_ONE',
      status: 'success',
      details: { step: 1 },
    });

    const audit2 = launchAuditService.recordAudit({
      tenantId,
      actorId: 'user-2',
      clientIp: '127.0.0.1',
      endpoint: '/api/test/2',
      action: 'ACTION_TWO',
      status: 'success',
      details: { step: 2 },
    });

    assert.equal(audit2.previousHash, audit1.currentHash, 'Audit chain must link hashes sequentially');
    assert.ok(audit1.currentHash && audit1.currentHash.length === 64, 'SHA-256 hash required');
    assert.ok(audit2.currentHash && audit2.currentHash.length === 64, 'SHA-256 hash required');
  });
});
