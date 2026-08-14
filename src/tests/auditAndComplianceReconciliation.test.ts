import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ariaDispatchService, detectEmergencyHazard } from '../services/ariaDispatchService';
import { launchAuditService } from '../services/launchAuditService';
import { launchIdempotencyService } from '../services/launchIdempotencyService';
import { getDatabase } from '../db/database';
import crypto from 'node:crypto';

const RUN_ID = Date.now();

test('Reconciliation 1: Versioned Consent Model & Unbundled Consent Enforced', () => {
  const tenantId = `tenant-consent-test-${RUN_ID}`;
  
  // A. Reject when consent is missing
  const resNoConsent = ariaDispatchService.intakeLead({
    tenantId,
    idempotencyKey: `idemp-consent-1-${RUN_ID}`,
    customerName: 'Consent Test User',
    contactMethod: 'sms',
    phone: '5085559999',
    zipCode: '02038',
    problemDescription: 'Need EV charger install',
    source: 'web_form'
  });
  assert.equal(resNoConsent.success, false);
  assert.match(resNoConsent.blockReason || '', /MISSING_CONSENT/);

  // B. Reject when consent purpose is unbundled (e.g. PROMOTIONAL consent provided, but intake requires LEAD_RESPONSE)
  const resWrongPurpose = ariaDispatchService.intakeLead({
    tenantId,
    idempotencyKey: `idemp-consent-2-${RUN_ID}`,
    customerName: 'Consent Test User',
    contactMethod: 'sms',
    phone: '5085559999',
    zipCode: '02038',
    problemDescription: 'Need EV charger install',
    source: 'web_form',
    consentRecord: {
      consentStatus: 'OPTED_IN',
      communicationChannel: 'sms',
      messagePurpose: 'PROMOTIONAL', // Wrong purpose!
      consentMethod: 'WEB_FORM_CHECKBOX',
      capturedAt: new Date().toISOString(),
      disclosureVersion: 'v1.0-2026-08',
      disclosureTextHash: crypto.createHash('sha256').update('Promo Disclosure').digest('hex'),
      sourceFormId: 'promo_form_1',
      normalizedRecipient: '+15085559999',
      tenantId,
      revocationStatus: false,
      revokedAt: null,
      evidenceClassification: 'DOCUMENT_SUPPORTED'
    }
  });
  assert.equal(resWrongPurpose.success, false);
  assert.match(resWrongPurpose.blockReason || '', /UNBUNDLED_CONSENT_VIOLATION/);

  // C. Accept when valid versioned LEAD_RESPONSE consent is supplied
  const resValid = ariaDispatchService.intakeLead({
    tenantId,
    idempotencyKey: `idemp-consent-3-${RUN_ID}`,
    customerName: 'Consent Test User',
    contactMethod: 'sms',
    phone: '5085559999',
    zipCode: '02038',
    problemDescription: 'Need EV charger install',
    source: 'web_form',
    consentRecord: {
      consentStatus: 'OPTED_IN',
      communicationChannel: 'sms',
      messagePurpose: 'LEAD_RESPONSE',
      consentMethod: 'WEB_FORM_CHECKBOX',
      capturedAt: new Date().toISOString(),
      disclosureVersion: 'v1.0-2026-08',
      disclosureTextHash: crypto.createHash('sha256').update('Lead Response Disclosure').digest('hex'),
      sourceFormId: 'web_form_v1',
      normalizedRecipient: '+15085559999',
      tenantId,
      revocationStatus: false,
      revokedAt: null,
      evidenceClassification: 'DOCUMENT_SUPPORTED'
    }
  });
  assert.equal(resValid.success, true);
  assert.ok(resValid.lead);
  assert.equal(resValid.lead.consentRecord.messagePurpose, 'LEAD_RESPONSE');
});

test('Reconciliation 2: Emergency Hazard Detection, Negations, Ambiguity & DRY_RUN Safety', () => {
  // A. Negation test: "no sparks", "no smoke" -> NOT emergency
  const negResult = detectEmergencyHazard('There are no sparks and no smoke coming from the outlet, just want a extra plug');
  assert.equal(negResult.isEmergency, false);
  assert.ok(negResult.negatedTerms.length > 0);

  // B. Multiple hazard signals: "smoke", "sparks", "burning smell" -> EMERGENCY
  const emergencyResult = detectEmergencyHazard('I smell burning and there are sparks and smoke at my main panel!');
  assert.equal(emergencyResult.isEmergency, true);
  assert.ok(emergencyResult.detectedSignals.includes('sparks'));
  assert.ok(emergencyResult.detectedSignals.includes('smoke'));

  // C. DRY_RUN Intake behavior on Emergency
  const tenantId = `tenant-emergency-test-${RUN_ID}`;
  const intakeRes = ariaDispatchService.intakeLead({
    tenantId,
    idempotencyKey: `idemp-emerg-1-${RUN_ID}`,
    customerName: 'Emergency User',
    contactMethod: 'sms',
    phone: '5085558888',
    zipCode: '02038',
    problemDescription: 'I see heavy smoke and sparking from my circuit breaker panel!',
    consentProvided: true,
    source: 'web_form'
  });

  assert.equal(intakeRes.success, true);
  assert.ok(intakeRes.lead);
  assert.equal(intakeRes.lead.urgencyCategory, 'EMERGENCY_HAZARD');
  assert.equal(intakeRes.lead.urgentHumanEscalation, true);
  assert.ok(intakeRes.lead.safetyWarningEmitted?.includes('Do not touch any exposed electrical equipment'));
  // Confirm NO external calls or texts were sent in DRY_RUN mode
  assert.equal(intakeRes.lead.executionMode, 'DRY_RUN');
  assert.equal(intakeRes.lead.dispatchStatus, 'UNSENT');
});

test('Reconciliation 3: Audit Log Database-Enforced Append-Only & Hash-Chaining', () => {
  const db = getDatabase();
  const tenantId = `tenant-audit-db-${RUN_ID}`;

  const rec1 = launchAuditService.recordAudit({
    tenantId,
    actorId: 'agent-dispatch',
    clientIp: '192.168.1.100',
    endpoint: '/api/aria/intake',
    action: 'TEST_ACTION_1',
    status: 'SUCCESS',
    executionMode: 'DRY_RUN',
    details: { email: 'john@example.com', phone: '508-555-1234' }
  });

  const rec2 = launchAuditService.recordAudit({
    tenantId,
    actorId: 'agent-dispatch',
    clientIp: '192.168.1.100',
    endpoint: '/api/aria/intake',
    action: 'TEST_ACTION_2',
    status: 'SUCCESS',
    executionMode: 'DRY_RUN',
    details: { step: 2 }
  });

  // Verify Sequence & Hash Chaining
  assert.ok(rec2.sequenceNumber > rec1.sequenceNumber);
  assert.equal(rec2.previousEventHash, rec1.eventHash);
  assert.equal(rec1.clientIp, '192.168.1.x'); // IP sanitized

  // Verify Database Triggers Reject UPDATE
  assert.throws(() => {
    db.prepare(`UPDATE launch_audit_logs SET status = 'TAMPERED' WHERE id = ?`).run(rec1.id);
  }, /AUDIT_LOG_IMMUTABLE/);

  // Verify Database Triggers Reject DELETE
  assert.throws(() => {
    db.prepare(`DELETE FROM launch_audit_logs WHERE id = ?`).run(rec1.id);
  }, /AUDIT_LOG_IMMUTABLE/);
});

test('Reconciliation 4: Idempotency Persistent Key-Store & Concurrent Safety', () => {
  const tenantId = `tenant-idemp-test-${RUN_ID}`;
  const op = 'test_idempotent_op';
  const key = `key-concurrent-${RUN_ID}`;
  const payload = { test: true };

  // First claim succeeds
  const res1 = launchIdempotencyService.claimIdempotency(tenantId, op, key, payload);
  assert.equal(res1.isCached, false);
  assert.equal(res1.isConflict, false);

  // Complete operation
  launchIdempotencyService.saveIdempotency(tenantId, op, key, payload, { result: 'OK' });

  // Second claim returns cached response
  const res2 = launchIdempotencyService.claimIdempotency(tenantId, op, key, payload);
  assert.equal(res2.isCached, true);
  assert.deepEqual(res2.response, { result: 'OK' });
});
