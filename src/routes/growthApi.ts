import { Router, Request, Response } from 'express';
import { growthPersistenceService } from '../services/growthPersistenceService';
import { staleLeadRecoveryEngine } from '../services/staleLeadRecoveryEngine';

export const growthRouter = Router();

// Helper to extract tenant ID (defaults to 'tenant_demo_1')
function getTenantId(req: Request): string {
  const headerTenant = req.headers['x-tenant-id'] as string;
  return headerTenant || (req.query.tenantId as string) || 'tenant_demo_1';
}

// 1. Data Sources
growthRouter.get('/sources', (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const sources = growthPersistenceService.getConnectedDataSources(tenantId);
    return res.json({ success: true, tenantId, sources });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Data Quality & Integration Health
growthRouter.get('/data-quality', (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const issues = growthPersistenceService.getDataQualityIssues(tenantId);
    return res.json({ success: true, tenantId, issues });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Opportunities & Evidence Graph
growthRouter.get('/opportunities', (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const opportunities = growthPersistenceService.getOpportunities(tenantId);
    return res.json({ success: true, tenantId, opportunities });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Activate opportunity with Approval Gate & Execution Ledger
growthRouter.post('/opportunities/activate', (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const { opportunityId, actorName = 'User Admin' } = req.body;

    if (!opportunityId) {
      return res.status(400).json({ success: false, error: 'opportunityId is required' });
    }

    const opp = growthPersistenceService.getOpportunityById(tenantId, opportunityId);
    if (!opp) {
      return res.status(404).json({ success: false, error: 'Opportunity not found' });
    }

    const highImpact = opp.estimatedMonthlyValue >= 5000 || opp.actionType === 'pricing_update';

    if (highImpact) {
      // High impact: create approval request -> Opportunity stays PendingApproval!
      const approval = growthPersistenceService.createApprovalRequest(tenantId, {
        opportunityId: opp.id,
        actionTitle: `Activate ${opp.title}`,
        requestedBy: actorName,
        approverRole: 'Executive',
        riskLevel: opp.estimatedMonthlyValue > 10000 ? 'High' : 'Medium',
        reasoning: opp.detectedCondition,
        financialImpactEstimate: opp.estimatedMonthlyValue,
        targetCount: opp.affectedRecordsCount
      });

      return res.json({
        success: true,
        status: 'pending_approval',
        opportunityStatus: 'PendingApproval',
        approvalRequest: approval
      });
    } else {
      // Low impact: auto-approve & execute
      growthPersistenceService.updateOpportunityStatus(tenantId, opp.id, 'Running');

      const execRecord = growthPersistenceService.appendExecutionEvent(tenantId, {
        aggregateId: opp.id,
        eventType: opp.actionType,
        actorType: 'ai_agent',
        actorId: actorName,
        priorState: opp.status,
        resultingState: 'Running',
        idempotencyKey: `act-${opp.id}-${Date.now()}`,
        channelOrProvider: 'dry_run_simulation',
        correlationId: `corr-${opp.id}`,
        metadata: { financialImpact: opp.estimatedMonthlyValue },
        status: 'completed',
        costIncurred: 2.5,
        apiCallsCount: opp.affectedRecordsCount * 2,
        outputSummary: `Successfully activated ${opp.recommendedPlaybook} targeting ${opp.affectedRecordsCount} records.`
      });

      return res.json({
        success: true,
        status: 'approved_and_executed',
        opportunityStatus: 'Running',
        executionRecord: execRecord
      });
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Approval Requests Queue
growthRouter.get('/approvals', (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const approvals = growthPersistenceService.getApprovalRequests(tenantId);
    return res.json({ success: true, tenantId, approvals });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Decide Approval Request (approved | rejected)
growthRouter.post('/approvals/decide', (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const { approvalId, decision, approverName = 'Executive Admin' } = req.body;

    if (!approvalId || !decision) {
      return res.status(400).json({ success: false, error: 'approvalId and decision (approved|rejected) are required' });
    }

    if (decision !== 'approved' && decision !== 'rejected') {
      return res.status(400).json({ success: false, error: 'decision must be "approved" or "rejected"' });
    }

    const result = growthPersistenceService.decideApproval(tenantId, approvalId, decision, approverName);
    return res.json({ success: true, tenantId, ...result });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Execution Ledger
growthRouter.get('/execution-ledger', (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const ledger = growthPersistenceService.getExecutionLedger(tenantId);
    return res.json({ success: true, tenantId, ledger });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Stale Lead Recovery Dry-Run Slice
growthRouter.post('/stale-leads/dry-run', (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const { ruleConfig = {}, actorName = 'Executive Growth Agent' } = req.body;

    const dryRunResult = staleLeadRecoveryEngine.executeDryRun(tenantId, ruleConfig, actorName);
    return res.json({ success: true, tenantId, dryRunResult });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 7. Outcome Ingestion
growthRouter.post('/outcomes/ingest', (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const { opportunityId, leadId, eventType, value, providerMessageId, metadata } = req.body;

    if (!eventType) {
      return res.status(400).json({ success: false, error: 'eventType is required' });
    }

    const outcome = growthPersistenceService.ingestOutcomeEvent(tenantId, {
      opportunityId,
      leadId,
      eventType,
      value,
      providerMessageId,
      metadata
    });

    return res.json({ success: true, tenantId, outcome });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 8. Attribution Records
growthRouter.get('/attribution', (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const records = growthPersistenceService.getAttributionRecords(tenantId);
    return res.json({ success: true, tenantId, records });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 9. ROI Command Center Stats
growthRouter.get('/roi-stats', (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const model = (req.query.model as any) || 'workflow_comparison';
    const stats = growthPersistenceService.getROIStats(tenantId, model);
    return res.json({ success: true, tenantId, stats });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 10. Recommendation Evaluations & AI Calibration
growthRouter.get('/recommendations', (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const evaluations = growthPersistenceService.getRecommendationEvaluations(tenantId);
    return res.json({ success: true, tenantId, evaluations });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
