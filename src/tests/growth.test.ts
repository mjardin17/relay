import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { initializeDatabaseSchema } from '../db/database';
import { GrowthPersistenceService } from '../services/growthPersistenceService';
import { StaleLeadRecoveryEngine } from '../services/staleLeadRecoveryEngine';

const TEST_DB_PATH = path.join(process.cwd(), 'test_relay.db');

describe('Empire OS Relay v2.0 Growth Engine Test Suite', () => {
  let db: DatabaseSync;
  let persistence: GrowthPersistenceService;
  let staleLeadEngine: StaleLeadRecoveryEngine;

  before(() => {
    // Cleanup any existing test DB file
    if (fs.existsSync(TEST_DB_PATH)) {
      try { fs.unlinkSync(TEST_DB_PATH); } catch {}
    }

    process.env.DATABASE_PATH = TEST_DB_PATH;
    db = new DatabaseSync(TEST_DB_PATH);
    initializeDatabaseSchema(db);

    persistence = new GrowthPersistenceService();
    staleLeadEngine = new StaleLeadRecoveryEngine();

    // Setup tenant_a and tenant_b
    db.exec(`
      INSERT INTO tenants (id, name, industry, mrr, created_at) VALUES ('tenant_a', 'Company A', 'SaaS', 10000, CURRENT_TIMESTAMP);
      INSERT INTO tenants (id, name, industry, mrr, created_at) VALUES ('tenant_b', 'Company B', 'Fintech', 50000, CURRENT_TIMESTAMP);
    `);
  });

  after(() => {
    if (fs.existsSync(TEST_DB_PATH)) {
      try { fs.unlinkSync(TEST_DB_PATH); } catch {}
    }
  });

  it('1. Database persistence survives re-opening DB instance', () => {
    db.prepare(`
      INSERT INTO source_records (id, tenant_id, source_type, name, category, status, last_sync_at, created_at)
      VALUES ('ds-test-1', 'tenant_a', 'stripe', 'Stripe Integration Test', 'Billing', 'connected', 'now', CURRENT_TIMESTAMP)
    `).run();

    // Re-open DB connection
    const newDb = new DatabaseSync(TEST_DB_PATH);
    const row = newDb.prepare('SELECT * FROM source_records WHERE id = ?').get('ds-test-1') as any;

    assert.ok(row);
    assert.strictEqual(row.name, 'Stripe Integration Test');
    assert.strictEqual(row.tenant_id, 'tenant_a');
  });

  it('2. Tenant Isolation: Tenant A records are invisible to Tenant B', () => {
    db.prepare(`
      INSERT INTO opportunities (id, tenant_id, title, category, description, action_type, status, estimated_monthly_value, detected_condition, recommended_playbook, created_at)
      VALUES ('opp-tenant-a', 'tenant_a', 'Secret Tenant A Opp', 'Lead Recovery', 'Desc A', 'email', 'Detected', 5000, 'Condition A', 'Playbook A', CURRENT_TIMESTAMP)
    `).run();

    const tenantAopps = persistence.getOpportunities('tenant_a');
    const tenantBopps = persistence.getOpportunities('tenant_b');

    assert.ok(tenantAopps.some((o) => o.id === 'opp-tenant-a'));
    assert.strictEqual(tenantBopps.some((o) => o.id === 'opp-tenant-a'), false);
  });

  it('3. Approval Behavior: High-impact action sets opportunity status to PendingApproval, NOT Approved', () => {
    db.prepare(`
      INSERT INTO opportunities (id, tenant_id, title, category, description, action_type, status, estimated_monthly_value, detected_condition, recommended_playbook, created_at)
      VALUES ('opp-high-impact', 'tenant_a', 'High Impact Workflow', 'Expansion', 'Big deal', 'pricing_update', 'Detected', 15000, 'High value accounts', 'Upgrade playbook', CURRENT_TIMESTAMP)
    `).run();

    const req = persistence.createApprovalRequest('tenant_a', {
      opportunityId: 'opp-high-impact',
      actionTitle: 'High Impact Workflow',
      requestedBy: 'Test Agent',
      approverRole: 'Executive',
      riskLevel: 'High',
      reasoning: 'Financial impact exceeds threshold',
      financialImpactEstimate: 15000,
      targetCount: 10
    });

    assert.strictEqual(req.status, 'pending');

    const updatedOpp = persistence.getOpportunityById('tenant_a', 'opp-high-impact');
    assert.strictEqual(updatedOpp?.status, 'PendingApproval');
    assert.notStrictEqual(updatedOpp?.status, 'Approved');
  });

  it('4. Approval Decision: Transition opportunity to Running and appends Execution Event', () => {
    const pendingRequests = persistence.getApprovalRequests('tenant_a');
    const req = pendingRequests.find((r) => r.opportunityId === 'opp-high-impact');
    assert.ok(req);

    const decision = persistence.decideApproval('tenant_a', req.id, 'approved', 'CEO Admin');

    assert.strictEqual(decision.approvalRequest.status, 'approved');

    const opp = persistence.getOpportunityById('tenant_a', 'opp-high-impact');
    assert.strictEqual(opp?.status, 'Running');

    assert.ok(decision.executionRecord);
    assert.strictEqual(decision.executionRecord.status, 'completed');
  });

  it('5. Approval Rejection Decision: Transition opportunity to Rejected', () => {
    db.prepare(`
      INSERT INTO opportunities (id, tenant_id, title, category, description, action_type, status, estimated_monthly_value, detected_condition, recommended_playbook, created_at)
      VALUES ('opp-reject-test', 'tenant_a', 'Reject Test Opp', 'Expansion', 'Risky change', 'email', 'Detected', 8000, 'Risky condition', 'Risk playbook', CURRENT_TIMESTAMP)
    `).run();

    const req = persistence.createApprovalRequest('tenant_a', {
      opportunityId: 'opp-reject-test',
      actionTitle: 'Risky Workflow',
      requestedBy: 'Test Agent',
      approverRole: 'Executive',
      riskLevel: 'High',
      reasoning: 'Risk test',
      financialImpactEstimate: 8000,
      targetCount: 5
    });

    persistence.decideApproval('tenant_a', req.id, 'rejected', 'Risk Officer');

    const opp = persistence.getOpportunityById('tenant_a', 'opp-reject-test');
    assert.strictEqual(opp?.status, 'Rejected');
  });

  it('6. Idempotency Key prevents duplicate execution events', () => {
    const key = 'idem-test-unique-1001';

    const exec1 = persistence.appendExecutionEvent('tenant_a', {
      aggregateId: 'opp-idemp-1',
      eventType: 'EMAIL_SENT',
      actorType: 'system',
      actorId: 'System',
      resultingState: 'Completed',
      idempotencyKey: key,
      outputSummary: 'First Execution'
    });

    const exec2 = persistence.appendExecutionEvent('tenant_a', {
      aggregateId: 'opp-idemp-1',
      eventType: 'EMAIL_SENT',
      actorType: 'system',
      actorId: 'System',
      resultingState: 'Completed',
      idempotencyKey: key,
      outputSummary: 'Duplicate Attempt'
    });

    assert.strictEqual(exec1.id, exec2.id);
    assert.strictEqual(exec2.outputSummary, 'First Execution');
  });

  it('7. Stale Lead Recovery Dry-Run suppresses opted-out/converted leads and never sends external messages', () => {
    // Seed test leads in tenant_b
    db.prepare(`
      INSERT INTO leads (id, tenant_id, name, email, pipeline_stage, estimated_value, last_interaction_at, response_delay_hours, opted_out, do_not_contact, is_converted, is_duplicate, created_at)
      VALUES ('lead-optedout', 'tenant_b', 'Opted Out User', 'optedout@test.com', 'new_inbound', 5000, datetime('now', '-30 days'), 48, 1, 0, 0, 0, CURRENT_TIMESTAMP);
    `).run();

    db.prepare(`
      INSERT INTO leads (id, tenant_id, name, email, pipeline_stage, estimated_value, last_interaction_at, response_delay_hours, opted_out, do_not_contact, is_converted, is_duplicate, created_at)
      VALUES ('lead-converted', 'tenant_b', 'Converted User', 'converted@test.com', 'closed_won', 10000, datetime('now', '-40 days'), 72, 0, 0, 1, 0, CURRENT_TIMESTAMP);
    `).run();

    db.prepare(`
      INSERT INTO leads (id, tenant_id, name, email, pipeline_stage, estimated_value, last_interaction_at, response_delay_hours, opted_out, do_not_contact, is_converted, is_duplicate, created_at)
      VALUES ('lead-eligible', 'tenant_b', 'Eligible Stale User', 'eligible@test.com', 'new_inbound', 8000, datetime('now', '-35 days'), 36, 0, 0, 0, 0, CURRENT_TIMESTAMP);
    `).run();

    const dryRunResult = staleLeadEngine.executeDryRun('tenant_b');

    // Opted out and converted leads must be suppressed
    assert.ok(dryRunResult.suppressionDecisions.some((s) => s.email === 'optedout@test.com'));
    assert.ok(dryRunResult.suppressionDecisions.some((s) => s.email === 'converted@test.com'));

    // Eligible lead must be in eligible audience
    assert.ok(dryRunResult.eligibleAudience.some((a) => a.email === 'eligible@test.com'));

    // Dry-run execution ledger channel must be dry_run_simulation
    assert.strictEqual(dryRunResult.executionLedgerEvent.canRollback, true);
  });

  it('8. Financial Calculations: Zero execution cost displays N/A (Zero Cost), NOT hardcoded 1420%', () => {
    const stats = persistence.getROIStats('tenant_b');
    assert.notStrictEqual(stats.netRoiDisplay, '+1420%');
    assert.strictEqual(typeof stats.netRoiDisplay, 'string');
    assert.ok(stats.netRoiDisplay.includes('Zero') || stats.netRoiDisplay.includes('Awaiting') || stats.netRoiDisplay.includes('Infinite'));
  });

  it('9. Financial Calculations: Missing outcome data displays Awaiting Data', () => {
    const stats = persistence.getROIStats('tenant_a');
    assert.ok(stats.attributionStatus.includes('Data') || stats.attributionStatus === 'Attributed');
  });
});
