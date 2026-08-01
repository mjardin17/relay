import React, { useState } from 'react';
import { Workflow, Zap, Play, Plus, CheckCircle2, RefreshCw } from 'lucide-react';
import { AutomationWorkflow } from '../../types/relay';

interface AutomationEngineProps {
  workflows: AutomationWorkflow[];
  darkMode: boolean;
  onToggleWorkflow: (id: string) => void;
}

export const AutomationEngine: React.FC<AutomationEngineProps> = ({
  workflows,
  darkMode,
  onToggleWorkflow
}) => {
  const [wfList, setWfList] = useState<AutomationWorkflow[]>(workflows);

  const toggleWf = (id: string) => {
    setWfList(wfList.map((w) => w.id === id ? { ...w, enabled: !w.enabled } : w));
    onToggleWorkflow(id);
  };

  return (
    <div className="space-y-6">
      <div className={`p-5 rounded-2xl border flex items-center justify-between gap-4 ${
        darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div>
          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">
            MODULAR WORKFLOWS
          </span>
          <h1 className="text-xl font-extrabold tracking-tight mt-1">Automation Engine & Trigger Rules</h1>
          <p className="text-xs text-slate-400">
            Configure automated content pipelines triggered by RSS feeds, YouTube uploads, webhooks, or cron schedules.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {wfList.map((wf) => (
          <div
            key={wf.id}
            className={`p-5 rounded-2xl border space-y-3 transition-all ${
              darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Workflow className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-slate-100">{wf.title}</h3>
              </div>
              <button
                onClick={() => toggleWf(wf.id)}
                className={`px-3 py-1 rounded-full text-xs font-mono font-bold cursor-pointer transition-all ${
                  wf.enabled ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {wf.enabled ? 'ACTIVE' : 'PAUSED'}
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1 font-mono">
              <div className="text-amber-400 font-bold">TRIGGER: {wf.trigger}</div>
              <div className="text-slate-400">
                ACTIONS:
                <ul className="list-disc list-inside space-y-0.5 text-slate-300 pt-1">
                  {wf.actions.map((act, i) => (
                    <li key={i}>{act}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-1">
              <span>Runs: {wf.runCount} times</span>
              <span>Last executed: {wf.lastRun || 'Never'}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
