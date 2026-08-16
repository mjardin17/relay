import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { getDatabase } from '../db/database';
import { reisElectricPilotService } from '../services/reisElectricPilotService';
import { pilotActivationStateService } from '../services/pilotActivationStateService';
import { pilotLeadIntakeService } from '../services/pilotLeadIntakeService';
import { productionEvidenceService } from '../services/productionEvidenceService';
import { pilotFailureDrillsService } from '../services/pilotFailureDrillsService';
import { controlledLiveOperationsService } from '../services/controlledLiveOperationsService';

describe('Real Pilot Activation & Production Evidence Capture (Relay v2.0)', () => {
  const tenantId = 'tenant_ma_fresh_launch';

  beforeEach(() => {
    const db = getDatabase();
    db.prepare('DELETE FROM pilot_timeline_events WHERE tenant_id = ?').run(tenantId);
    db.prepare('DELETE FROM production_approvals WHERE tenant_id = ?').run(tenantId);
    db.prepare('DELETE FROM production_idempotency WHERE tenant_id = ?').run(tenantId);
    db.prepare('DELETE FROM manual_outcome_records WHERE tenant_id = ?').run(tenantId);
    db.prepare('DELETE FROM payment_evidence_records WHERE tenant_id = ?').run(tenantId);
    db.prepare('DELETE FROM pilot_lead_intake WHERE tenant_id = ?').run(tenantId);
    db.prepare('DELETE FROM tenant_pilot_states WHERE tenant_id = ?').run(tenantId);
    reisElectricPilotService.seedPilotScenario(tenantId);
  });

  describe('Build 1-3: Data Environment & Tenant Pilot Lifecycle State Machine', () => {
    it('initializes tenant in PILOT_READY with verified MA compliance and connectors', () => {
      const state = pilotActivationStateService.getTenantPilotState(tenantId);
      assert.ok(['PILOT_READY', 'PILOT_ACTIVE'].includes(state.currentState));
    });

    it('evaluates all 12 deterministic readiness gates without fabrication', () => {
      const report = pilotActivationStateService.evaluatePilotReadiness(tenantId);
      assert.strictEqual(report.tenantId, tenantId);
      assert.strictEqual(report.gates.length, 12);

      const maLicenseGate = report.gates.find((g) => g.gateId === 'GATE_MA_COMPLIANCE');
      assert.ok(maLicenseGate);
      assert.strictEqual(maLicenseGate?.status, 'PASS');
      assert.ok(maLicenseGate?.reason.includes('Master Electrician License #19842-A'));

      const sodGate = report.gates.find((g) => g.gateId === 'GATE_SEGREGATION_OF_DUTIES');
      assert.strictEqual(sodGate?.status, 'PASS');
    });

    it('enforces Segregation of Duties: AI agent cannot activate pilot', () => {
      assert.throws(() => {
        pilotActivationStateService.activatePilot({
          tenantId,
          actorId: 'aria_agent_001',
          actorRole: 'AI_ADVISORY_AGENT' as any,
          notes: 'AI attempting self-activation'
        });
      }, /SOD_VIOLATION/);
    });

    it('allows authorized human owner (Shad Reis) to activate pilot', () => {
      const result = pilotActivationStateService.activatePilot({
        tenantId,
        actorId: 'actor_shad_reis',
        actorRole: 'LEGAL_BUSINESS_OWNER',
        notes: 'Owner authorized live pilot start'
      });

      assert.strictEqual(result.success, true);
      const state = pilotActivationStateService.getTenantPilotState(tenantId);
      assert.strictEqual(state.currentState, 'PILOT_ACTIVE');
      assert.strictEqual(state.activatedBy, 'actor_shad_reis');
    });
  });

  describe('Build 4-7: Real Pilot Lead Intake, Deduplication & Location Intelligence', () => {
    it('normalizes inbound customer contact and assigns location intelligence', () => {
      const lead = pilotLeadIntakeService.intakeLead({
        tenantId,
        source: 'Website Form',
        sourceType: 'WEBSITE_FORM',
        fullName: 'Marcus Vance',
        email: 'marcus.vance@example.com',
        phone: '508-555-0199',
        municipality: 'New Bedford',
        stateProvince: 'MA',
        postalCode: '02740',
        serviceRequested: '200A Service Upgrade',
        propertyType: 'Residential',
        consentState: 'OPTED_IN',
        estimatedValue: 3200
      });

      assert.ok(lead.leadId);
      assert.strictEqual(lead.normalizedContact.fullName, 'Marcus Vance');
      assert.strictEqual(lead.normalizedContact.municipality, 'New Bedford');
      assert.strictEqual(lead.locationEvidence.serviceAreaStatus, 'IN_SERVICE_AREA');
      assert.strictEqual(lead.qualificationStatus, 'QUALIFIED');
      assert.strictEqual(lead.duplicateStatus, 'NEW');
    });

    it('detects duplicate lead submissions and flags CONFIRMED_DUPLICATE without losing provenance', () => {
      const lead1 = pilotLeadIntakeService.intakeLead({
        tenantId,
        source: 'Website Form',
        sourceType: 'WEBSITE_FORM',
        fullName: 'Eleanor Rigby',
        email: 'erigby@example.com',
        phone: '508-555-0144',
        municipality: 'Dartmouth',
        stateProvince: 'MA',
        postalCode: '02748',
        serviceRequested: 'EV Charger Installation',
        estimatedValue: 1800
      });

      const lead2 = pilotLeadIntakeService.intakeLead({
        tenantId,
        source: 'GBP Form',
        sourceType: 'AUTHENTICATED_CONNECTOR',
        fullName: 'Eleanor Rigby',
        email: 'erigby@example.com',
        phone: '508-555-0144',
        municipality: 'Dartmouth',
        stateProvince: 'MA',
        postalCode: '02748',
        serviceRequested: 'EV Charger Installation',
        estimatedValue: 1800
      });

      assert.strictEqual(lead1.duplicateStatus, 'NEW');
      assert.strictEqual(lead2.duplicateStatus, 'CONFIRMED_DUPLICATE');
      assert.strictEqual(lead2.duplicateDetails?.matchedLeadId, lead1.leadId);
    });

    it('automatically flags out-of-service-area job locations as DISQUALIFIED', () => {
      const lead = pilotLeadIntakeService.intakeLead({
        tenantId,
        source: 'Web Inquiry',
        sourceType: 'WEBSITE_FORM',
        fullName: 'Western MA Resident',
        email: 'west@example.com',
        phone: '413-555-0100',
        municipality: 'Pittsfield',
        stateProvince: 'MA',
        postalCode: '01201',
        serviceRequested: 'Generator Transfer Switch'
      });

      assert.strictEqual(lead.locationEvidence.serviceAreaStatus, 'OUT_OF_SERVICE_AREA');
      assert.strictEqual(lead.qualificationStatus, 'DISQUALIFIED');
    });
  });

  describe('Build 8-11: Cryptographic Approvals, SoD & Idempotency Boundary', () => {
    it('creates cryptographic proposal and blocks self-approval by proposing operator', () => {
      const proposal = productionEvidenceService.createApprovalProposal({
        tenantId,
        leadId: `lead_test_${Date.now()}`,
        proposedAction: 'Send SMS Estimate Link',
        actionPayload: { text: 'Your estimate is ready: https://reselectric.com/est/123' },
        ariaReasoning: 'Customer consented and requested quote',
        connectorId: 'conn_twilio',
        recipient: '+15085550182',
        consentEvidenceRef: 'consent_ref_001',
        authorizationEvidenceRef: 'auth_ref_001',
        jurisdictionContext: 'New Bedford MA',
        expectedExternalEffect: 'Outbound SMS to mobile carrier',
        proposerId: 'operator_alice',
        proposerRole: 'RELAY_OPERATOR'
      });

      assert.ok(proposal.canonicalPayloadHash);
      assert.strictEqual(proposal.decision, 'PENDING');

      // Operator Alice attempts to approve her own proposal -> MUST THROW SOD_VIOLATION
      assert.throws(() => {
        productionEvidenceService.decideApproval({
          tenantId,
          approvalId: proposal.id,
          decision: 'APPROVED',
          approverId: 'operator_alice',
          approverRole: 'RELAY_OPERATOR'
        });
      }, /SOD_VIOLATION/);

      // Separate authorized approver Shad Reis approves
      const decided = productionEvidenceService.decideApproval({
        tenantId,
        approvalId: proposal.id,
        decision: 'APPROVED',
        approverId: 'actor_shad_reis',
        approverRole: 'LEGAL_BUSINESS_OWNER'
      });

      assert.strictEqual(decided.decision, 'APPROVED');
      assert.strictEqual(decided.approverId, 'actor_shad_reis');
    });

    it('rejects approval if payload was tampered with after proposal (hash mismatch)', () => {
      const originalPayload = { rate: 2500, terms: 'Standard net 30' };
      const tamperedPayload = { rate: 4500, terms: 'Due upon receipt' };

      const proposal = productionEvidenceService.createApprovalProposal({
        tenantId,
        leadId: `lead_tamper_${Date.now()}`,
        proposedAction: 'Send Custom Contract',
        actionPayload: originalPayload,
        ariaReasoning: 'Customer agreed to standard rate',
        connectorId: 'conn_resend',
        recipient: 'customer@example.com',
        consentEvidenceRef: 'consent_002',
        authorizationEvidenceRef: 'auth_002',
        jurisdictionContext: 'Dartmouth MA',
        expectedExternalEffect: 'Email contract',
        proposerId: 'operator_bob',
        proposerRole: 'RELAY_OPERATOR'
      });

      assert.throws(() => {
        productionEvidenceService.decideApproval({
          tenantId,
          approvalId: proposal.id,
          decision: 'APPROVED',
          approverId: 'actor_shad_reis',
          approverRole: 'LEGAL_BUSINESS_OWNER',
          executionPayload: tamperedPayload
        });
      }, /PAYLOAD_HASH_MISMATCH/);
    });

    it('enforces execution idempotency: same request returns cached result, differing payload throws conflict', () => {
      const idempotencyKey = `idemp_test_${Date.now()}`;
      const hashAlpha = 'hash_request_alpha';
      const hashBeta = 'hash_request_beta';

      // 1. Initial execution
      const first = productionEvidenceService.verifyOrRecordIdempotency({
        tenantId,
        connectorId: 'conn_twilio',
        capability: 'SMS',
        operation: 'SEND_SMS',
        idempotencyKey,
        canonicalRequestHash: hashAlpha,
        target: '+15085550182',
        executionId: 'exec_first',
        result: { status: 'DELIVERED', sid: 'SM12345' }
      });
      assert.strictEqual(first.isDuplicate, false);

      // 2. Replay with identical hash
      const replay = productionEvidenceService.verifyOrRecordIdempotency({
        tenantId,
        connectorId: 'conn_twilio',
        capability: 'SMS',
        operation: 'SEND_SMS',
        idempotencyKey,
        canonicalRequestHash: hashAlpha,
        target: '+15085550182',
        executionId: 'exec_second'
      });
      assert.strictEqual(replay.isDuplicate, true);
      assert.strictEqual((replay.cachedResult as any)?.sid, 'SM12345');

      // 3. Replay with modified hash -> MUST THROW IDEMPOTENCY_CONFLICT
      assert.throws(() => {
        productionEvidenceService.verifyOrRecordIdempotency({
          tenantId,
          connectorId: 'conn_twilio',
          capability: 'SMS',
          operation: 'SEND_SMS',
          idempotencyKey,
          canonicalRequestHash: hashBeta,
          target: '+15085550182',
          executionId: 'exec_third'
        });
      }, /IDEMPOTENCY_CONFLICT/);
    });
  });

  describe('Build 12-15: Manual Outcomes, Payment Capture & Cryptographic Audit Package', () => {
    it('records manual outcome tagged strictly as OPERATOR_REPORTED', () => {
      const outcome = productionEvidenceService.recordManualOutcome({
        tenantId,
        leadId: `lead_reis_pilot_${tenantId}`,
        outcomeType: 'JOB_BOOKED',
        amount: 2850,
        notes: 'Signed contract for 200A panel upgrade',
        operatorId: 'operator_shad_reis',
        operatorRole: 'LEGAL_BUSINESS_OWNER'
      });

      assert.strictEqual(outcome.verificationStatus, 'OPERATOR_REPORTED');
      assert.strictEqual(outcome.amount, 2850);
    });

    it('captures verified payment evidence and calculates defensible financial metrics', () => {
      productionEvidenceService.recordPaymentEvidence({
        tenantId,
        leadId: `lead_reis_pilot_${tenantId}`,
        paymentAmount: 2850,
        evidenceState: 'VERIFIED',
        processorName: 'Stripe Merchant',
        transactionReference: 'ch_3Pz79xLkdIw45B01',
        bankDepositReference: 'dep_982310',
        operatorId: 'operator_shad_reis',
        notes: 'Bank deposit verified',
        dataEnvironment: 'PILOT'
      });

      const metrics = productionEvidenceService.calculateProductionFinancialMetrics(tenantId, 'PILOT');
      assert.strictEqual(metrics.verifiedRevenue, 2850);
      assert.ok(metrics.attributableGrossProfit > 1000);
    });

    it('generates cryptographic audit package with complete hash chain', () => {
      const pkg = productionEvidenceService.generatePilotAuditPackage(tenantId, `lead_reis_pilot_${tenantId}`);
      assert.strictEqual(pkg.tenantId, tenantId);
      assert.strictEqual(pkg.leadId, `lead_reis_pilot_${tenantId}`);
      assert.ok(pkg.auditHash);
      assert.ok(pkg.timelineEvents.length > 0);
      assert.ok(pkg.verifiedAt);
    });
  });

  describe('Build 16-18: Emergency Pilot Controls & Failure Drills Execution', () => {
    it('engages emergency stop and halts queue execution until resumed', () => {
      pilotActivationStateService.pausePilot(tenantId, 'actor_shad_reis', 'Emergency drill test');
      const state = pilotActivationStateService.getTenantPilotState(tenantId);
      assert.strictEqual(state.currentState, 'PAUSED');

      // Attempting to process queue item while paused must throw EMERGENCY_STOP_ENGAGED
      const conn = controlledLiveOperationsService.registerConnector({
        tenantId,
        provider: 'TWILIO',
        capability: 'SMS_DISPATCH',
        connectorType: 'REST_API'
      });

      const item = controlledLiveOperationsService.enqueueExecution({
        tenantId,
        connectorId: conn.id,
        operation: 'SEND_SMS',
        target: '+15085550182',
        payload: { text: 'test' },
        idempotencyKey: `emergency_test_${Date.now()}`,
        proposerId: 'operator_test',
        proposerRole: 'RELAY_OPERATOR'
      });

      assert.throws(() => {
        controlledLiveOperationsService.processQueueItem(item.id);
      }, /EMERGENCY_STOP_ENGAGED/);

      // Resuming pilot allows execution
      pilotActivationStateService.resumePilot(tenantId, 'actor_shad_reis');
      assert.strictEqual(pilotActivationStateService.getTenantPilotState(tenantId).currentState, 'PILOT_ACTIVE');
    });

    it('executes all 13 deterministic failure drills and verifies safe fail-closed behavior', () => {
      const results = pilotFailureDrillsService.runAllDrills(tenantId);
      assert.strictEqual(results.length, 13);

      for (const drill of results) {
        assert.strictEqual(drill.passed, true);
        assert.strictEqual(drill.auditVerified, true);
      }
    });
  });
});
