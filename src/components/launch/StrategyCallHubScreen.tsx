import React, { useState } from 'react';
import { PhoneCall, FileText, CheckCircle2, Sparkles, Send, DollarSign, Clock } from 'lucide-react';
import { StrategyCallBrief, ProposalRecord } from '../../types/launchProgram';

interface StrategyCallHubScreenProps {
  briefs: StrategyCallBrief[];
  proposals: ProposalRecord[];
  onCreateProposal: (proposal: ProposalRecord) => void;
  onUpdateProposalStatus: (id: string, status: ProposalRecord['status']) => void;
  darkMode: boolean;
}

export const StrategyCallHubScreen: React.FC<StrategyCallHubScreenProps> = ({
  briefs,
  proposals,
  onCreateProposal,
  onUpdateProposalStatus,
  darkMode
}) => {
  const [selectedBrief, setSelectedBrief] = useState<StrategyCallBrief | null>(briefs[0] || null);
  const [generatingProp, setGeneratingProp] = useState(false);

  const handleGenerateProposal = async () => {
    if (!selectedBrief) return;
    setGeneratingProp(true);
    try {
      const res = await fetch('/api/launch-program/generate-proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prospectId: selectedBrief.prospectId,
          companyName: selectedBrief.companyName,
          clientName: selectedBrief.contactName
        })
      });
      const data = await res.json();
      if (data.success && data.proposal) {
        onCreateProposal(data.proposal);
      }
    } catch {
      // Fallback
    } finally {
      setGeneratingProp(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <PhoneCall className="w-5 h-5 text-indigo-400" />
            Strategy Calls & Closing Hub
          </h2>
          <p className="text-xs text-slate-400">
            Access call briefs, structured discovery script flows, post-call note capture, and 1-click automated proposal documents.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Strategy Call Briefs & Scripts */}
        <div className="lg:col-span-2 space-y-4">
          {selectedBrief && (
            <div className={`p-6 rounded-2xl border ${darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase text-indigo-400">
                    Call Brief & Discovery Script
                  </span>
                  <h3 className="text-lg font-bold mt-0.5">
                    {selectedBrief.contactName} ({selectedBrief.companyName})
                  </h3>
                </div>
                <button
                  onClick={handleGenerateProposal}
                  disabled={generatingProp}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 text-white transition-all shadow-md cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  {generatingProp ? 'Building Proposal...' : 'Generate Customized Proposal'}
                </button>
              </div>

              {/* Evidence Summary */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 mb-5 text-xs space-y-1 font-mono">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Discovered Prospect Evidence Points:</span>
                {selectedBrief.discoveredEvidenceSummary.map((ev, idx) => (
                  <div key={idx} className="text-slate-200 flex items-center gap-1.5">
                    <span className="text-indigo-400">•</span> {ev}
                  </div>
                ))}
              </div>

              {/* Discovery Flow Steps */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase font-mono text-slate-400">Structured Discovery Call Flow</h4>
                {selectedBrief.discoveryCallFlow.map((step) => (
                  <div key={step.step} className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2 text-xs">
                    <div className="flex items-center justify-between font-mono">
                      <span className="font-bold text-indigo-400">Step {step.step}: {step.phase}</span>
                    </div>
                    {step.scriptQuestions.map((q, idx) => (
                      <p key={idx} className="text-slate-300 italic font-sans leading-relaxed">
                        "{q}"
                      </p>
                    ))}
                  </div>
                ))}
              </div>

              {/* Post Call Summary */}
              {selectedBrief.postCallSummary && (
                <div className="mt-5 p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-xs font-mono space-y-2">
                  <h4 className="font-bold text-emerald-400 uppercase">Post-Call Discovery Summary Captured</h4>
                  <p className="text-slate-200">
                    <strong>Captured Pain:</strong> {selectedBrief.postCallSummary.capturedPain}
                  </p>
                  <div className="flex items-center gap-4 text-[11px]">
                    <span>Current Process Cost: <strong>${selectedBrief.postCallSummary.currentProcessCost.toLocaleString()}/mo</strong></span>
                    <span>Urgency: <strong className="text-amber-400">{selectedBrief.postCallSummary.urgencyLevel}</strong></span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Generated Proposals */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold uppercase font-mono text-indigo-400 flex items-center gap-2">
            <FileText className="w-4 h-4" /> Proposals & Closing Status ({proposals.length})
          </h3>

          <div className="space-y-4">
            {proposals.map((prop) => (
              <div
                key={prop.id}
                className={`p-5 rounded-xl border space-y-3 text-xs ${
                  prop.status === 'accepted'
                    ? 'border-emerald-500/50 bg-emerald-950/20'
                    : darkMode
                    ? 'bg-slate-900/60 border-slate-800'
                    : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase text-slate-400">{prop.companyName}</span>
                    <h4 className="font-bold text-sm text-slate-200">{prop.proposalTitle}</h4>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                    prop.status === 'accepted'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}>
                    {prop.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 font-mono text-[11px] bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                  <div>
                    <span className="text-slate-400 block text-[9px]">Setup Fee</span>
                    <span className="font-bold text-indigo-400">${prop.setupFee.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px]">Monthly Retainer</span>
                    <span className="font-bold text-emerald-400">${prop.monthlyRetainer.toLocaleString()}/mo</span>
                  </div>
                </div>

                {prop.status !== 'accepted' && (
                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={() => onUpdateProposalStatus(prop.id, 'accepted')}
                      className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-md shadow-emerald-950 cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Mark Client Deal Closed Won
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
