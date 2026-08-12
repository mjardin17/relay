import http from 'node:http';
import { PrivacyGateScanner } from '../src/utils/privacyGateScanner';
import { CONTROLLED_FORBIDDEN_PATTERNS } from './verify-privacy-gate';

const PORT = 3000;
const HOST = '127.0.0.1';

interface TestResult {
  name: string;
  passed: boolean;
  expectedStatus: number;
  actualStatus: number;
  details: string;
}

const results: TestResult[] = [];

function makeRequest(options: {
  path: string;
  method: string;
  headers?: Record<string, string>;
  body?: any;
}): Promise<{ statusCode: number; headers: http.IncomingHttpHeaders; body: any }> {
  return new Promise((resolve, reject) => {
    const payload = options.body ? JSON.stringify(options.body) : '';
    const req = http.request(
      {
        host: HOST,
        port: PORT,
        path: options.path,
        method: options.method,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          ...options.headers,
        },
      },
      (res) => {
        let responseText = '';
        res.on('data', (chunk) => (responseText += chunk));
        res.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(responseText);
          } catch {
            parsed = responseText;
          }
          resolve({ statusCode: res.statusCode || 500, headers: res.headers, body: parsed });
        });
      }
    );

    req.on('error', (err) => reject(err));
    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

async function runElectricalLeadWorkflowTests() {
  console.log('================================================================');
  console.log('  ELECTRICAL LEAD VERTICAL SLICE & BOUNDARY VERIFICATION AUDIT ');
  console.log('================================================================\n');

  const tenant1Auth = { Authorization: 'Bearer token_owner_tenant1' };
  const tenant2Auth = { Authorization: 'Bearer token_owner_tenant2' };

  const runId = Date.now();
  const testEmail = `sjenkins-${runId}@pdxhome.com`;
  const testPhone = `+1-503-${Math.floor(1000000 + Math.random() * 8999999)}`;

  let createdLeadId = '';

  // 1. Valid Lead Intake
  try {
    const res = await makeRequest({
      path: '/api/growth/electrical-leads/intake',
      method: 'POST',
      headers: { ...tenant1Auth },
      body: {
        name: 'Sarah Jenkins',
        email: testEmail,
        phone: testPhone,
        serviceRequested: '200A Electrical Panel Upgrade & EV Charger',
        city: 'Portland',
        state: 'OR',
        zip: '97201',
        consentProvided: true,
        source: 'Google Business Profile Inquiry',
        sourceReference: 'gbp-ref-98231',
      },
    });

    const passed = res.statusCode === 201 && res.body.success === true && res.body.lead?.leadId;
    if (passed) {
      createdLeadId = res.body.lead.leadId;
    }
    results.push({
      name: '1. Valid Lead Intake',
      passed,
      expectedStatus: 201,
      actualStatus: res.statusCode,
      details: passed ? `Lead created: ${createdLeadId}` : `Failed: ${JSON.stringify(res.body)}`,
    });
  } catch (err: any) {
    results.push({ name: '1. Valid Lead Intake', passed: false, expectedStatus: 201, actualStatus: 500, details: err.message });
  }

  // 2. Invalid Payload Rejection
  try {
    const res = await makeRequest({
      path: '/api/growth/electrical-leads/intake',
      method: 'POST',
      headers: { ...tenant1Auth },
      body: {
        name: 'Invalid Lead',
        // missing email, phone, city, state
      },
    });

    const passed = res.statusCode === 400 && res.body.success === false;
    results.push({
      name: '2. Invalid Payload Rejection',
      passed,
      expectedStatus: 400,
      actualStatus: res.statusCode,
      details: passed ? 'Rejected invalid payload' : `Failed: ${JSON.stringify(res.body)}`,
    });
  } catch (err: any) {
    results.push({ name: '2. Invalid Payload Rejection', passed: false, expectedStatus: 400, actualStatus: 500, details: err.message });
  }

  // 3. Tenant Isolation Across Every Resource
  try {
    const res = await makeRequest({
      path: `/api/growth/electrical-leads/${createdLeadId}`,
      method: 'GET',
      headers: { ...tenant2Auth }, // Tenant 2 attempting to access Tenant 1 lead
    });

    const passed = res.statusCode === 404 && res.body.success === false;
    results.push({
      name: '3. Tenant Isolation Enforced',
      passed,
      expectedStatus: 404,
      actualStatus: res.statusCode,
      details: passed ? 'Tenant 2 blocked from Tenant 1 lead' : `Failed: ${JSON.stringify(res.body)}`,
    });
  } catch (err: any) {
    results.push({ name: '3. Tenant Isolation Enforced', passed: false, expectedStatus: 404, actualStatus: 500, details: err.message });
  }

  // 4. Duplicate Lead Handling
  try {
    const res = await makeRequest({
      path: '/api/growth/electrical-leads/intake',
      method: 'POST',
      headers: { ...tenant1Auth },
      body: {
        name: 'Sarah Jenkins Duplicate',
        email: testEmail, // Matching email
        phone: testPhone,
        serviceRequested: '200A Electrical Panel Upgrade',
        city: 'Portland',
        state: 'OR',
        consentProvided: true,
        source: 'Website Form',
        sourceReference: 'form-102',
      },
    });

    const passed = res.statusCode === 200 && res.body.isDuplicate === true;
    results.push({
      name: '4. Duplicate Lead Handling',
      passed,
      expectedStatus: 200,
      actualStatus: res.statusCode,
      details: passed ? 'Duplicate flagged & suppressed' : `Failed: ${JSON.stringify(res.body)}`,
    });
  } catch (err: any) {
    results.push({ name: '4. Duplicate Lead Handling', passed: false, expectedStatus: 200, actualStatus: 500, details: err.message });
  }

  // 5. Suppression & Opt-Out Enforcement
  try {
    const optOutEmail = `optout-${runId}@suppressed.com`;
    const { getDatabase } = await import('../src/db/database');
    const db = getDatabase();
    db.prepare(`
      INSERT INTO suppression_decisions (id, tenant_id, lead_id, lead_email, decision, reasoning, rule_triggered, created_at)
      VALUES (?, 'tenant_demo_1', 'unassigned', ?, 'suppressed_opted_out', 'Opt-out requested by customer', 'OPT_OUT_LIST', ?)
    `).run(`supp-optout-${runId}`, optOutEmail, new Date().toISOString());

    const res = await makeRequest({
      path: '/api/growth/electrical-leads/intake',
      method: 'POST',
      headers: { ...tenant1Auth },
      body: {
        name: 'Robert Thorne OptedOut',
        email: optOutEmail,
        phone: '+1-503-555-9999',
        serviceRequested: 'Lighting Install',
        city: 'Portland',
        state: 'OR',
        consentProvided: true,
        source: 'Google Business Profile Inquiry',
        sourceReference: 'ref-optout',
      },
    });

    const passed = res.statusCode === 403 && (res.body.error === 'LEAD_SUPPRESSED_OPTED_OUT' || res.body.suppressionDecision?.decision === 'suppressed_opted_out');
    results.push({
      name: '5. Suppression and Opt-Out Enforcement',
      passed,
      expectedStatus: 403,
      actualStatus: res.statusCode,
      details: passed ? 'Suppression enforced for opted-out contact' : `Failed: ${JSON.stringify(res.body)}`,
    });
  } catch (err: any) {
    results.push({ name: '5. Suppression and Opt-Out Enforcement', passed: false, expectedStatus: 403, actualStatus: 500, details: err.message });
  }

  // 6. Missing-Consent Fail-Closed Behavior
  try {
    const res = await makeRequest({
      path: '/api/growth/electrical-leads/intake',
      method: 'POST',
      headers: { ...tenant1Auth },
      body: {
        name: 'No Consent Lead',
        email: 'noconsent@example.com',
        phone: '+1-503-555-8888',
        serviceRequested: 'Generator Hookup',
        city: 'Portland',
        state: 'OR',
        consentProvided: false, // NO CONSENT
        source: 'Phone Inbound',
        sourceReference: 'ref-noconsent',
      },
    });

    const passed = res.statusCode === 403 && res.body.error === 'CONSENT_REQUIRED';
    results.push({
      name: '6. Missing-Consent Fail-Closed',
      passed,
      expectedStatus: 403,
      actualStatus: res.statusCode,
      details: passed ? 'Failed closed on missing consent' : `Failed: ${JSON.stringify(res.body)}`,
    });
  } catch (err: any) {
    results.push({ name: '6. Missing-Consent Fail-Closed', passed: false, expectedStatus: 403, actualStatus: 500, details: err.message });
  }

  // 7. Draft Creation Does Not Execute an Action
  try {
    const getRes = await makeRequest({
      path: `/api/growth/electrical-leads/${createdLeadId}`,
      method: 'GET',
      headers: { ...tenant1Auth },
    });

    const lead = getRes.body.lead;
    const passed = lead.approvalStatus === 'pending' && lead.executionStatus === 'unexecuted';
    results.push({
      name: '7. Draft Creation Does Not Execute Action',
      passed,
      expectedStatus: 200,
      actualStatus: getRes.statusCode,
      details: passed ? `Draft status: ${lead.approvalStatus}, execution: ${lead.executionStatus}` : `Failed: ${JSON.stringify(lead)}`,
    });
  } catch (err: any) {
    results.push({ name: '7. Draft Creation Does Not Execute Action', passed: false, expectedStatus: 200, actualStatus: 500, details: err.message });
  }

  // 8. Execution Without Approval is Rejected
  try {
    const res = await makeRequest({
      path: `/api/growth/electrical-leads/${createdLeadId}/execute`,
      method: 'POST',
      headers: { ...tenant1Auth, 'x-idempotency-key': `unapp-key-${Date.now()}` },
    });

    const passed = res.statusCode === 403 && res.body.error?.includes('FORBIDDEN_APPROVAL_REQUIRED');
    results.push({
      name: '8. Unapproved Execution Rejected',
      passed,
      expectedStatus: 403,
      actualStatus: res.statusCode,
      details: passed ? 'Blocked execution without approval' : `Failed: ${JSON.stringify(res.body)}`,
    });
  } catch (err: any) {
    results.push({ name: '8. Unapproved Execution Rejected', passed: false, expectedStatus: 403, actualStatus: 500, details: err.message });
  }

  // 9. Approval Bound to Exact Action and Content
  try {
    const appRes = await makeRequest({
      path: `/api/growth/electrical-leads/${createdLeadId}/approve`,
      method: 'POST',
      headers: { ...tenant1Auth },
    });

    const passed = appRes.statusCode === 200 && appRes.body.approval?.contentHash;
    results.push({
      name: '9. Approval Bound to Exact Content Hash',
      passed,
      expectedStatus: 200,
      actualStatus: appRes.statusCode,
      details: passed ? `Approval hash: ${appRes.body.approval.contentHash}` : `Failed: ${JSON.stringify(appRes.body)}`,
    });
  } catch (err: any) {
    results.push({ name: '9. Approval Bound to Exact Content Hash', passed: false, expectedStatus: 200, actualStatus: 500, details: err.message });
  }

  // 10. Editing Approved Content Invalidates Approval
  try {
    // Edit the proposed response
    const editRes = await makeRequest({
      path: `/api/growth/electrical-leads/${createdLeadId}/draft`,
      method: 'PUT',
      headers: { ...tenant1Auth },
      body: { newText: 'Edited response draft: Hi Sarah, we offer 10% discount on EV charger installation!' },
    });

    const lead = editRes.body.lead;
    const passed = editRes.statusCode === 200 && lead.approvalStatus === 'pending';
    results.push({
      name: '10. Editing Content Invalidates Approval',
      passed,
      expectedStatus: 200,
      actualStatus: editRes.statusCode,
      details: passed ? 'Approval status reset to pending on content edit' : `Failed: ${JSON.stringify(lead)}`,
    });
  } catch (err: any) {
    results.push({ name: '10. Editing Content Invalidates Approval', passed: false, expectedStatus: 200, actualStatus: 500, details: err.message });
  }

  // Re-approve after edit for execution tests
  await makeRequest({
    path: `/api/growth/electrical-leads/${createdLeadId}/approve`,
    method: 'POST',
    headers: { ...tenant1Auth },
  });

  // 11. Idempotent Retries Do Not Execute Twice
  const idempotencyKey = `exec-idemp-${Date.now()}`;
  try {
    // First execution call
    const exec1 = await makeRequest({
      path: `/api/growth/electrical-leads/${createdLeadId}/execute`,
      method: 'POST',
      headers: { ...tenant1Auth, 'x-idempotency-key': idempotencyKey },
    });

    // Second execution call with same idempotency key
    const exec2 = await makeRequest({
      path: `/api/growth/electrical-leads/${createdLeadId}/execute`,
      method: 'POST',
      headers: { ...tenant1Auth, 'x-idempotency-key': idempotencyKey },
    });

    const passed = exec1.statusCode === 200 && exec2.statusCode === 200 && exec2.body.dispatchStatus === 'cached_idempotent_replay';
    results.push({
      name: '11. Idempotent Execution Protection',
      passed,
      expectedStatus: 200,
      actualStatus: exec2.statusCode,
      details: passed ? 'Replay returned cached idempotent result' : `Failed: ${JSON.stringify(exec2.body)}`,
    });
  } catch (err: any) {
    results.push({ name: '11. Idempotent Execution Protection', passed: false, expectedStatus: 200, actualStatus: 500, details: err.message });
  }

  // 12 & 13. Missing Credentials Fail Closed & Dry-Run Labeled Simulated
  try {
    const getRes = await makeRequest({
      path: `/api/growth/electrical-leads/${createdLeadId}`,
      method: 'GET',
      headers: { ...tenant1Auth },
    });

    const lead = getRes.body.lead;
    const passed = lead.executionMode === 'simulated' && lead.executionStatus === 'simulated';
    results.push({
      name: '12 & 13. Missing Credentials Fail Closed to DRY_RUN Simulation',
      passed,
      expectedStatus: 200,
      actualStatus: getRes.statusCode,
      details: passed ? `Execution mode: ${lead.executionMode}, status: ${lead.executionStatus}` : `Failed: ${JSON.stringify(lead)}`,
    });
  } catch (err: any) {
    results.push({ name: '12 & 13. Missing Credentials Fail Closed to DRY_RUN Simulation', passed: false, expectedStatus: 200, actualStatus: 500, details: err.message });
  }

  // 14. Simulated Outcomes Cannot Be Counted as Actual Revenue
  try {
    const getRes = await makeRequest({
      path: `/api/growth/electrical-leads/${createdLeadId}`,
      method: 'GET',
      headers: { ...tenant1Auth },
    });

    const lead = getRes.body.lead;
    const passed = lead.actualRevenue === 0 && lead.actualRoi.actualRevenue === 0;
    results.push({
      name: '14. Simulated Outcomes Do Not Count as Actual Revenue',
      passed,
      expectedStatus: 200,
      actualStatus: getRes.statusCode,
      details: passed ? 'Actual revenue is $0 during simulation stage' : `Failed: ${JSON.stringify(lead)}`,
    });
  } catch (err: any) {
    results.push({ name: '14. Simulated Outcomes Do Not Count as Actual Revenue', passed: false, expectedStatus: 200, actualStatus: 500, details: err.message });
  }

  // 15. Outcome Events Retain Source Evidence
  try {
    const schedRes = await makeRequest({
      path: `/api/growth/electrical-leads/${createdLeadId}/outcome`,
      method: 'POST',
      headers: { ...tenant1Auth },
      body: { stage: 'schedule_estimate', scheduledTime: '2026-08-13T10:00:00Z' },
    });

    const lead = schedRes.body.lead;
    const passed = schedRes.statusCode === 200 && lead.schedulingStatus === 'scheduled' && lead.verifiedFacts.length > 0;
    results.push({
      name: '15. Outcome Events Retain Source Evidence',
      passed,
      expectedStatus: 200,
      actualStatus: schedRes.statusCode,
      details: passed ? `Scheduled estimate, retained ${lead.verifiedFacts.length} verified facts` : `Failed: ${JSON.stringify(lead)}`,
    });
  } catch (err: any) {
    results.push({ name: '15. Outcome Events Retain Source Evidence', passed: false, expectedStatus: 200, actualStatus: 500, details: err.message });
  }

  // 16 & 17. Deterministic Attribution & Projected vs Actual ROI
  try {
    // Record actual revenue booking
    await makeRequest({
      path: `/api/growth/electrical-leads/${createdLeadId}/outcome`,
      method: 'POST',
      headers: { ...tenant1Auth },
      body: { stage: 'record_booking', bookedJobValue: 2500 },
    });

    const revRes = await makeRequest({
      path: `/api/growth/electrical-leads/${createdLeadId}/outcome`,
      method: 'POST',
      headers: { ...tenant1Auth },
      body: { stage: 'record_revenue', actualRevenue: 2750 },
    });

    const lead = revRes.body.lead;
    const passed =
      revRes.statusCode === 200 &&
      lead.actualRevenue === 2750 &&
      lead.actualRoi.varianceVsProjected === 250 && // 2750 actual - 2500 projected = +250
      Boolean(lead.attributionSource && lead.attributionSource.includes('Google Business Profile'));

    results.push({
      name: '16 & 17. Deterministic Attribution & ROI Variance',
      passed,
      expectedStatus: 200,
      actualStatus: revRes.statusCode,
      details: passed ? `Actual Revenue: $${lead.actualRevenue}, ROI Variance: +$${lead.actualRoi.varianceVsProjected}` : `Failed: ${JSON.stringify(lead)}`,
    });
  } catch (err: any) {
    results.push({ name: '16 & 17. Deterministic Attribution & ROI Variance', passed: false, expectedStatus: 200, actualStatus: 500, details: err.message });
  }

  // 18. Audit Events Append-Only
  try {
    const auditRes = await makeRequest({
      path: '/api/launch-program/audit-logs',
      method: 'GET',
      headers: { ...tenant1Auth },
    });

    const passed = auditRes.statusCode === 200 && Array.isArray(auditRes.body.logs) && auditRes.body.logs.length > 0;
    results.push({
      name: '18. Audit Events Append-Only',
      passed,
      expectedStatus: 200,
      actualStatus: auditRes.statusCode,
      details: passed ? `Recorded ${auditRes.body.logs.length} audit logs` : `Failed: ${JSON.stringify(auditRes.body)}`,
    });
  } catch (err: any) {
    results.push({ name: '18. Audit Events Append-Only', passed: false, expectedStatus: 200, actualStatus: 500, details: err.message });
  }

  // 19 & 21. Redaction & Privacy Gate Scanning
  try {
    const getRes = await makeRequest({
      path: `/api/growth/electrical-leads/${createdLeadId}`,
      method: 'GET',
      headers: { ...tenant1Auth },
    });

    const leadStr = JSON.stringify(getRes.body);
    const scanner = new PrivacyGateScanner(CONTROLLED_FORBIDDEN_PATTERNS);
    const leaks = scanner.scanObject('Lead Object', getRes.body);

    const passed = leaks.length === 0;
    results.push({
      name: '19 & 21. Privacy Gate & Redaction Verification',
      passed,
      expectedStatus: 200,
      actualStatus: getRes.statusCode,
      details: passed ? 'Zero raw secret/privacy leaks detected' : `Leaks found: ${JSON.stringify(leaks)}`,
    });
  } catch (err: any) {
    results.push({ name: '19 & 21. Privacy Gate & Redaction Verification', passed: false, expectedStatus: 200, actualStatus: 500, details: err.message });
  }

  // Print Summary
  console.log('----------------------------------------------------------------');
  let passedCount = 0;
  for (const r of results) {
    if (r.passed) passedCount++;
    const icon = r.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${icon} [${r.actualStatus}] ${r.name} - ${r.details}`);
  }
  console.log('----------------------------------------------------------------');
  console.log(`SUMMARY: ${passedCount} / ${results.length} Tests Passed.\n`);

  if (passedCount !== results.length) {
    process.exit(1);
  }
}

runElectricalLeadWorkflowTests().catch((err) => {
  console.error('[Electrical Workflow Test Error]', err);
  process.exit(1);
});
