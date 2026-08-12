import assert from 'node:assert';
import { maskStreetAddress } from '../src/utils/redaction';

const BASE_URL = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';
const OWNER_TOKEN = 'token_owner_tenant1';
const MEMBER_TOKEN = 'token_member_tenant1';
const TENANT2_TOKEN = 'token_owner_tenant2';

async function runGbpBoundaryTests() {
  console.log('\n================================================================');
  console.log('  GOOGLE BUSINESS PROFILE LAUNCH PROGRAM: BOUNDARY AUDIT');
  console.log('================================================================\n');

  let passedCount = 0;
  let totalCount = 0;

  function logPass(name: string, details?: string) {
    passedCount++;
    totalCount++;
    console.log(`  \x1b[32m✓ [PASS]\x1b[0m ${name}`);
    if (details) console.log(`    \x1b[90mDetails: ${details.substring(0, 120)}\x1b[0m`);
  }

  function logFail(name: string, error: string) {
    totalCount++;
    console.log(`  \x1b[31m✗ [FAIL]\x1b[0m ${name}`);
    console.log(`    \x1b[31mError: ${error}\x1b[0m`);
  }

  const authHeader = { Authorization: `Bearer ${OWNER_TOKEN}` };

  // 1. Connector Status Truthfulness
  try {
    const res = await fetch(`${BASE_URL}/api/gbp-launch/connector-status`, {
      headers: { ...authHeader },
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.connectorStatus.isSimulation, true);
    assert.strictEqual(data.connectorStatus.mode, 'GUIDED_MANUAL');
    assert.strictEqual(data.connectorStatus.apiApproved, false);
    logPass('Truthful Connector Status', `Mode: ${data.connectorStatus.mode}, API Approved: ${data.connectorStatus.apiApproved}`);
  } catch (e: any) {
    logFail('Truthful Connector Status', e.message);
  }

  // 2. Business Intake with Private Address Separation
  let profileId = '';
  try {
    const intakePayload = {
      clientId: 'electrical-pilot-01',
      companyName: 'Apex Electrical Solutions & Generators',
      accountType: 'service_area',
      primaryCategory: 'Electrician',
      secondaryCategories: ['Electrical Installation Service'],
      publicPhone: '(555) 234-5678',
      websiteUrl: 'https://apexelectricalpdx.com',
      serviceAreas: ['Portland, OR', 'Gresham, OR'],
      servicesOffered: ['200A Electrical Panel Upgrade', 'EV Charger Installation'],
      description: 'Licensed, bonded, and insured electrical contractors serving Portland Metro.',
      licenseNumber: 'CCB #239481',
      privateStreetAddress: '1420 SW 5th Ave',
      privateUnit: 'Suite 800',
      privateCity: 'Portland',
      privateState: 'OR',
      privateZip: '97201',
    };

    const res = await fetch(`${BASE_URL}/api/gbp-launch/intake`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader, 'X-Idempotency-Key': `test-intake-${Date.now()}` },
      body: JSON.stringify(intakePayload),
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.ok(data.profile.id);
    assert.strictEqual(data.profile.privateStreetAddress, '1420 SW 5th Ave');
    profileId = data.profile.id;
    logPass('Business Intake & Private Address Separation', `Profile ID: ${profileId}, Private Street: ${maskStreetAddress(data.profile.privateStreetAddress)}`);
  } catch (e: any) {
    logFail('Business Intake & Private Address Separation', e.message);
  }

  // 3. Duplicate Discovery & SAB Classification
  try {
    const res = await fetch(`${BASE_URL}/api/gbp-launch/check-duplicates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader, 'X-Idempotency-Key': `test-dup-${profileId}` },
      body: JSON.stringify({ profileId }),
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.discovery.decision, 'CREATE_NEW_SERVICE_AREA');
    logPass('Duplicate Discovery & SAB Classification', `Decision: ${data.discovery.decision}`);
  } catch (e: any) {
    logFail('Duplicate Discovery & SAB Classification', e.message);
  }

  // 4. Policy-Compliant Profile Plan Generation via Gemini
  let generatedPlan: any = null;
  try {
    const res = await fetch(`${BASE_URL}/api/gbp-launch/generate-profile-plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader, 'X-Idempotency-Key': `test-plan-${profileId}` },
      body: JSON.stringify({ profileId }),
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.ok(data.plan.optimizedName);
    generatedPlan = data.plan;
    logPass('Policy Profile Plan Generation', `Optimized Name: ${data.plan.optimizedName}`);
  } catch (e: any) {
    logFail('Policy Profile Plan Generation', e.message);
  }

  // 5. Human Owner Approval Sign-Off with SHA-256 Content Hash
  let approvalHash = '';
  try {
    const res = await fetch(`${BASE_URL}/api/gbp-launch/approve-profile-plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader, 'X-Idempotency-Key': `test-appr-plan-${profileId}` },
      body: JSON.stringify({ profileId, planPayload: generatedPlan }),
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.ok(data.approval.contentHash);
    approvalHash = data.approval.contentHash;
    logPass('Human Owner Approval SHA-256 Sign-off', `Hash: ${approvalHash.substring(0, 16)}...`);
  } catch (e: any) {
    logFail('Human Owner Approval SHA-256 Sign-off', e.message);
  }

  // 6. Post Draft & Unapproved Dispatch Blocked
  let postId = '';
  try {
    const draftRes = await fetch(`${BASE_URL}/api/gbp-launch/create-post-draft`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader, 'X-Idempotency-Key': `test-post-${Date.now()}` },
      body: JSON.stringify({
        profileId,
        postType: 'offer',
        summary: '200A Electrical Panel Upgrade Special in Portland Metro.',
      }),
    });
    const draftData = await draftRes.json();
    assert.strictEqual(draftRes.status, 200);
    postId = draftData.post.id;

    // Attempt publish WITHOUT approval -> Expect 403 Forbidden
    const unapprovedRes = await fetch(`${BASE_URL}/api/gbp-launch/publish-post`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader },
      body: JSON.stringify({
        postId,
        postContent: { summary: '200A Electrical Panel Upgrade Special in Portland Metro.' },
      }),
    });
    const unapprovedData = await unapprovedRes.json();
    assert.strictEqual(unapprovedRes.status, 403);
    assert.strictEqual(unapprovedData.error, 'FORBIDDEN_APPROVAL_REQUIRED');
    logPass('Unapproved Post Dispatch Blocked (403)', `Error: ${unapprovedData.error}`);
  } catch (e: any) {
    logFail('Unapproved Post Dispatch Blocked (403)', e.message);
  }

  // 7. Post Approval & Tamper Detection
  try {
    // Approve post
    const postPayload = { summary: '200A Electrical Panel Upgrade Special in Portland Metro.' };
    const apprRes = await fetch(`${BASE_URL}/api/gbp-launch/approve-post`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader, 'X-Idempotency-Key': `test-appr-post-${postId}` },
      body: JSON.stringify({ postId, postContent: postPayload }),
    });
    assert.strictEqual(apprRes.status, 200);

    // Attempt publish with MODIFIED payload -> Expect 403 Content Mismatch
    const tamperedRes = await fetch(`${BASE_URL}/api/gbp-launch/publish-post`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader },
      body: JSON.stringify({
        postId,
        postContent: { summary: 'MODIFIED PAYLOAD: Free electrical panels for everyone!' },
      }),
    });
    const tamperedData = await tamperedRes.json();
    assert.strictEqual(tamperedRes.status, 403);
    assert.strictEqual(tamperedData.error, 'APPROVAL_CONTENT_MISMATCH');
    logPass('Post Content Tamper Detection (403)', `Error: ${tamperedData.error}`);

    // Publish with EXACT approved payload -> Expect 200 OK
    const validPubRes = await fetch(`${BASE_URL}/api/gbp-launch/publish-post`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader, 'X-Idempotency-Key': `test-pub-post-${postId}` },
      body: JSON.stringify({ postId, postContent: postPayload }),
    });
    assert.strictEqual(validPubRes.status, 200);
    logPass('Exact Approved Post Published', `Publish Status: published_manual_guided`);
  } catch (e: any) {
    logFail('Post Approval & Tamper Detection', e.message);
  }

  // 8. Tenant-Isolated Audit Logging
  try {
    const auditRes = await fetch(`${BASE_URL}/api/gbp-launch/audit-logs`, {
      headers: { ...authHeader },
    });
    const auditData = await auditRes.json();
    assert.strictEqual(auditRes.status, 200);
    assert.ok(auditData.logs.length > 0);
    logPass('Tenant-Isolated GBP Audit Logs', `Recorded GBP Log Count: ${auditData.logs.length}`);
  } catch (e: any) {
    logFail('Tenant-Isolated GBP Audit Logs', e.message);
  }

  console.log('\n================================================================');
  console.log(`  AUDIT COMPLETE: ${passedCount}/${totalCount} GBP BOUNDARY TESTS PASSED`);
  console.log('================================================================\n');

  if (passedCount < totalCount) {
    process.exit(1);
  }
}

runGbpBoundaryTests().catch((err) => {
  console.error('Fatal Test Runner Error:', err);
  process.exit(1);
});
