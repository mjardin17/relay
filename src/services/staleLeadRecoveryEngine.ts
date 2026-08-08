import { getDatabase } from '../db/database';
import { growthPersistenceService, StaleLeadDryRunResult } from './growthPersistenceService';
import { ConfidenceLevel } from '../types/evidence';

export interface StaleLeadRuleConfig {
  minInactivityDays?: number;      // e.g. 25
  minResponseDelayHours?: number;  // e.g. 24
  targetPipelineStages?: string[]; // e.g. ['new_inbound', 'demo_completed', 'proposal_sent']
  conservativeConversionRate?: number; // e.g. 0.10
  expectedConversionRate?: number;     // e.g. 0.26
  upsideConversionRate?: number;       // e.g. 0.40
}

export class StaleLeadRecoveryEngine {
  public executeDryRun(
    tenantId: string = 'tenant_demo_1',
    customConfig: StaleLeadRuleConfig = {},
    actorName: string = 'System Growth Engine'
  ): StaleLeadDryRunResult {
    const db = getDatabase();
    const now = new Date();
    const nowIso = now.toISOString();

    const config = {
      minInactivityDays: customConfig.minInactivityDays ?? 25,
      minResponseDelayHours: customConfig.minResponseDelayHours ?? 24,
      targetPipelineStages: customConfig.targetPipelineStages ?? ['new_inbound', 'demo_completed', 'proposal_sent'],
      conservativeConversionRate: customConfig.conservativeConversionRate ?? 0.10,
      expectedConversionRate: customConfig.expectedConversionRate ?? 0.26,
      upsideConversionRate: customConfig.upsideConversionRate ?? 0.40
    };

    // 1. Fetch leads from database for tenant
    const leads = db.prepare('SELECT * FROM leads WHERE tenant_id = ?').all(tenantId) as any[];

    const eligibleAudience: Array<{
      id: string;
      name: string;
      email: string;
      company: string;
      estimatedValue: number;
      inactivityDays: number;
      responseDelayHours: number;
    }> = [];

    const suppressionDecisions: Array<{
      leadId: string;
      email: string;
      decision: string;
      reasoning: string;
    }> = [];

    const insertSuppression = db.prepare(`
      INSERT INTO suppression_decisions (id, tenant_id, lead_id, lead_email, decision, reasoning, rule_triggered, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Helper to evaluate email validity
    const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    // 2. Evaluate each lead for eligibility vs suppression
    for (const lead of leads) {
      const lastInteractionDate = new Date(lead.last_interaction_at);
      const daysInactive = Math.floor((now.getTime() - lastInteractionDate.getTime()) / (1000 * 60 * 60 * 24));

      // Rule checks for suppression
      if (lead.opted_out === 1) {
        const reasoning = 'Lead opted out of communication (Unsubscribed)';
        suppressionDecisions.push({ leadId: lead.id, email: lead.email, decision: 'suppressed_opted_out', reasoning });
        insertSuppression.run(`supp-${Date.now()}-${lead.id}`, tenantId, lead.id, lead.email, 'suppressed_opted_out', reasoning, 'OptOutCheck', nowIso);
        continue;
      }

      if (lead.do_not_contact === 1) {
        const reasoning = 'Lead explicitly marked as Do Not Contact in CRM';
        suppressionDecisions.push({ leadId: lead.id, email: lead.email, decision: 'suppressed_do_not_contact', reasoning });
        insertSuppression.run(`supp-${Date.now()}-${lead.id}`, tenantId, lead.id, lead.email, 'suppressed_do_not_contact', reasoning, 'DoNotContactCheck', nowIso);
        continue;
      }

      if (lead.is_converted === 1 || lead.pipeline_stage === 'closed_won') {
        const reasoning = 'Lead already converted to paying customer (Closed Won)';
        suppressionDecisions.push({ leadId: lead.id, email: lead.email, decision: 'suppressed_converted', reasoning });
        insertSuppression.run(`supp-${Date.now()}-${lead.id}`, tenantId, lead.id, lead.email, 'suppressed_converted', reasoning, 'ConvertedCheck', nowIso);
        continue;
      }

      if (lead.is_duplicate === 1) {
        const reasoning = 'Duplicate record detected in pipeline';
        suppressionDecisions.push({ leadId: lead.id, email: lead.email, decision: 'suppressed_duplicate', reasoning });
        insertSuppression.run(`supp-${Date.now()}-${lead.id}`, tenantId, lead.id, lead.email, 'suppressed_duplicate', reasoning, 'DeduplicationCheck', nowIso);
        continue;
      }

      if (!isValidEmail(lead.email)) {
        const reasoning = 'Malformed or unverified email address format';
        suppressionDecisions.push({ leadId: lead.id, email: lead.email, decision: 'suppressed_invalid', reasoning });
        insertSuppression.run(`supp-${Date.now()}-${lead.id}`, tenantId, lead.id, lead.email, 'suppressed_invalid', reasoning, 'EmailFormatCheck', nowIso);
        continue;
      }

      if (!config.targetPipelineStages.includes(lead.pipeline_stage)) {
        const reasoning = `Pipeline stage '${lead.pipeline_stage}' not in target stages`;
        suppressionDecisions.push({ leadId: lead.id, email: lead.email, decision: 'suppressed_stage', reasoning });
        insertSuppression.run(`supp-${Date.now()}-${lead.id}`, tenantId, lead.id, lead.email, 'suppressed_stage', reasoning, 'PipelineStageCheck', nowIso);
        continue;
      }

      if (daysInactive < config.minInactivityDays) {
        const reasoning = `Recent interaction (${daysInactive} days ago < ${config.minInactivityDays} threshold)`;
        suppressionDecisions.push({ leadId: lead.id, email: lead.email, decision: 'suppressed_recent', reasoning });
        insertSuppression.run(`supp-${Date.now()}-${lead.id}`, tenantId, lead.id, lead.email, 'suppressed_recent', reasoning, 'InactivityThresholdCheck', nowIso);
        continue;
      }

      if (lead.response_delay_hours < config.minResponseDelayHours) {
        const reasoning = `Response delay (${lead.response_delay_hours} hrs < ${config.minResponseDelayHours} hrs threshold)`;
        suppressionDecisions.push({ leadId: lead.id, email: lead.email, decision: 'suppressed_responsive', reasoning });
        insertSuppression.run(`supp-${Date.now()}-${lead.id}`, tenantId, lead.id, lead.email, 'suppressed_responsive', reasoning, 'ResponseDelayCheck', nowIso);
        continue;
      }

      // If passed all suppression checks -> Eligible!
      eligibleAudience.push({
        id: lead.id,
        name: lead.name,
        email: lead.email,
        company: lead.company || 'N/A',
        estimatedValue: lead.estimated_value,
        inactivityDays: daysInactive,
        responseDelayHours: lead.response_delay_hours
      });
    }

    // 3. Calculate Financial Projections
    const totalTargetPipeline = eligibleAudience.reduce((acc, l) => acc + l.estimatedValue, 0);
    const conservativeValue = Math.round(totalTargetPipeline * config.conservativeConversionRate);
    const expectedValue = Math.round(totalTargetPipeline * config.expectedConversionRate);
    const upsideValue = Math.round(totalTargetPipeline * config.upsideConversionRate);

    // 4. Build Evidence Graph Entry
    const evidence = {
      claim: `${eligibleAudience.length} high-value inbound leads with >${config.minInactivityDays} days inactivity and >${config.minResponseDelayHours}h response latency identified.`,
      sampleSize: eligibleAudience.length,
      confidence: 'High' as ConfidenceLevel,
      verifiedRecords: eligibleAudience.map((a) => ({
        leadId: a.id,
        name: a.name,
        company: a.company,
        value: `$${a.estimatedValue.toLocaleString()}`,
        delay: `${a.responseDelayHours}h`
      }))
    };

    // 5. Prepare Proposed Contact Plan (DRY-RUN ONLY - NO EXTERNAL MESSAGES SENT)
    const proposedContactPlan = {
      channel: 'email_sequence_and_sms',
      sequenceName: 'Apex AI Stale Inbound Recovery Sequence (Dry Run)',
      stepsCount: 3,
      sampleSubject: 'Re: {{company}} growth roadmap & platform follow-up',
      sampleMessagePreview: 'Hi {{firstName}}, I noticed we paused our discussion on {{company}}\'s growth strategy last month. Our AI engine identified 2 key quick-wins for your pipeline. Would a 10-minute sync this Thursday make sense?'
    };

    // 6. Approval Gate check
    const approvalRequired = expectedValue >= 5000;
    let approvalReasoning: string | undefined;

    if (approvalRequired) {
      approvalReasoning = `Expected financial impact ($${expectedValue.toLocaleString()}) exceeds human approval threshold ($5,000). Pending executive sign-off.`;
    }

    // 7. Record Dry-Run Event in Durable Execution Ledger
    const execLedgerEvent = growthPersistenceService.appendExecutionEvent(tenantId, {
      aggregateId: 'opp-stale-lead-recovery',
      eventType: 'STALE_LEAD_RECOVERY_DRY_RUN',
      actorType: 'system',
      actorId: actorName,
      priorState: 'Detected',
      resultingState: approvalRequired ? 'PendingApproval' : 'Ready',
      idempotencyKey: `dryrun-stale-${Date.now()}`,
      channelOrProvider: 'dry_run_simulation',
      correlationId: `corr-dryrun-${Date.now()}`,
      metadata: {
        totalIngested: leads.length,
        eligibleCount: eligibleAudience.length,
        suppressedCount: suppressionDecisions.length,
        expectedValue,
        approvalRequired
      },
      status: 'completed',
      costIncurred: 0, // Dry run costs $0!
      apiCallsCount: eligibleAudience.length * 2,
      outputSummary: `Dry-run completed for ${eligibleAudience.length} eligible stale leads (${suppressionDecisions.length} suppressed). Expected impact: $${expectedValue.toLocaleString()}/mo. No external messages sent.`
    });

    // 8. If approval required, create approval request in DB (sets opp status to PendingApproval)
    if (approvalRequired) {
      growthPersistenceService.createApprovalRequest(tenantId, {
        opportunityId: 'opp-stale-lead-recovery',
        actionTitle: 'Execute Stale Inbound Lead Recovery Sequence',
        requestedBy: actorName,
        approverRole: 'Executive',
        riskLevel: expectedValue > 10000 ? 'High' : 'Medium',
        reasoning: `Dry-run identified ${eligibleAudience.length} verified stale prospects representing $${totalTargetPipeline.toLocaleString()} pipeline. Expected monthly value: $${expectedValue.toLocaleString()}.`,
        financialImpactEstimate: expectedValue,
        targetCount: eligibleAudience.length,
        audience: eligibleAudience,
        proposedContent: proposedContactPlan,
        channel: 'email_sequence_and_sms',
        spendingLimit: 50.0
      });
    }

    return {
      tenantId,
      evaluatedAt: nowIso,
      rulesApplied: {
        minInactivityDays: config.minInactivityDays,
        minResponseDelayHours: config.minResponseDelayHours,
        requiredPipelineStages: config.targetPipelineStages
      },
      totalIngestedLeads: leads.length,
      eligibleLeadsCount: eligibleAudience.length,
      suppressedLeadsCount: suppressionDecisions.length,
      eligibleAudience,
      suppressionDecisions,
      evidence,
      financialProjections: {
        totalTargetPipeline,
        conservativeValue,
        expectedValue,
        upsideValue,
        assumptions: {
          conservativeRate: `${config.conservativeConversionRate * 100}% conversion`,
          expectedRate: `${config.expectedConversionRate * 100}% conversion`,
          upsideRate: `${config.upsideConversionRate * 100}% conversion`
        }
      },
      proposedContactPlan,
      approvalRequired,
      approvalReasoning,
      executionLedgerEvent: execLedgerEvent
    };
  }
}

export const staleLeadRecoveryEngine = new StaleLeadRecoveryEngine();
