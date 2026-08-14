import React from 'react';
import { BarChart3, TrendingUp, Sparkles, CheckCircle2, Award, ArrowUpRight, DollarSign, Repeat } from 'lucide-react';
import { ClientResultMetrics } from '../../types/launchProgram';

interface ResultsProofScreenProps {
  metrics: ClientResultMetrics[];
  darkMode: boolean;
}

export const ResultsProofScreen: React.FC<ResultsProofScreenProps> = ({
  metrics,
  darkMode
}) => {
  const result = metrics[0];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-indigo-400" />
          Results, Proof & Client Expansion Engine
        </h2>
        <p className="text-xs text-slate-400">
          Compare baseline metrics against actual attributed performance, prove ROI, generate case studies, and unlock 30-day expansion & referral opportunities.
        </p>
      </div>

      {result && (
        <div className="space-y-6">
          {/* ROI Metric Highlight Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className={`p-4 rounded-xl border ${darkMode ? 'bg-emerald-950/20 border-emerald-500/30' : 'bg-emerald-50 border-emerald-200'}`}>
              <span className="text-[10px] font-mono font-bold uppercase text-emerald-400">Attributed Monthly Revenue</span>
              <div className="text-2xl font-extrabold text-emerald-400 font-mono mt-1">
                ${result.actualResultsCurrent.attributedMonthlyRevenue.toLocaleString()}
              </div>
              <span className="text-[10px] text-slate-400 font-mono block mt-0.5">+133% vs Baseline</span>
            </div>

            <div className={`p-4 rounded-xl border ${darkMode ? 'bg-indigo-950/20 border-indigo-500/30' : 'bg-indigo-50 border-indigo-200'}`}>
              <span className="text-[10px] font-mono font-bold uppercase text-indigo-400">Leads Recovered</span>
              <div className="text-2xl font-extrabold text-indigo-400 font-mono mt-1">
                {result.actualResultsCurrent.leadsRecoveredTotal} Leads
              </div>
              <span className="text-[10px] text-slate-400 font-mono block mt-0.5">Sub-20s Response Time</span>
            </div>

            <div className={`p-4 rounded-xl border ${darkMode ? 'bg-sky-950/20 border-sky-500/30' : 'bg-sky-50 border-sky-200'}`}>
              <span className="text-[10px] font-mono font-bold uppercase text-sky-400">Projected vs Actual Lift</span>
              <div className="text-2xl font-extrabold text-sky-400 font-mono mt-1">
                +{result.projectedVsActualValue.variancePercentage}%
              </div>
              <span className="text-[10px] text-slate-400 font-mono block mt-0.5">Outperformed Prediction</span>
            </div>

            <div className={`p-4 rounded-xl border ${darkMode ? 'bg-purple-950/20 border-purple-500/30' : 'bg-purple-50 border-purple-200'}`}>
              <span className="text-[10px] font-mono font-bold uppercase text-purple-400">Hours Saved / Month</span>
              <div className="text-2xl font-extrabold text-purple-400 font-mono mt-1">
                {result.actualResultsCurrent.hoursSavedMonthly} Hours
              </div>
              <span className="text-[10px] text-slate-400 font-mono block mt-0.5">Staff Labor Reclaimed</span>
            </div>
          </div>

          {/* Baseline vs Actual Detailed Table */}
          <div className={`p-5 rounded-xl border space-y-3 ${darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
            <h3 className="text-sm font-bold uppercase font-mono text-indigo-400 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4" /> Baseline vs Actual Performance Verification
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
              <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-slate-400 text-[10px] block">Avg Lead Response Time</span>
                <div className="flex items-center justify-between">
                  <span className="text-rose-400 line-through">{result.baselineMetrics.avgResponseTimeMinutes} mins</span>
                  <span className="text-emerald-400 font-bold text-sm">{result.actualResultsCurrent.avgResponseTimeSeconds} seconds</span>
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-slate-400 text-[10px] block">Monthly Booked Appointments</span>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">{result.baselineMetrics.appointmentsBookedMonthly} / mo</span>
                  <span className="text-emerald-400 font-bold text-sm">{result.actualResultsCurrent.appointmentsBookedMonthly} / mo</span>
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-slate-400 text-[10px] block">Monthly Attributed Revenue</span>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">${result.baselineMetrics.monthlyRevenue.toLocaleString()}</span>
                  <span className="text-emerald-400 font-bold text-sm">${result.actualResultsCurrent.attributedMonthlyRevenue.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Generated Case Study Asset */}
          <div className={`p-6 rounded-2xl border space-y-4 ${darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-400" />
                Verified Client Case Study & Proof Asset
              </h3>
              <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Client Sign-Off Approved
              </span>
            </div>

            <h4 className="text-lg font-bold text-slate-100">{result.caseStudyDraft.headline}</h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-amber-400 font-bold uppercase text-[10px] block">Client Challenge</span>
                <p className="text-slate-300 font-sans leading-relaxed">{result.caseStudyDraft.challenge}</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-emerald-400 font-bold uppercase text-[10px] block">Verified Solution & Results</span>
                <p className="text-slate-300 font-sans leading-relaxed">{result.caseStudyDraft.verifiedResults}</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-500/30 text-xs italic font-mono text-indigo-200">
              {result.caseStudyDraft.testimonialQuote}
            </div>
          </div>

          {/* Retention & 30-Day Expansion Plan */}
          <div className={`p-5 rounded-xl border space-y-3 ${darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
            <h3 className="text-sm font-bold uppercase font-mono text-purple-400 flex items-center gap-1.5">
              <Repeat className="w-4 h-4" /> Recommended 30-Day Expansion & Retention Plan
            </h3>
            <p className="text-xs text-slate-300 font-mono">
              <strong>Upsell Opportunity:</strong> {result.retentionExpansionOpportunity.upsellRecommendation}
            </p>
            <div className="space-y-1 text-xs font-mono text-slate-300">
              {result.retentionExpansionOpportunity.next30DayOptimizationPlan.map((step, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">✓ Step {idx + 1}:</span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
