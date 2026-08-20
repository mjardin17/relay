import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { UniversalActionEngineService } from '../services/universalActionEngineService';
import { AuthoritativeConnectorRegistryService } from '../services/authoritativeConnectorRegistryService';
import { EmergencyControlService } from '../services/emergencyControlService';
import { seedDatabaseIfEmpty } from '../db/seed';

describe('Universal Action Engine & Fail-Closed Governance', () => {
  before(() => {
    seedDatabaseIfEmpty();
    EmergencyControlService.getInstance().resumeGlobal({ actorId: 'test-runner' });
  });

  it('generates consistent idempotency keys and fingerprints', () => {
    const engine = UniversalActionEngineService.getInstance();
    const payload = { recipient: 'john@example.com', subject: 'Quote Ready', amount: 4500 };

    const key1 = engine.generateIdempotencyKey('tenant_1', 'COMMUNICATION_OUTBOUND_SMS', payload);
    const key2 = engine.generateIdempotencyKey('tenant_1', 'COMMUNICATION_OUTBOUND_SMS', payload);
    assert.strictEqual(key1, key2);
    assert.ok(key1.startsWith('idemp_communication_outbound_sms_'));

    const fp1 = engine.generateFingerprint(payload);
    const fp2 = engine.generateFingerprint(payload);
    assert.strictEqual(fp1, fp2);
  });

  it('submits action and executes fail-closed when connector is disconnected', async () => {
    const engine = UniversalActionEngineService.getInstance();
    const testTenant = `tenant_failclosed_${Date.now()}`;

    const record = await engine.submitAction({
      tenantId: testTenant,
      actor: { id: 'user_1', role: 'OPERATOR', name: 'Tester' },
      actionType: 'COMMUNICATION_OUTBOUND_SMS',
      provider: 'TWILIO',
      input: { to: '+15555551212', body: 'Test Notification', runNonce: Date.now() },
      requiresApprovalOverride: false
    });

    assert.ok(record);
    assert.strictEqual(record.executionState, 'FAILED_CLOSED');
    assert.strictEqual(record.error?.code, 'CONNECTOR_NOT_CONFIGURED');
    assert.strictEqual(record.error?.failedClosed, true);
  });

  it('handles actions requiring approval through PENDING_APPROVAL and APPROVE lifecycle with cryptographic signature', async () => {
    const engine = UniversalActionEngineService.getInstance();
    const connectorService = AuthoritativeConnectorRegistryService.getInstance();
    const testTenant = `tenant_approval_${Date.now()}`;

    // Configure and verify connector for this tenant
    connectorService.configureTenantConnector(testTenant, {
      provider: 'CLOUDFLARE_PAGES',
      credentials: { apiKey: 'cf_test_key_123' },
      configuredBy: 'operator-1'
    });
    connectorService.verifyTenantConnector(testTenant, 'CLOUDFLARE_PAGES', {
      testDoubleProbe: (c, d) => ({
        provider: d.provider,
        status: 'VERIFIED',
        connectionState: 'VERIFIED',
        sanitizedMessage: 'Cloudflare Pages verified in test harness',
        latencyMs: 15,
        scopesGranted: d.capabilities,
        scopesMissing: [],
        probedAt: new Date().toISOString(),
        evidenceRef: 'ev_test_cf'
      })
    });

    const record = await engine.submitAction({
      tenantId: testTenant,
      actor: { id: 'aria_agent', role: 'AI_AGENT', name: 'Aria AI' },
      actionType: 'WEBSITE_DEPLOY_STATIC',
      provider: 'CLOUDFLARE_PAGES',
      input: {
        siteId: 'site_123',
        deployTarget: 'production',
        runNonce: Date.now(),
        testDoubleResult: {
          status: 'CONFIRMED_BY_PROVIDER',
          deploymentId: 'cf_dep_test_998',
          url: 'https://site-123.pages.dev'
        }
      },
      requiresApprovalOverride: true
    });

    assert.strictEqual(record.approvalState, 'PENDING_APPROVAL');
    assert.strictEqual(record.approvalRequired, true);
    assert.strictEqual(record.executionState, 'PENDING_APPROVAL');

    // Operator decides to APPROVE
    const approvedRecord = await engine.decideApproval(record.id, {
      decision: 'APPROVE',
      approverId: 'operator_dan',
      approverRole: 'OWNER',
      reason: 'Reviewed and verified live'
    });

    assert.strictEqual(approvedRecord.approvalState, 'APPROVED');
    assert.strictEqual(approvedRecord.approvedBy, 'operator_dan');
    assert.strictEqual(approvedRecord.executionState, 'SUCCEEDED');
    assert.ok(approvedRecord.approvalSignature);
    assert.strictEqual(approvedRecord.resultPayload?.status, 'CONFIRMED_BY_PROVIDER');
  });

  it('rejects self-approval when requesting actor attempts to approve', async () => {
    const engine = UniversalActionEngineService.getInstance();
    const testTenant = `tenant_self_app_${Date.now()}`;

    const record = await engine.submitAction({
      tenantId: testTenant,
      actor: { id: 'operator_dan', role: 'OPERATOR', name: 'Dan Operator' },
      actionType: 'WEBSITE_DEPLOY_STATIC',
      provider: 'CLOUDFLARE_PAGES',
      input: { deploy: 'test' },
      requiresApprovalOverride: true
    });

    await assert.rejects(
      async () => {
        await engine.decideApproval(record.id, {
          decision: 'APPROVE',
          approverId: 'operator_dan', // Same as requesting actor
          approverRole: 'OWNER',
          reason: 'Self approval attempt'
        });
      },
      (err: any) => {
        assert.ok(err.message.includes('SELF_APPROVAL_REJECTED'));
        return true;
      }
    );
  });

  it('rejects approval from non-owner/non-admin roles', async () => {
    const engine = UniversalActionEngineService.getInstance();
    const testTenant = `tenant_unauth_app_${Date.now()}`;

    const record = await engine.submitAction({
      tenantId: testTenant,
      actor: { id: 'aria_agent', role: 'AI_AGENT' },
      actionType: 'COMMUNICATION_OUTBOUND_SMS',
      provider: 'TWILIO',
      input: { test: true },
      requiresApprovalOverride: true
    });

    await assert.rejects(
      async () => {
        await engine.decideApproval(record.id, {
          decision: 'APPROVE',
          approverId: 'viewer_bob',
          approverRole: 'VIEWER',
          reason: 'Viewer attempting approval'
        });
      },
      (err: any) => {
        assert.ok(err.message.includes('UNAUTHORIZED_APPROVER_ROLE'));
        return true;
      }
    );
  });

  it('handles action REJECTION with complete audit capture', async () => {
    const engine = UniversalActionEngineService.getInstance();
    const testTenant = `tenant_reject_${Date.now()}`;

    const record = await engine.submitAction({
      tenantId: testTenant,
      actor: { id: 'agent_lead', role: 'AI_AGENT' },
      actionType: 'COMMUNICATION_OUTBOUND_SMS',
      provider: 'TWILIO',
      input: { data: 'batch_blast', runNonce: Date.now() },
      requiresApprovalOverride: true
    });

    assert.strictEqual(record.approvalState, 'PENDING_APPROVAL');

    const rejectedRecord = await engine.decideApproval(record.id, {
      decision: 'REJECT',
      approverId: 'operator_dan',
      approverRole: 'OWNER',
      reason: 'Batch blast not permitted'
    });

    assert.strictEqual(rejectedRecord.approvalState, 'REJECTED');
    assert.strictEqual(rejectedRecord.executionState, 'REJECTED');
    assert.strictEqual(rejectedRecord.approvalReason, 'Batch blast not permitted');
  });

  it('enforces Emergency Pause fail-closed for all automation', async () => {
    const emergency = EmergencyControlService.getInstance();
    emergency.pauseGlobal({ reason: 'Emergency maintenance hold', actorId: 'operator_dan' });

    const engine = UniversalActionEngineService.getInstance();
    const testTenant = `tenant_pause_${Date.now()}`;

    const record = await engine.submitAction({
      tenantId: testTenant,
      actor: { id: 'aria_agent', role: 'AI_AGENT' },
      actionType: 'WEBSITE_DEPLOY_STATIC',
      provider: 'CLOUDFLARE_PAGES',
      input: { test: true, runNonce: Date.now() },
      requiresApprovalOverride: false
    });

    assert.strictEqual(record.executionState, 'AUTHORIZE_FAILED');
    assert.strictEqual(record.error?.code, 'EMERGENCY_PAUSED');

    // Clean up emergency pause for subsequent suites
    emergency.resumeGlobal({ actorId: 'test-runner', reason: 'Test suite cleanup' });
  });
});
