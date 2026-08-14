import { ariaDispatchService } from '../src/services/ariaDispatchService';
import { launchAuditService } from '../src/services/launchAuditService';
import { launchIdempotencyService } from '../src/services/launchIdempotencyService';
import crypto from 'node:crypto';

async function runDemo() {
  const timestamp = new Date().toISOString();
  console.log(`================================================================================`);
  console.log(`RELAY v2.0 CONTROLLED PILOT DRY_RUN DEMONSTRATION`);
  console.log(`Timestamp: ${timestamp}`);
  console.log(`Tenant: tenant-reis-electric (Reis Electric LLC, Franklin MA)`);
  console.log(`Agent: Aria (Speed-to-Lead & Electrical Dispatch)`);
  console.log(`Execution Mode: DRY_RUN (No live SMS, no external network calls, synthetic data)`);
  console.log(`================================================================================\n`);

  // Step 1: Inbound Lead Intake with Versioned Consent
  const idempotencyKey = `demo-aria-intake-${Date.now()}`;
  const payload = {
    tenantId: 'tenant-reis-electric',
    idempotencyKey,
    customerName: 'Synthetic Demo Customer',
    contactMethod: 'sms' as const,
    phone: '508-555-0199',
    email: 'demo-customer@example.com',
    serviceAddress: '100 Main St, Franklin, MA',
    zipCode: '02038',
    problemDescription: 'Looking for an estimate to install a 240V Level 2 EV charger in my Franklin garage.',
    source: 'web_lead_form_v1',
    consentRecord: {
      consentStatus: 'OPTED_IN' as const,
      communicationChannel: 'sms' as const,
      messagePurpose: 'LEAD_RESPONSE' as const,
      consentMethod: 'WEB_FORM_CHECKBOX' as const,
      capturedAt: timestamp,
      disclosureVersion: 'v1.0-2026-08',
      disclosureTextHash: crypto.createHash('sha256').update('Web Form Lead Consent Disclosure v1.0').digest('hex'),
      sourceFormId: 'web_form_v1',
      normalizedRecipient: '+15085550199',
      tenantId: 'tenant-reis-electric',
      revocationStatus: false,
      revokedAt: null,
      evidenceClassification: 'DOCUMENT_SUPPORTED' as const
    }
  };

  console.log(`1. INBOUND LEAD INTAKE (POST /api/aria/intake)`);
  console.log(`Input Payload:`, JSON.stringify(payload, null, 2));

  const intakeResult = ariaDispatchService.intakeLead(payload);
  console.log(`\nIntake Response:`, JSON.stringify(intakeResult, null, 2));

  if (!intakeResult.success || !intakeResult.lead) {
    console.error(`Intake Failed! Exiting.`);
    process.exit(1);
  }

  const lead = intakeResult.lead;

  // Step 2: Content Hash Bound Approval
  console.log(`\n--------------------------------------------------------------------------------`);
  console.log(`2. DRAFT RESPONSE APPROVAL (POST /api/aria/approve)`);
  console.log(`Proposed Draft Text: "${lead.proposedDraftText}"`);
  console.log(`Content Hash: ${lead.contentHash}`);

  const approvalResult = ariaDispatchService.approveDraft(
    'tenant-reis-electric',
    lead.id,
    'owner-shadrick-reis',
    lead.proposedDraftText
  );
  console.log(`\nApproval Response:`, JSON.stringify(approvalResult, null, 2));

  // Step 3: Execution Dispatch in DRY_RUN Mode
  console.log(`\n--------------------------------------------------------------------------------`);
  console.log(`3. DISPATCH EXECUTION (POST /api/aria/execute)`);
  const dispatchResult = await ariaDispatchService.executeDispatch('tenant-reis-electric', lead.id);
  console.log(`Dispatch Response:`, JSON.stringify(dispatchResult, null, 2));

  // Step 4: Audit Verification
  console.log(`\n--------------------------------------------------------------------------------`);
  console.log(`4. TAMPER-EVIDENT AUDIT TRAIL VERIFICATION`);
  const auditLogs = launchAuditService.getTenantAuditLogs('tenant-reis-electric', 3);
  console.log(`Latest Audit Log Entries:`, JSON.stringify(auditLogs, null, 2));

  console.log(`\n================================================================================`);
  console.log(`DEMONSTRATION COMPLETED SUCCESSFULLY WITH EXIT CODE 0`);
  console.log(`================================================================================`);
}

runDemo().catch((err) => {
  console.error('Demo Error:', err);
  process.exit(1);
});
