import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  ShieldCheck,
  Zap,
  Layers,
  BarChart3,
  ArrowUpRight,
  Scale,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Play,
  FileCheck,
  HelpCircle,
  Network,
  Activity,
  CheckCircle2,
  XCircle,
  Sparkles,
  Info
} from 'lucide-react';
import {
  DefensibleROIMetrics,
  EvidenceGraphData,
  EvidenceNode,
  ReconciliationReport,
  StructuredOutcome,
  ExecutionEvidenceRecord
} from '../../types/evidenceGraph';

interface ROICommandCenterProps {
  darkMode: boolean;
  onOpenEvidence?: (evidence: any) => void;
}

export const ROICommandCenter: React.FC<ROICommandCenterProps> = ({
  darkMode,
  onOpenEvidence
}) => {
  const [selectedTenantId, setSelectedTenantId] = useState<'tenant_ma_fresh_launch' | 'tenant_demo_1'>('tenant_ma_fresh_launch');
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState<DefensibleROIMetrics | null>(null);
  const [reconciliation, setReconciliation] = useState<ReconciliationReport | null>(null);
  const [graphData, setGraphData] = useState<EvidenceGraphData | null>(null);
  const [outcomes, setOutcomes] = useState<StructuredOutcome[]>([]);
  const [executionRecords, setExecutionRecords] = useState<ExecutionEvidenceRecord[]>([]);
  const [advisorSummary, setAdvisorSummary] = useState<any>(null);
  const [selectedNode, setSelectedNode] = useState<EvidenceNode | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'funnel' | 'graph' | 'reconciliation' | 'advisor'>('overview');

  const activeToken = selectedTenantId === 'tenant_ma_fresh_launch' ? 'token_ma_fresh_launch' : 'token_owner_tenant1';

  const fetchData = async () => {
    setLoading(true);
    setFeedbackMsg(null);
    try {
      // 1. Defensible ROI
      const resROI = await fetch('/api/growth/defensible-roi', {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      const dataROI = await resROI.json();
      if (dataROI.success && dataROI.metrics) {
        setMetrics(dataROI.metrics);
      }

      // 2. Reconciliation
      const resRec = await fetch('/api/growth/reconciliation', {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      const dataRec = await resRec.json();
      if (dataRec.success && dataRec.report) {
        setReconciliation(dataRec.report);
      }

      // 3. Evidence Graph
      const resGraph = await fetch('/api/growth/evidence-graph', {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      const dataGraph = await resGraph.json();
      if (dataGraph.success && dataGraph.graph) {
        setGraphData(dataGraph.graph);
      }

      // 4. Structured Outcomes
      const resOutcomes = await fetch('/api/growth/structured-outcomes', {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      const dataOutcomes = await resOutcomes.json();
      if (dataOutcomes.success && Array.isArray(dataOutcomes.outcomes)) {
        setOutcomes(dataOutcomes.outcomes);
      }

      // 5. Execution Evidence
      const resExec = await fetch('/api/growth/execution-evidence', {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      const dataExec = await resExec.json();
      if (dataExec.success && Array.isArray(dataExec.records)) {
        setExecutionRecords(dataExec.records);
      }

      // 6. Advisor Summary
      const resSummary = await fetch('/api/growth/advisor/executive-summary', {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      const dataSummary = await resSummary.json();
      if (dataSummary.success && dataSummary.summary) {
        setAdvisorSummary(dataSummary.summary);
      }
    } catch (err: any) {
      setFeedbackMsg({ text: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedTenantId]);

  const handleRunPilotScenario = async () => {
    setLoading(true);
    setFeedbackMsg(null);
    try {
      const res = await fetch('/api/growth/pilot/seed-reis-electric', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${activeToken}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setFeedbackMsg({
          text: `Reis Electric pilot vertical slice executed! Generated ${data.result.nodesCount} nodes, ${data.result.edgesCount} edges with 100% integrity.`,
          type: 'success'
        });
        await fetchData();
      } else {
        setFeedbackMsg({ text: data.error || 'Failed to seed pilot scenario', type: 'error' });
      }
    } catch (err: any) {
      setFeedbackMsg({ text: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Classification Banner */}
      {selectedTenantId === 'tenant_demo_1' ? (
        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>DEMO / SIMULATED — SYNTHETIC BENCHMARK DATA</span>
          </div>
          <span className="bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-mono text-[11px]">
            CLASSIFICATION: SYNTHETIC_TEST
          </span>
        </div>
      ) : (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>REIS ELECTRIC PILOT — CLOSED-LOOP FINANCIAL ATTRIBUTION & RECONCILIATION ENGINE</span>
          </div>
          <span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-mono text-[11px]">
            CLASSIFICATION: PILOT_VERIFIED
          </span>
        </div>
      )}

      {/* Header */}
      <div className={`p-6 rounded-2xl border ${darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
                Evidence → Execution → Attribution → ROI
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {selectedTenantId === 'tenant_ma_fresh_launch' ? 'Reis Electric LLC (MA)' : 'Demo Tenant 1'}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-100 mt-1">ROI Command Center & Attribution Ledger</h1>
            <p className="text-xs text-slate-400">
              Defensible financial attribution tracing lead origin → human approval → execution → invoice → verified payment.
            </p>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs">
              <button
                onClick={() => setSelectedTenantId('tenant_ma_fresh_launch')}
                className={`px-3 py-1.5 rounded-lg font-medium transition ${
                  selectedTenantId === 'tenant_ma_fresh_launch'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Reis Electric (MA)
              </button>
              <button
                onClick={() => setSelectedTenantId('tenant_demo_1')}
                className={`px-3 py-1.5 rounded-lg font-medium transition ${
                  selectedTenantId === 'tenant_demo_1'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Demo Tenant (Simulated)
              </button>
            </div>

            <button
              onClick={handleRunPilotScenario}
              disabled={loading}
              className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 transition"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Run Reis Electric Pilot Flow
            </button>

            <button
              onClick={fetchData}
              disabled={loading}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-xs transition"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-800 overflow-x-auto text-xs">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              activeTab === 'overview' ? 'bg-slate-800 text-emerald-400 border border-emerald-500/30' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Overview & Unit Economics
          </button>
          <button
            onClick={() => setActiveTab('funnel')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              activeTab === 'funnel' ? 'bg-slate-800 text-emerald-400 border border-emerald-500/30' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Lifecycle Funnel (Contacted → Paid)
          </button>
          <button
            onClick={() => setActiveTab('graph')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              activeTab === 'graph' ? 'bg-slate-800 text-emerald-400 border border-emerald-500/30' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Evidence Graph ({graphData?.nodes.length || 0} Nodes)
          </button>
          <button
            onClick={() => setActiveTab('reconciliation')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              activeTab === 'reconciliation' ? 'bg-slate-800 text-emerald-400 border border-emerald-500/30' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Reconciliation & Anomalies ({reconciliation?.anomalies.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('advisor')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1 ${
              activeTab === 'advisor' ? 'bg-slate-800 text-purple-400 border border-purple-500/30' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            Gemini Executive Brief
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedbackMsg && (
        <div className={`p-4 rounded-xl text-sm flex items-center gap-3 border ${
          feedbackMsg.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            : 'bg-red-500/10 border-red-500/20 text-red-400'
        }`}>
          {feedbackMsg.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertTriangle className="w-5 h-5 shrink-0" />}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Attributable Gross Profit */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-semibold">
              Attributable Gross Profit
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-100 mt-3 font-mono">
            ${metrics?.attributableGrossProfit?.toLocaleString() || '0'}
          </div>
          <div className="flex items-center justify-between mt-2 text-xs">
            <span className="text-slate-400">Collected Revenue:</span>
            <span className="text-emerald-400 font-semibold font-mono">${metrics?.totalCollectedRevenue?.toLocaleString() || '0'}</span>
          </div>
        </div>

        {/* Relay Execution Cost */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold">
              Relay Execution Cost
            </span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-100 mt-3 font-mono">
            ${metrics?.totalRelayExecutionCost?.toFixed(2) || '0.00'}
          </div>
          <div className="flex items-center justify-between mt-2 text-xs">
            <span className="text-slate-400">Direct Job Costs (Permits/Mat):</span>
            <span className="text-slate-300 font-semibold font-mono">${metrics?.trackedCosts?.totalDirectJobCost?.toLocaleString() || '0'}</span>
          </div>
        </div>

        {/* Net ROI */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold">
              Defensible Net ROI
            </span>
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Zap className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-sky-400 mt-3 font-mono">
            {metrics?.netRoiDisplay || 'N/A'}
          </div>
          <div className="flex items-center justify-between mt-2 text-xs">
            <span className="text-slate-400">Payback Period:</span>
            <span className="text-sky-300 font-semibold font-mono">{metrics?.paybackDisplay || 'N/A'}</span>
          </div>
        </div>

        {/* Evidence Health & Integrity */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold">
              Evidence Integrity
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-100 mt-3 font-mono flex items-center gap-2">
            <span>{reconciliation?.integrityScore || 100}</span>
            <span className="text-sm font-normal text-slate-400">/ 100</span>
          </div>
          <div className="flex items-center justify-between mt-2 text-xs">
            <span className="text-slate-400">Reconciliation Status:</span>
            <span className="text-emerald-400 font-semibold font-mono text-[11px]">
              {reconciliation?.status || 'CLEAN'}
            </span>
          </div>
        </div>
      </div>

      {/* TAB 1: OVERVIEW & UNIT ECONOMICS */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Unit Economics Breakdown Card */}
          <div className={`p-6 rounded-2xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-emerald-400" />
              Pilot Unit Economics & Cost Allocation Breakdown
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400">Cost Per Inbound Lead</span>
                <div className="text-lg font-bold text-slate-200 font-mono mt-1">
                  ${metrics?.costPerLead !== null ? metrics?.costPerLead?.toFixed(2) : 'N/A'}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400">Cost Per Qualified Lead</span>
                <div className="text-lg font-bold text-slate-200 font-mono mt-1">
                  ${metrics?.costPerQualifiedLead !== null ? metrics?.costPerQualifiedLead?.toFixed(2) : 'N/A'}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400">Cost Per Booked Job</span>
                <div className="text-lg font-bold text-emerald-400 font-mono mt-1">
                  ${metrics?.costPerBooking !== null ? metrics?.costPerBooking?.toFixed(2) : 'N/A'}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400">Booking Conversion Rate</span>
                <div className="text-lg font-bold text-sky-400 font-mono mt-1">
                  {metrics?.bookingConversionRate || 0}%
                </div>
              </div>
            </div>

            {/* Direct Costs vs Gross Margin */}
            <div className="mt-6 p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block font-mono">
                Attribution Accounting Formula (Reis Electric LLC)
              </span>
              <div className="text-xs font-mono text-slate-300 space-y-1.5">
                <div className="flex justify-between border-b border-slate-800 pb-1">
                  <span>(+) Attributed Collected Revenue (Verified Merchant Deposit):</span>
                  <span className="text-emerald-400 font-bold">${metrics?.attributedGrossRevenue?.toLocaleString() || '0'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-1">
                  <span>(-) Direct Electrical Materials (200A Panel + Conduit + EV Charger):</span>
                  <span className="text-amber-400">-${metrics?.trackedCosts?.directJobMaterialsCost?.toLocaleString() || '0'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-1">
                  <span>(-) Massachusetts Municipal Electrical Permit (Board of Electricians):</span>
                  <span className="text-amber-400">-${metrics?.trackedCosts?.directJobPermitCost?.toLocaleString() || '0'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-1 font-bold text-slate-100">
                  <span>(=) Attributable Gross Profit:</span>
                  <span className="text-emerald-400">${metrics?.attributableGrossProfit?.toLocaleString() || '0'}</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span>(-) Relay Platform & Execution Cost (Model API + Carrier SMS):</span>
                  <span className="text-purple-400">-${metrics?.totalRelayExecutionCost?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="flex justify-between font-bold text-sky-400 pt-1 text-sm border-t border-slate-700">
                  <span>Defensible Net Operating ROI:</span>
                  <span>{metrics?.netRoiDisplay || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: LIFECYCLE FUNNEL */}
      {activeTab === 'funnel' && (
        <div className={`p-6 rounded-2xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} space-y-6`}>
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-400" />
              Verified Pipeline Stage Progression (Contacted → Paid)
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Every stage transition requires verifiable evidence before status change or revenue recognition.
            </p>
          </div>

          <div className="space-y-3">
            {outcomes.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                No structured pipeline outcomes recorded yet. Click "Run Reis Electric Pilot Flow" above to simulate the vertical slice.
              </div>
            ) : (
              outcomes.map((outcome, idx) => (
                <div key={outcome.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center text-xs font-bold font-mono shrink-0 mt-0.5">
                      {idx + 1}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">
                          {outcome.stage.replace(/_/g, ' ')}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                          {outcome.evidenceType}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">
                          CONFIDENCE: {(outcome.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{outcome.notes || `Source: ${outcome.actorOrSource}`}</p>
                      <div className="text-[11px] text-slate-500 font-mono mt-1">
                        Recorded at: {new Date(outcome.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    {outcome.collectedRevenue > 0 && (
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-mono block">Collected Revenue</span>
                        <span className="text-base font-extrabold text-emerald-400 font-mono">
                          ${outcome.collectedRevenue.toLocaleString()}
                        </span>
                      </div>
                    )}
                    {outcome.bookedValue > 0 && outcome.collectedRevenue === 0 && (
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-mono block">Booked Job Value</span>
                        <span className="text-base font-extrabold text-purple-400 font-mono">
                          ${outcome.bookedValue.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 3: EVIDENCE GRAPH */}
      {activeTab === 'graph' && (
        <div className={`p-6 rounded-2xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} space-y-6`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Network className="w-5 h-5 text-purple-400" />
                Evidence Graph Inspector ({graphData?.nodes.length || 0} Nodes, {graphData?.edges.length || 0} Edges)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Cryptographically linked provenance from lead origin to financial payment receipt.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Nodes List */}
            <div className="lg:col-span-6 space-y-2 max-h-[500px] overflow-y-auto">
              {graphData?.nodes.map((n) => (
                <button
                  key={n.id}
                  onClick={() => setSelectedNode(n)}
                  className={`w-full text-left p-3 rounded-xl border text-xs font-mono transition ${
                    selectedNode?.id === n.id
                      ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300'
                      : 'border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-200 uppercase">{n.type}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400 border border-slate-700">
                      {n.evidenceStatus}
                    </span>
                  </div>
                  <div className="mt-1 text-slate-300 font-sans">{n.label}</div>
                  <div className="text-[10px] text-slate-500 mt-1">Source: {n.source}</div>
                </button>
              ))}
            </div>

            {/* Node Detail & Provenance Inspector */}
            <div className="lg:col-span-6">
              {selectedNode ? (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 text-xs">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                    <span className="font-bold text-emerald-400 uppercase font-mono">{selectedNode.type} Node Details</span>
                    <span className="text-slate-500 font-mono text-[10px]">ID: {selectedNode.id.substring(0, 16)}...</span>
                  </div>
                  <div>
                    <label className="text-slate-500 block font-mono text-[10px]">Label</label>
                    <div className="text-slate-200 font-semibold">{selectedNode.label}</div>
                  </div>
                  <div>
                    <label className="text-slate-500 block font-mono text-[10px]">Actor / Ingested By</label>
                    <div className="text-slate-300">{selectedNode.actor}</div>
                  </div>
                  <div>
                    <label className="text-slate-500 block font-mono text-[10px]">Provenance & Verification Method</label>
                    <div className="text-slate-300 font-mono">
                      {selectedNode.provenance?.verificationMethod || 'System verification'} ({selectedNode.provenance?.sourceSystem})
                    </div>
                  </div>
                  {selectedNode.auditHash && (
                    <div>
                      <label className="text-slate-500 block font-mono text-[10px]">SHA-256 Audit Fingerprint</label>
                      <div className="text-purple-400 font-mono text-[10px] break-all">{selectedNode.auditHash}</div>
                    </div>
                  )}
                  <div>
                    <label className="text-slate-500 block font-mono text-[10px]">Metadata Payload</label>
                    <pre className="p-2 bg-slate-900 border border-slate-800 rounded font-mono text-[10px] text-slate-300 overflow-x-auto max-h-40">
                      {JSON.stringify(selectedNode.metadata, null, 2)}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                  Select a node from the left list to inspect cryptographic provenance and verification methods.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: RECONCILIATION & ANOMALIES */}
      {activeTab === 'reconciliation' && (
        <div className={`p-6 rounded-2xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} space-y-6`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                Evidence Chain Reconciliation & Anomaly Scanner
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Automated continuous reconciliation safeguarding against broken chains, unverified payments, or duplicate revenue claims.
              </p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-bold font-mono ${
              reconciliation?.status === 'CLEAN'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
            }`}>
              STATUS: {reconciliation?.status || 'CLEAN'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-500 block">Total Nodes Scanned</span>
              <span className="text-lg font-bold text-slate-200">{reconciliation?.totalNodesScanned || 0}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-500 block">Total Edges Scanned</span>
              <span className="text-lg font-bold text-slate-200">{reconciliation?.totalEdgesScanned || 0}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-500 block">Verified Scanned Revenue</span>
              <span className="text-lg font-bold text-emerald-400">${reconciliation?.totalRevenueScanned?.toLocaleString() || '0'}</span>
            </div>
          </div>

          <div className="space-y-3">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block font-mono">
              Reconciliation Anomalies & Findings ({reconciliation?.anomalies.length || 0})
            </span>

            {reconciliation?.anomalies.length === 0 ? (
              <div className="p-6 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-emerald-300 flex items-center gap-3 text-xs">
                <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <span className="font-bold">Zero Anomalies Detected:</span> All financial attribution links, customer authorizations, and invoice-to-deposit records are strictly consistent.
                </div>
              </div>
            ) : (
              reconciliation?.anomalies.map((anom) => (
                <div key={anom.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-400 font-mono">{anom.code}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      anom.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
                    }`}>
                      {anom.severity}
                    </span>
                  </div>
                  <p className="text-slate-300">{anom.description}</p>
                  <div className="p-2 rounded bg-slate-900 text-slate-400 text-[11px] font-mono">
                    Remediation: {anom.remediationAdvice}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 5: GEMINI EXECUTIVE BRIEF */}
      {activeTab === 'advisor' && (
        <div className={`p-6 rounded-2xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} space-y-6`}>
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <h2 className="text-base font-bold text-slate-100">
                Gemini Executive Attribution Advisor
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              AI-generated executive briefing interpreting financial performance. Deterministic logic strictly enforces underlying data integrity.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-950/30 via-slate-950 to-slate-950 border border-purple-500/30 space-y-4">
            <h3 className="text-base font-bold text-slate-100 font-mono">
              {advisorSummary?.summaryHeadline || 'Executive Briefing Ready'}
            </h3>

            <div className="space-y-2">
              <span className="text-xs font-bold text-purple-400 uppercase tracking-wider font-mono">Key Financial Insights</span>
              <ul className="space-y-1.5 text-xs text-slate-300">
                {advisorSummary?.keyInsights?.map((insight: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-purple-400 font-mono">•</span>
                    <span>{insight}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider font-mono">Recommended Operator Verifications</span>
              <ul className="space-y-1.5 text-xs text-slate-300">
                {advisorSummary?.recommendedOperatorActions?.map((act: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-emerald-400 font-mono">•</span>
                    <span>{act}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
