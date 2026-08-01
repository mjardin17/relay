import React, { useState } from 'react';
import {
  Cpu,
  Clock,
  DollarSign,
  CheckCircle2,
  Zap,
  ArrowUpRight,
  TrendingUp,
  Sliders,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { OperationalEfficiencyItem } from '../../types/relay';

interface OperationsOptimizationEngineProps {
  items: OperationalEfficiencyItem[];
  setItems: React.Dispatch<React.SetStateAction<OperationalEfficiencyItem[]>>;
  darkMode: boolean;
  onDeployToAutomation: (itemTask: string) => void;
}

export const OperationsOptimizationEngine: React.FC<OperationsOptimizationEngineProps> = ({
  items,
  setItems,
  darkMode,
  onDeployToAutomation
}) => {
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const totalHoursSaved = items.reduce((sum, item) => sum + item.projectedHoursSaved, 0);
  const totalMonthlySavings = items.reduce((sum, item) => sum + item.projectedMonthlySavings, 0);

  const handleDeployAutomation = (item: OperationalEfficiencyItem) => {
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, status: 'automated' } : i))
    );

    setToastMsg(`🚀 Deployed AI Automation for "${item.taskName}"! Savings: $${item.projectedMonthlySavings.toLocaleString()}/mo`);
    setTimeout(() => {
      setToastMsg(null);
      onDeployToAutomation(item.taskName);
    }, 1500);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className={`p-6 rounded-2xl border relative overflow-hidden ${
        darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase tracking-wider flex items-center gap-1">
                <Cpu className="w-3 h-3 text-amber-400" />
                Engine 5 • Business Operations & Margin Engine
              </span>
              <span className="text-xs text-slate-400 font-mono">Cost Elimination & Automation</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Operations Optimization Engine</h1>
            <p className={`text-xs max-w-2xl ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Identify manual labor friction, eliminate wasted team hours, reduce overhead costs, and deploy AI solutions to maximize gross margins.
            </p>
          </div>
        </div>

        {toastMsg && (
          <div className="mt-3 p-2.5 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-xs text-emerald-300 font-mono flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMsg}</span>
          </div>
        )}
      </div>

      {/* Aggregate Savings Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={`p-4 rounded-xl border ${darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'} space-y-1`}>
          <span className="text-[10px] text-slate-400 font-mono uppercase font-bold">Total Hours Recovered</span>
          <div className="text-2xl font-bold font-mono text-amber-400">{totalHoursSaved.toFixed(1)} hrs / week</div>
          <p className="text-[10px] text-slate-400">Reallocated to high-value strategic growth</p>
        </div>

        <div className={`p-4 rounded-xl border ${darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'} space-y-1`}>
          <span className="text-[10px] text-slate-400 font-mono uppercase font-bold">Projected Net Monthly Savings</span>
          <div className="text-2xl font-bold font-mono text-emerald-400">+${totalMonthlySavings.toLocaleString()} / mo</div>
          <p className="text-[10px] text-slate-400">Directly adds to EBITDA operational margin</p>
        </div>

        <div className={`p-4 rounded-xl border ${darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'} space-y-1`}>
          <span className="text-[10px] text-slate-400 font-mono uppercase font-bold">Operational Automation Ratio</span>
          <div className="text-2xl font-bold font-mono text-indigo-400">72% Automated</div>
          <p className="text-[10px] text-slate-400">Targeting 85% by end of Q3</p>
        </div>
      </div>

      {/* Manual Task Audit Table */}
      <div className={`p-5 rounded-2xl border ${darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'} space-y-4`}>
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-400" />
            <h2 className="text-sm font-bold uppercase font-mono tracking-wider">Manual Labor & AI Automation Matrix</h2>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">REAL COST SAVINGS CALCULATOR</span>
        </div>

        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className={`p-4 rounded-xl border space-y-3 transition-all ${
                item.status === 'automated'
                  ? 'bg-emerald-950/10 border-emerald-500/30'
                  : darkMode
                  ? 'bg-slate-950/60 border-slate-800'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase">
                      {item.department}
                    </span>
                    <h3 className="text-xs font-bold text-slate-200">{item.taskName}</h3>
                  </div>
                </div>

                <div className="flex items-center gap-3 font-mono text-xs">
                  <span className="text-slate-400">
                    Manual: <strong className="text-rose-400">{item.currentManualHoursPerWeek} hrs/wk</strong> (${item.monthlyCost}/mo)
                  </span>
                  <span className="text-slate-400">
                    Savings: <strong className="text-emerald-400">+${item.projectedMonthlySavings}/mo</strong>
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-xs text-slate-300 space-y-0.5">
                  <span className="text-[10px] font-mono text-indigo-400 font-bold uppercase">AI Automation Solution:</span>
                  <p>{item.aiAutomationSolution}</p>
                </div>

                <button
                  onClick={() => handleDeployAutomation(item)}
                  disabled={item.status === 'automated'}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                    item.status === 'automated'
                      ? 'bg-emerald-950 border border-emerald-500/40 text-emerald-400 cursor-default'
                      : 'bg-amber-600 hover:bg-amber-500 text-white shadow-md shadow-amber-950/50'
                  }`}
                >
                  <span>{item.status === 'automated' ? 'AI Solution Deployed' : 'Deploy AI Automation'}</span>
                  {item.status !== 'automated' && <ArrowUpRight className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
