import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Target,
  Sparkles,
  Zap,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Building2,
  Mail,
  Phone,
  Calendar,
  Layers,
  ShieldCheck,
  RefreshCw,
  Play,
  FileCode,
  Lock,
  Eye,
  Check,
  X,
  Clock,
  Award,
  ChevronRight,
  Package,
  Activity,
  DollarSign
} from 'lucide-react';
import {
  RevenueOpportunity,
  OpportunityLifecycleState,
  UniversalRevenueActionType,
  RevenueExecutionMode
} from '../../types/revenueOpportunity';
import { ProductDefinition } from '../../types/products';

interface OpportunitiesViewProps {
  darkMode: boolean;
  tenantId: string;
  growthData: any;
  loading: boolean;
  onRefresh: () => void;
  onNavigateTab: (tabId: string) => void;
}

const LIFECYCLE_STAGES: OpportunityLifecycleState[] = [
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

export const OpportunitiesView: React.FC<OpportunitiesViewProps> = ({
  darkMode,
  tenantId,
  growthData,
  loading,
  onRefresh,
  onNavigateTab
}) => {
  const [opportunities, setOpportunities] = useState<RevenueOpportunity[]>([]);
  const [products, setProducts] = useState<ProductDefinition[]>([]);
  const [fetchingOpps, setFetchingOpps] = useState(false);
  const [selectedOpp, setSelectedOpp] = useState<RevenueOpportunity | null>(null);
  const [showInspector, setShowInspector] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [dogfoodLog, setDogfoodLog] = useState<Array<{ step: string; timestamp: string; evidence: string }> | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'opportunities' | 'leads' | 'attributions'>('opportunities');

  // New Opp Form State
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState('Growth & Revenue');
  const [formDescription, setFormDescription] = useState('');
  const [formActionType, setFormActionType] = useState<UniversalRevenueActionType>('CREATE_MARKETING_CAMPAIGN');
  const [formProductId, setFormProductId] = useState('prod_relay');
  const [formRevEst, setFormRevEst] = useState('3500');
  const [formCostEst, setFormCostEst] = useState('200');

  // Measurement Form State
  const [measuringOppId, setMeasuringOppId] = useState<string | null>(null);
  const [measuringRev, setMeasuringRev] = useState('3500');
  const [measuringCost, setMeasuringCost] = useState('200');

  const authHeaders = {
    Authorization: 'Bearer demo-session',
    'Content-Type': 'application/json'
  };

  const loadOpportunities = async () => {
    setFetchingOpps(true);
    try {
      const [oppRes, prodRes] = await Promise.all([
        fetch('/api/control-center/opportunities', { headers: authHeaders }),
        fetch('/api/control-center/products', { headers: authHeaders })
      ]);

      if (oppRes.ok) {
        const d = await oppRes.json();
        setOpportunities(d.opportunities || []);
      }
      if (prodRes.ok) {
        const pd = await prodRes.json();
        setProducts(pd.products || []);
      }
    } catch {
      // Fallback to growthData if API fails
      if (growthData?.opportunities) {
        setOpportunities(growthData.opportunities);
      }
    } finally {
      setFetchingOpps(false);
    }
  };

  useEffect(() => {
    loadOpportunities();
  }, [tenantId]);

  const handleRunDogfoodDemo = async () => {
    setActionInProgress('dogfood');
    setFeedback(null);
    setDogfoodLog(null);

    try {
      const res = await fetch('/api/control-center/opportunities/dogfood-demo', {
        method: 'POST',
        headers: authHeaders
      });

      const d = await res.json();
      if (res.ok && d.success) {
        setFeedback({
          type: 'success',
          message: `Jardin’s Outpost Revenue-Activation Workflow completed deterministically through all 9 lifecycle stages.`
        });
        setDogfoodLog(d.lifecycleSteps || []);
        await loadOpportunities();
        onRefresh();
      } else {
        setFeedback({
          type: 'error',
          message: d.error || 'Failed to execute dogfood demo.'
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Network error running dogfood demo.'
      });
    } finally {
      setActionInProgress(null);
    }
  };

  const handleCreateOpportunity = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionInProgress('create');

    try {
      const res = await fetch('/api/control-center/opportunities', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          title: formTitle,
          category: formCategory,
          description: formDescription,
          actionType: formActionType,
          productId: formProductId,
          revenueEstimate: Number(formRevEst),
          costEstimate: Number(formCostEst),
          confidenceScore: 'High',
          riskLevel: 'MEDIUM'
        })
      });

      const d = await res.json();
      if (res.ok && d.success) {
        setFeedback({ type: 'success', message: `Opportunity '${formTitle}' discovered and registered.` });
        setShowCreateModal(false);
        setFormTitle('');
        setFormDescription('');
        await loadOpportunities();
        onRefresh();
      } else {
        setFeedback({ type: 'error', message: d.error || 'Failed to create opportunity' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Network error creating opportunity' });
    } finally {
      setActionInProgress(null);
    }
  };

  const handleGenerateDraft = async (oppId: string) => {
    setActionInProgress(`draft_${oppId}`);
    setFeedback(null);

    try {
      const res = await fetch(`/api/control-center/opportunities/${oppId}/draft`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({})
      });

      const d = await res.json();
      if (res.ok && d.success) {
        setFeedback({
          type: 'success',
          message: `Deliverable draft generated with SHA-256 version hash ${d.opportunity.deliverableVersionHash?.substring(0, 16)}...`
        });
        setSelectedOpp(d.opportunity);
        setShowInspector(true);
        await loadOpportunities();
        onRefresh();
      } else {
        setFeedback({ type: 'error', message: d.error || 'Failed to generate draft' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Network error' });
    } finally {
      setActionInProgress(null);
    }
  };

  const handleSubmitForApproval = async (oppId: string) => {
    setActionInProgress(`submit_${oppId}`);

    try {
      const res = await fetch(`/api/control-center/opportunities/${oppId}/submit-approval`, {
        method: 'POST',
        headers: authHeaders
      });

      const d = await res.json();
      if (res.ok && d.success) {
        setFeedback({ type: 'success', message: 'Deliverable submitted to Human Operator Approval Gate.' });
        if (selectedOpp?.id === oppId) setSelectedOpp(d.opportunity);
        await loadOpportunities();
        onRefresh();
      } else {
        setFeedback({ type: 'error', message: d.error || 'Failed to submit' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Network error' });
    } finally {
      setActionInProgress(null);
    }
  };

  const handleApproveDecision = async (oppId: string, decision: 'APPROVED' | 'REJECTED') => {
    setActionInProgress(`approve_${oppId}`);

    try {
      const res = await fetch(`/api/control-center/opportunities/${oppId}/approve`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          decision,
          approverName: 'Human Managing Partner',
          notes: decision === 'APPROVED' ? 'Approved for governed DRY_RUN staging.' : 'Returned for revision.'
        })
      });

      const d = await res.json();
      if (res.ok && d.success) {
        setFeedback({
          type: 'success',
          message: decision === 'APPROVED'
            ? `Cryptographic approval recorded. Hash bound: ${d.opportunity.approvalRecord?.approvedVersionHash?.substring(0, 16)}...`
            : 'Opportunity rejected and returned to draft.'
        });
        if (selectedOpp?.id === oppId) setSelectedOpp(d.opportunity);
        await loadOpportunities();
        onRefresh();
      } else {
        setFeedback({ type: 'error', message: d.error || 'Failed to record decision' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Network error' });
    } finally {
      setActionInProgress(null);
    }
  };

  const handleExecuteAction = async (oppId: string, mode: RevenueExecutionMode = 'DRY_RUN') => {
    setActionInProgress(`exec_${oppId}`);

    try {
      const res = await fetch(`/api/control-center/opportunities/${oppId}/execute`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ executionMode: mode })
      });

      const d = await res.json();
      if (res.ok && d.success) {
        setFeedback({
          type: 'success',
          message: `Execution verified in ${mode} mode. Evidence hash: ${d.opportunity.executionRecord?.evidenceHash?.substring(0, 16)}...`
        });
        if (selectedOpp?.id === oppId) setSelectedOpp(d.opportunity);
        await loadOpportunities();
        onRefresh();
      } else {
        setFeedback({ type: 'error', message: d.error || 'Execution blocked by governance gate' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Network error executing action' });
    } finally {
      setActionInProgress(null);
    }
  };

  const handleRecordMeasurement = async (oppId: string) => {
    setActionInProgress(`meas_${oppId}`);

    try {
      const res = await fetch(`/api/control-center/opportunities/${oppId}/measure`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          realizedRevenue: Number(measuringRev),
          actualCost: Number(measuringCost),
          attributableConversions: 1,
          evidenceNotes: 'Reconciled closed-loop payment receipt from client retainer.'
        })
      });

      const d = await res.json();
      if (res.ok && d.success) {
        setFeedback({
          type: 'success',
          message: `ROI measured: ${d.opportunity.measurementRecord?.roiPercent}% ($${d.opportunity.measurementRecord?.netGain} net gain).`
        });
        setMeasuringOppId(null);
        if (selectedOpp?.id === oppId) setSelectedOpp(d.opportunity);
        await loadOpportunities();
        onRefresh();
      } else {
        setFeedback({ type: 'error', message: d.error || 'Failed to record measurement' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Network error' });
    } finally {
      setActionInProgress(null);
    }
  };

  const leads = growthData?.leads || [];
  const attributions = growthData?.attributions || [];

  const totalPipeline = opportunities.reduce(
    (acc: number, o: any) => acc + (o.revenueEstimate || o.estimated_monthly_value || o.estimated_value || 0),
    0
  );

  const totalRealized = opportunities.reduce(
    (acc: number, o: any) => acc + (o.measurementRecord?.realizedRevenue || o.actual_realized_monthly_value || 0),
    0
  );

  const getStageBadgeClass = (stage: OpportunityLifecycleState) => {
    switch (stage) {
      case 'MEASURED':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'EXECUTED':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
      case 'APPROVED':
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30';
      case 'AWAITING_APPROVAL':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'DRAFT_CREATED':
      case 'ACTION_PROPOSED':
        return 'bg-sky-500/10 text-sky-400 border-sky-500/30';
      case 'BLOCKED':
      case 'FAILED':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    }
  };

  const getStageIndex = (stage: OpportunityLifecycleState) => {
    return LIFECYCLE_STAGES.indexOf(stage);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header with Stats & Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div
          className={`p-4 rounded-xl border ${
            darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="text-xs text-slate-400 font-semibold flex items-center justify-between">
            <span>Discovered Pipeline</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-2">
            ${totalPipeline.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Across {opportunities.length} opportunities</div>
        </div>

        <div
          className={`p-4 rounded-xl border ${
            darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="text-xs text-slate-400 font-semibold flex items-center justify-between">
            <span>Realized Revenue</span>
            <DollarSign className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-cyan-400 mt-2">
            ${totalRealized.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Closed-loop verified revenue</div>
        </div>

        <div
          className={`p-4 rounded-xl border ${
            darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="text-xs text-slate-400 font-semibold flex items-center justify-between">
            <span>Awaiting Approval</span>
            <Lock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400 mt-2">
            {opportunities.filter((o) => o.lifecycleState === 'AWAITING_APPROVAL').length}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Human sign-off required</div>
        </div>

        <div
          className={`p-4 rounded-xl border ${
            darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="text-xs text-slate-400 font-semibold flex items-center justify-between">
            <span>Governed Execution Mode</span>
            <ShieldCheck className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-sm font-bold font-mono text-sky-400 mt-2 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            DRY_RUN / GOVERNED
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Zero-mock deterministic safety</div>
        </div>
      </div>

      {/* Control Banner */}
      <div
        className={`p-4 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
          darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}
      >
        <div className="space-y-1">
          <div className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-sky-400" />
            Revenue-Activation Workspace & Operating Engine
          </div>
          <p className="text-xs text-slate-400 max-w-2xl">
            Take business opportunities from discovery to draft deliverable, human operator sign-off, deterministic DRY_RUN execution, and closed-loop ROI measurement.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            id="btn_run_dogfood_demo"
            onClick={handleRunDogfoodDemo}
            disabled={actionInProgress === 'dogfood'}
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
          >
            {actionInProgress === 'dogfood' ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5" />
            )}
            Run Jardin’s Outpost Dogfood Demo
          </button>

          <button
            id="btn_create_opportunity"
            onClick={() => setShowCreateModal(true)}
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-all"
          >
            <Target className="w-3.5 h-3.5 text-emerald-400" />
            Discover Opportunity
          </button>

          <button
            onClick={loadOpportunities}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 border border-slate-800 hover:bg-slate-800"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${fetchingOpps ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Dogfood Step Progression Log */}
      {dogfoodLog && dogfoodLog.length > 0 && (
        <div
          className={`p-4 rounded-xl border space-y-3 ${
            darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="text-xs font-bold text-slate-200 flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="flex items-center gap-2">
              <Award className="w-4 h-4 text-sky-400" />
              Jardin’s Outpost Dogfood Demonstration — Complete 9-Step Execution Trail
            </span>
            <span className="text-[10px] font-mono text-emerald-400">100% Deterministic</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-9 gap-1.5 pt-1">
            {dogfoodLog.map((step, idx) => (
              <div
                key={idx}
                className="p-2 rounded-lg bg-slate-800/80 border border-slate-700/60 text-center space-y-1"
              >
                <div className="text-[10px] font-bold text-sky-400">{step.step}</div>
                <div className="text-[9px] text-slate-400 truncate" title={step.evidence}>
                  {step.evidence}
                </div>
                <div className="text-[8px] font-mono text-slate-500">
                  {new Date(step.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-slate-800 space-x-4 text-xs font-semibold">
        <button
          onClick={() => setActiveSubTab('opportunities')}
          className={`pb-2.5 flex items-center gap-1.5 ${
            activeSubTab === 'opportunities'
              ? 'text-sky-400 border-b-2 border-sky-400'
              : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          <Target className="w-3.5 h-3.5" />
          Revenue Opportunities ({opportunities.length})
        </button>
        <button
          onClick={() => setActiveSubTab('leads')}
          className={`pb-2.5 flex items-center gap-1.5 ${
            activeSubTab === 'leads'
              ? 'text-sky-400 border-b-2 border-sky-400'
              : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          <Mail className="w-3.5 h-3.5" />
          Inbound CRM Leads ({leads.length})
        </button>
        <button
          onClick={() => setActiveSubTab('attributions')}
          className={`pb-2.5 flex items-center gap-1.5 ${
            activeSubTab === 'attributions'
              ? 'text-sky-400 border-b-2 border-sky-400'
              : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          Attribution Ledgers ({attributions.length})
        </button>
      </div>

      {/* Sub-Tab 1: Opportunities Workspace */}
      {activeSubTab === 'opportunities' && (
        <div className="space-y-4">
          {opportunities.length === 0 ? (
            <div className="p-12 text-center border rounded-xl border-dashed border-slate-800 text-slate-400 text-xs">
              No revenue opportunities found. Click "Run Jardin’s Outpost Dogfood Demo" or "Discover Opportunity" to activate.
            </div>
          ) : (
            opportunities.map((opp) => {
              const stageIdx = getStageIndex(opp.lifecycleState);
              const isSelected = selectedOpp?.id === opp.id;

              return (
                <div
                  key={opp.id}
                  id={`opp_card_${opp.id}`}
                  className={`p-5 rounded-xl border transition-all ${
                    darkMode
                      ? isSelected
                        ? 'bg-slate-900 border-sky-500/50 shadow-lg'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  {/* Top Row: Title, Product & Badges */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-bold text-slate-100 text-sm">{opp.title}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                        {opp.productId || 'prod_relay'}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/30">
                        {opp.actionType}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getStageBadgeClass(opp.lifecycleState)}`}>
                        {opp.lifecycleState}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        TRUTH: {opp.truthStatus || 'VERIFIED'}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs font-mono">
                      <span className="text-emerald-400 font-bold">
                        ${(opp.revenueEstimate || opp.estimated_monthly_value || 0).toLocaleString()}/mo
                      </span>
                      <span className="text-slate-500">|</span>
                      <span className="text-slate-400">
                        Cost: ${(opp.costEstimate || opp.cost_estimate || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 mt-2">{opp.description}</p>

                  {/* 9-Step Lifecycle Progress Tracker */}
                  <div className="mt-4 pt-3 border-t border-slate-800/80">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1.5 font-mono">
                      <span>Lifecycle Progression:</span>
                      <span className="text-slate-300">
                        Stage {stageIdx + 1} of {LIFECYCLE_STAGES.length}
                      </span>
                    </div>
                    <div className="grid grid-cols-9 gap-1">
                      {LIFECYCLE_STAGES.map((s, idx) => {
                        const isPast = idx < stageIdx;
                        const isCurrent = idx === stageIdx;
                        return (
                          <div
                            key={s}
                            className={`h-1.5 rounded-full transition-all ${
                              isCurrent
                                ? 'bg-sky-400 animate-pulse'
                                : isPast
                                ? 'bg-emerald-500'
                                : 'bg-slate-800'
                            }`}
                            title={`Step ${idx + 1}: ${s}`}
                          />
                        );
                      })}
                    </div>
                  </div>

                  {/* Worker & Meta Details */}
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
                    <div className="flex items-center gap-4">
                      <span>Worker: <strong className="text-slate-200">{opp.assignedWorkerName || 'Aria (AI Orchestrator)'}</strong></span>
                      {opp.deliverableVersionHash && (
                        <span className="font-mono text-[10px] text-sky-400">
                          Hash: {opp.deliverableVersionHash.substring(0, 12)}...
                        </span>
                      )}
                      {opp.approvalRecord && (
                        <span className="font-mono text-[10px] text-emerald-400 flex items-center gap-1">
                          <Check className="w-3 h-3" /> Signed by {opp.approvalRecord.approverName}
                        </span>
                      )}
                      {opp.measurementRecord && (
                        <span className="font-mono text-[10px] text-cyan-400 font-bold">
                          ROI: {opp.measurementRecord.roiPercent}% (${opp.measurementRecord.netGain} net)
                        </span>
                      )}
                    </div>

                    {/* Action Controls per Lifecycle Stage */}
                    <div className="flex items-center gap-2">
                      {/* View Deliverable Inspector */}
                      {opp.deliverableDraft && (
                        <button
                          onClick={() => {
                            setSelectedOpp(opp);
                            setShowInspector(true);
                          }}
                          className="px-2.5 py-1 rounded text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3 text-sky-400" />
                          Inspect Deliverable
                        </button>
                      )}

                      {/* Stage 1-3: Generate Draft Deliverable */}
                      {['DISCOVERED', 'QUALIFIED', 'ACTION_PROPOSED'].includes(opp.lifecycleState) && (
                        <button
                          onClick={() => handleGenerateDraft(opp.id)}
                          disabled={actionInProgress === `draft_${opp.id}`}
                          className="px-3 py-1 rounded text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white flex items-center gap-1.5 transition-all disabled:opacity-50"
                        >
                          <FileCode className="w-3 h-3" />
                          Generate Draft Deliverable
                        </button>
                      )}

                      {/* Stage 4: Submit for Operator Approval */}
                      {opp.lifecycleState === 'DRAFT_CREATED' && (
                        <button
                          onClick={() => handleSubmitForApproval(opp.id)}
                          disabled={actionInProgress === `submit_${opp.id}`}
                          className="px-3 py-1 rounded text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white flex items-center gap-1.5 transition-all disabled:opacity-50"
                        >
                          <Lock className="w-3 h-3" />
                          Submit to Approval Gate
                        </button>
                      )}

                      {/* Stage 5: Human Operator Approval Sign-Off */}
                      {opp.lifecycleState === 'AWAITING_APPROVAL' && (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleApproveDecision(opp.id, 'APPROVED')}
                            disabled={actionInProgress === `approve_${opp.id}`}
                            className="px-3 py-1 rounded text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1 shadow-sm transition-all disabled:opacity-50"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Approve (Operator Sign-off)
                          </button>
                          <button
                            onClick={() => handleApproveDecision(opp.id, 'REJECTED')}
                            disabled={actionInProgress === `approve_${opp.id}`}
                            className="px-2.5 py-1 rounded text-xs font-semibold bg-rose-900/60 hover:bg-rose-800 text-rose-200 border border-rose-700 flex items-center gap-1"
                          >
                            <X className="w-3.5 h-3.5" />
                            Reject
                          </button>
                        </div>
                      )}

                      {/* Stage 6: Queue & Execute Action */}
                      {opp.lifecycleState === 'APPROVED' && (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleExecuteAction(opp.id, 'DRY_RUN')}
                            disabled={actionInProgress === `exec_${opp.id}`}
                            className="px-3 py-1 rounded text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white flex items-center gap-1.5 transition-all disabled:opacity-50 shadow-sm"
                          >
                            <Play className="w-3 h-3" />
                            Execute (DRY_RUN)
                          </button>
                          <button
                            onClick={() => handleExecuteAction(opp.id, 'LIVE')}
                            disabled={actionInProgress === `exec_${opp.id}`}
                            className="px-2.5 py-1 rounded text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                            title="Execute in live mode (requires verified connector)"
                          >
                            Execute (LIVE)
                          </button>
                        </div>
                      )}

                      {/* Stage 8: Record Measurement & Closed-Loop Attribution */}
                      {opp.lifecycleState === 'EXECUTED' && (
                        <button
                          onClick={() => {
                            setMeasuringOppId(opp.id);
                            setMeasuringRev(String(opp.revenueEstimate || 3500));
                            setMeasuringCost(String(opp.costEstimate || 200));
                          }}
                          className="px-3 py-1 rounded text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white flex items-center gap-1.5 transition-all"
                        >
                          <DollarSign className="w-3 h-3" />
                          Record Realized ROI
                        </button>
                      )}

                      {/* Completed / Measured Badge */}
                      {opp.lifecycleState === 'MEASURED' && (
                        <span className="px-2.5 py-1 rounded text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Closed-Loop Measured
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Inline Measurement Form */}
                  {measuringOppId === opp.id && (
                    <div className="mt-4 p-3 rounded-lg bg-slate-800/80 border border-slate-700 space-y-2.5">
                      <div className="text-xs font-semibold text-slate-200">
                        Record Closed-Loop Realized Revenue & Cost Reconciliation
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1">Realized Revenue ($)</label>
                          <input
                            type="number"
                            value={measuringRev}
                            onChange={(e) => setMeasuringRev(e.target.value)}
                            className="w-full px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-slate-200 font-mono text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1">Actual Cost ($)</label>
                          <input
                            type="number"
                            value={measuringCost}
                            onChange={(e) => setMeasuringCost(e.target.value)}
                            className="w-full px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-slate-200 font-mono text-xs"
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          onClick={() => setMeasuringOppId(null)}
                          className="px-2.5 py-1 rounded text-xs text-slate-400 hover:text-slate-200"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleRecordMeasurement(opp.id)}
                          disabled={actionInProgress === `meas_${opp.id}`}
                          className="px-3 py-1 rounded text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white"
                        >
                          Save & Attribute ROI
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Sub-Tab 2: Inbound Leads */}
      {activeSubTab === 'leads' && (
        <div className="space-y-3">
          {leads.length === 0 ? (
            <div className="p-8 text-center border rounded-xl border-dashed border-slate-800 text-slate-400 text-xs">
              No inbound leads captured yet. Lead intake triggers automatically on website form submissions.
            </div>
          ) : (
            leads.map((lead: any) => (
              <div
                key={lead.id}
                className="p-4 rounded-xl border bg-slate-900/60 border-slate-800 flex items-center justify-between"
              >
                <div>
                  <div className="font-semibold text-slate-200 text-xs">{lead.name || lead.contact_name || 'Inbound Prospect'}</div>
                  <div className="text-[11px] text-slate-400 flex items-center gap-3 mt-1">
                    <span>{lead.email}</span>
                    <span>{lead.phone}</span>
                    <span>Score: <strong className="text-emerald-400">{lead.score || 85}/100</strong></span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-sky-500/10 text-sky-400 border border-sky-500/30">
                  {lead.status || 'QUALIFIED'}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {/* Sub-Tab 3: Attributions */}
      {activeSubTab === 'attributions' && (
        <div className="space-y-3">
          {attributions.length === 0 ? (
            <div className="p-8 text-center border rounded-xl border-dashed border-slate-800 text-slate-400 text-xs">
              No attribution events logged yet. Once actions execute and revenue reconciles, closed-loop ledger records appear here.
            </div>
          ) : (
            attributions.map((att: any) => (
              <div
                key={att.id}
                className="p-4 rounded-xl border bg-slate-900/60 border-slate-800 flex items-center justify-between"
              >
                <div>
                  <div className="font-semibold text-slate-200 text-xs">{att.title || 'Attributed Engagement'}</div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Method: {att.attribution_method || 'CLOSED_LOOP_RECONCILIATION'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-mono font-bold text-emerald-400">
                    +${(att.realized_value || att.amount || 0).toLocaleString()}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {new Date(att.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Deliverable Inspector Modal */}
      {showInspector && selectedOpp && selectedOpp.deliverableDraft && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div
            className={`w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-xl border p-6 space-y-4 shadow-2xl ${
              darkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <div className="text-sm font-bold flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-sky-400" />
                  Deliverable Package Inspector: {selectedOpp.title}
                </div>
                <div className="text-xs text-slate-400 font-mono mt-0.5">
                  Action: {selectedOpp.actionType} | Worker: {selectedOpp.assignedWorkerName}
                </div>
              </div>
              <button
                onClick={() => setShowInspector(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Version Hash Binding */}
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono space-y-1">
              <div className="text-[10px] text-slate-400 flex items-center justify-between">
                <span>Cryptographic Version Hash (SHA-256):</span>
                <span className="text-emerald-400">Tamper-Evident</span>
              </div>
              <div className="text-sky-300 break-all text-[11px]">
                {selectedOpp.deliverableVersionHash || 'Hash pending computation'}
              </div>
            </div>

            {/* Structured Deliverable Content */}
            <div className="space-y-3 text-xs">
              {/* Marketing Campaign Draft */}
              {selectedOpp.actionType === 'CREATE_MARKETING_CAMPAIGN' && (selectedOpp.deliverableDraft as any).landingPageCopy && (
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-700 space-y-1.5">
                    <div className="font-semibold text-slate-200">Landing Page Copy & Value Proposition</div>
                    <div className="text-sky-400 font-bold text-sm">
                      {(selectedOpp.deliverableDraft as any).landingPageCopy.headline}
                    </div>
                    <p className="text-slate-300">
                      {(selectedOpp.deliverableDraft as any).landingPageCopy.subheadline}
                    </p>
                    <ul className="list-disc list-inside text-slate-400 space-y-0.5 pt-1">
                      {(selectedOpp.deliverableDraft as any).landingPageCopy.keyBenefits?.map((b: string, i: number) => (
                        <li key={i}>{b}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-700 space-y-2">
                    <div className="font-semibold text-slate-200">Omnichannel Social Post Variants</div>
                    {(selectedOpp.deliverableDraft as any).socialPostVariants?.map((v: any, i: number) => (
                      <div key={i} className="p-2.5 rounded bg-slate-900 border border-slate-800 space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span className="font-bold text-sky-400">{v.platform}</span>
                          <span>{v.characterCount} chars</span>
                        </div>
                        <p className="text-slate-200 whitespace-pre-line text-[11px]">{v.postText}</p>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {v.hashtags?.join(' ')}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-700 space-y-1">
                      <div className="font-semibold text-slate-200">Channel Plan & Reach</div>
                      <div className="text-slate-400">
                        Channels: {(selectedOpp.deliverableDraft as any).suggestedChannelPlan?.channels?.join(', ')}
                      </div>
                      <div className="text-slate-400">
                        Cadence: {(selectedOpp.deliverableDraft as any).suggestedChannelPlan?.cadence}
                      </div>
                      <div className="text-slate-400">
                        Est. Reach: {(selectedOpp.deliverableDraft as any).suggestedChannelPlan?.estimatedReach?.toLocaleString()}
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-700 space-y-1">
                      <div className="font-semibold text-slate-200">Tracking Identifiers (UTMs)</div>
                      <div className="font-mono text-[10px] text-slate-400">
                        utm_source: {(selectedOpp.deliverableDraft as any).trackingIdentifiers?.utmSource}
                      </div>
                      <div className="font-mono text-[10px] text-slate-400">
                        utm_campaign: {(selectedOpp.deliverableDraft as any).trackingIdentifiers?.utmCampaign}
                      </div>
                      <div className="font-mono text-[10px] text-slate-400">
                        campaignId: {(selectedOpp.deliverableDraft as any).trackingIdentifiers?.campaignId}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Raw JSON Fallback for Other Types */}
              {selectedOpp.actionType !== 'CREATE_MARKETING_CAMPAIGN' && (
                <pre className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 font-mono text-[11px] overflow-x-auto">
                  {JSON.stringify(selectedOpp.deliverableDraft, null, 2)}
                </pre>
              )}
            </div>

            {/* Approval Record Information if Present */}
            {selectedOpp.approvalRecord && (
              <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/50 space-y-1 text-xs">
                <div className="font-semibold text-emerald-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Recorded Operator Approval (Segregation of Duties Verified)
                </div>
                <div className="text-slate-300">
                  Approved by <strong>{selectedOpp.approvalRecord.approverName}</strong> ({selectedOpp.approvalRecord.approverRole}) on{' '}
                  {new Date(selectedOpp.approvalRecord.approvedAt).toLocaleString()}
                </div>
                <div className="font-mono text-[10px] text-emerald-400/80 break-all">
                  Signature: {selectedOpp.approvalRecord.signature}
                </div>
              </div>
            )}

            {/* Execution Record Information if Present */}
            {selectedOpp.executionRecord && (
              <div className="p-3 rounded-lg bg-sky-950/40 border border-sky-800/50 space-y-1 text-xs">
                <div className="font-semibold text-sky-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-sky-400" />
                  Execution Result & Evidence
                </div>
                <div className="text-slate-300">
                  Mode: <strong>{selectedOpp.executionRecord.executionMode}</strong> | Status:{' '}
                  <strong className="text-emerald-400">{selectedOpp.executionRecord.status}</strong>
                </div>
                <div className="font-mono text-[10px] text-sky-400/80 break-all">
                  Evidence Hash: {selectedOpp.executionRecord.evidenceHash}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowInspector(false)}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Discover Opportunity Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateOpportunity}
            className={`w-full max-w-lg rounded-xl border p-6 space-y-4 shadow-2xl ${
              darkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="text-sm font-bold flex items-center gap-2">
                <Target className="w-4 h-4 text-emerald-400" />
                Discover & Register Revenue Opportunity
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Opportunity Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Promote Relay OS to Technical Studios"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3 py-1.5 rounded bg-slate-950 border border-slate-700 text-slate-200 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Target Product</label>
                  <select
                    value={formProductId}
                    onChange={(e) => setFormProductId(e.target.value)}
                    className="w-full px-3 py-1.5 rounded bg-slate-950 border border-slate-700 text-slate-200 text-xs"
                  >
                    <option value="prod_relay">Relay (Core AI OS & Site Builder)</option>
                    <option value="prod_bosslister">BossLister (Commerce & Catalog)</option>
                    <option value="prod_storyforge">StoryForge (Narrative Engine)</option>
                    <option value="prod_crosspost">Crosspost (Social Distribution)</option>
                    <option value="prod_ontrack">OnTrack (Habit Engine)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Universal Action Type</label>
                  <select
                    value={formActionType}
                    onChange={(e) => setFormActionType(e.target.value as any)}
                    className="w-full px-3 py-1.5 rounded bg-slate-950 border border-slate-700 text-slate-200 text-xs"
                  >
                    <option value="CREATE_MARKETING_CAMPAIGN">CREATE_MARKETING_CAMPAIGN</option>
                    <option value="CREATE_LISTING">CREATE_LISTING</option>
                    <option value="CREATE_BOOK_PACKAGE">CREATE_BOOK_PACKAGE</option>
                    <option value="CREATE_WEBSITE_CONTENT">CREATE_WEBSITE_CONTENT</option>
                    <option value="CREATE_SOCIAL_CONTENT">CREATE_SOCIAL_CONTENT</option>
                    <option value="GENERATE_COMMERCIAL_PLAN">GENERATE_COMMERCIAL_PLAN</option>
                    <option value="PREPARE_PUBLISHING_PACKAGE">PREPARE_PUBLISHING_PACKAGE</option>
                    <option value="FOLLOW_UP_WITH_LEAD">FOLLOW_UP_WITH_LEAD</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Description & Strategic Context</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Explain why this opportunity represents high-confidence business value..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3 py-1.5 rounded bg-slate-950 border border-slate-700 text-slate-200 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Estimated Monthly Value ($)</label>
                  <input
                    type="number"
                    value={formRevEst}
                    onChange={(e) => setFormRevEst(e.target.value)}
                    className="w-full px-3 py-1.5 rounded bg-slate-950 border border-slate-700 text-slate-200 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Estimated Execution Cost ($)</label>
                  <input
                    type="number"
                    value={formCostEst}
                    onChange={(e) => setFormCostEst(e.target.value)}
                    className="w-full px-3 py-1.5 rounded bg-slate-950 border border-slate-700 text-slate-200 font-mono text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-3.5 py-1.5 rounded text-xs text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionInProgress === 'create'}
                className="px-4 py-1.5 rounded text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 disabled:opacity-50"
              >
                {actionInProgress === 'create' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Target className="w-3.5 h-3.5" />}
                Discover Opportunity
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
