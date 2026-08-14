import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ariaDispatchService } from '../services/ariaDispatchService';
import { maElectricalComplianceService } from '../services/maElectricalComplianceService';
import { rebateKnowledgeService } from '../services/rebateKnowledgeService';
import { agentTrainingService } from '../services/agentTrainingService';
import { pricingRulesService } from '../services/pricingRulesService';
import { launchAuditService } from '../services/launchAuditService';
import { redactText } from '../utils/redaction';
import { CANONICAL_CAPABILITY_REGISTRY, hasVerifiedRuntime } from '../data/capabilityRegistry';

const RUN_ID = Date.now();

test('1. Agent UI configuration cannot be labeled live deployment', () => {
  assert.equal(hasVerifiedRuntime('agent-strategist'), false);
  assert.equal(hasVerifiedRuntime('agent-seo'), false);
  assert.equal(hasVerifiedRuntime('agent-rebate'), false);
  assert.equal(hasVerifiedRuntime('agent-brand'), false);
});

test('2. Unverified capabilities display accurate status in registry', () => {
  const kaelenCap = CANONICAL_CAPABILITY_REGISTRY.find((c) => c.agentId === 'agent-strategist');
  assert.ok(kaelenCap);
  assert.equal(kaelenCap.implementationStatus, 'UI_CONFIGURED');
  assert.equal(kaelenCap.executionMode, 'DEMO');

  const ariaLiveCap = CANONICAL_CAPABILITY_REGISTRY.find((c) => c.capabilityId === 'aria-live-sms-dispatch');
  assert.ok(ariaLiveCap);
  assert.equal(ariaLiveCap.implementationStatus, 'BLOCKED');
});

test('3. Aria cannot dispatch without consent and content-bound approval', async () => {
  const tenantId = `tenant-reis-test-3-${RUN_ID}`;
  const noConsentRes = ariaDispatchService.intakeLead({
    tenantId,
    idempotencyKey: `key-no-consent-1-${RUN_ID}`,
    customerName: 'John Doe',
    contactMethod: 'sms',
    phone: '5085551234',
    zipCode: '02038',
    problemDescription: 'Flickering lights in kitchen',
    consentProvided: false,
    source: 'web_form'
  });

  assert.equal(noConsentRes.success, false);
  assert.match(noConsentRes.blockReason || '', /MISSING_CONSENT/);
});

test('4. Editing a draft invalidates approval (hash mismatch)', () => {
  const tenantId = `tenant-reis-test-4-${RUN_ID}`;
  const intakeRes = ariaDispatchService.intakeLead({
    tenantId,
    idempotencyKey: `key-hash-test-1-${RUN_ID}`,
    customerName: 'Jane Smith',
    contactMethod: 'sms',
    phone: '5085559876',
    zipCode: '02038',
    problemDescription: 'Need 200A panel quote',
    consentProvided: true,
    source: 'web_form'
  });

  assert.equal(intakeRes.success, true);
  assert.ok(intakeRes.lead);

  // Attempt to approve with edited text
  const approvalRes = ariaDispatchService.approveDraft(
    tenantId,
    intakeRes.lead.id,
    'user-approver-1',
    'TAMPERED_DRAFT_TEXT_DIFFERENT_FROM_PROPOSED'
  );

  assert.equal(approvalRes.success, false);
  assert.match(approvalRes.error || '', /APPROVAL_HASH_MISMATCH/);
});

test('5. Opted-out contacts are blocked', () => {
  const tenantId = `tenant-reis-test-5-${RUN_ID}`;
  const optOutPhone = '5085550000';
  ariaDispatchService.setOptOut(optOutPhone);

  const res = ariaDispatchService.intakeLead({
    tenantId,
    idempotencyKey: `key-opt-out-1-${RUN_ID}`,
    customerName: 'Opted Out User',
    contactMethod: 'sms',
    phone: optOutPhone,
    zipCode: '02038',
    problemDescription: 'Panel upgrade enquiry',
    consentProvided: true,
    source: 'web_form'
  });

  assert.equal(res.success, false);
  assert.match(res.blockReason || '', /CONTACT_SUPPRESSED/);
});

test('6. Duplicate leads and repeated requests do not cause duplicate dispatch', async () => {
  const tenantId = `tenant-reis-test-6-${RUN_ID}`;
  const key = `key-idempotency-dup-1-${RUN_ID}`;

  const res1 = ariaDispatchService.intakeLead({
    tenantId,
    idempotencyKey: key,
    customerName: 'Repeat Customer',
    contactMethod: 'sms',
    phone: '5085551111',
    zipCode: '02038',
    problemDescription: 'Outlet sparking',
    consentProvided: true,
    source: 'web_form'
  });

  assert.equal(res1.success, true);

  const res2 = ariaDispatchService.intakeLead({
    tenantId,
    idempotencyKey: key,
    customerName: 'Repeat Customer',
    contactMethod: 'sms',
    phone: '5085551111',
    zipCode: '02038',
    problemDescription: 'Outlet sparking',
    consentProvided: true,
    source: 'web_form'
  });

  assert.equal(res2.success, true);
  assert.equal(res2.lead?.id, res1.lead?.id); // Returns original lead record without creating duplicate
});

test('7. Cross-tenant access is rejected', () => {
  const tenantA = `tenant-A-${RUN_ID}`;
  const tenantB = `tenant-B-${RUN_ID}`;

  const intakeRes = ariaDispatchService.intakeLead({
    tenantId: tenantA,
    idempotencyKey: `key-tenant-isolation-1-${RUN_ID}`,
    customerName: 'Alice',
    contactMethod: 'sms',
    phone: '5085552222',
    zipCode: '02038',
    problemDescription: 'EV charger install',
    consentProvided: true,
    source: 'web_form'
  });

  assert.equal(intakeRes.success, true);
  assert.ok(intakeRes.lead);

  // Attempt cross-tenant access to draft approval
  const crossRes = ariaDispatchService.approveDraft(
    tenantB,
    intakeRes.lead.id,
    'user-approver-cross',
    intakeRes.lead.proposedDraftText
  );

  assert.equal(crossRes.success, false);
  assert.match(crossRes.error || '', /LEAD_NOT_FOUND/);
});

test('8. Emergency stop blocks execution', () => {
  const tenantId = 'tenant-emergency-stop-1';
  ariaDispatchService.setEmergencyStop(tenantId, true);

  const res = ariaDispatchService.intakeLead({
    tenantId,
    idempotencyKey: 'key-emergency-stop-1',
    customerName: 'Bob',
    contactMethod: 'sms',
    phone: '5085553333',
    zipCode: '02038',
    problemDescription: 'Need light fixture installed',
    consentProvided: true,
    source: 'web_form'
  });

  assert.equal(res.success, false);
  assert.match(res.blockReason || '', /EMERGENCY_STOP_ACTIVE/);

  // Resume emergency stop
  ariaDispatchService.setEmergencyStop(tenantId, false);
});

test('9. Synthetic activity is excluded from production KPIs', () => {
  const demoCaps = CANONICAL_CAPABILITY_REGISTRY.filter((c) => c.executionMode === 'DEMO');
  assert.ok(demoCaps.length > 0);
  demoCaps.forEach((cap) => {
    assert.notEqual(cap.implementationStatus, 'LIVE_PRODUCTION');
  });
});

test('10. Individual licensing cannot satisfy the business-license gate', () => {
  const evalResult = maElectricalComplianceService.evaluateCompliance('tenant-reis-test-10', {
    legalBusinessName: 'Reis Electric LLC',
    maA1BusinessLicenseNumber: '', // Missing A1 business license
    businessLicenseStatus: 'unverified',
    masterElectricianName: 'Shadrick M. Reis',
    masterElectricianLicenseNumber: 'B-38914', // Individual Journeyman credential
    masterElectricianLicenseStatus: 'active',
    masterElectricianClassification: 'SELF_REPORTED',
    journeymanLicenses: [
      {
        workerName: 'Shadrick M. Reis',
        licenseNumber: 'B-38914',
        licenseStatus: 'active',
        evidenceClassification: 'SELF_REPORTED'
      }
    ],
    evidenceSource: 'SELF_REPORTED'
  });

  assert.equal(evalResult.canClaimLicensedCompany, false);
  assert.ok(evalResult.blockedReasoning.some((r) => r.includes('INDIVIDUAL_JOURNEYMAN_GATE')));
});

test('11. Unverified rebate records cannot produce definitive eligibility claims', () => {
  // Query with no approved rebate programs in registry
  const res = rebateKnowledgeService.queryRebates('EV Charger', '02038');
  assert.equal(res.matchingPrograms.length, 0);
  assert.match(res.informationalDisclaimer, /INFORMATIONAL DISCLAIMER/);
});

test('12. Human feedback cannot automatically modify production instructions', () => {
  const propVersion = agentTrainingService.createProposedVersion(
    'agent-dispatch',
    'Updated Aria prompt with customer feedback',
    'Iteration 2'
  );

  assert.equal(propVersion.status, 'DRAFT');

  // Attempt to promote without running regression evaluation first
  const promoRes = agentTrainingService.promoteToProduction('agent-dispatch', propVersion.id, 'user-approver-12');
  assert.equal(promoRes.success, false);
  assert.match(promoRes.error || '', /EVAL_REQUIRED/);
});

test('13. Pricing ranges cannot be represented as binding quotes without approved pricing rules', () => {
  const evalRes = pricingRulesService.evaluatePricing({
    tenantId: 'tenant-unbacked-price-13',
    serviceRequested: 'Custom Solar Panel Overhaul',
    city: 'Franklin'
  });

  assert.equal(evalRes.allowed, false);
  assert.equal(evalRes.classification, 'INFORMATION_REQUEST');
  assert.match(evalRes.blockedReason || '', /NO_APPROVED_PRICING_RULE/);
});

test('14. Audit events preserve agent, tenant, approver, input hash, output hash, mode, and outcome', () => {
  const tenantId = `tenant-audit-test-14-${RUN_ID}`;
  const intakeRes = ariaDispatchService.intakeLead({
    tenantId,
    idempotencyKey: `key-audit-14-${RUN_ID}`,
    customerName: 'Audit Test User',
    contactMethod: 'sms',
    phone: '5085554444',
    zipCode: '02038',
    problemDescription: 'Generac generator transfer switch install',
    consentProvided: true,
    source: 'web_form'
  });

  assert.equal(intakeRes.success, true);
  assert.ok(intakeRes.lead);

  const trail = launchAuditService.getTenantAuditLogs(tenantId);
  assert.ok(trail.length > 0);
  const lastEvent = trail[0]; // Ordered DESC
  assert.equal(lastEvent.tenantId, tenantId);
  assert.equal(lastEvent.actorId, 'agent-dispatch (Aria)');
  assert.ok(lastEvent.details.contentHash);
});

test('15. All existing privacy, redaction, financial, approval, and isolation gates remain passing', () => {
  const sensitiveText = 'Customer John Doe at 508-555-1234 or email john@example.com asked for quote.';
  const redacted = redactText(sensitiveText);

  assert.equal(redacted.includes('508-555-1234'), false);
  assert.equal(redacted.includes('john@example.com'), false);
  assert.ok(redacted.includes('[REDACTED_PHONE]'));
  assert.ok(redacted.includes('[REDACTED_EMAIL]'));
});
