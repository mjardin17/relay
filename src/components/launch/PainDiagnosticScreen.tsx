import React, { useState } from 'react';
import { ShieldAlert, DollarSign, Clock, FileCheck2, Plus, AlertCircle, Sparkles } from 'lucide-react';
import { NichePainPoint } from '../../types/launchProgram';

interface PainDiagnosticScreenProps {
  painPoints: NichePainPoint[];
  onAddPainPoint: (pain: NichePainPoint) => void;
  darkMode: boolean;
}

export const PainDiagnosticScreen: React.FC<PainDiagnosticScreenProps> = ({
  painPoints,
  onAddPainPoint,
  darkMode
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<NichePainPoint['category']>('missed_communications');
  const [newFinancialCost, setNewFinancialCost] = useState(10000);
  const [newHoursWasted, setNewHoursWasted] = useState(25);
  const [newEvidence, setNewEvidence] = useState('');
  const [newSolution, setNewSolution] = useState('');

  const totalMonthlyLoss = painPoints.reduce((acc, p) => acc + p.financialCostEstimateMonthly, 0);
  const totalHoursWasted = painPoints.reduce((acc, p) => acc + p.operationalHoursWastedMonthly, 0);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle) return;
    const item: NichePainPoint = {
      id: `pain-custom-${Date.now()}`,
      nicheId: 'niche-dental',
      problemTitle: newTitle,
      category: newCategory,
      observedSymptom: 'Custom user-diagnosed operational bottleneck',
      financialCostEstimateMonthly: newFinancialCost,
      operationalHoursWastedMonthly: newHoursWasted,
      supportingEvidence: newEvidence || 'User audit sample',
      confidenceScore: 'Verified',
      recommendedSolution: newSolution || 'AI Automation Workflow',
      requiredValidation: 'Client ledger review'
    };
    onAddPainPoint(item);
    setShowAddModal(false);
    setNewTitle('');
    setNewEvidence('');
    setNewSolution('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
            Niche Business Pain Diagnostic & Leakage Calculator
          </h2>
          <p className="text-xs text-slate-400">
            Diagnose financial and operational loss caused by missed calls, slow response, and broken follow-up before designing your offer.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Log Diagnosed Pain Point
        </button>
      </div>

      {/* Summary Financial Metric Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={`p-4 rounded-xl border flex items-center justify-between ${darkMode ? 'bg-amber-950/20 border-amber-500/30' : 'bg-amber-50 border-amber-200'}`}>
          <div>
            <span className="text-xs font-mono font-medium text-amber-400 uppercase tracking-wider">
              Diagnosed Monthly Financial Leakage
            </span>
            <div className="text-2xl font-extrabold text-amber-400 font-mono mt-1">
              ${totalMonthlyLoss.toLocaleString()} / mo
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Across {painPoints.length} verified operational loss points in selected niche.
            </p>
          </div>
          <DollarSign className="w-8 h-8 text-amber-400/80" />
        </div>

        <div className={`p-4 rounded-xl border flex items-center justify-between ${darkMode ? 'bg-indigo-950/20 border-indigo-500/30' : 'bg-indigo-50 border-indigo-200'}`}>
          <div>
            <span className="text-xs font-mono font-medium text-indigo-400 uppercase tracking-wider">
              Diagnosed Monthly Staff Hours Wasted
            </span>
            <div className="text-2xl font-extrabold text-indigo-400 font-mono mt-1">
              {totalHoursWasted} Hours / mo
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Manual administrative overhead that can be automated with AI.
            </p>
          </div>
          <Clock className="w-8 h-8 text-indigo-400/80" />
        </div>
      </div>

      {/* Diagnosed Pain Point Cards */}
      <div className="space-y-4">
        {painPoints.map((pain) => (
          <div
            key={pain.id}
            className={`p-5 rounded-xl border transition-all ${darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    {pain.category.replace('_', ' ')}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Evidence Score: {pain.confidenceScore}
                  </span>
                </div>
                <h3 className="text-base font-bold">{pain.problemTitle}</h3>
              </div>
              <div className="flex items-center gap-4 font-mono text-xs shrink-0">
                <div className="bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800 text-amber-400 font-bold">
                  -${pain.financialCostEstimateMonthly.toLocaleString()}/mo Loss
                </div>
                <div className="bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800 text-indigo-400 font-bold">
                  {pain.operationalHoursWastedMonthly} hrs/mo Wasted
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-300 mb-3 leading-relaxed">
              <strong className="text-slate-400">Observed Symptom:</strong> {pain.observedSymptom}
            </p>

            <div className="p-3 rounded-lg bg-slate-950/50 border border-slate-800 text-xs space-y-2 font-mono">
              <div>
                <span className="text-indigo-400 font-bold">Supporting Grounding Evidence:</span>{' '}
                <span className="text-slate-300">{pain.supportingEvidence}</span>
              </div>
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                <div>
                  <span className="text-emerald-400 font-bold">Recommended AI Solution:</span>{' '}
                  <span className="text-slate-200">{pain.recommendedSolution}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Pain Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`w-full max-w-md p-6 rounded-2xl border ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-900'}`}>
            <h3 className="text-base font-bold mb-4 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-400" /> Log Diagnosed Pain Point
            </h3>
            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Problem Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="e.g. Unanswered Inbound Calls During Lunch Hours"
                  className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:border-indigo-500 ${
                    darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Problem Category</label>
                <select
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value as any)}
                  className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:border-indigo-500 ${
                    darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                >
                  <option value="missed_communications">Missed Communications</option>
                  <option value="slow_lead_response">Slow Lead Response</option>
                  <option value="failed_followup">Failed Follow-Up</option>
                  <option value="scheduling_leakage">Scheduling Leakage</option>
                  <option value="admin_bottleneck">Administrative Bottleneck</option>
                  <option value="cash_flow_leak">Cash Flow Leakage</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Est. Monthly Cost ($)</label>
                  <input
                    type="number"
                    value={newFinancialCost}
                    onChange={e => setNewFinancialCost(Number(e.target.value))}
                    className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:border-indigo-500 ${
                      darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Hours Wasted / Mo</label>
                  <input
                    type="number"
                    value={newHoursWasted}
                    onChange={e => setNewHoursWasted(Number(e.target.value))}
                    className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:border-indigo-500 ${
                      darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Grounding Evidence</label>
                <textarea
                  rows={2}
                  value={newEvidence}
                  onChange={e => setNewEvidence(e.target.value)}
                  placeholder="e.g. Audit of phone log exports showed 38 unanswered calls."
                  className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:border-indigo-500 ${
                    darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Recommended AI Solution</label>
                <input
                  type="text"
                  value={newSolution}
                  onChange={e => setNewSolution(e.target.value)}
                  placeholder="e.g. 24/7 Voice & SMS AI Receptionist"
                  className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:border-indigo-500 ${
                    darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold cursor-pointer"
                >
                  Save Pain Diagnostic
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
