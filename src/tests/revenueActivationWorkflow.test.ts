import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { getDatabase } from '../db/database';
import { productLauncherService } from '../services/productLauncherService';
import { revenueActivationService } from '../services/revenueActivationService';
import { JardinOutpostService } from '../services/jardinOutpostService';
import { EmergencyControlService } from '../services/emergencyControlService';

describe('Relay Revenue-Activation Workflow & Product Launcher Test Suite', () => {
  const testTenantId = 'tenant_revenue_activation_test';
  const studioTenantId = JardinOutpostService.TENANT_ID;

  beforeEach(() => {
    const db = getDatabase();
    const now = new Date().toISOString();

    // Ensure tenants exist
    db.prepare(`
      INSERT OR IGNORE INTO tenants (id, name, industry, created_at)
      VALUES (?, 'Test Revenue Tenant', 'Software & Automation', ?)
    `).run(testTenantId, now);

    db.prepare(`
      INSERT OR IGNORE INTO tenants (id, name, industry, created_at)
      VALUES (?, 'Jardin Outpost Studio', 'Software Studio', ?)
    `).run(studioTenantId, now);

    // Clean up test tables (audit logs are append-only and immutable)
    db.prepare('DELETE FROM opportunities WHERE tenant_id IN (?, ?)').run(testTenantId, studioTenantId);
    db.prepare('DELETE FROM universal_action_records WHERE tenant_id IN (?, ?)').run(testTenantId, studioTenantId);
    db.prepare('DELETE FROM explainable_attributions WHERE tenant_id IN (?, ?)').run(testTenantId, studioTenantId);
    db.prepare('DELETE FROM emergency_controls WHERE tenant_id IN (?, ?)').run(testTenantId, studioTenantId);
  });

  describe('1. Product Launcher Roster & Specification Retrieval', () => {
    it('provides authoritative roster of all 5 verified products', () => {
      const products = productLauncherService.getProducts(testTenantId);
      assert.ok(products.length >= 5);

      const relay = products.find((p) => p.id === 'prod_relay');
      const bossLister = products.find((p) => p.id === 'prod_bosslister');
      const storyForge = products.find((p) => p.id === 'prod_storyforge');
      const crosspost = products.find((p) => p.id === 'prod_crosspost');
      const onTrack = products.find((p) => p.id === 'prod_ontrack');

      assert.ok(relay, 'Relay product must exist in catalog');
      assert.ok(bossLister, 'BossLister product must exist in catalog');
      assert.ok(storyForge, 'StoryForge product must exist in catalog');
      assert.ok(crosspost, 'Crosspost product must exist in catalog');
      assert.ok(onTrack, 'OnTrack product must exist in catalog');

      assert.strictEqual(relay?.truthStatus, 'VERIFIED');
      assert.strictEqual(relay?.integrationStatus, 'VERIFIED');
      assert.ok(relay?.capabilities.includes('Cryptographic Segregation of Duties (SoD)'));
      assert.ok(relay?.proofs.length >= 3);
    });

    it('retrieves individual product specs by id', () => {
      const bossLister = productLauncherService.getProductById('prod_bosslister', testTenantId);
      assert.ok(bossLister);
      assert.strictEqual(bossLister?.name, 'BossLister');
      assert.strictEqual(bossLister?.category, 'Commerce Intelligence');
      assert.ok(bossLister?.supportedInputTypes.includes('PRODUCT_INVENTORY_ITEM'));
      assert.ok(bossLister?.supportedOutputTypes.includes('MARKETPLACE_LISTING_PACKAGE'));
    });
  });

  describe('2. Complete 9-Stage Revenue Opportunity Lifecycle', () => {
    it('executes full end-to-end lifecycle: DISCOVERED -> MEASURED', async () => {
      // Step 1: Discover
      const opp = revenueActivationService.createOpportunity({
        tenantId: testTenantId,
        title: 'Launch Relay Promotion Campaign for Architectural Studios',
        category: 'Growth & Inbound Pipeline',
        description: 'Deploy targeted value proposition and case studies to technical studios.',
        actionType: 'CREATE_MARKETING_CAMPAIGN',
        productId: 'prod_relay',
        revenueEstimate: 4500,
        costEstimate: 300,
        confidenceScore: 'High',
        riskLevel: 'MEDIUM',
        supportingEvidence: ['32 verified architectural studios identified in Greater Boston region.'],
        detectedCondition: 'Untapped technical firm inbound demand',
        recommendedPlaybook: 'Studio Inbound Acceleration Playbook'
      });

      assert.strictEqual(opp.lifecycleState, 'DISCOVERED');
      assert.strictEqual(opp.revenueEstimate, 4500);
      assert.strictEqual(opp.costEstimate, 300);

      // Step 2: Qualify
      const qualifiedOpp = revenueActivationService.transitionLifecycle(
        testTenantId,
        opp.id,
        'QUALIFIED',
        'operator_lead',
        'Lead list and ICP criteria verified against commercial directory.'
      );
      assert.strictEqual(qualifiedOpp.lifecycleState, 'QUALIFIED');

      // Step 3: Propose Action
      const proposedOpp = revenueActivationService.transitionLifecycle(
        testTenantId,
        opp.id,
        'ACTION_PROPOSED',
        'operator_lead',
        'Assigned Aria worker to draft multi-channel marketing package.'
      );
      assert.strictEqual(proposedOpp.lifecycleState, 'ACTION_PROPOSED');

      // Step 4: Generate Deliverable Draft & Compute Cryptographic Version Hash
      const draftedOpp = revenueActivationService.generateDeliverableDraft(testTenantId, opp.id);
      assert.strictEqual(draftedOpp.lifecycleState, 'DRAFT_CREATED');
      assert.ok(draftedOpp.deliverableDraft);
      assert.ok(draftedOpp.deliverableVersionHash);
      assert.strictEqual(draftedOpp.deliverableVersionHash?.length, 64);
      assert.ok((draftedOpp.deliverableDraft as any).landingPageCopy?.headline);
      assert.ok((draftedOpp.deliverableDraft as any).socialPostVariants?.length >= 2);

      // Step 5: Submit for Human Approval
      const submittedOpp = revenueActivationService.submitForApproval(testTenantId, opp.id, 'worker_aria');
      assert.strictEqual(submittedOpp.lifecycleState, 'AWAITING_APPROVAL');

      // Step 6: Human Operator Approval Gate (Enforcing Segregation of Duties & Hash Binding)
      const approvedOpp = revenueActivationService.recordApprovalDecision({
        tenantId: testTenantId,
        opportunityId: opp.id,
        approverId: 'human_managing_partner_01',
        approverName: 'Marcus (Partner)',
        approverRole: 'OWNER',
        decision: 'APPROVED',
        notes: 'Reviewed copy and channel plan. Approved for deterministic DRY_RUN staging.'
      });

      assert.strictEqual(approvedOpp.lifecycleState, 'APPROVED');
      assert.ok(approvedOpp.approvalRecord);
      assert.strictEqual(approvedOpp.approvalRecord?.decision, 'APPROVED');
      assert.strictEqual(approvedOpp.approvalRecord?.approvedVersionHash, draftedOpp.deliverableVersionHash);
      assert.ok(approvedOpp.approvalRecord?.signature);

      // Step 7 & 8: Queue & Execute Governed Action in DRY_RUN Mode
      const executedOpp = await revenueActivationService.executeOpportunityAction({
        tenantId: testTenantId,
        opportunityId: opp.id,
        executionMode: 'DRY_RUN',
        actorId: 'human_managing_partner_01'
      });

      assert.strictEqual(executedOpp.lifecycleState, 'EXECUTED');
      assert.ok(executedOpp.executionRecord);
      assert.strictEqual(executedOpp.executionRecord?.executionMode, 'DRY_RUN');
      assert.strictEqual(executedOpp.executionRecord?.status, 'DRY_RUN_COMPLETED');
      assert.strictEqual(executedOpp.executionRecord?.evidenceHash.length, 64);

      // Step 9: Record Realized Revenue & Measure ROI
      const measuredOpp = revenueActivationService.recordMeasurement({
        tenantId: testTenantId,
        opportunityId: opp.id,
        realizedRevenue: 5200,
        actualCost: 280,
        attributableConversions: 2,
        evidenceNotes: 'Reconciled 2 annual studio subscriptions originating from campaign UTM tags.'
      });

      assert.strictEqual(measuredOpp.lifecycleState, 'MEASURED');
      assert.ok(measuredOpp.measurementRecord);
      assert.strictEqual(measuredOpp.measurementRecord?.realizedRevenue, 5200);
      assert.strictEqual(measuredOpp.measurementRecord?.actualCost, 280);
      assert.strictEqual(measuredOpp.measurementRecord?.netGain, 4920);
      assert.ok(measuredOpp.measurementRecord?.roiPercent && measuredOpp.measurementRecord.roiPercent > 1000);

      // Verify measurement and state was recorded in DB
      const db = getDatabase();
      const dbOpp = db
        .prepare('SELECT * FROM opportunities WHERE tenant_id = ? AND id = ?')
        .get(testTenantId, opp.id) as any;
      assert.ok(dbOpp);
      assert.strictEqual(dbOpp.lifecycle_state, 'MEASURED');
      assert.strictEqual(dbOpp.actual_realized_monthly_value, 5200);
      assert.ok(dbOpp.measurement_record_json);
    });

    it('rejects execution if deliverable was modified after approval without re-approval (anti-tamper)', async () => {
      const opp = revenueActivationService.createOpportunity({
        tenantId: testTenantId,
        title: 'Tamper Prevention Test Opportunity',
        category: 'Security',
        description: 'Test tamper detection.',
        actionType: 'CREATE_MARKETING_CAMPAIGN',
        productId: 'prod_relay',
        revenueEstimate: 1000,
        costEstimate: 100
      });

      revenueActivationService.generateDeliverableDraft(testTenantId, opp.id);
      revenueActivationService.submitForApproval(testTenantId, opp.id, 'worker_aria');
      revenueActivationService.recordApprovalDecision({
        tenantId: testTenantId,
        opportunityId: opp.id,
        approverId: 'human_operator_1',
        approverName: 'Operator 1',
        approverRole: 'OWNER',
        decision: 'APPROVED'
      });

      // Tamper with the deliverable draft in DB behind the scenes
      const db = getDatabase();
      const tamperedDraft = { tampered: true, headline: 'Unauthorized modified campaign' };
      db.prepare('UPDATE opportunities SET deliverable_draft_json = ? WHERE id = ?').run(
        JSON.stringify(tamperedDraft),
        opp.id
      );

      // Attempt to execute should fail due to signature mismatch
      await assert.rejects(
        async () => {
          await revenueActivationService.executeOpportunityAction({
            tenantId: testTenantId,
            opportunityId: opp.id,
            executionMode: 'DRY_RUN'
          });
        },
        /APPROVAL_INVALIDATED/
      );
    });

    it('respects Emergency Pause control when executing revenue actions', async () => {
      const opp = revenueActivationService.createOpportunity({
        tenantId: testTenantId,
        title: 'Emergency Stop Test Opportunity',
        category: 'Security',
        description: 'Test emergency pause enforcement.',
        actionType: 'CREATE_MARKETING_CAMPAIGN',
        productId: 'prod_relay',
        revenueEstimate: 1000,
        costEstimate: 100
      });

      revenueActivationService.generateDeliverableDraft(testTenantId, opp.id);
      revenueActivationService.submitForApproval(testTenantId, opp.id, 'worker_aria');
      revenueActivationService.recordApprovalDecision({
        tenantId: testTenantId,
        opportunityId: opp.id,
        approverId: 'human_operator_1',
        approverName: 'Operator 1',
        approverRole: 'OWNER',
        decision: 'APPROVED'
      });

      // Trigger emergency pause
      EmergencyControlService.getInstance().pause({
        scope: 'TENANT',
        tenantId: testTenantId,
        reason: 'Testing emergency lockdown',
        pausedBy: 'human_operator_1'
      });

      // Attempt to execute should fail closed
      await assert.rejects(
        async () => {
          await revenueActivationService.executeOpportunityAction({
            tenantId: testTenantId,
            opportunityId: opp.id,
            executionMode: 'DRY_RUN'
          });
        },
        /FAIL_CLOSED_EMERGENCY_PAUSED/
      );

      // Resume
      EmergencyControlService.getInstance().resume({
        scope: 'TENANT',
        tenantId: testTenantId,
        reason: 'Resume for testing',
        resumedBy: 'human_operator_1'
      });
    });
  });

  describe('3. Jardin’s Outpost Dogfood Revenue-Activation Workflow', () => {
    it('executes deterministic dogfood demo through all 9 stages', () => {
      const result = revenueActivationService.executeJardinOutpostDogfoodWorkflow(studioTenantId);

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.opportunity.lifecycleState, 'MEASURED');
      assert.strictEqual(result.opportunity.productId, 'prod_relay');
      assert.strictEqual(result.lifecycleSteps.length, 9);

      // Verify all steps are sequenced correctly
      const expectedSteps = [
        'DISCOVERED',
        'QUALIFIED',
        'ACTION_PROPOSED',
        'DRAFT_CREATED',
        'AWAITING_APPROVAL',
        'APPROVED',
        'QUEUED',
        'EXECUTED',
        'MEASURED'
      ];

      result.lifecycleSteps.forEach((step, idx) => {
        assert.strictEqual(step.step, expectedSteps[idx]);
        assert.ok(step.evidence.length > 5);
        assert.ok(step.timestamp);
      });

      // Verify ROI
      assert.strictEqual(result.opportunity.measurementRecord?.realizedRevenue, 3500);
      assert.strictEqual(result.opportunity.measurementRecord?.netGain, 3320);
    });
  });
});
