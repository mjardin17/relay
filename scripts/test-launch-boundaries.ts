import http from 'http';

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

async function runAuditTests() {
  console.log('================================================================');
  console.log('  PRODUCTION BOUNDARY HARDENING AUDIT: /api/launch-program/*  ');
  console.log('================================================================\n');

  const authHeader = { Authorization: 'Bearer token_owner_tenant1' };

  // -------------------------------------------------------------------------
  // TEST 1: Unapproved Dispatch Attempt -> Expect HTTP 403 Forbidden
  // -------------------------------------------------------------------------
  try {
    const res = await makeRequest({
      path: '/api/launch-program/dispatch-outreach',
      method: 'POST',
      headers: { ...authHeader },
      body: {
        outreachId: 'unapproved-outreach-101',
        approvalStatus: 'pending_owner_approval',
        prospectEmail: 'dr.smith@dentalcare.com',
        messageBody: 'Hello Dr Smith, we noticed lead delays on your site.',
      },
    });

    const passed = res.statusCode === 403 && res.body?.error === 'FORBIDDEN_APPROVAL_REQUIRED';
    results.push({
      name: 'Human-in-the-loop Gate: Block Unapproved Dispatch',
      passed,
      expectedStatus: 403,
      actualStatus: res.statusCode,
      details: JSON.stringify(res.body),
    });
  } catch (err: any) {
    results.push({
      name: 'Human-in-the-loop Gate: Block Unapproved Dispatch',
      passed: false,
      expectedStatus: 403,
      actualStatus: 0,
      details: err.message,
    });
  }

  // -------------------------------------------------------------------------
  // TEST 2: Approved Dispatch Execution -> Expect HTTP 200 OK
  // -------------------------------------------------------------------------
  try {
    const approvedOutreachId = `outreach-appr-${Date.now()}`;
    const prospectEmail = 'dr.smith@dentalcare.com';
    const messageBody = 'Hello Dr Smith, we noticed lead delays on your site.';

    // First, record approval via POST /approve-outreach
    await makeRequest({
      path: '/api/launch-program/approve-outreach',
      method: 'POST',
      headers: { ...authHeader },
      body: {
        outreachId: approvedOutreachId,
        prospectEmail,
        messageBody,
        channel: 'email',
      },
    });

    // Second, dispatch outreach
    const res = await makeRequest({
      path: '/api/launch-program/dispatch-outreach',
      method: 'POST',
      headers: { ...authHeader, 'X-Idempotency-Key': `key-dispatch-${Date.now()}` },
      body: {
        outreachId: approvedOutreachId,
        prospectEmail,
        messageBody,
        channel: 'email',
      },
    });

    const passed = res.statusCode === 200 && res.body?.success === true;
    results.push({
      name: 'Human-in-the-loop Gate: Allow Human-Approved Dispatch',
      passed,
      expectedStatus: 200,
      actualStatus: res.statusCode,
      details: JSON.stringify(res.body),
    });
  } catch (err: any) {
    results.push({
      name: 'Human-in-the-loop Gate: Allow Human-Approved Dispatch',
      passed: false,
      expectedStatus: 200,
      actualStatus: 0,
      details: err.message,
    });
  }

  // -------------------------------------------------------------------------
  // TEST 3: Zod Input Schema Validation Failure -> Expect HTTP 400 Bad Request
  // -------------------------------------------------------------------------
  try {
    const res = await makeRequest({
      path: '/api/launch-program/recommend-niche',
      method: 'POST',
      headers: { ...authHeader },
      body: { industryPreference: '' }, // empty string fails min(1) constraint
    });

    const passed = res.statusCode === 400 && res.body?.error === 'INVALID_INPUT';
    results.push({
      name: 'Zod Input Schema Validation: Reject Malformed Request',
      passed,
      expectedStatus: 400,
      actualStatus: res.statusCode,
      details: JSON.stringify(res.body),
    });
  } catch (err: any) {
    results.push({
      name: 'Zod Input Schema Validation: Reject Malformed Request',
      passed: false,
      expectedStatus: 400,
      actualStatus: 0,
      details: err.message,
    });
  }

  // -------------------------------------------------------------------------
  // TEST 4: Idempotency Replay Verification -> Expect X-Cache-Hit: true
  // -------------------------------------------------------------------------
  try {
    const idempotencyKey = `key-offer-${Date.now()}`;
    const payload = { nicheName: 'Pediatric Dentistry', primaryProblem: 'No after-hours answer' };

    // First Call
    await makeRequest({
      path: '/api/launch-program/generate-offer',
      method: 'POST',
      headers: { ...authHeader, 'X-Idempotency-Key': idempotencyKey },
      body: payload,
    });

    // Replay Call with same key
    const replayRes = await makeRequest({
      path: '/api/launch-program/generate-offer',
      method: 'POST',
      headers: { ...authHeader, 'X-Idempotency-Key': idempotencyKey },
      body: payload,
    });

    const passed = replayRes.statusCode === 200 && replayRes.headers['x-cache-hit'] === 'true';
    results.push({
      name: 'Idempotency Engine: Replay Cached Response on Duplicate Header',
      passed,
      expectedStatus: 200,
      actualStatus: replayRes.statusCode,
      details: `Header X-Cache-Hit: ${replayRes.headers['x-cache-hit']}`,
    });
  } catch (err: any) {
    results.push({
      name: 'Idempotency Engine: Replay Cached Response on Duplicate Header',
      passed: false,
      expectedStatus: 200,
      actualStatus: 0,
      details: err.message,
    });
  }

  // -------------------------------------------------------------------------
  // TEST 5: Emergency Rollback Execution -> Expect HTTP 200
  // -------------------------------------------------------------------------
  try {
    const res = await makeRequest({
      path: '/api/launch-program/execute-rollback',
      method: 'POST',
      headers: { ...authHeader },
      body: { stageId: 'stage-7', rollbackReason: 'Synthetic rollback verification' },
    });

    const passed = res.statusCode === 200 && res.body?.rollbackStatus === 'simulated_rollback_completed';
    results.push({
      name: 'Emergency Rollback API: Execute Sandbox Rollback',
      passed,
      expectedStatus: 200,
      actualStatus: res.statusCode,
      details: JSON.stringify(res.body),
    });
  } catch (err: any) {
    results.push({
      name: 'Emergency Rollback API: Execute Sandbox Rollback',
      passed: false,
      expectedStatus: 200,
      actualStatus: 0,
      details: err.message,
    });
  }

  // -------------------------------------------------------------------------
  // TEST 6: Audit Log Stream Retrieval -> Expect Recorded Entries
  // -------------------------------------------------------------------------
  try {
    const res = await makeRequest({
      path: '/api/launch-program/audit-logs',
      method: 'GET',
      headers: { ...authHeader },
    });

    const passed = res.statusCode === 200 && Array.isArray(res.body?.logs) && res.body.logs.length > 0;
    results.push({
      name: 'Audit Logging Engine: Retrieve Tenant Audit Records',
      passed,
      expectedStatus: 200,
      actualStatus: res.statusCode,
      details: `Captured ${res.body?.totalLogsCount || 0} audit log entries for tenant_demo_1`,
    });
  } catch (err: any) {
    results.push({
      name: 'Audit Logging Engine: Retrieve Tenant Audit Records',
      passed: false,
      expectedStatus: 200,
      actualStatus: 0,
      details: err.message,
    });
  }

  // -------------------------------------------------------------------------
  // TEST 7: Credential Vault Status -> Expect Truthful Non-KMS Report
  // -------------------------------------------------------------------------
  try {
    const res = await makeRequest({
      path: '/api/launch-program/credential-status',
      method: 'GET',
      headers: { ...authHeader },
    });

    const passed = res.statusCode === 200 && res.body?.kmsEncryptionActive === false && res.body?.productionReady === false;
    results.push({
      name: 'Connector & Secrets Truthfulness: Report Non-KMS Plaintext Status',
      passed,
      expectedStatus: 200,
      actualStatus: res.statusCode,
      details: JSON.stringify(res.body),
    });
  } catch (err: any) {
    results.push({
      name: 'Connector & Secrets Truthfulness: Report Non-KMS Plaintext Status',
      passed: false,
      expectedStatus: 200,
      actualStatus: 0,
      details: err.message,
    });
  }

  // -------------------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------------------
  console.log('AUDIT TEST RESULTS SUMMARY:\n');
  let allPassed = true;

  results.forEach((r, idx) => {
    const icon = r.passed ? '✅ [PASS]' : '❌ [FAIL]';
    console.log(`${idx + 1}. ${icon} ${r.name}`);
    console.log(`   Expected HTTP: ${r.expectedStatus} | Actual HTTP: ${r.actualStatus}`);
    console.log(`   Details: ${r.details}\n`);
    if (!r.passed) allPassed = false;
  });

  if (allPassed) {
    console.log('================================================================');
    console.log('  ALL PRODUCTION BOUNDARY TESTS PASSED SUCCESSFULLY!          ');
    console.log('================================================================');
    process.exit(0);
  } else {
    console.log('================================================================');
    console.log('  SOME BOUNDARY TESTS FAILED! SEE LOGS ABOVE.                  ');
    console.log('================================================================');
    process.exit(1);
  }
}

runAuditTests();
