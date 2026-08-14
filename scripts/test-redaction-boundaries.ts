import assert from 'node:assert';
import {
  maskStreetAddress,
  redactText,
  redactObject,
} from '../src/utils/redaction';
import { getDatabase } from '../src/db/database';

const BASE_URL = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';
const OWNER_TOKEN = 'token_owner_tenant1';
const TENANT2_TOKEN = 'token_owner_tenant2';

async function runRedactionBoundaryTests() {
  console.log('\n================================================================');
  console.log('  RELAY CENTRALIZED REDACTION & PRIVACY BOUNDARY AUDIT');
  console.log('================================================================\n');

  let passed = 0;
  let total = 0;

  function assertPass(name: string, condition: boolean, detail?: string) {
    total++;
    if (condition) {
      passed++;
      console.log(`  \x1b[32m✓ [PASS]\x1b[0m ${name}`);
      if (detail) console.log(`    \x1b[90mDetails: ${detail}\x1b[0m`);
    } else {
      console.log(`  \x1b[31m✗ [FAIL]\x1b[0m ${name}`);
      throw new Error(`Assertion failed for: ${name}`);
    }
  }

  // 1. Street Address Masking Unit Tests
  console.log('\n1. Street Address Masking Unit Tests');
  assertPass(
    'Standard street address masked with leading house number',
    maskStreetAddress('1420 SW 5th Ave') === '1420 ***',
    `Result: ${maskStreetAddress('1420 SW 5th Ave')}`
  );
  assertPass(
    'Street address with suite masked correctly',
    maskStreetAddress('100 N Main Street Suite 400') === '100 ***',
    `Result: ${maskStreetAddress('100 N Main Street Suite 400')}`
  );
  assertPass(
    'Street name without house number returns [REDACTED_ADDRESS]',
    maskStreetAddress('Main Street') === '[REDACTED_ADDRESS]',
    `Result: ${maskStreetAddress('Main Street')}`
  );
  assertPass(
    'Empty or null address handles gracefully',
    maskStreetAddress(null) === '' && maskStreetAddress(undefined) === '',
    'Handled null/undefined without throwing'
  );

  // 2. Free-text Redaction Scanning Tests
  console.log('\n2. Free-text Redaction Scanning Tests');
  const rawText = 'Error verifying address 1420 SW 5th Ave for user dr.smith@dentalcare.com';
  const sanitizedText = redactText(rawText);
  assertPass(
    'Redacts street address and email in arbitrary error/log text',
    !sanitizedText.includes('1420 SW 5th Ave') &&
      !sanitizedText.includes('dr.smith@dentalcare.com') &&
      sanitizedText.includes('1420 ***') &&
      sanitizedText.includes('[REDACTED_EMAIL]'),
    `Sanitized: "${sanitizedText}"`
  );

  // 3. Object & Nested Payload Redaction Tests
  console.log('\n3. Object & Nested Payload Redaction Tests');
  const complexObj: any = {
    companyName: 'Apex Electrical Solutions',
    privateStreetAddress: '1420 SW 5th Ave',
    private_unit: 'Suite 800',
    location_address: '742 Evergreen Terrace',
    contactEmail: 'owner@apexelectricalpdx.com',
    secretKey: 'sk_test_992817293812',
    nestedList: [
      { streetAddress: '1420 SW 5th Ave', userEmail: 'test@example.com' },
    ],
    metadataJsonStr: '{"privateStreetAddress":"1420 SW 5th Ave","email":"nested@domain.com"}',
    errInstance: new Error('Failed to validate address 1420 SW 5th Ave'),
  };

  // Add circular reference
  complexObj.selfRef = complexObj;

  const redacted = redactObject(complexObj);

  assertPass(
    'Redacts privateStreetAddress in top-level object',
    redacted.privateStreetAddress === '1420 ***',
    `Value: ${redacted.privateStreetAddress}`
  );
  assertPass(
    'Redacts private_unit',
    redacted.private_unit === '[REDACTED_UNIT]',
    `Value: ${redacted.private_unit}`
  );
  assertPass(
    'Redacts alternate key location_address',
    redacted.location_address === '742 ***',
    `Value: ${redacted.location_address}`
  );
  assertPass(
    'Redacts contactEmail and secretKey',
    redacted.contactEmail === '[REDACTED_EMAIL]' && redacted.secretKey === '[REDACTED_SENSITIVE_DATA]',
    'Emails and keys redacted'
  );
  assertPass(
    'Redacts nested arrays and objects',
    redacted.nestedList[0].streetAddress === '1420 ***' &&
      redacted.nestedList[0].userEmail === '[REDACTED_EMAIL]',
    'Nested list redacted'
  );
  assertPass(
    'Redacts stringified JSON payloads',
    !redacted.metadataJsonStr.includes('1420 SW 5th Ave') &&
      redacted.metadataJsonStr.includes('1420 ***') &&
      redacted.metadataJsonStr.includes('[REDACTED_EMAIL]'),
    `Serialized JSON: ${redacted.metadataJsonStr}`
  );
  assertPass(
    'Redacts Error instances gracefully',
    !redacted.errInstance.message.includes('1420 SW 5th Ave') &&
      redacted.errInstance.message.includes('1420 ***'),
    `Error Message: ${redacted.errInstance.message}`
  );
  assertPass(
    'Handles circular references without infinite call stack',
    redacted.selfRef === '[CIRCULAR_REFERENCE]',
    'Circular reference trapped safely'
  );

  // 4. Source Record Non-Destruction Integrity Test
  console.log('\n4. Source Record Non-Destruction Integrity Test');
  const testIntakePayload = {
    clientId: 'redaction-test-client',
    companyName: 'Redaction Integrity Electricians',
    accountType: 'service_area',
    primaryCategory: 'Electrician',
    secondaryCategories: [],
    publicPhone: '(555) 999-0000',
    websiteUrl: 'https://redaction-test.com',
    serviceAreas: ['Portland, OR'],
    servicesOffered: ['Panel Upgrade'],
    description: 'Licensed electrical contractors for redaction verification testing.',
    privateStreetAddress: '1420 SW 5th Ave',
    privateUnit: 'Suite 800',
    privateCity: 'Portland',
    privateState: 'OR',
    privateZip: '97201',
  };

  const intakeRes = await fetch(`${BASE_URL}/api/gbp-launch/intake`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OWNER_TOKEN}`,
      'X-Idempotency-Key': `redact-test-${Date.now()}`,
    },
    body: JSON.stringify(testIntakePayload),
  });
  const intakeText = await intakeRes.text();
  let intakeData: any = {};
  try {
    intakeData = JSON.parse(intakeText);
  } catch (err) {
    throw new Error(`Failed to parse intake response JSON: ${intakeText.substring(0, 200)}`);
  }
  assert.strictEqual(intakeRes.status, 200);
  const profileId = intakeData.profile.id;

  // Query raw database row directly from SQLite
  const db = getDatabase();
  const rawDbRow = db
    .prepare('SELECT private_street_address, private_unit FROM gbp_profiles WHERE id = ?')
    .get(profileId) as any;

  assertPass(
    'Source database record retains full original address for authorized workflows',
    rawDbRow.private_street_address === '1420 SW 5th Ave' && rawDbRow.private_unit === 'Suite 800',
    `DB Street: "${maskStreetAddress(rawDbRow.private_street_address)}", Unit: "${rawDbRow.private_unit}"`
  );

  // 5. Audit Log Redaction & Tenant Isolation API Verification
  console.log('\n5. Audit Log Redaction & Tenant Isolation API Verification');
  const auditRes = await fetch(`${BASE_URL}/api/gbp-launch/audit-logs`, {
    headers: { Authorization: `Bearer ${OWNER_TOKEN}` },
  });
  const auditText = await auditRes.text();
  let auditData: any = {};
  try {
    auditData = JSON.parse(auditText);
  } catch (err) {
    throw new Error(`Failed to parse audit response JSON: ${auditText.substring(0, 200)}`);
  }
  assert.strictEqual(auditRes.status, 200);

  const auditLogStr = JSON.stringify(auditData.logs);
  assertPass(
    'Shared audit log details contain ZERO unredacted private street addresses or emails',
    !auditLogStr.includes('1420 SW 5th Ave') && !auditLogStr.includes('owner@apexelectricalpdx.com'),
    'All audit log details verified clean'
  );

  // Tenant 2 isolation check
  const tenant2AuditRes = await fetch(`${BASE_URL}/api/gbp-launch/audit-logs`, {
    headers: { Authorization: `Bearer ${TENANT2_TOKEN}` },
  });
  const tenant2AuditText = await tenant2AuditRes.text();
  let tenant2AuditData: any = {};
  try {
    tenant2AuditData = JSON.parse(tenant2AuditText);
  } catch (err) {
    throw new Error(`Failed to parse tenant2 audit response JSON: ${tenant2AuditText.substring(0, 200)}`);
  }
  assert.strictEqual(tenant2AuditRes.status, 200);

  const t2HasT1Logs = tenant2AuditData.logs.some((l: any) => l.tenant_id === 'tenant_demo_1');
  assertPass(
    'Tenant 2 cannot read Tenant 1 audit records (Tenant isolation enforced)',
    !t2HasT1Logs,
    `Tenant 2 total GBP audit log count: ${tenant2AuditData.logs.length}`
  );

  // 6. Automated Privacy Gate Scanner Regression Tests
  console.log('\n6. Automated Privacy Gate Scanner Regression Tests');
  const { PrivacyGateScanner } = await import('../src/utils/privacyGateScanner');
  const { CONTROLLED_FORBIDDEN_PATTERNS } = await import('./verify-privacy-gate');

  const gateScanner = new PrivacyGateScanner(CONTROLLED_FORBIDDEN_PATTERNS);
  const rawAddrFixture = ['1420', 'SW', '5th', 'Ave'].join(' ');

  // Test 6a: Raw report rejection
  const badReport = `# Report\nLocated at ${rawAddrFixture} in Portland.`;
  const badViolations = gateScanner.scanTextContent('bad_report.md', badReport);
  assertPass(
    'Report containing raw private address is REJECTED by PrivacyGateScanner',
    badViolations.length > 0 && badViolations[0].classification === 'PRIVATE_ADDRESS',
    `Caught ${badViolations.length} violation(s) on bad_report.md`
  );

  // Test 6b: Masked report passes
  const goodReport = `# Report\nLocated at 1420 *** in Portland.`;
  const goodViolations = gateScanner.scanTextContent('good_report.md', goodReport);
  assertPass(
    'Report containing only masked address PASSES PrivacyGateScanner',
    goodViolations.length === 0,
    'Zero violations detected on good_report.md'
  );

  // Test 6c: Nested JSON, arrays, and Error objects scanned
  const nestedErrorPayload = {
    metadata: [
      { location: rawAddrFixture }
    ],
    lastErr: new Error(`Failed address lookup for ${rawAddrFixture}`)
  };
  const nestedViolations = gateScanner.scanObject('nested_payload.json', nestedErrorPayload);
  assertPass(
    'Nested JSON, arrays, serialized payloads, and Error objects are scanned',
    nestedViolations.length >= 2,
    `Caught ${nestedViolations.length} nested violations`
  );

  // Test 6d: stdout and stderr scanning
  const stdoutLog = `[INFO] Initializing service at ${rawAddrFixture}`;
  const stderrLog = `[ERROR] Connection timeout for address ${rawAddrFixture}`;
  const stdoutViolations = gateScanner.scanTextContent('captured_stdout.log', stdoutLog);
  const stderrViolations = gateScanner.scanTextContent('captured_stderr.log', stderrLog);
  assertPass(
    'Captured stdout and stderr logs are scanned and flagged on exposure',
    stdoutViolations.length === 1 && stderrViolations.length === 1,
    `stdout target: ${stdoutViolations[0]?.targetName}, stderr target: ${stderrViolations[0]?.targetName}`
  );

  // Test 6e: Failure message never repeats detected secret
  const formattedFailureReport = gateScanner.formatViolationsReport(badViolations);
  assertPass(
    'Failure report message NEVER repeats the detected raw secret',
    !formattedFailureReport.includes(rawAddrFixture),
    'Verified report uses safe fingerprint sha256:... without echoing raw secret'
  );

  console.log('\n================================================================');
  console.log(`  AUDIT COMPLETE: ${passed}/${total} REDACTION BOUNDARY TESTS PASSED`);
  console.log('================================================================\n');

  if (passed < total) {
    process.exit(1);
  }
}

runRedactionBoundaryTests().catch((err) => {
  console.error('Redaction Boundary Test Suite Error:', err);
  process.exit(1);
});
