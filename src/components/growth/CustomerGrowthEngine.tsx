import React, { useState } from 'react';
import {
  Users,
  GitBranch,
  Play,
  Pause,
  CheckCircle2,
  Zap,
  ArrowRight,
  Plus,
  RefreshCw,
  Clock,
  Sparkles,
  ShieldCheck,
  TrendingUp
} from 'lucide-react';
import { CustomerWorkflow } from '../../types/relay';

interface CustomerGrowthEngineProps {
  workflows: CustomerWorkflow[];
  setWorkflows: React.Dispatch<React.SetStateAction<CustomerWorkflow[]>>;
  darkMode: boolean;
}

export const CustomerGrowthEngine: React.FC<CustomerGrowthEngineProps> = ({
  workflows,
  setWorkflows,
  darkMode
}) => {
  const [selectedType, setSelectedType] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTrigger, setNewTrigger] = useState('');
  const [newStepInput, setNewStepInput] = useState('');

  const toggleWorkflow = (id: string) => {
    setWorkflows((prev) =>
      prev.map((w) => (w.id === id ? { ...w, enabled: !w.enabled } : w))
    );
  };

  const handleCreateWorkflow = () => {
    if (!newTitle.trim() || !newTrigger.trim()) return;

    const newWf: CustomerWorkflow = {
      id: `cw-${Date.now()}`,
      title: newTitle,
      type: 'lead_nurture',
      trigger: newTrigger,
      steps: newStepInput.split(',').map((s) => s.trim()).filter(Boolean),
      activeCount: 1,
      conversionRate: '28.0%',
      enabled: true
    };

    setWorkflows([newWf, ...workflows]);
    setNewTitle('');
    setNewTrigger('');
    setNewStepInput('');
    setShowAddModal(false);
  };

  const filteredWorkflows = workflows.filter((w) => {
    if (selectedType !== 'all' && w.type !== selectedType) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className={`p-6 rounded-2xl border relative overflow-hidden ${
        darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider flex items-center gap-1">
                <Users className="w-3 h-3 text-emerald-400" />
                Engine 4 • Customer Lifecycle Growth
              </span>
              <span className="text-xs text-slate-400 font-mono">Automated Retention Engine</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Customer Growth & Retention Engine</h1>
            <p className={`text-xs max-w-2xl ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Automated workflows for instant speed-to-lead nurturing, VIP customer onboarding, abandoned quote recovery, referral flywheels, and customer reactivation.
            </p>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-950/40 flex items-center gap-2 transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>New Customer Workflow</span>
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={`p-4 rounded-xl border ${darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'} space-y-1`}>
          <span className="text-[10px] text-slate-400 font-mono uppercase font-bold">Active Customer Workflows</span>
          <div className="text-2xl font-bold font-mono text-emerald-400">
            {workflows.filter((w) => w.enabled).length} / {workflows.length} Enabled
          </div>
          <p className="text-[10px] text-slate-400">Continuous 24/7 retention automation</p>
        </div>

        <div className={`p-4 rounded-xl border ${darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'} space-y-1`}>
          <span className="text-[10px] text-slate-400 font-mono uppercase font-bold">Enrolled Active Leads/Customers</span>
          <div className="text-2xl font-bold font-mono text-sky-400">
            {workflows.reduce((sum, w) => sum + w.activeCount, 0)} Active
          </div>
          <p className="text-[10px] text-slate-400">Currently executing sequence steps</p>
        </div>

        <div className={`p-4 rounded-xl border ${darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'} space-y-1`}>
          <span className="text-[10px] text-slate-400 font-mono uppercase font-bold">Average Conversion Boost</span>
          <div className="text-2xl font-bold font-mono text-indigo-400">+28.4%</div>
          <p className="text-[10px] text-slate-400">Over manual human follow-up baseline</p>
        </div>
      </div>

      {/* Workflows Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredWorkflows.map((wf) => (
          <div
            key={wf.id}
            className={`p-5 rounded-2xl border space-y-4 transition-all ${
              wf.enabled
                ? darkMode
                  ? 'bg-slate-900/90 border-slate-800'
                  : 'bg-white border-slate-200'
                : 'opacity-60 bg-slate-950/40 border-slate-800/60'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 uppercase">
                  {wf.type.replace('_', ' ')}
                </span>
                <h3 className="text-sm font-bold text-slate-100">{wf.title}</h3>
              </div>

              {/* Toggle Switch */}
              <button
                onClick={() => toggleWorkflow(wf.id)}
                className={`p-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  wf.enabled
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {wf.enabled ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5" />}
                <span>{wf.enabled ? 'Enabled' : 'Paused'}</span>
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
              <div className="text-[11px] text-slate-400 font-mono">
                <strong className="text-indigo-400">TRIGGER: </strong>
                {wf.trigger}
              </div>

              <div className="space-y-1.5 pt-1 border-t border-slate-800">
                <span className="text-[10px] text-slate-500 font-mono uppercase">Automated Steps ({wf.steps.length}):</span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {wf.steps.map((step, idx) => (
                    <span key={idx} className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 flex items-center gap-1">
                      <span className="text-indigo-400 font-bold">{idx + 1}.</span> {step}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800 font-mono">
              <span className="text-slate-400">Enrolled: <strong className="text-slate-200">{wf.activeCount} users</strong></span>
              <span className="text-slate-400">Conversion Rate: <strong className="text-emerald-400">{wf.conversionRate}</strong></span>
            </div>
          </div>
        ))}
      </div>

      {/* Add Workflow Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`p-6 rounded-2xl border max-w-md w-full space-y-4 ${
            darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <h3 className="text-base font-bold font-mono uppercase">Create Customer Growth Workflow</h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-mono text-slate-400">Workflow Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Speed-to-Lead Follow-up Sequence"
                  className="w-full mt-1 p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100"
                />
              </div>

              <div>
                <label className="font-mono text-slate-400">Trigger Condition</label>
                <input
                  type="text"
                  value={newTrigger}
                  onChange={(e) => setNewTrigger(e.target.value)}
                  placeholder="e.g. Inbound Demo Form Submitted"
                  className="w-full mt-1 p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100"
                />
              </div>

              <div>
                <label className="font-mono text-slate-400">Steps (comma separated)</label>
                <input
                  type="text"
                  value={newStepInput}
                  onChange={(e) => setNewStepInput(e.target.value)}
                  placeholder="e.g. Instant SMS, Email Intro, Calendar Link"
                  className="w-full mt-1 p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateWorkflow}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
              >
                Save & Enable Workflow
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
