import React, { useState } from 'react';
import { Play, Sparkles, CheckCircle2, MessageSquare, Calculator, Volume2, ShieldCheck } from 'lucide-react';
import { DemoAsset } from '../../types/launchProgram';

interface DemoStudioScreenProps {
  demoAssets: DemoAsset[];
  onApproveDemo: (demoId: string) => void;
  darkMode: boolean;
}

export const DemoStudioScreen: React.FC<DemoStudioScreenProps> = ({
  demoAssets,
  onApproveDemo,
  darkMode
}) => {
  const [activeTab, setActiveTab] = useState<'script' | 'simulator' | 'roi'>('simulator');
  const [testLeadMsg, setTestLeadMsg] = useState('Hi, do you have any available cosmetic dental appointments this Friday?');
  const [simulatedReply, setSimulatedReply] = useState('');
  const [simulating, setSimulating] = useState(false);

  const activeDemo = demoAssets[0];

  const runSimulation = () => {
    setSimulating(true);
    setSimulatedReply('');
    setTimeout(() => {
      setSimulatedReply(`Hi! Thanks for reaching out to Apex Dental Group. Dr. Vance has two open consultation slots this Friday: 10:30 AM and 2:15 PM. Which time works best for you?`);
      setSimulating(false);
    }, 1000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Play className="w-5 h-5 text-indigo-400" />
            AI Demonstration Studio & Sales Collateral
          </h2>
          <p className="text-xs text-slate-400">
            Generate interactive live demos, scripts, and ROI calculators to present evidence of sub-30-second AI lead recovery on strategy calls.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-medium">
          <button
            onClick={() => setActiveTab('simulator')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${activeTab === 'simulator' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Live AI Simulator
          </button>
          <button
            onClick={() => setActiveTab('script')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${activeTab === 'script' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Talking Script
          </button>
          <button
            onClick={() => setActiveTab('roi')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${activeTab === 'roi' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            ROI Calculator
          </button>
        </div>
      </div>

      {activeDemo && (
        <div className={`p-6 rounded-2xl border ${darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-400">
                {activeDemo.solutionType.replace('_', ' ')}
              </span>
              <h3 className="text-lg font-bold mt-0.5">{activeDemo.title}</h3>
            </div>
            {activeDemo.approvalState === 'approved' ? (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Demo Approved
              </span>
            ) : (
              <button
                onClick={() => onApproveDemo(activeDemo.id)}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer"
              >
                Approve Demo Asset
              </button>
            )}
          </div>

          {/* Simulator View */}
          {activeTab === 'simulator' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase font-mono text-slate-400 flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-indigo-400" /> Test Inbound Patient Inquiry
                </h4>
                <div className="space-y-2 text-xs">
                  <label className="block text-slate-400">Inbound Lead Message (Simulated SMS / Web Form)</label>
                  <textarea
                    rows={3}
                    value={testLeadMsg}
                    onChange={e => setTestLeadMsg(e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:border-indigo-500 font-mono text-xs ${
                      darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                  <button
                    onClick={runSimulation}
                    disabled={simulating}
                    className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all cursor-pointer shadow-md shadow-indigo-950 flex items-center justify-center gap-2"
                  >
                    {simulating ? <Sparkles className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                    {simulating ? 'AI Processing Response (< 1 sec)...' : 'Test Sub-30-Second AI Response'}
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-3 font-mono text-xs">
                <h4 className="text-xs font-bold uppercase text-emerald-400 flex items-center gap-1.5">
                  <Volume2 className="w-4 h-4" /> Live AI Receptionist Preview
                </h4>
                {simulatedReply ? (
                  <div className="p-3 rounded-lg bg-indigo-950/40 border border-indigo-500/30 space-y-2">
                    <p className="text-indigo-200 leading-relaxed font-sans">{simulatedReply}</p>
                    <div className="pt-2 border-t border-indigo-500/20 text-[10px] text-emerald-400 flex items-center justify-between">
                      <span>✓ Latency: 0.8 seconds</span>
                      <span>✓ Action: OpenDental Calendar Slot Held</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 text-center text-slate-500 text-xs italic">
                    Click "Test Sub-30-Second AI Response" to preview live conversational AI response.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Script View */}
          {activeTab === 'script' && (
            <div className="space-y-4 text-xs font-mono">
              <h4 className="font-bold text-slate-400 uppercase">Interactive Call Script Flow</h4>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 whitespace-pre-wrap text-slate-300 leading-relaxed">
                {activeDemo.interactiveScript}
              </div>
            </div>
          )}

          {/* ROI Calculator View */}
          {activeTab === 'roi' && (
            <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
              <h4 className="text-xs font-bold uppercase font-mono text-emerald-400 flex items-center gap-1.5">
                <Calculator className="w-4 h-4" /> Interactive ROI Calculator Preset
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono text-center">
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Monthly Inbound Leads</span>
                  <span className="text-lg font-bold text-slate-200">{activeDemo.roiCalculatorPreset.leadsPerMonth}</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Avg Client Value</span>
                  <span className="text-lg font-bold text-emerald-400">${activeDemo.roiCalculatorPreset.avgClientValue}</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Conversion Boost</span>
                  <span className="text-lg font-bold text-sky-400">+{activeDemo.roiCalculatorPreset.estimatedConversionLiftPct}%</span>
                </div>
                <div className="p-3 rounded-lg bg-indigo-950 border border-indigo-500/40">
                  <span className="text-[10px] text-indigo-300 block">Projected Monthly Gain</span>
                  <span className="text-lg font-extrabold text-emerald-400">${activeDemo.roiCalculatorPreset.projectedMonthlyGain.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
