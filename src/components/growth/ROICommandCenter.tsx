import React, { useState } from 'react';
import { DollarSign, TrendingUp, ShieldCheck, Zap, Layers, BarChart3, ArrowUpRight, Scale, CheckCircle } from 'lucide-react';
import { growthEvidenceEngine } from '../../services/growthEvidenceEngine';
import { AttributionModelType } from '../../types/evidence';

interface ROICommandCenterProps {
  darkMode: boolean;
  onOpenEvidence: (evidence: any) => void;
}

export const ROICommandCenter: React.FC<ROICommandCenterProps> = ({
  darkMode,
  onOpenEvidence
}) => {
  const [selectedModel, setSelectedModel] = useState<AttributionModelType>('workflow_comparison');
  const stats = growthEvidenceEngine.getROIStats(selectedModel);
  const attributionRecords = growthEvidenceEngine.getAttributionRecords();
  const opportunities = growthEvidenceEngine.getOpportunities();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
              Closed-Loop Financial Attribution
            </span>
            <span className="text-xs text-slate-400 font-mono">Model: {selectedModel.toUpperCase()}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-100 mt-1">ROI Command Center</h1>
          <p className="text-xs text-slate-400">
            Compare predicted opportunity impact against verified realized revenue with multi-model attribution.
          </p>
        </div>

        {/* Attribution Model Selector */}
        <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded-xl border border-slate-800">
          <span className="text-xs text-slate-400 pl-2 font-mono flex items-center gap-1">
            <Scale className="w-3.5 h-3.5 text-emerald-400" />
            Model:
          </span>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value as AttributionModelType)}
            className="bg-slate-800 text-slate-100 text-xs rounded-lg px-3 py-1.5 border border-slate-700 font-mono focus:outline-none focus:border-emerald-500"
          >
            <option value="workflow_comparison">Workflow vs Control Group</option>
            <option value="direct">Direct Attribution</option>
            <option value="first_touch">First-Touch</option>
            <option value="last_touch">Last-Touch</option>
            <option value="linear">Linear Multi-Touch</option>
            <option value="position_based">Position-Based (40/20/40)</option>
            <option value="time_decay">Time-Decay</option>
          </select>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Realized Monthly Revenue */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-semibold">
              Realized Monthly Impact
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-100 mt-3 font-mono">
            ${stats.totalRealizedMonthlyRevenue.toLocaleString()}
            <span className="text-xs text-slate-400 font-normal"> / mo</span>
          </div>
          <div className="flex items-center justify-between mt-2 text-xs">
            <span className="text-slate-400">Annualized Run-Rate:</span>
            <span className="text-emerald-400 font-semibold font-mono">${stats.totalAnnualizedRealized.toLocaleString()}</span>
          </div>
        </div>

        {/* Total Opportunities Value */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold">
              Identified Opportunities
            </span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-100 mt-3 font-mono">
            ${stats.totalIdentifiedMonthlyValue.toLocaleString()}
            <span className="text-xs text-slate-400 font-normal"> / mo</span>
          </div>
          <div className="flex items-center justify-between mt-2 text-xs">
            <span className="text-slate-400">Total Opportunities:</span>
            <span className="text-purple-400 font-semibold font-mono">{stats.totalOpportunitiesIdentified} Detected</span>
          </div>
        </div>

        {/* Net ROI */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold">
              Net Execution ROI
            </span>
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Zap className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-sky-400 mt-3 font-mono">
            +{stats.netRoiPercentage}%
          </div>
          <div className="flex items-center justify-between mt-2 text-xs">
            <span className="text-slate-400">Execution Cost:</span>
            <span className="text-slate-200 font-semibold font-mono">${stats.totalExecutionCost.toFixed(2)}</span>
          </div>
        </div>

        {/* Confidence & Payback */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold">
              Payback Speed
            </span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-100 mt-3 font-mono">
            {stats.averagePaybackDays} <span className="text-lg text-slate-400">Days</span>
          </div>
          <div className="flex items-center justify-between mt-2 text-xs">
            <span className="text-slate-400">Attribution Status:</span>
            <span className="text-emerald-400 font-semibold flex items-center gap-1 font-mono">
              <CheckCircle className="w-3.5 h-3.5" /> VERIFIED
            </span>
          </div>
        </div>
      </div>

      {/* Verified Opportunities Attribution Ledger Table */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-400" />
              Verified Opportunity Attribution Ledger
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Transparent breakdown comparing estimated vs realized value with direct link to Evidence Graph.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 uppercase font-mono text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-3">Opportunity Title</th>
                <th className="p-3">Category</th>
                <th className="p-3">Est. Monthly</th>
                <th className="p-3">Realized Monthly</th>
                <th className="p-3">Status</th>
                <th className="p-3">Confidence</th>
                <th className="p-3 text-right">Evidence Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-mono">
              {opportunities.map((opp) => (
                <tr key={opp.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="p-3 font-semibold text-slate-100 font-sans">{opp.title}</td>
                  <td className="p-3 text-slate-400">{opp.category}</td>
                  <td className="p-3 text-purple-400 font-semibold">${opp.estimatedMonthlyValue.toLocaleString()}</td>
                  <td className="p-3 text-emerald-400 font-bold">${opp.actualRealizedMonthlyValue.toLocaleString()}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {opp.status}
                    </span>
                  </td>
                  <td className="p-3 text-slate-300">{opp.confidence}</td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => onOpenEvidence(opp.evidence)}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 font-sans text-[11px] font-medium border border-slate-700 inline-flex items-center gap-1 transition-colors"
                    >
                      Inspect Evidence <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Control Group Lift Comparison Panel */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 space-y-4">
        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 font-mono">
          <Layers className="w-4 h-4 text-purple-400" />
          Control Group vs. Workflow-Enrolled Lift Analysis
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {attributionRecords.map((rec) => (
            <div key={rec.id} className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
              <div className="flex justify-between text-slate-300 font-semibold">
                <span>Customer: {rec.customerEmail}</span>
                <span className="text-emerald-400 font-mono">${rec.dealValue.toLocaleString()}</span>
              </div>
              {rec.controlGroupComparison && (
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 font-mono text-[11px]">
                  <div>
                    <span className="text-slate-500 block">Enrolled Conv.</span>
                    <span className="text-emerald-400 font-bold">{(rec.controlGroupComparison.enrolledConversionRate * 100).toFixed(1)}%</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Control Conv.</span>
                    <span className="text-slate-400 font-bold">{(rec.controlGroupComparison.controlConversionRate * 100).toFixed(1)}%</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Incremental Lift</span>
                    <span className="text-purple-400 font-bold">+${rec.controlGroupComparison.incrementalLiftRevenue.toLocaleString()}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
