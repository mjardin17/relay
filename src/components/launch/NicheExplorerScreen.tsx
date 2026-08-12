import React, { useState } from 'react';
import { Target, CheckCircle2, Sparkles, ShieldAlert, Award, ArrowUpRight, BarChart3, RefreshCw } from 'lucide-react';
import { NicheCandidate } from '../../types/launchProgram';

interface NicheExplorerScreenProps {
  niches: NicheCandidate[];
  onSelectNiche: (nicheId: string) => void;
  onRecommendAI: () => Promise<void>;
  darkMode: boolean;
}

export const NicheExplorerScreen: React.FC<NicheExplorerScreenProps> = ({
  niches,
  onSelectNiche,
  onRecommendAI,
  darkMode
}) => {
  const [loadingAI, setLoadingAI] = useState(false);

  const handleAI = async () => {
    setLoadingAI(true);
    await onRecommendAI();
    setLoadingAI(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Target className="w-5 h-5 text-indigo-400" />
            Niche Opportunity Evaluator & Explorer
          </h2>
          <p className="text-xs text-slate-400">
            Compare target industries on 8 quantitative factors: pain severity, ability to pay, ease of access, urgency, automation potential, and expected ROI.
          </p>
        </div>
        <button
          onClick={handleAI}
          disabled={loadingAI}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:opacity-90 transition-all shadow-md cursor-pointer disabled:opacity-50"
        >
          {loadingAI ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {loadingAI ? 'Evaluating Market...' : 'Run AI Niche Discovery'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {niches.map((niche) => {
          const isSelected = niche.selectedByOwner;
          return (
            <div
              key={niche.id}
              className={`p-5 rounded-xl border flex flex-col justify-between transition-all relative ${
                isSelected
                  ? 'border-indigo-500/60 bg-gradient-to-b from-indigo-950/40 to-slate-900/80 shadow-lg shadow-indigo-950/30 ring-1 ring-indigo-500/40'
                  : darkMode
                  ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-400">
                      {niche.industryCategory}
                    </span>
                    <h3 className="text-base font-bold mt-0.5 leading-snug">{niche.name}</h3>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xl font-extrabold text-emerald-400 font-mono">
                      {niche.overallScore}
                    </span>
                    <span className="text-[10px] text-slate-400 block font-mono">/ 100 Score</span>
                  </div>
                </div>

                {niche.recommended && (
                  <div className="mb-3 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[11px] font-semibold">
                    <Award className="w-3.5 h-3.5 text-indigo-400" />
                    Recommended Primary Niche
                  </div>
                )}

                <p className="text-xs text-slate-300 mb-4 leading-relaxed">
                  {niche.evidenceSummary}
                </p>

                {/* Quantitative Factor Matrix */}
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono mb-4 bg-slate-950/50 p-3 rounded-lg border border-slate-800/80">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Pain Severity:</span>
                    <span className="font-bold text-amber-400">{niche.painSeverityScore}/10</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Ability to Pay:</span>
                    <span className="font-bold text-emerald-400">{niche.abilityToPayScore}/10</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Ease of Access:</span>
                    <span className="font-bold text-sky-400">{niche.easeOfAccessScore}/10</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Automation Potential:</span>
                    <span className="font-bold text-purple-400">{niche.automationPotentialScore}/10</span>
                  </div>
                  <div className="flex justify-between col-span-2 pt-1 border-t border-slate-800">
                    <span className="text-slate-400">Avg Monthly ROI / Client:</span>
                    <span className="font-bold text-emerald-400">${niche.estimatedMonthlyRoiPerClient.toLocaleString()}/mo</span>
                  </div>
                </div>

                {/* Key Pain Points */}
                <div className="space-y-1.5 mb-5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Observed Pain Symptoms:
                  </span>
                  {niche.keyPainPoints.map((pt, idx) => (
                    <div key={idx} className="flex items-start gap-1.5 text-xs text-slate-300">
                      <span className="text-indigo-400 font-bold">•</span>
                      <span>{pt}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                {isSelected ? (
                  <div className="w-full py-2 px-3 rounded-lg bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-xs font-bold text-center flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                    Selected & Active Niche
                  </div>
                ) : (
                  <button
                    onClick={() => onSelectNiche(niche.id)}
                    className="w-full py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all shadow-md shadow-indigo-950 cursor-pointer flex items-center justify-center gap-1"
                  >
                    Select Niche
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
