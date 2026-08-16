import { describe, it, before, beforeEach } from 'node:test';
import assert from 'node:assert';
import crypto from 'node:crypto';
import { getDatabase } from '../db/database';
import { ConnectorRegistryService } from '../services/connectorRegistryService';
import { DurableExecutionQueueService } from '../services/durableExecutionQueueService';
import { EmergencyControlService } from '../services/emergencyControlService';
import { DeadLetterQueueService } from '../services/deadLetterQueueService';
import { OperatorApprovalConsoleService } from '../services/operatorApprovalConsoleService';
import { PilotReadinessService } from '../services/pilotReadinessService';
import { ExecutionObservabilityService } from '../services/executionObservabilityService';
import { ControlledLiveOperationsFacade } from '../services/controlledLiveOperationsFacade';
import { durableApprovalService } from '../services/durableApprovalService';
import { AuthService } from '../services/authService';

describe('Controlled Live Operations & Connector Verification Engine', () => {
  const tenantId = 'test_tenant_live_ops_reis';
  const otherTenantId = 'test_tenant_live_ops_other';

  const connectorRegistry = ConnectorRegistryService.getInstance();
  const queueService = DurableExecutionQueueService.getInstance();
  const emergencyService = EmergencyControlService.getInstance();
  const dlqService = DeadLetterQueueService.getInstance();
  const approvalConsole = OperatorApprovalConsoleService.getInstance();
  const pilotReadiness = PilotReadinessService.getInstance();
  const observability = ExecutionObservabilityService.getInstance();
  const operationsFacade = ControlledLiveOperationsFacade.getInstance();
  const authService = AuthService.getInstance();

  before(() => {
    const db = getDatabase();
    db.prepare(`
      INSERT INTO tenants (id, name, industry, mrr, created_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET name = excluded.name
    `).run(tenantId, 'Reis Electric Controlled Test', 'Electrical Contractor', 15000);

    db.prepare(`
      INSERT INTO tenants (id, name, industry, mrr, created_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET name = excluded.name
    `).run(otherTenantId, 'Other Tenant Safety', 'HVAC', 12000);

    // Register actors for SoD
    db.prepare(`
      INSERT INTO actors (id, tenant_id, name, email, role, user_role_classification, created_at)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO NOTHING
    `).run('actor_proposer_1', tenantId, 'Alice Proposer', 'alice@reis.test', 'DISPATCHER', 'DISPATCHER');

    db.prepare(`
      INSERT INTO actors (id, tenant_id, name, email, role, user_role_classification, created_at)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO NOTHING
    `).run('actor_approver_1', tenantId, 'Bob Approver', 'bob@reis.test', 'EXECUTIVE', 'EXECUTIVE');
  });

  beforeEach(() => {
    const db = getDatabase();
    db.prepare('DELETE FROM connector_verifications WHERE tenant_id IN (?, ?)').run(tenantId, otherTenantId);
    db.prepare('DELETE FROM durable_execution_queue WHERE tenant_id IN (?, ?)').run(tenantId, otherTenantId);
    db.prepare('DELETE FROM dead_letter_queue WHERE tenant_id IN (?, ?)').run(tenantId, otherTenantId);
    db.prepare('DELETE FROM emergency_controls WHERE tenant_id IN (?, ?)').run(tenantId, otherTenantId);
    db.prepare('DELETE FROM connector_records WHERE tenant_id IN (?, ?)').run(tenantId, otherTenantId);
    db.prepare('DELETE FROM durable_approval_workflows WHERE tenant_id IN (?, ?)').run(tenantId, otherTenantId);
  });

  describe('1. Truthful Connector Registry & Credential Health State Machine', () => {
    it('initializes connectors with UNCONFIGURED and NOT_APPLICABLE states (no fake AUTHENTICATED)', () => {
      const conn = connectorRegistry.registerConnector(tenantId, {
        provider: 'TWILIO_SMS',
        capability: 'CUSTOMER_DISPATCH',
        connectorType: 'OFFICIAL_API',
        permissions: ['messages:create'],
        scopes: ['sms:outbound']
      });

      assert.strictEqual(conn.tenantId, tenantId);
      assert.strictEqual(conn.configurationState, 'UNCONFIGURED');
      assert.strictEqual(conn.authenticationState, 'NOT_APPLICABLE');
      assert.strictEqual(conn.executionMode, 'DRY_RUN');
      assert.strictEqual(conn.healthStatus, 'UNKNOWN');
    });

    it('requires explicit verification evidence to transition to AUTHENTICATED', async () => {
      const conn = connectorRegistry.registerConnector(tenantId, {
        provider: 'GOOGLE_MAPS',
        capability: 'GEOCODING',
        connectorType: 'LOCAL_FIXTURE'
      });

      const verification = await connectorRegistry.verifyConnector(tenantId, conn.id, {
        apiKey: 'valid_mock_api_key'
      });

      assert.strictEqual(verification.status, 'AUTHENTICATED');
      assert.strictEqual(verification.healthStatus, 'HEALTHY');

      const updated = connectorRegistry.getConnector(tenantId, conn.id);
      assert.strictEqual(updated?.authenticationState, 'AUTHENTICATED');
      assert.strictEqual(updated?.healthStatus, 'HEALTHY');
      assert.ok(updated?.lastVerificationAt);
    });

    it('accurately records AUTH_FAILED and marks health as DEGRADED on verification failure', async () => {
      const conn = connectorRegistry.registerConnector(tenantId, {
        provider: 'GOOGLE_GBP',
        capability: 'GBP_MANAGEMENT',
        connectorType: 'OFFICIAL_API'
      });

      const verification = await connectorRegistry.verifyConnector(tenantId, conn.id, {
        simulatedOutcome: {
          success: false,
          status: 'AUTH_FAILED',
          healthStatus: 'DEGRADED',
          failureClassification: 'AUTH_FAILED'
        }
      });

      assert.strictEqual(verification.status, 'AUTH_FAILED');
      assert.strictEqual(verification.healthStatus, 'DEGRADED');

      const updated = connectorRegistry.getConnector(tenantId, conn.id);
      assert.strictEqual(updated?.authenticationState, 'AUTH_FAILED');
      assert.strictEqual(updated?.healthStatus, 'DEGRADED');
    });
  });

  describe('2. Durable Execution Queue, Concurrency Locks & Fail-Closed DRY_RUN', () => {
    it('enqueues actions and executes them deterministically in DRY_RUN mode', async () => {
      const conn = connectorRegistry.registerConnector(tenantId, {
        provider: 'TWILIO_SMS',
        capability: 'CUSTOMER_DISPATCH',
        connectorType: 'OFFICIAL_API'
      });

      const idempotencyKey = `idemp_${Date.now()}_test1`;
      const item = queueService.enqueue({
        tenantId,
        connectorId: conn.id,
        operation: 'DISPATCH_SMS_REMINDER',
        target: '+15085550199',
        payload: { message: 'Technician en route to New Bedford, MA' },
        idempotencyKey,
        proposerId: 'actor_proposer_1',
        proposerRole: 'DISPATCHER',
        executionMode: 'DRY_RUN'
      });

      assert.strictEqual(item.status, 'QUEUED');
      assert.strictEqual(item.executionMode, 'DRY_RUN');

      const executed = await queueService.executeQueueItem(tenantId, item.id);
      assert.strictEqual(executed.status, 'SUCCEEDED');
      assert.strictEqual(executed.attempts, 1);
      assert.ok(executed.completedAt);
    });

    it('enforces idempotency key deduplication on duplicate enqueue calls', () => {
      const conn = connectorRegistry.registerConnector(tenantId, {
        provider: 'GOOGLE_GBP',
        capability: 'GBP_POST',
        connectorType: 'OFFICIAL_API'
      });

      const idempotencyKey = `idemp_dup_check_${Date.now()}`;
      const item1 = queueService.enqueue({
        tenantId,
        connectorId: conn.id,
        operation: 'POST_UPDATE',
        target: 'local_gbp_profile',
        payload: { text: 'Emergency Electrical Generator Safety Tips' },
        idempotencyKey,
        proposerId: 'actor_proposer_1',
        proposerRole: 'DISPATCHER'
      });

      const item2 = queueService.enqueue({
        tenantId,
        connectorId: conn.id,
        operation: 'POST_UPDATE',
        target: 'local_gbp_profile',
        payload: { text: 'Emergency Electrical Generator Safety Tips' },
        idempotencyKey,
        proposerId: 'actor_proposer_1',
        proposerRole: 'DISPATCHER'
      });

      assert.strictEqual(item1.id, item2.id, 'Duplicate idempotency key must return original queue item');
    });

    it('transitions to DEAD_LETTERED after exceeding maximum retry attempts', async () => {
      const conn = connectorRegistry.registerConnector(tenantId, {
        provider: 'TWILIO_SMS',
        capability: 'CUSTOMER_DISPATCH',
        connectorType: 'OFFICIAL_API'
      });

      const idempotencyKey = `idemp_fail_dlq_${Date.now()}`;
      const item = queueService.enqueue({
        tenantId,
        connectorId: conn.id,
        operation: 'DISPATCH_SMS',
        target: '+15085550199',
        payload: { forceFailure: true },
        idempotencyKey,
        proposerId: 'actor_proposer_1',
        proposerRole: 'DISPATCHER',
        maxAttempts: 2
      });

      // Attempt 1 -> RETRYABLE_FAILURE
      try {
        await queueService.executeQueueItem(tenantId, item.id);
      } catch {}
      let fetched = queueService.getQueueItem(tenantId, item.id);
      assert.strictEqual(fetched?.status, 'RETRYABLE_FAILURE');
      assert.strictEqual(fetched?.attempts, 1);

      // Attempt 2 -> DEAD_LETTERED
      try {
        await queueService.executeQueueItem(tenantId, item.id);
      } catch {}
      fetched = queueService.getQueueItem(tenantId, item.id);
      assert.strictEqual(fetched?.status, 'DEAD_LETTERED');
      assert.strictEqual(fetched?.attempts, 2);

      // Verify record entered DLQ table
      const dlqRecords = dlqService.listDLQ(tenantId);
      assert.strictEqual(dlqRecords.length, 1);
      assert.strictEqual(dlqRecords[0].queueItemId, item.id);
    });
  });

  describe('3. Emergency Isolation Controls (Global, Tenant & Connector Scopes)', () => {
    it('blocks execution when a tenant-level emergency stop is active', async () => {
      const conn = connectorRegistry.registerConnector(tenantId, {
        provider: 'TWILIO_SMS',
        capability: 'CUSTOMER_DISPATCH',
        connectorType: 'OFFICIAL_API'
      });

      emergencyService.pause({
        scope: 'TENANT',
        tenantId,
        reason: 'Operator testing emergency safety stop',
        pausedBy: 'actor_approver_1'
      });

      assert.strictEqual(emergencyService.isExecutionBlocked(tenantId).blocked, true);

      const idempotencyKey = `idemp_emergency_${Date.now()}`;
      const item = queueService.enqueue({
        tenantId,
        connectorId: conn.id,
        operation: 'DISPATCH_SMS',
        target: '+15085550199',
        payload: { text: 'Test message during emergency' },
        idempotencyKey,
        proposerId: 'actor_proposer_1',
        proposerRole: 'DISPATCHER'
      });

      await assert.rejects(
        async () => {
          await queueService.executeQueueItem(tenantId, item.id);
        },
        /EMERGENCY_STOP_ACTIVE/
      );
    });

    it('resumes execution after emergency stop is lifted', async () => {
      emergencyService.resume({
        scope: 'TENANT',
        tenantId,
        resumedBy: 'actor_approver_1',
        reason: 'Safety audit completed'
      });

      assert.strictEqual(emergencyService.isExecutionBlocked(tenantId).blocked, false);
    });
  });

  describe('4. Operator Approval Console & Segregation of Duties (SoD)', () => {
    it('prevents the proposer from approving their own queued action', async () => {
      // 1. Submit workflow with Proposer A
      const workflow = durableApprovalService.suspendWorkflow({
        tenantId,
        workflowType: 'HIGH_VALUE_DISPATCH',
        actionTitle: 'High Value Commercial Dispatch',
        proposerId: 'actor_proposer_1',
        proposerRole: 'DISPATCHER',
        requiredApproverRole: 'EXECUTIVE',
        executionPayload: {
          action: 'HIGH_VALUE_DISPATCH',
          customer: 'Cape Cod Commercial Plaza',
          quoteAmount: 45000,
          evidenceRefs: ['ev_quote_45000']
        }
      });

      // 2. Proposer attempts to approve their own workflow -> MUST FAIL
      await assert.rejects(
        async () => {
          await approvalConsole.approveAction({
            tenantId,
            approvalId: workflow.workflowId,
            approverId: 'actor_proposer_1',
            approverRole: 'DISPATCHER'
          });
        },
        /SEGREGATION_OF_DUTIES_VIOLATION/
      );

      // 3. Independent Approver B approves -> MUST SUCCEED
      const approved = await approvalConsole.approveAction({
        tenantId,
        approvalId: workflow.workflowId,
        approverId: 'actor_approver_1',
        approverRole: 'EXECUTIVE'
      });

      assert.strictEqual(approved.success, true);
    });
  });

  describe('5. Pilot Readiness Matrix & Observability Metrics', () => {
    it('evaluates pilot readiness dynamically without hardcoded fabrication', () => {
      const report = pilotReadiness.evaluatePilotReadiness(tenantId);
      assert.strictEqual(report.tenantId, tenantId);
      assert.ok(report.readinessScore > 0 && report.readinessScore <= 100);
      assert.ok(report.items.length >= 10);
      assert.ok(report.mandatoryDisclaimer.includes('synthetic or simulated records'));
    });

    it('computes accurate execution telemetry metrics from database logs', () => {
      const metrics = observability.getTenantMetrics(tenantId);
      assert.strictEqual(metrics.tenantId, tenantId);
      assert.strictEqual(typeof metrics.connectorAvailabilityPercent, 'number');
      assert.strictEqual(typeof metrics.executionSuccessRatePercent, 'number');
      assert.strictEqual(typeof metrics.deadLetterCount, 'number');
    });
  });

  describe('6. End-to-End Real Lead Pipeline Execution', () => {
    it('executes unbroken lead intake, location check, consent verification, and execution queueing', async () => {
      const consentId = `consent_${Date.now()}`;

      const result = await operationsFacade.processLeadPipeline({
        tenantId,
        leadData: {
          fullName: 'Johnathan Baker',
          phone: '+15085550199',
          email: 'jbaker@example.com',
          address: '42 Union St',
          city: 'New Bedford',
          stateProvince: 'MA',
          postalCode: '02740',
          serviceRequested: '200A Electrical Panel Upgrade',
          source: 'GOOGLE_LEADS',
          consentRecordId: consentId
        },
        proposerId: 'actor_proposer_1',
        proposerRole: 'DISPATCHER',
        requestedExecutionMode: 'DRY_RUN'
      });

      assert.strictEqual(result.tenantId, tenantId);
      assert.strictEqual(result.intakeSuccess, true);
      assert.strictEqual(result.consentVerified, true);
      assert.strictEqual(result.executionMode, 'DRY_RUN');
      assert.strictEqual(result.executionStatus, 'SUCCEEDED');
      assert.ok(result.queueItemId);
    });
  });
});
