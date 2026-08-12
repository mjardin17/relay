import React, { useState } from 'react';
import { Cpu, CheckCircle2, RotateCcw, AlertTriangle } from 'lucide-react';
import { SolutionDeploymentBlueprint } from '../../types/launchProgram';

interface SolutionDeploymentScreenProps {
  blueprints: SolutionDeploymentBlueprint[];
  onDeployLive: (id: string) => void;
  onRollback: (id: string) => void;
  darkMode: boolean;
}

export const SolutionDeploymentScreen: React.FC<SolutionDeploymentScreenProps> = ({
  blueprints,
  onDeployLive,
  onRollback,
  darkMode
}) => {
  const [testing, setTesting] = useState(false);
  const [testLog, setTestLog] = useState<string | null>(null);

  const blueprint = blueprints[0];

  const runVerificationTests = () => {
    setTesting(true);
    setTestLog('Executing Synthetic Test Suite (Simulation Mode):\n[1/2] Simulated After-Hours Missed Call -> PASS (0.8s response time)\n[2/2] OpenDental Calendar Slot Conflict Resolution -> PASS (Offered alternate slot)\nAll 2 test cases PASSED in sandbox memory.');
    setTimeout(() => {
      setTesting(false);
    }, 1000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Cpu className="w-5 h-5 text-indigo-400" />
              Solution Deployment Engine & Verification Ledger
            </h2>
            <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              SIMULATION MODE
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Deploy solution blueprints (AI Receptionist, Missed-Call Lead Recovery) in sandbox mode with test suites and simulated rollback triggers.
          </p>
        </div>
      </div>

      <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-start gap-3 text-xs text-slate-300 font-mono">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-amber-400 block">SIMULATED CONNECTOR NOTICE:</span>
          SIP trunk tests, phone line provisions, and system rollbacks executed in this dashboard update local application state. External provider webhooks require live API configuration.
        </div>
      </div>

      {blueprint && (
        <div className="space-y-6">
          {/* Main Blueprint Card */}
          <div className={`p-6 rounded-2xl border space-y-5 ${
            blueprint.status === 'deployed_live'
              ? 'border-emerald-500/50 bg-emerald-950/20 shadow-lg shadow-emerald-950/30'
              : darkMode
              ? 'bg-slate-900/60 border-slate-800'
              : 'bg-white border-slate-200'
          }`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-400">
                  Client: {blueprint.clientCompanyName}
                </span>
                <h3 className="text-xl font-bold mt-0.5">{blueprint.blueprintName}</h3>
              </div>

              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-xs font-mono font-bold uppercase ${
                  blueprint.status === 'deployed_live'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                }`}>
                  Status: {blueprint.status.replace('_', ' ')} (Simulated)
                </span>

                {blueprint.status === 'deployed_live' ? (
                  <button
                    onClick={() => onRollback(blueprint.id)}
                    className="px-4 py-2 rounded-lg text-xs font-bold bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 cursor-pointer flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-4 h-4" /> Trigger Simulated Rollback
                  </button>
                ) : (
                  <button
                    onClick={() => onDeployLive(blueprint.id)}
                    className="px-5 py-2.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-md shadow-emerald-950 cursor-pointer flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Deploy to Simulated Live Env
                  </button>
                )}
              </div>
            </div>

            {/* Blueprint Rules Matrix */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="text-indigo-400 font-bold uppercase text-[10px] block">Trigger Event & Inputs</span>
                <p className="text-slate-200"><strong>Trigger:</strong> {blueprint.triggerEvent}</p>
                <p className="text-slate-400"><strong>Required Inputs:</strong> {blueprint.requiredInputs.join(', ')}</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="text-emerald-400 font-bold uppercase text-[10px] block">Business Rules & Compliance</span>
                <ul className="space-y-1 text-slate-300">
                  {blueprint.businessRules.map((rule, idx) => (
                    <li key={idx}>• {rule}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* AI System Prompt Instructions */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 text-xs font-mono space-y-1">
              <span className="text-purple-400 font-bold uppercase text-[10px] block">AI System Instructions</span>
              <p className="text-slate-300 leading-relaxed font-sans italic">
                "{blueprint.aiPromptInstructions}"
              </p>
            </div>

            {/* Test Cases Suite */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between">
                <span className="text-amber-400 font-bold uppercase text-[10px]">Synthetic Verification Test Suite</span>
                <button
                  onClick={runVerificationTests}
                  disabled={testing}
                  className="px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold cursor-pointer disabled:opacity-50"
                >
                  {testing ? 'Running Synthetic Suite...' : 'Run Synthetic Test Suite'}
                </button>
              </div>

              <div className="space-y-2">
                {blueprint.testCases.map((tc, idx) => (
                  <div key={idx} className="p-2.5 rounded bg-slate-900 border border-slate-800 flex items-center justify-between text-[11px]">
                    <div>
                      <span className="text-slate-200 font-bold block">{tc.testName}</span>
                      <span className="text-slate-400 text-[10px]">{tc.expectedOutcome}</span>
                    </div>
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Passed (Simulated)
                    </span>
                  </div>
                ))}
              </div>

              {testLog && (
                <div className="p-3 rounded bg-slate-900/80 border border-slate-800 text-[10px] text-emerald-300 whitespace-pre-wrap">
                  {testLog}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
