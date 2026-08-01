import React from 'react';
import { BrainCircuit, CheckCircle2, AlertCircle, ArrowUpRight, TrendingUp, Sparkles, RefreshCw } from 'lucide-react';
import { growthEvidenceEngine } from '../../services/growthEvidenceEngine';

interface RecommendationHistoryProps {
  darkMode: boolean;
}

export const RecommendationHistory: React.FC<RecommendationHistoryProps> = ({ darkMode }) => {
  const evaluations = growthEvidenceEngine.getRecommendationEvaluations();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20 uppercase tracking-wider">
            Closed-Loop AI Learning & Prediction Calibration
          </span>
        </div>
        <h1 className="text-2xl font-bold text-slate-100 mt-1">Recommendation History & AI Accuracy</h1>
        <p className="text-xs text-slate-400">
          Relay continuously evaluates its own predictions against real-world execution to calibrate future conversion and financial estimates.
        </p>
      </div>

      {/* Accuracy Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {evaluations.map((ev) => (
          <div key={ev.id} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono text-purple-400 font-semibold uppercase">
                  Opportunity Evaluated
                </span>
                <h3 className="text-sm font-bold text-slate-100">{ev.opportunityTitle}</h3>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-mono border border-emerald-500/20 font-bold">
                {ev.accuracyScore}% Accuracy
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs font-mono">
              <div>
                <span className="text-slate-500 text-[10px] block">Predicted Value</span>
                <span className="text-purple-400 font-bold">${ev.predictedValue.toLocaleString()} / mo</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block">Realized Value</span>
                <span className="text-emerald-400 font-bold">${ev.realizedValue.toLocaleString()} / mo</span>
              </div>
            </div>

            <div className="space-y-1 text-xs text-slate-300">
              <span className="text-slate-400 font-semibold text-[11px]">Evaluation Feedback:</span>
              <p className="text-slate-300 bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/60 font-sans">{ev.feedbackNotes}</p>
            </div>

            <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/30 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-300">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                AI Learning Adjustment Applied:
              </div>
              <p className="text-[11px] text-purple-200/90 font-mono pl-5">• {ev.learningAdjustmentApplied}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
