import {
  WorkspaceDataMode,
  ConnectedDataSource,
  VerifiedOpportunity,
  ApprovalRequest,
  ExecutionRecord,
  AttributionRecord,
  RecommendationEvaluation,
  DataQualityIssue,
  ConfidenceLevel,
  AttributionModelType
} from '../types/evidence';
import { DEMO_DATA_SOURCES, DEMO_VERIFIED_OPPORTUNITIES, DEMO_APPROVAL_REQUESTS, DEMO_EXECUTION_RECORDS, DEMO_ATTRIBUTION_RECORDS } from '../data/evidenceData';

export class GrowthEvidenceEngine {
  private mode: WorkspaceDataMode = 'demo';
  private tenantId = 'tenant_demo_1';
  private opportunitiesCache: VerifiedOpportunity[] = DEMO_VERIFIED_OPPORTUNITIES;
  private approvalsCache: ApprovalRequest[] = DEMO_APPROVAL_REQUESTS;
  private ledgerCache: ExecutionRecord[] = DEMO_EXECUTION_RECORDS;
  private sourcesCache: ConnectedDataSource[] = DEMO_DATA_SOURCES;

  constructor() {
    this.refreshFromApi();
  }

  public async refreshFromApi(): Promise<void> {
    try {
      const [oppsRes, apprRes, execRes, srcRes] = await Promise.all([
        fetch('/api/growth/opportunities').then((r) => r.json()).catch(() => null),
        fetch('/api/growth/approvals').then((r) => r.json()).catch(() => null),
        fetch('/api/growth/execution-ledger').then((r) => r.json()).catch(() => null),
        fetch('/api/growth/sources').then((r) => r.json()).catch(() => null)
      ]);

      if (oppsRes?.success && Array.isArray(oppsRes.opportunities) && oppsRes.opportunities.length > 0) {
        this.opportunitiesCache = oppsRes.opportunities;
      }
      if (apprRes?.success && Array.isArray(apprRes.approvals)) {
        this.approvalsCache = apprRes.approvals;
      }
      if (execRes?.success && Array.isArray(execRes.ledger)) {
        this.ledgerCache = execRes.ledger;
      }
      if (srcRes?.success && Array.isArray(srcRes.sources) && srcRes.sources.length > 0) {
        this.sourcesCache = srcRes.sources;
      }
    } catch {
      // Offline / fallback to initial cache
    }
  }

  // Workspace Mode
  public getMode(): WorkspaceDataMode {
    return this.mode;
  }

  public setMode(newMode: WorkspaceDataMode): void {
    this.mode = newMode;
  }

  public getTenantId(): string {
    return this.tenantId;
  }

  // Data Sources & Quality
  public getDataSources(): ConnectedDataSource[] {
    return this.sourcesCache;
  }

  public getDataQualityIssues(): DataQualityIssue[] {
    return [
      {
        id: 'issue-101',
        provider: 'hubspot',
        issueType: 'missing_field',
        severity: 'medium',
        description: '14 lead records missing primary contact phone number required for SMS fallback.',
        affectedCount: 14,
        suggestedFix: 'Run Clearbit enrichment or use email channel.',
        createdAt: new Date(Date.now() - 3600000).toISOString()
      },
      {
        id: 'issue-102',
        provider: 'ga4',
        issueType: 'stale_sync',
        severity: 'low',
        description: '30-minute attribution reporting latency detected on web lead events.',
        affectedCount: 12,
        suggestedFix: 'None required. Auto-refreshes hourly.',
        createdAt: new Date(Date.now() - 7200000).toISOString()
      }
    ];
  }

  // Opportunities
  public getOpportunities(): VerifiedOpportunity[] {
    return this.opportunitiesCache;
  }

  public getOpportunityById(id: string): VerifiedOpportunity | undefined {
    return this.opportunitiesCache.find((o) => o.id === id);
  }

  public detectOpportunities(): VerifiedOpportunity[] {
    return this.getOpportunities();
  }

  // Activation with persistent backend call
  public activateOpportunity(
    oppId: string,
    actorName: string = 'User Admin'
  ): { status: 'approved_and_executed' | 'pending_approval'; executionRecord?: ExecutionRecord; approvalRequest?: ApprovalRequest } {
    const opp = this.getOpportunityById(oppId);
    if (!opp) throw new Error(`Opportunity with ID ${oppId} not found.`);

    const highImpact = opp.estimatedMonthlyValue >= 5000 || opp.actionType === 'pricing_update';

    // Trigger backend API asynchronously
    fetch('/api/growth/opportunities/activate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ opportunityId: oppId, actorName })
    }).then((r) => r.json()).then(() => this.refreshFromApi()).catch(() => {});

    if (highImpact) {
      opp.status = 'PendingApproval';
      const newApproval: ApprovalRequest = {
        id: `appr-${Date.now()}`,
        opportunityId: opp.id,
        actionTitle: `Activate ${opp.title}`,
        requestedBy: actorName,
        approverRole: 'Executive',
        status: 'pending',
        riskLevel: opp.estimatedMonthlyValue > 10000 ? 'High' : 'Medium',
        reasoning: opp.detectedCondition,
        financialImpactEstimate: opp.estimatedMonthlyValue,
        targetCount: opp.affectedRecordsCount,
        createdAt: new Date().toISOString()
      };
      this.approvalsCache.unshift(newApproval);
      return { status: 'pending_approval', approvalRequest: newApproval };
    } else {
      opp.status = 'Running';
      const newExec: ExecutionRecord = {
        id: `exec-${Date.now()}`,
        activationId: `act-${Date.now()}`,
        opportunityId: opp.id,
        actionType: opp.actionType,
        actor: actorName,
        executorType: 'ai_agent',
        targetEntityCount: opp.affectedRecordsCount,
        status: 'completed',
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        costIncurred: 2.5,
        apiCallsCount: opp.affectedRecordsCount * 2,
        outputSummary: `Successfully launched ${opp.recommendedPlaybook} targeting ${opp.affectedRecordsCount} records.`,
        canRollback: true
      };
      this.ledgerCache.unshift(newExec);
      return { status: 'approved_and_executed', executionRecord: newExec };
    }
  }

  public approveRequest(requestId: string, approverName: string = 'Executive Admin'): ExecutionRecord {
    const req = this.approvalsCache.find((r) => r.id === requestId);
    if (req) {
      req.status = 'approved';
      req.decidedAt = new Date().toISOString();
      req.decidedBy = approverName;

      const opp = this.getOpportunityById(req.opportunityId);
      if (opp) opp.status = 'Running';
    }

    fetch('/api/growth/approvals/decide', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approvalId: requestId, decision: 'approved', approverName })
    }).then((r) => r.json()).then(() => this.refreshFromApi()).catch(() => {});

    const execRecord: ExecutionRecord = {
      id: `exec-${Date.now()}`,
      activationId: `corr-${requestId}`,
      opportunityId: req?.opportunityId || 'opp-stale-lead-recovery',
      actionType: 'email_sequence',
      actor: approverName,
      executorType: 'user',
      targetEntityCount: req?.targetCount || 4,
      status: 'completed',
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      costIncurred: 5.0,
      apiCallsCount: (req?.targetCount || 4) * 2,
      outputSummary: `Executive approval granted by ${approverName}. Workflow executed.`,
      canRollback: true
    };
    this.ledgerCache.unshift(execRecord);
    return execRecord;
  }

  public rejectRequest(requestId: string, approverName: string = 'Executive Admin'): void {
    const req = this.approvalsCache.find((r) => r.id === requestId);
    if (req) {
      req.status = 'rejected';
      req.decidedAt = new Date().toISOString();
      req.decidedBy = approverName;

      const opp = this.getOpportunityById(req.opportunityId);
      if (opp) opp.status = 'Rejected';
    }

    fetch('/api/growth/approvals/decide', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approvalId: requestId, decision: 'rejected', approverName })
    }).then((r) => r.json()).then(() => this.refreshFromApi()).catch(() => {});
  }

  public getExecutionLedger(): ExecutionRecord[] {
    return this.ledgerCache;
  }

  public getApprovalRequests(): ApprovalRequest[] {
    return this.approvalsCache;
  }

  public getAttributionRecords(): AttributionRecord[] {
    return DEMO_ATTRIBUTION_RECORDS;
  }

  public getROIStats(selectedModel: AttributionModelType = 'workflow_comparison') {
    const opps = this.getOpportunities();
    const ledger = this.getExecutionLedger();

    const totalIdentifiedValue = opps.reduce((sum, o) => sum + o.estimatedMonthlyValue, 0);
    const totalActivatedValue = opps
      .filter((o) => o.status === 'Running' || o.status === 'Activated' || o.status === 'Approved')
      .reduce((sum, o) => sum + o.estimatedMonthlyValue, 0);

    const totalRealizedRevenue = opps.reduce((sum, o) => sum + o.actualRealizedMonthlyValue, 0);
    const totalExecutionCost = ledger.reduce((sum, e) => sum + e.costIncurred, 0);

    const netValue = totalRealizedRevenue - totalExecutionCost;

    let netRoiPercentage: number | null = null;
    let netRoiDisplay = 'N/A (Zero Execution Cost)';

    if (totalExecutionCost > 0) {
      netRoiPercentage = Math.round((netValue / totalExecutionCost) * 100);
      netRoiDisplay = `${netRoiPercentage > 0 ? '+' : ''}${netRoiPercentage}%`;
    } else if (totalRealizedRevenue > 0) {
      netRoiDisplay = 'Infinite (Zero Incurred Cost)';
    } else {
      netRoiDisplay = 'Awaiting Outcome Data';
    }

    let averagePaybackDays: number | null = null;
    let paybackDisplay = 'Awaiting Outcome Data';

    if (totalExecutionCost > 0 && totalRealizedRevenue > 0) {
      const dailyRevenue = totalRealizedRevenue / 30;
      if (dailyRevenue > 0) {
        averagePaybackDays = Math.round((totalExecutionCost / dailyRevenue) * 10) / 10;
        paybackDisplay = `${averagePaybackDays} Days`;
      }
    } else if (totalExecutionCost === 0 && totalRealizedRevenue > 0) {
      paybackDisplay = 'Immediate (0 Days)';
    }

    return {
      totalOpportunitiesIdentified: opps.length,
      totalIdentifiedMonthlyValue: totalIdentifiedValue,
      totalActivatedMonthlyValue: totalActivatedValue,
      totalRealizedMonthlyRevenue: totalRealizedRevenue,
      totalAnnualizedRealized: totalRealizedRevenue * 12,
      totalExecutionCost,
      netRoiPercentage,
      netRoiDisplay,
      averagePaybackDays,
      paybackDisplay,
      overallConfidence: 'Verified' as ConfidenceLevel,
      attributionModelUsed: selectedModel,
      attributionStatus: totalRealizedRevenue > 0 ? 'Attributed' : 'Instrumented & Awaiting Outcome Data'
    };
  }

  public getRecommendationEvaluations(): RecommendationEvaluation[] {
    return [
      {
        id: 'rec-eval-1',
        opportunityId: 'opp-stale-lead-recovery',
        opportunityTitle: 'Stale Inbound Lead Recovery Engine',
        predictedValue: 10790,
        realizedValue: 9800,
        variancePercentage: -9,
        accuracyScore: 91,
        timeToResultDaysPredicted: 3,
        timeToResultDaysActual: 3,
        status: 'Accurate',
        feedbackNotes: 'Historical re-engagement produced 23.6% conversion, within 2.4% of predicted 26% benchmark.',
        learningAdjustmentApplied: 'Adjusted decay model multiplier from 0.85 to 0.88 for tech leads with >$10k value.'
      }
    ];
  }

  public async runStaleLeadRecoveryDryRun(customConfig?: any, actorName?: string) {
    try {
      const res = await fetch('/api/growth/stale-leads/dry-run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ruleConfig: customConfig, actorName })
      });
      const json = await res.json();
      if (json.success) {
        this.refreshFromApi();
        return json.dryRunResult;
      }
    } catch {}
    return null;
  }
}

export const growthEvidenceEngine = new GrowthEvidenceEngine();
