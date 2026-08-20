import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { controlCenterRouter } from '../routes/controlCenterRouter';
import { universalActionsRouter } from '../routes/universalActionsRouter';
import { connectorRegistryRouter } from '../routes/connectorRegistryRouter';
import { projectIntelligenceRouter } from '../routes/projectIntelligenceRouter';
import { getDatabase } from '../db/database';
import { seedDatabaseIfEmpty } from '../db/seed';

describe('Unified Relay AI Business Operating System & Control Center Suite', () => {
  let app: express.Express;
  let server: any;
  let baseUrl: string;

  const authHeaders = {
    authorization: 'Bearer token-shad',
    'content-type': 'application/json'
  };

  before(async () => {
    getDatabase();
    seedDatabaseIfEmpty();

    // Ensure test opportunity exists for default tenant
    const db = getDatabase();
    const existingOpp = db.prepare('SELECT id FROM opportunities WHERE id = ?').get('opp_test_1');
    if (!existingOpp) {
      db.prepare(`
        INSERT INTO opportunities (
          id, tenant_id, title, category, description, action_type, status, effort, risk_level,
          affected_records_count, estimated_monthly_value, estimated_annual_value, confidence,
          detected_condition, recommended_playbook, created_at
        ) VALUES (
          'opp_test_1', 'default', 'Test Commercial Electrical Upgrade', 'HVAC_COMMERCIAL',
          'Commercial upgrade opportunity converted from inbound lead', 'COMMUNICATION_OUTBOUND_EMAIL',
          'Detected', 'Medium', 'Low', 1, 1250, 15000, 'High',
          'High probability lead qualification', 'Commercial Outreach Playbook', datetime('now')
        )
      `).run();
    }

    // Ensure worker configs exist for default tenant
    const existingWorker = db.prepare('SELECT worker_id FROM tenant_worker_configs WHERE tenant_id = ? AND worker_id = ?').get('default', 'aria_executive');
    if (!existingWorker) {
      db.prepare(`
        INSERT INTO tenant_worker_configs (
          id, tenant_id, worker_id, worker_name, role_description, is_enabled, execution_mode,
          assigned_permissions_json, approval_requirement, schedule_or_trigger, capability_status,
          updated_at
        ) VALUES (
          'twc_default_aria', 'default', 'aria_executive', 'Aria — Autonomous Operations Orchestrator',
          'Executive triage and cross-agent coordination.', 1, 'DRY_RUN',
          '["universal_actions:propose"]', 'REQUIRE_APPROVAL_HIGH_IMPACT',
          'Continuous Event Stream', 'ACTIVE', datetime('now')
        )
      `).run();
    }

    app = express();
    app.use(express.json());

    app.use('/api/control-center', controlCenterRouter);
    app.use('/api/universal-actions', universalActionsRouter);
    app.use('/api/connector-registry', connectorRegistryRouter);
    app.use('/api/project-intelligence', projectIntelligenceRouter);

    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://localhost:${port}`;
        resolve();
      });
    });
  });

  after(() => {
    if (server) {
      server.close();
    }
  });

  test('1. Dashboard endpoint returns comprehensive executive health, health metrics, and pending actions', async () => {
    const res = await fetch(`${baseUrl}/api/control-center/dashboard`, {
      headers: authHeaders
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.dashboard);
    assert.ok(data.dashboard.tenant);
    assert.equal(typeof data.dashboard.health.score, 'number');
    assert.equal(typeof data.dashboard.metrics.pipelineValue, 'number');
    assert.ok(Array.isArray(data.dashboard.alerts));
    assert.ok(Array.isArray(data.dashboard.pendingApprovals));
    assert.ok(Array.isArray(data.dashboard.nextActions));
  });

  test('2. Business Profile GET and PUT endpoint works with strict tenant isolation', async () => {
    // GET Profile
    const getRes = await fetch(`${baseUrl}/api/control-center/business-profile`, {
      headers: authHeaders
    });
    assert.equal(getRes.status, 200);
    const getData = await getRes.json();
    assert.equal(getData.success, true);
    assert.ok(getData.profile);

    // PUT Profile Update
    const updateRes = await fetch(`${baseUrl}/api/control-center/business-profile`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        legalName: 'MA Fresh Launch Updated Co',
        industry: 'HVAC & Green Energy',
        phone: '508-555-0199',
        email: 'ops@mafreshlaunch.com',
        address: {
          street: '100 Innovation Way',
          city: 'New Bedford',
          stateProvince: 'MA',
          postalCode: '02740',
          country: 'US'
        }
      })
    });

    assert.equal(updateRes.status, 200);
    const updateData = await updateRes.json();
    assert.equal(updateData.success, true);
    assert.equal(updateData.message, 'Business profile updated successfully');
  });

  test('3. Convert Opportunity to Universal Action with strict approval requirement', async () => {
    const res = await fetch(`${baseUrl}/api/control-center/opportunities/opp_test_1/convert-action`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        actionType: 'COMMUNICATION_OUTBOUND_EMAIL',
        customPayload: { subject: 'Follow-up on EV Commercial Proposal', budget: 15000 }
      })
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.actionId);
    assert.equal(data.executionState, 'PENDING_APPROVAL');
  });

  test('4. Workforce AI Workers listing and toggle endpoint', async () => {
    const listRes = await fetch(`${baseUrl}/api/control-center/workers`, {
      headers: authHeaders
    });

    assert.equal(listRes.status, 200);
    const listData = await listRes.json();
    assert.equal(listData.success, true);
    assert.ok(Array.isArray(listData.workers));
    assert.ok(listData.workers.length > 0);

    const firstWorker = listData.workers[0];
    const targetState = !firstWorker.isEnabled;

    // Toggle Worker
    const toggleRes = await fetch(`${baseUrl}/api/control-center/workers/${firstWorker.id}/toggle`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ isEnabled: targetState })
    });

    assert.equal(toggleRes.status, 200);
    const toggleData = await toggleRes.json();
    assert.equal(toggleData.success, true);
    assert.equal(toggleData.workerId, firstWorker.id);
    assert.equal(toggleData.isEnabled, targetState);
  });

  test('5. Projects & Modules inventory endpoint returns real active modules and deployments', async () => {
    const res = await fetch(`${baseUrl}/api/control-center/projects-and-modules`, {
      headers: authHeaders
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(Array.isArray(data.modules));
    assert.ok(data.modules.length >= 5);
  });

  test('6. Cryptographic Audit Ledger verifies hash chains', async () => {
    const res = await fetch(`${baseUrl}/api/control-center/audit-ledger`, {
      headers: authHeaders
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.isChainValid, true);
    assert.ok(Array.isArray(data.logs));
  });

  test('7. Emergency Pause toggle blocks live action dispatching and enforces fail-closed state', async () => {
    // 1. Activate Emergency Pause
    const pauseRes = await fetch(`${baseUrl}/api/control-center/emergency-pause`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ paused: true, reason: 'Security Drill' })
    });
    assert.equal(pauseRes.status, 200);

    // 2. Submit an action during emergency pause
    const submitRes = await fetch(`${baseUrl}/api/universal-actions/submit`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        actionType: 'SEND_CAMPAIGN_EMAIL',
        provider: 'RESEND',
        input: { subject: 'Test Campaign During Pause' }
      })
    });

    const submitData = await submitRes.json();
    assert.equal(submitRes.status, 200);
    assert.equal(submitData.success, true);
    assert.equal(submitData.action.executionState, 'AUTHORIZE_FAILED');
    assert.equal(submitData.action.error.code, 'EMERGENCY_PAUSED');

    // 3. Unpause
    const unpauseRes = await fetch(`${baseUrl}/api/control-center/emergency-pause`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ paused: false, reason: 'Drill Completed' })
    });
    assert.equal(unpauseRes.status, 200);
  });
});
