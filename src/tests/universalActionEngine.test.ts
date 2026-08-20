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

  it('handles actions requiring approval through PENDING_APPROVAL and APPROVE lifecycle', async () => {
    const engine = UniversalActionEngineService.getInstance();
    const connectorService = AuthoritativeConnectorRegistryService.getInstance();
    const testTenant = `tenant_approval_${Date.now()}`;

    // Configure and verify connector for this tenant
    connectorService.configureTenantConnector(testTenant, {
      provider: 'CLOUDFLARE_PAGES',
      credentials: { apiKey: 'cf_test_key_123' },
      configuredBy: 'operator-1'
    });
    connectorService.verifyTenantConnector(testTenant, 'CLOUDFLARE_PAGES', { simulateSuccess: true });

    const record = await engine.submitAction({
      tenantId: testTenant,
      actor: { id: 'aria_agent', role: 'AI_AGENT', name: 'Aria AI' },
      actionType: 'WEBSITE_DEPLOY_STATIC',
      provider: 'CLOUDFLARE_PAGES',
      input: { siteId: 'site_123', deployTarget: 'production', runNonce: Date.now() },
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
    assert.strictEqual(approvedRecord.resultPayload?.status, 'CONFIRMED_BY_PROVIDER');
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
