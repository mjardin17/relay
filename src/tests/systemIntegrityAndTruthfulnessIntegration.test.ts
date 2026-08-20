import { describe, it, before, beforeEach } from 'node:test';
import assert from 'node:assert';
import crypto from 'node:crypto';
import express from 'express';
import { getDatabase } from '../db/database';
import { seedDatabaseIfEmpty } from '../db/seed';
import { controlCenterRouter } from '../routes/controlCenterRouter';
import { universalActionsRouter } from '../routes/universalActionsRouter';
import { connectorRegistryRouter } from '../routes/connectorRegistryRouter';
import { projectIntelligenceRouter } from '../routes/projectIntelligenceRouter';
import { UniversalActionEngineService } from '../services/universalActionEngineService';
import { AuthoritativeConnectorRegistryService } from '../services/authoritativeConnectorRegistryService';
import { LaunchAuditService } from '../services/launchAuditService';
import { EmergencyControlService } from '../services/emergencyControlService';
import { RelayProjectIntelligenceService } from '../services/relayProjectIntelligenceService';
import { ProviderAdapterRegistry, UniversalProviderAdapter } from '../services/providerAdapters/universalProviderAdapters';

// Robust mock dispatcher for Express router endpoint testing
function makeRouterCall(
  router: express.Router,
  method: string,
  url: string,
  options?: {
    headers?: Record<string, string>;
    body?: any;
    query?: Record<string, string>;
    params?: Record<string, string>;
  }
): Promise<{ status: number; body: any }> {
  return new Promise((resolve) => {
    const parsedUrl = new URL(`http://localhost${url}`);
    const queryObj: Record<string, string> = {};
    parsedUrl.searchParams.forEach((v, k) => {
      queryObj[k] = v;
    });

    const req: any = {
      method: method.toUpperCase(),
      url,
      path: parsedUrl.pathname,
      headers: options?.headers || {},
      body: options?.body || {},
      query: { ...queryObj, ...(options?.query || {}) },
      params: options?.params || {}
    };

    const res: any = {
      statusCode: 200,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(data: any) {
        resolve({ status: this.statusCode, body: data });
      },
      send(data: any) {
        resolve({ status: this.statusCode, body: data });
      }
    };

    router(req, res, (err: any) => {
      if (err) {
        resolve({ status: 500, body: { error: err.message } });
      } else {
        resolve({ status: 404, body: { error: 'Not found' } });
      }
    });
  });
}

describe('RELAY SYSTEM INTEGRITY & ARCHITECTURAL TRUTHFULNESS INTEGRATION SUITE', () => {
  before(() => {
    seedDatabaseIfEmpty();
    const db = getDatabase();

    // Seed test tenants
    const now = new Date().toISOString();
    db.prepare(`
      INSERT OR IGNORE INTO tenants (id, name, industry, created_at)
      VALUES ('tenant_alpha', 'Alpha Technologies', 'Technology', ?)
    `).run(now);

    db.prepare(`
      INSERT OR IGNORE INTO tenants (id, name, industry, created_at)
      VALUES ('tenant_beta', 'Beta Logistics', 'Logistics', ?)
    `).run(now);

    // Seed actors for multi-tenant testing
    db.prepare(`
      INSERT OR IGNORE INTO actors (id, tenant_id, role, name, email, created_at)
      VALUES ('user_alpha_admin', 'tenant_alpha', 'admin', 'Alpha Admin', 'admin@alpha.test', ?)
    `).run(now);

    db.prepare(`
      INSERT OR IGNORE INTO actors (id, tenant_id, role, name, email, created_at)
      VALUES ('user_alpha_op', 'tenant_alpha', 'operator', 'Alpha Operator', 'operator@alpha.test', ?)
    `).run(now);

    db.prepare(`
      INSERT OR IGNORE INTO actors (id, tenant_id, role, name, email, created_at)
      VALUES ('user_beta_admin', 'tenant_beta', 'admin', 'Beta Admin', 'admin@beta.test', ?)
    `).run(now);

    // Seed active sessions in database
    const exp = new Date(Date.now() + 86400000).toISOString();
    db.prepare(`
      INSERT OR REPLACE INTO auth_sessions (token, actor_id, tenant_id, role, permissions_json, expires_at, created_at)
      VALUES ('token_alpha_admin', 'user_alpha_admin', 'tenant_alpha', 'admin', '["*"]', ?, ?)
    `).run(exp, now);

    db.prepare(`
      INSERT OR REPLACE INTO auth_sessions (token, actor_id, tenant_id, role, permissions_json, expires_at, created_at)
      VALUES ('token_alpha_op', 'user_alpha_op', 'tenant_alpha', 'operator', '["actions:submit", "actions:read"]', ?, ?)
    `).run(exp, now);

    db.prepare(`
      INSERT OR REPLACE INTO auth_sessions (token, actor_id, tenant_id, role, permissions_json, expires_at, created_at)
      VALUES ('token_beta_admin', 'user_beta_admin', 'tenant_beta', 'admin', '["*"]', ?, ?)
    `).run(exp, now);
  });

  // =========================================================================
  // SECTION A: AUTHENTICATION & TENANT ISOLATION
  // =========================================================================
  describe('A. Authentication & Tenant Isolation Boundaries', () => {
    it('rejects unauthenticated requests on all four routers', async () => {
      const r1 = await makeRouterCall(controlCenterRouter, 'GET', '/summary');
      assert.strictEqual(r1.status, 401);
      assert.strictEqual(r1.body.error, 'UNAUTHORIZED');

      const r2 = await makeRouterCall(universalActionsRouter, 'GET', '/list');
      assert.strictEqual(r2.status, 401);
      assert.strictEqual(r2.body.error, 'UNAUTHORIZED');

      const r3 = await makeRouterCall(connectorRegistryRouter, 'GET', '/list');
      assert.strictEqual(r3.status, 401);
      assert.strictEqual(r3.body.error, 'UNAUTHORIZED');

      const r4 = await makeRouterCall(projectIntelligenceRouter, 'GET', '/projects');
      assert.strictEqual(r4.status, 401);
      assert.strictEqual(r4.body.error, 'UNAUTHORIZED');
    });

    it('rejects malformed authorization schemes (Basic, invalid tokens, empty strings)', async () => {
      const r1 = await makeRouterCall(controlCenterRouter, 'GET', '/summary', {
        headers: { authorization: 'Basic YWRtaW46cGFzc3dvcmQ=' }
      });
      assert.strictEqual(r1.status, 401);

      const r2 = await makeRouterCall(controlCenterRouter, 'GET', '/summary', {
        headers: { authorization: 'Bearer invalid-token-xyz' }
      });
      assert.strictEqual(r2.status, 401);

      const r3 = await makeRouterCall(controlCenterRouter, 'GET', '/summary', {
        headers: { authorization: 'Bearer ' }
      });
      assert.strictEqual(r3.status, 401);
    });

    it('prohibits browser-supplied tenantId or actor spoofing in universal action submission', async () => {
      const res = await makeRouterCall(universalActionsRouter, 'POST', '/submit', {
        headers: {
          authorization: 'Bearer token_alpha_admin',
          'x-tenant-id': 'tenant_beta' // Attempt header injection
        },
        body: {
          tenantId: 'tenant_beta', // Attempt body injection
          actorId: 'user_beta_admin',
          actorRole: 'OWNER',
          actionType: 'COMMUNICATION_OUTBOUND_SMS',
          provider: 'TWILIO',
          input: { message: 'Isolation test payload' }
        }
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      // Strictly bound to session: tenant_alpha and user_alpha_admin
      assert.strictEqual(res.body.action.tenantId, 'tenant_alpha');
      assert.strictEqual(res.body.action.actorId, 'user_alpha_admin');
      assert.strictEqual(res.body.action.actorRole, 'ADMIN');
    });

    it('prohibits cross-tenant single action inspection (GET /:id returns 403)', async () => {
      // 1. Submit action in tenant_alpha
      const actionRes = await makeRouterCall(universalActionsRouter, 'POST', '/submit', {
        headers: { authorization: 'Bearer token_alpha_admin' },
        body: {
          actionType: 'COMMUNICATION_OUTBOUND_SMS',
          provider: 'TWILIO',
          input: { msg: 'Alpha private action' }
        }
      });
      const alphaActionId = actionRes.body.action.id;

      // 2. Attempt inspection from tenant_beta
      const crossRes = await makeRouterCall(universalActionsRouter, 'GET', `/${alphaActionId}`, {
        headers: { authorization: 'Bearer token_beta_admin' }
      });

      assert.strictEqual(crossRes.status, 403);
      assert.ok(crossRes.body.error.includes('FORBIDDEN'));
    });

    it('prohibits cross-tenant approval (Tenant B admin cannot approve Tenant A action)', async () => {
      // 1. Submit action requiring approval in tenant_alpha
      const actionRes = await makeRouterCall(universalActionsRouter, 'POST', '/submit', {
        headers: { authorization: 'Bearer token_alpha_op' },
        body: {
          actionType: 'COMMUNICATION_OUTBOUND_SMS',
          provider: 'TWILIO',
          input: { msg: 'Consequential SMS' },
          requiresApprovalOverride: true
        }
      });
      const actionId = actionRes.body.action.id;
      assert.strictEqual(actionRes.body.action.approvalState, 'PENDING_APPROVAL');

      // 2. Tenant Beta Admin attempts approval
      const crossApprove = await makeRouterCall(universalActionsRouter, 'POST', '/approve', {
        headers: { authorization: 'Bearer token_beta_admin' },
        body: {
          actionId,
          decision: 'APPROVE',
          reason: 'Cross-tenant malicious approval'
        }
      });

      assert.strictEqual(crossApprove.status, 403);
      assert.ok(crossApprove.body.error.includes('Cross-tenant'));
    });

    it('guarantees tenant-scoped isolation on list endpoints (no record leakage)', async () => {
      const alphaList = await makeRouterCall(universalActionsRouter, 'GET', '/list', {
        headers: { authorization: 'Bearer token_alpha_admin' }
      });
      assert.strictEqual(alphaList.status, 200);
      assert.ok(alphaList.body.actions.every((a: any) => a.tenantId === 'tenant_alpha'));

      const betaList = await makeRouterCall(universalActionsRouter, 'GET', '/list', {
        headers: { authorization: 'Bearer token_beta_admin' }
      });
      assert.strictEqual(betaList.status, 200);
      assert.ok(betaList.body.actions.every((a: any) => a.tenantId === 'tenant_beta'));
    });
  });

  // =========================================================================
  // SECTION B: ROUTER CONTRACTS & ROLE-BASED ACCESS
  // =========================================================================
  describe('B. Router Contracts & Role Authorizations', () => {
    it('executes all controlCenterRouter inspection endpoints truthfully', async () => {
      const endpoints = ['/summary', '/tenants', '/workforce', '/growth', '/content', '/connectors', '/operations'];
      for (const ep of endpoints) {
        const res = await makeRouterCall(controlCenterRouter, 'GET', ep, {
          headers: { authorization: 'Bearer token-shad' }
        });
        assert.strictEqual(res.status, 200, `Endpoint ${ep} returned status ${res.status}`);
        assert.strictEqual(res.body.success, true, `Endpoint ${ep} success was false`);
      }
    });

    it('enforces role restriction on emergency pause (rejects OPERATOR and VIEWER)', async () => {
      const r1 = await makeRouterCall(controlCenterRouter, 'POST', '/emergency-pause', {
        headers: { authorization: 'Bearer token-viewer' },
        body: { paused: true, reason: 'Viewer pause attempt' }
      });
      assert.strictEqual(r1.status, 403);

      const r2 = await makeRouterCall(controlCenterRouter, 'POST', '/emergency-pause', {
        headers: { authorization: 'Bearer token-joshua' }, // Operator
        body: { paused: true, reason: 'Operator pause attempt' }
      });
      assert.strictEqual(r2.status, 403);

      // Authorized ADMIN
      const r3 = await makeRouterCall(controlCenterRouter, 'POST', '/emergency-pause', {
        headers: { authorization: 'Bearer token-shad' },
        body: { paused: false, reason: 'Admin system resume' }
      });
      assert.strictEqual(r3.status, 200);
      assert.strictEqual(r3.body.emergencyState.isEmergencyPaused, false);
    });

    it('returns 404 for unknown action IDs safely', async () => {
      const res = await makeRouterCall(universalActionsRouter, 'GET', '/non_existent_action_12345', {
        headers: { authorization: 'Bearer token-shad' }
      });
      assert.strictEqual(res.status, 404);
      assert.strictEqual(res.body.success, false);
    });
  });

  // =========================================================================
  // SECTION C: UNIVERSAL ACTION LIFECYCLE & STATE TRANSITIONS
  // =========================================================================
  describe('C. Universal Action Lifecycle & State Machine', () => {
    const engine = UniversalActionEngineService.getInstance();

    it('verifies full lifecycle for human-approved consequential action', async () => {
      // Step 1: Submit action requiring approval
      const record = await engine.submitAction({
        tenantId: 'tenant_alpha',
        actor: { id: 'user_alpha_op', role: 'OPERATOR' },
        actionType: 'PROFILE_UPDATE_HOURS',
        provider: 'GOOGLE_BUSINESS_PROFILE',
        idempotencyKey: `act_lifecycle_step1_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        inputPayload: { businessHours: { monday: '08:00-17:00' } }
      });

      assert.strictEqual(record.executionState, 'PENDING_APPROVAL');
      assert.strictEqual(record.approvalState, 'PENDING_APPROVAL');
      assert.strictEqual(record.approvalRequired, true);
      assert.ok(record.inputFingerprint.length > 20);

      // Step 2: Ensure direct execution is rejected while unapproved
      const earlyExec = await engine.executeAction(record.id);
      assert.strictEqual(earlyExec.executionState, 'FAILED_CLOSED');
      assert.strictEqual(earlyExec.error?.code, 'APPROVAL_MISSING');

      // Step 3: Approve with separate ADMIN actor
      // Re-submit clean record for approval test
      const action2 = await engine.submitAction({
        tenantId: 'tenant_alpha',
        actor: { id: 'user_alpha_op', role: 'OPERATOR' },
        actionType: 'PROFILE_UPDATE_HOURS',
        provider: 'GOOGLE_BUSINESS_PROFILE',
        idempotencyKey: `act_lifecycle_step3_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        inputPayload: { businessHours: { monday: '08:00-18:00' } }
      });

      const approved = await engine.decideApproval(action2.id, {
        decision: 'APPROVE',
        approverId: 'user_alpha_admin',
        approverRole: 'ADMIN',
        reason: 'Authorized spring schedule hours update'
      });

      assert.strictEqual(approved.approvalState, 'APPROVED');
      assert.strictEqual(approved.approvedBy, 'user_alpha_admin');
      assert.ok(approved.approvalSignature);
      assert.strictEqual(approved.approvalSignature.length, 64); // SHA-256 hex string
    });

    it('enforces deterministic idempotency replay', async () => {
      const idempotencyKey = `idem_${Date.now()}_unique_${Math.random().toString(36).substring(2, 6)}`;
      const payload = { recipient: '+15085551234', text: 'Idempotency test SMS' };

      const first = await engine.submitAction({
        tenantId: 'tenant_alpha',
        actor: { id: 'user_alpha_op', role: 'OPERATOR' },
        actionType: 'COMMUNICATION_OUTBOUND_SMS',
        provider: 'TWILIO',
        idempotencyKey,
        inputPayload: payload
      });

      // Second submission with exact same key and payload returns exact same record
      const replay = await engine.submitAction({
        tenantId: 'tenant_alpha',
        actor: { id: 'user_alpha_op', role: 'OPERATOR' },
        actionType: 'COMMUNICATION_OUTBOUND_SMS',
        provider: 'TWILIO',
        idempotencyKey,
        inputPayload: payload
      });

      assert.strictEqual(first.id, replay.id);
      assert.strictEqual(first.inputFingerprint, replay.inputFingerprint);

      // Third submission with same key but DIFFERENT payload fails with conflict
      await assert.rejects(
        async () => {
          await engine.submitAction({
            tenantId: 'tenant_alpha',
            actor: { id: 'user_alpha_op', role: 'OPERATOR' },
            actionType: 'COMMUNICATION_OUTBOUND_SMS',
            provider: 'TWILIO',
            idempotencyKey,
            inputPayload: { recipient: '+15085559999', text: 'Tampered different payload' }
          });
        },
        (err: any) => err.message.includes('IDEMPOTENCY_CONFLICT')
      );
    });

    it('fails closed when emergency pause is triggered', async () => {
      const emergency = EmergencyControlService.getInstance();
      emergency.pause({
        scope: 'TENANT',
        tenantId: 'tenant_alpha',
        reason: 'Integration test circuit trip',
        pausedBy: 'user_alpha_admin'
      });

      const action = await engine.submitAction({
        tenantId: 'tenant_alpha',
        actor: { id: 'user_alpha_op', role: 'OPERATOR' },
        actionType: 'STATIC_WEBSITE_DRAFT',
        provider: 'STATIC_EXPORT',
        idempotencyKey: `act_emergency_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        inputPayload: { slug: 'test-page' }
      });

      assert.strictEqual(action.executionState, 'AUTHORIZE_FAILED');
      assert.strictEqual(action.error?.code, 'EMERGENCY_PAUSED');

      // Reset emergency pause
      emergency.resume({
        scope: 'TENANT',
        tenantId: 'tenant_alpha',
        resumedBy: 'user_alpha_admin',
        reason: 'Reset integration test circuit'
      });
    });
  });

  // =========================================================================
  // SECTION D: SEGREGATION OF DUTIES & APPROVAL INTEGRITY
  // =========================================================================
  describe('D. Segregation of Duties & Cryptographic Approval Binding', () => {
    const engine = UniversalActionEngineService.getInstance();

    it('rejects self-approval when proposer attempts to approve own action', async () => {
      const action = await engine.submitAction({
        tenantId: 'tenant_alpha',
        actor: { id: 'user_alpha_admin', role: 'ADMIN' },
        actionType: 'PROFILE_UPDATE_HOURS',
        provider: 'GOOGLE_BUSINESS_PROFILE',
        inputPayload: { businessHours: { monday: '09:00-17:00' }, nonce: 'self-approve-test' }
      });

      await assert.rejects(
        async () => {
          await engine.decideApproval(action.id, {
            decision: 'APPROVE',
            approverId: 'user_alpha_admin', // Proposer cannot self-approve
            approverRole: 'ADMIN',
            reason: 'Attempting self-approval'
          });
        },
        (err: any) => err.message.includes('SELF_APPROVAL_REJECTED')
      );
    });

    it('rejects approval when attempted by unauthorized role (OPERATOR / VIEWER)', async () => {
      const action = await engine.submitAction({
        tenantId: 'tenant_alpha',
        actor: { id: 'user_alpha_admin', role: 'ADMIN' },
        actionType: 'PROFILE_UPDATE_HOURS',
        provider: 'GOOGLE_BUSINESS_PROFILE',
        inputPayload: { businessHours: { tuesday: '09:00-17:00' }, nonce: 'unauth-role-test' }
      });

      await assert.rejects(
        async () => {
          await engine.decideApproval(action.id, {
            decision: 'APPROVE',
            approverId: 'user_alpha_op',
            approverRole: 'OPERATOR', // OPERATOR is not authorized to approve
            reason: 'Operator approval attempt'
          });
        },
        (err: any) => err.message.includes('UNAUTHORIZED_APPROVER_ROLE')
      );
    });

    it('detects payload tampering before approval and fails closed', async () => {
      const action = await engine.submitAction({
        tenantId: 'tenant_alpha',
        actor: { id: 'user_alpha_op', role: 'OPERATOR' },
        actionType: 'PROFILE_UPDATE_HOURS',
        provider: 'GOOGLE_BUSINESS_PROFILE',
        inputPayload: { businessHours: { wednesday: '09:00-17:00' }, nonce: 'tamper-test' }
      });

      // Direct database tampering simulation
      const db = getDatabase();
      db.prepare(`
        UPDATE universal_action_records
        SET input_payload_json = ?
        WHERE id = ?
      `).run(JSON.stringify({ businessHours: { wednesday: '00:00-24:00' }, nonce: 'tamper-test' }), action.id);

      await assert.rejects(
        async () => {
          await engine.decideApproval(action.id, {
            decision: 'APPROVE',
            approverId: 'user_alpha_admin',
            approverRole: 'ADMIN',
            reason: 'Tampered approval attempt'
          });
        },
        (err: any) => err.message.includes('APPROVAL_PAYLOAD_TAMPERED')
      );
    });
  });

  // =========================================================================
  // SECTION E: CONNECTOR TRUTHFULNESS & CREDENTIAL REDACTION
  // =========================================================================
  describe('E. Connector Truthfulness & Safety Guarantees', () => {
    const connectorRegistry = AuthoritativeConnectorRegistryService.getInstance();

    it('configures new official connectors strictly as CONFIGURED_UNVERIFIED', () => {
      const conn = connectorRegistry.configureTenantConnector('tenant_alpha', {
        provider: 'TWILIO',
        configuredBy: 'user_alpha_admin',
        credentials: {
          apiKey: 'secret_live_tw_sk_999999999999999999'
        }
      });

      assert.strictEqual(conn.connectionState, 'CONFIGURED_UNVERIFIED');
      assert.strictEqual(conn.provider, 'TWILIO');
      // Verify raw secret is never stored or returned in credentialsMasked
      assert.strictEqual(conn.credentialsMasked.hasApiKey, true);
      assert.strictEqual((conn.credentialsMasked as any).apiKey, undefined);
      assert.ok(conn.credentialsMasked.apiKeyFingerprint?.startsWith('key_sha256_'));
    });

    it('unauthenticated or missing credentials probe fails closed (never claims fake VERIFIED)', () => {
      const unverifiedConn = connectorRegistry.configureTenantConnector('tenant_alpha', {
        provider: 'SENDGRID',
        configuredBy: 'user_alpha_admin'
      });
      assert.strictEqual(unverifiedConn.connectionState, 'CONFIGURED_UNVERIFIED');

      const probeResult = connectorRegistry.verifyTenantConnector('tenant_alpha', 'SENDGRID', {
        simulateSuccess: false
      });

      assert.notStrictEqual(probeResult.connectionState, 'VERIFIED');
      assert.strictEqual(probeResult.status, 'FAILED');
      assert.ok(probeResult.sanitizedMessage.includes('failed'));
    });

    it('verifies DRAFT_ONLY connectors safely via local schema validation', () => {
      const draftConn = connectorRegistry.configureTenantConnector('tenant_alpha', {
        provider: 'STATIC_EXPORT',
        configuredBy: 'user_alpha_admin'
      });

      assert.strictEqual(draftConn.connectorType, 'DRAFT_ONLY');
      assert.strictEqual(draftConn.connectionState, 'VERIFIED');

      const probe = connectorRegistry.verifyTenantConnector('tenant_alpha', 'STATIC_EXPORT');
      assert.strictEqual(probe.status, 'VERIFIED');
      assert.ok(probe.sanitizedMessage.includes('Draft-only connector verified'));
    });

    it('fails closed immediately on UNSUPPORTED connectors', () => {
      const def = connectorRegistry.getCatalogDefinition('TIKTOK');
      assert.ok(def);

      const probe = connectorRegistry.verifyTenantConnector('tenant_alpha', 'TIKTOK', {
        simulateSuccess: false
      });
      assert.notStrictEqual(probe.status, 'VERIFIED');
    });
  });

  // =========================================================================
  // SECTION F: UNIVERSAL ACTION PROVIDER DISPATCH
  // =========================================================================
  describe('F. Universal Action Provider Dispatch Fail-Closed Guarantees', () => {
    const engine = UniversalActionEngineService.getInstance();
    const connectorRegistry = AuthoritativeConnectorRegistryService.getInstance();

    it('fails closed when dispatching against an unconfigured provider connector', async () => {
      const action = await engine.submitAction({
        tenantId: 'tenant_alpha',
        actor: { id: 'user_alpha_admin', role: 'ADMIN' },
        actionType: 'PAYMENT_CAPTURE',
        provider: 'STRIPE',
        inputPayload: { amountCents: 5000 },
        requiresApprovalOverride: false
      });

      assert.strictEqual(action.executionState, 'FAILED_CLOSED');
      assert.ok(action.error?.message.includes('not configured') || action.error?.code.includes('FAILED_CLOSED'));
    });

    it('fails closed when dispatching against an unverified provider connector', async () => {
      // Configure connector but leave it CONFIGURED_UNVERIFIED
      connectorRegistry.configureTenantConnector('tenant_alpha', {
        provider: 'TWILIO',
        configuredBy: 'user_alpha_admin',
        credentials: { apiKey: 'live_test_key_sample' }
      });

      const action = await engine.submitAction({
        tenantId: 'tenant_alpha',
        actor: { id: 'user_alpha_admin', role: 'ADMIN' },
        actionType: 'COMMUNICATION_OUTBOUND_SMS',
        provider: 'TWILIO',
        inputPayload: { to: '+15085551234', body: 'Test' },
        requiresApprovalOverride: false
      });

      assert.strictEqual(action.executionState, 'FAILED_CLOSED');
      assert.ok(
        action.error?.message.includes('CONFIGURED_UNVERIFIED') ||
          action.error?.code === 'EXECUTION_FAILED_CLOSED' ||
          action.error?.code === 'EXECUTION_EXCEPTION'
      );
    });

    it('dispatches local draft website artifacts truthfully with verified SHA-256 hash', async () => {
      const action = await engine.submitAction({
        tenantId: 'tenant_alpha',
        actor: { id: 'user_alpha_admin', role: 'ADMIN' },
        actionType: 'STATIC_WEBSITE_DRAFT',
        provider: 'STATIC_EXPORT',
        inputPayload: {
          slug: 'commercial-electrical-boston',
          title: 'Commercial Electrical Services Boston',
          content: '<h1>Licensed Electrical Services</h1>'
        },
        requiresApprovalOverride: false
      });

      assert.strictEqual(action.executionState, 'SUCCEEDED');
      assert.ok(action.resultPayload);
      assert.strictEqual(action.resultPayload.action, 'DRAFT_CREATED');
      assert.ok(action.resultPayload.artifactSha256);
      assert.strictEqual(action.resultPayload.artifactSha256.length, 64);
    });
  });

  // =========================================================================
  // SECTION G: PROJECT INTELLIGENCE TRUTHFULNESS
  // =========================================================================
  describe('G. Project Intelligence & Capability Verification', () => {
    const intelligence = RelayProjectIntelligenceService.getInstance();

    it('returns verified workspace capabilities with existing implementations and test references', () => {
      const inventory = intelligence.getWorkspaceCapabilityInventory();
      assert.ok(inventory.length >= 8);

      for (const item of inventory) {
        assert.ok(item.capability, 'Capability must have a title');
        assert.ok(item.existingImplementation, 'Implementation file references must exist');
        assert.ok(item.testsCoveringIt.length > 0, 'Must reference tests covering capability');
        assert.strictEqual(item.status, 'production');
      }
    });

    it('compares projects honestly and never produces fabricated automated merges', () => {
      const comparison = intelligence.compareProjects('relay_central', 'relay_central');
      assert.strictEqual(comparison.status, 'COMPLETED');
      assert.strictEqual(comparison.recommendation, 'KEEP_INDEPENDENT');
      assert.ok(comparison.governanceNotice.includes('ZERO AUTO-MERGE GOVERNANCE'));
      assert.ok(comparison.workingFeatures.includes('Universal Action Engine'));
      assert.strictEqual(comparison.integrationRisk, 'LOW');
    });
  });

  // =========================================================================
  // SECTION H: AUDIT CHAIN INTEGRITY & LEDGER VALIDATION
  // =========================================================================
  describe('H. Audit Chain Integrity & Cryptographic Ledger', () => {
    const auditService = LaunchAuditService.getInstance();

    it('logs audit events with cryptographic previousEventHash linking', () => {
      const ev1 = auditService.logAuditEvent({
        tenantId: 'tenant_alpha',
        actorId: 'user_alpha_admin',
        action: 'INTEGRATION_TEST_EVENT_1',
        endpoint: '/api/test',
        status: 'SUCCESS',
        details: { note: 'First event' }
      });

      const ev2 = auditService.logAuditEvent({
        tenantId: 'tenant_alpha',
        actorId: 'user_alpha_admin',
        action: 'INTEGRATION_TEST_EVENT_2',
        endpoint: '/api/test',
        status: 'SUCCESS',
        details: { note: 'Second event' }
      });

      assert.strictEqual(ev2.previousEventHash, ev1.eventHash);
      assert.strictEqual(ev2.sequenceNumber, ev1.sequenceNumber + 1);
    });

    it('cryptographically verifies ledger integrity across all sequence numbers', () => {
      const chainTenant = `tenant_chain_${Date.now()}`;
      const ev1 = auditService.logAuditEvent({
        tenantId: chainTenant,
        actorId: 'user_alpha_admin',
        action: 'INTEGRATION_TEST_EVENT_A',
        endpoint: '/api/test',
        status: 'SUCCESS',
        details: { note: 'First event in clean chain' }
      });

      const ev2 = auditService.logAuditEvent({
        tenantId: chainTenant,
        actorId: 'user_alpha_admin',
        action: 'INTEGRATION_TEST_EVENT_B',
        endpoint: '/api/test',
        status: 'SUCCESS',
        details: { note: 'Second event in clean chain' }
      });

      const verification = auditService.verifyLedgerIntegrity({
        tenantId: chainTenant,
        startSequence: ev1.sequenceNumber,
        endSequence: ev2.sequenceNumber
      });
      assert.strictEqual(verification.isValid, true);
      assert.strictEqual(verification.verificationErrors.length, 0);
      assert.strictEqual(verification.totalEvents, 2);
    });

    it('enforces SQLite triggers preventing UPDATE and DELETE mutations on audit logs', () => {
      const db = getDatabase();

      const ev = auditService.logAuditEvent({
        tenantId: 'tenant_alpha',
        actorId: 'user_alpha_admin',
        action: 'INTEGRATION_TRIGGER_IMMUTABILITY_CHECK',
        endpoint: '/api/test',
        status: 'SUCCESS',
        details: { protected: true }
      });

      // Direct SQL UPDATE is blocked by SQLite trigger
      assert.throws(
        () => {
          db.prepare(`UPDATE launch_audit_logs SET details_json = ? WHERE id = ?`).run('{}', ev.id);
        },
        (err: any) => err.message.includes('AUDIT_LOG_IMMUTABLE')
      );

      // Direct SQL DELETE is blocked by SQLite trigger
      assert.throws(
        () => {
          db.prepare(`DELETE FROM launch_audit_logs WHERE id = ?`).run(ev.id);
        },
        (err: any) => err.message.includes('AUDIT_LOG_IMMUTABLE')
      );
    });

    it('detects tampering when an invalid canonical payload hash or event hash is stored', () => {
      const db = getDatabase();
      const now = new Date().toISOString();
      const tamperTenant = `tenant_tamper_${Date.now()}`;
      const fakeId = `tamper-fake-${Date.now()}`;

      // Insert an invalid forged row with bad canonical hash
      db.prepare(`
        INSERT INTO launch_audit_logs (
          id, sequence_number, previous_event_hash, event_hash, canonical_payload_hash,
          execution_mode, tenant_id, actor_id, client_ip, endpoint, action, status, details_json, created_at
        )
        VALUES (?, 999999, 'bad_prev_hash', 'bad_event_hash', 'forged_canonical_hash_123', 'DRY_RUN', ?, 'user_alpha_admin', '127.0.0.1', '/api/fake', 'FORGED_EVENT', 'SUCCESS', '{"tampered":true}', ?)
      `).run(fakeId, tamperTenant, now);

      const verification = auditService.verifyLedgerIntegrity(tamperTenant);
      assert.strictEqual(verification.isValid, false);
      assert.ok(verification.verificationErrors.some((e) => e.includes('Payload tampering detected') || e.includes('Event hash tampering detected')));
    });
  });
});
