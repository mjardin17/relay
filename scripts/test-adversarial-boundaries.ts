import { seedDatabaseIfEmpty } from '../src/db/seed';
import { getDatabase } from '../src/db/database';
import { authService } from '../src/services/authService';
import { launchApprovalService } from '../src/services/launchApprovalService';
import { launchAuditService } from '../src/services/launchAuditService';
import { launchIdempotencyService } from '../src/services/launchIdempotencyService';

const BASE_URL = 'http://127.0.0.1:3000';

// ANSI colors
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, testName: string, detail = '') {
  if (condition) {
    passedCount++;
    console.log(`  ${GREEN}✓ [PASS]${RESET} ${testName}`);
  } else {
    failedCount++;
    console.error(`  ${RED}✗ [FAIL]${RESET} ${testName} ${detail ? `(${detail})` : ''}`);
  }
}

async function runAdversarialBoundaryTestSuite() {
  console.log(`\n${BOLD}${CYAN}=== RELAY PRODUCTION-BOUNDARY ADVERSARIAL TEST SUITE ===${RESET}\n`);

  // Ensure DB is initialized and seeded
  seedDatabaseIfEmpty();

  // -------------------------------------------------------------------------
  // 1. Authentication Boundary Tests
  // -------------------------------------------------------------------------
  console.log(`${BOLD}1. Identity & Session Authentication Boundary Tests${RESET}`);

  // Test 1.1: Missing credential returns HTTP 401
  try {
    const res = await fetch(`${BASE_URL}/api/launch-program/recommend-niche`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ industryPreference: 'SaaS' }),
    });
    const text = await res.text();
    let data: any = {};
    try { data = JSON.parse(text); } catch { data = { rawText: text.substring(0, 100) }; }
    assert(res.status === 401 && data.error === 'UNAUTHORIZED', 'Missing authentication credential returns 401 Unauthorized', `Status: ${res.status}, body: ${JSON.stringify(data)}`);
  } catch (e: any) {
    assert(false, 'Missing credential returns 401', e.message);
  }

  // Test 1.2: Invalid token returns HTTP 401
  try {
    const res = await fetch(`${BASE_URL}/api/launch-program/recommend-niche`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer invalid_fake_token_xyz',
      },
      body: JSON.stringify({ industryPreference: 'SaaS' }),
    });
    const text = await res.text();
    let data: any = {};
    try { data = JSON.parse(text); } catch { data = { rawText: text.substring(0, 100) }; }
    assert(res.status === 401 && data.error === 'UNAUTHORIZED', 'Invalid token returns 401 Unauthorized', `Status: ${res.status}, body: ${JSON.stringify(data)}`);
  } catch (e: any) {
    assert(false, 'Invalid token returns 401', e.message);
  }

  // Test 1.3: Expired token returns HTTP 401
  try {
    const res = await fetch(`${BASE_URL}/api/launch-program/recommend-niche`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token_expired',
      },
      body: JSON.stringify({ industryPreference: 'SaaS' }),
    });
    const text = await res.text();
    let data: any = {};
    try { data = JSON.parse(text); } catch { data = { rawText: text.substring(0, 100) }; }
    assert(res.status === 401 && data.error === 'UNAUTHORIZED', 'Expired token returns 401 Unauthorized', `Status: ${res.status}, body: ${JSON.stringify(data)}`);
  } catch (e: any) {
    assert(false, 'Expired token returns 401', e.message);
  }

  // Test 1.3b: Token passed in query parameter is rejected (must use Bearer header)
  try {
    const res = await fetch(`${BASE_URL}/api/launch-program/recommend-niche?token=token_owner_tenant1`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ industryPreference: 'SaaS' }),
    });
    const text = await res.text();
    let data: any = {};
    try { data = JSON.parse(text); } catch { data = { rawText: text.substring(0, 100) }; }
    assert(res.status === 401 && data.error === 'UNAUTHORIZED', 'Query parameter token is rejected with 401 Unauthorized', `Status: ${res.status}`);
  } catch (e: any) {
    assert(false, 'Query parameter token rejection check', e.message);
  }

  // Test 1.4: Tenant isolation - Caller-controlled X-Tenant-ID header is ignored
  try {
    const res = await fetch(`${BASE_URL}/api/launch-program/recommend-niche`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token_owner_tenant1',
        'X-Tenant-ID': 'tenant_demo_2', // Attempting spoofing
      },
      body: JSON.stringify({ industryPreference: 'Fintech', targetIncome: 25000 }),
    });
    const data = await res.json();
    assert(
      res.status === 200 && data.tenantId === 'tenant_demo_1',
      'Caller-supplied X-Tenant-ID header is strictly IGNORED (derived tenantId is tenant_demo_1 from session)'
    );
  } catch (e: any) {
    assert(false, 'Tenant isolation header spoofing check', e.message);
  }

  // -------------------------------------------------------------------------
  // 2. Authorization & Tenant Isolation Tests
  // -------------------------------------------------------------------------
  console.log(`\n${BOLD}2. Authorization & Role-Based Access Control Tests${RESET}`);

  // Test 2.1: Member role attempting dispatch (lacks launch:dispatch) returns 403
  try {
    const res = await fetch(`${BASE_URL}/api/launch-program/dispatch-outreach`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token_member_tenant1',
      },
      body: JSON.stringify({
        outreachId: 'outreach-100',
        prospectEmail: 'prospect@client.com',
        messageBody: 'Hello prospect, this is outreach text.',
      }),
    });
    const data = await res.json();
    assert(
      res.status === 403 && data.error === 'FORBIDDEN_INSUFFICIENT_ROLE',
      'Member role lacking launch:dispatch permission receives 403 Forbidden'
    );
  } catch (e: any) {
    assert(false, 'Member role dispatch check', e.message);
  }

  // Test 2.2: Member role attempting audit log read (lacks audit:read) returns 403
  try {
    const res = await fetch(`${BASE_URL}/api/launch-program/audit-logs`, {
      method: 'GET',
      headers: {
        Authorization: 'Bearer token_member_tenant1',
      },
    });
    const data = await res.json();
    assert(
      res.status === 403 && data.error === 'FORBIDDEN_INSUFFICIENT_ROLE',
      'Member role lacking audit:read permission receives 403 Forbidden'
    );
  } catch (e: any) {
    assert(false, 'Member role audit log check', e.message);
  }

  // -------------------------------------------------------------------------
  // 3. Human Approval Enforcement & Content Hash Integrity Tests
  // -------------------------------------------------------------------------
  console.log(`\n${BOLD}3. Human Approval Enforcement & Content Integrity Tests${RESET}`);

  // Test 3.1: Request body passing approvalStatus: "approved_by_owner" without server DB record returns 403
  try {
    const res = await fetch(`${BASE_URL}/api/launch-program/dispatch-outreach`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token_owner_tenant1',
      },
      body: JSON.stringify({
        outreachId: 'unapproved-draft-999',
        prospectEmail: 'unapproved@target.com',
        messageBody: 'Unapproved outreach email body text.',
        approvalStatus: 'approved_by_owner', // Fake approval in body
      }),
    });
    const data = await res.json();
    assert(
      res.status === 403 && data.error === 'FORBIDDEN_APPROVAL_REQUIRED',
      'Request body approvalStatus parameter is IGNORED as proof; missing server DB approval returns 403'
    );
  } catch (e: any) {
    assert(false, 'Fake approvalStatus in body check', e.message);
  }

  // Test 3.2: Record official approval in Tenant 1
  const testOutreachId = `outreach-test-${Date.now()}`;
  const testEmail = 'exec@targetcompany.com';
  const originalMessage = 'Hello Exec, this is a verified evidence-grounded outreach email message.';

  try {
    const approveRes = await fetch(`${BASE_URL}/api/launch-program/approve-outreach`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token_owner_tenant1',
      },
      body: JSON.stringify({
        outreachId: testOutreachId,
        prospectEmail: testEmail,
        messageBody: originalMessage,
        channel: 'email',
      }),
    });
    const approveData = await approveRes.json();
    assert(
      approveRes.status === 200 && approveData.success && approveData.approvalRecord?.contentHash,
      'Owner approval is recorded in SQLite database with SHA-256 content hash'
    );
  } catch (e: any) {
    assert(false, 'Owner approval recording', e.message);
  }

  // Test 3.3: Cross-tenant approval check: Tenant 2 cannot dispatch using Tenant 1's approval
  try {
    const crossRes = await fetch(`${BASE_URL}/api/launch-program/dispatch-outreach`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token_owner_tenant2', // Tenant 2
      },
      body: JSON.stringify({
        outreachId: testOutreachId,
        prospectEmail: testEmail,
        messageBody: originalMessage,
        channel: 'email',
      }),
    });
    const crossData = await crossRes.json();
    assert(
      crossRes.status === 403 && crossData.error === 'FORBIDDEN_APPROVAL_REQUIRED',
      'Tenant 2 cannot use approval record created in Tenant 1 (Tenant isolation enforced)'
    );
  } catch (e: any) {
    assert(false, 'Cross-tenant approval check', e.message);
  }

  // Test 3.4: Content modification invalidates approval (Content Hash Mismatch)
  try {
    const modRes = await fetch(`${BASE_URL}/api/launch-program/dispatch-outreach`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token_owner_tenant1',
      },
      body: JSON.stringify({
        outreachId: testOutreachId,
        prospectEmail: testEmail,
        messageBody: 'TAMPERED / EDITED MESSAGE BODY AFTER APPROVAL', // Modified text
        channel: 'email',
      }),
    });
    const modData = await modRes.json();
    assert(
      modRes.status === 403 && modData.error === 'APPROVAL_CONTENT_MISMATCH',
      'Modifying message body after approval invalidates approval and returns 403 APPROVAL_CONTENT_MISMATCH'
    );
  } catch (e: any) {
    assert(false, 'Content tampering check', e.message);
  }

  // Test 3.5: Successful dispatch with exact approved content
  try {
    const validDispatchRes = await fetch(`${BASE_URL}/api/launch-program/dispatch-outreach`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token_owner_tenant1',
      },
      body: JSON.stringify({
        outreachId: testOutreachId,
        prospectEmail: testEmail,
        messageBody: originalMessage, // Unmodified
        channel: 'email',
      }),
    });
    const validDispatchData = await validDispatchRes.json();
    assert(
      validDispatchRes.status === 200 && validDispatchData.success && validDispatchData._connectorStatus?.isSimulation === true,
      'Dispatch succeeds for exact approved content and returns truthful simulation metadata'
    );
  } catch (e: any) {
    assert(false, 'Valid dispatch check', e.message);
  }

  // -------------------------------------------------------------------------
  // 4. Idempotency & Rate Limit Boundary Tests
  // -------------------------------------------------------------------------
  console.log(`\n${BOLD}4. Multi-Instance Durable Idempotency & Rate Limit Tests${RESET}`);

  const idempotencyKey = `idemp-key-${Date.now()}`;
  const payloadBody = { industryPreference: 'Legal & IP Law', targetIncome: 40000 };

  // Test 4.1: Initial request with X-Idempotency-Key
  let initialResponseData: any;
  try {
    const res1 = await fetch(`${BASE_URL}/api/launch-program/recommend-niche`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token_owner_tenant1',
        'X-Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(payloadBody),
    });
    initialResponseData = await res1.json();
    assert(res1.status === 200 && initialResponseData.success, 'First request with X-Idempotency-Key executes and saves response');
  } catch (e: any) {
    assert(false, 'Initial idempotency call', e.message);
  }

  // Test 4.2: Duplicate request with SAME key and SAME body returns cached response
  try {
    const res2 = await fetch(`${BASE_URL}/api/launch-program/recommend-niche`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token_owner_tenant1',
        'X-Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(payloadBody),
    });
    const data2 = await res2.json();
    const cacheHitHeader = res2.headers.get('x-cache-hit');
    assert(
      res2.status === 200 && cacheHitHeader === 'true' && data2.niche?.name === initialResponseData.niche?.name,
      'Duplicate request with same X-Idempotency-Key returns cached response with X-Cache-Hit: true'
    );
  } catch (e: any) {
    assert(false, 'Duplicate idempotency call', e.message);
  }

  // Test 4.2b: Duplicate request with reordered JSON keys produces same hash and returns cached response
  try {
    const resKeyOrder = await fetch(`${BASE_URL}/api/launch-program/recommend-niche`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token_owner_tenant1',
        'X-Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({ targetIncome: 40000, industryPreference: 'Legal & IP Law' }), // Reordered keys
    });
    const dataKeyOrder = await resKeyOrder.json();
    const cacheHitHeader = resKeyOrder.headers.get('x-cache-hit');
    assert(
      resKeyOrder.status === 200 && cacheHitHeader === 'true' && dataKeyOrder.niche?.name === initialResponseData.niche?.name,
      'Duplicate request with reordered JSON keys matches canonical hash and returns cached response'
    );
  } catch (e: any) {
    assert(false, 'Canonical idempotency key reorder check', e.message);
  }

  // Test 4.3: Reusing SAME key with DIFFERENT payload body returns 409 Conflict
  try {
    const res3 = await fetch(`${BASE_URL}/api/launch-program/recommend-niche`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token_owner_tenant1',
        'X-Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({ industryPreference: 'Healthcare Dental', targetIncome: 90000 }), // Different body
    });
    const data3 = await res3.json();
    assert(
      res3.status === 409 && data3.error === 'IDEMPOTENCY_KEY_REUSE_CONFLICT',
      'Reusing X-Idempotency-Key with different request body returns 409 Conflict'
    );
  } catch (e: any) {
    assert(false, 'Idempotency conflict check', e.message);
  }

  // -------------------------------------------------------------------------
  // 5. Audit Log Tenant Scope & Sensitive Data Redaction Tests
  // -------------------------------------------------------------------------
  console.log(`\n${BOLD}5. Audit Log Tenant Isolation & Sensitive Data Redaction Tests${RESET}`);

  try {
    const auditRes = await fetch(`${BASE_URL}/api/launch-program/audit-logs`, {
      method: 'GET',
      headers: {
        Authorization: 'Bearer token_owner_tenant1',
      },
    });
    const auditData = await auditRes.json();
    assert(
      auditRes.status === 200 && auditData.tenantId === 'tenant_demo_1' && Array.isArray(auditData.logs),
      'Tenant 1 owner receives tenant-isolated audit logs'
    );

    // Verify sensitive data redaction across logs
    const logDetailsString = JSON.stringify(auditData.logs);
    const containsRawEmails = logDetailsString.includes('exec@targetcompany.com');
    const containsRedactedEmails = logDetailsString.includes('[REDACTED_EMAIL]');
    const containsRedactedSensitive = logDetailsString.includes('[REDACTED_SENSITIVE_DATA]');

    assert(
      !containsRawEmails && (containsRedactedEmails || containsRedactedSensitive),
      'Audit log detail payload contains REDACTED emails and sensitive data (Zero cleartext leaks)'
    );
  } catch (e: any) {
    assert(false, 'Audit log tenant scope & redaction check', e.message);
  }

  // -------------------------------------------------------------------------
  // 6. Durable SQLite Persistence Check
  // -------------------------------------------------------------------------
  console.log(`\n${BOLD}6. Durable SQLite Persistence Integrity Tests${RESET}`);

  try {
    const db = getDatabase();
    const sessionCount = db.prepare('SELECT count(*) as count FROM auth_sessions').get() as { count: number };
    const approvalCount = db.prepare('SELECT count(*) as count FROM launch_approvals').get() as { count: number };
    const auditCount = db.prepare('SELECT count(*) as count FROM launch_audit_logs').get() as { count: number };
    const idempCount = db.prepare('SELECT count(*) as count FROM launch_idempotency').get() as { count: number };

    assert(
      sessionCount.count >= 4 && approvalCount.count >= 1 && auditCount.count >= 5 && idempCount.count >= 1,
      `SQLite durable storage verified: ${sessionCount.count} sessions, ${approvalCount.count} approvals, ${auditCount.count} audit logs, ${idempCount.count} idempotency keys.`
    );
  } catch (e: any) {
    assert(false, 'SQLite persistence check', e.message);
  }

  // -------------------------------------------------------------------------
  // Final Results Summary
  // -------------------------------------------------------------------------
  console.log(`\n${BOLD}${CYAN}=== ADVERSARIAL TEST RESULTS SUMMARY ===${RESET}`);
  console.log(`Passed Assertions: ${GREEN}${passedCount}${RESET}`);
  console.log(`Failed Assertions: ${failedCount === 0 ? GREEN : RED}${failedCount}${RESET}`);

  if (failedCount === 0) {
    console.log(`\n${BOLD}${GREEN}All production boundary adversarial tests PASSED successfully!${RESET}\n`);
  } else {
    console.log(`\n${BOLD}${RED}Some adversarial boundary tests failed! Correcting issues...${RESET}\n`);
    process.exit(1);
  }
}

runAdversarialBoundaryTestSuite().catch((err) => {
  console.error('Test suite failed to run:', err);
  process.exit(1);
});
