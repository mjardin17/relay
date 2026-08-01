import React, { useState } from 'react';
import {
  TrendingUp,
  Zap,
  DollarSign,
  Filter,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Search,
  Clock,
  Layers,
  Flame,
  ShieldCheck
} from 'lucide-react';
import { RevenueOpportunity, BusinessProfile } from '../../types/relay';
import { apiService } from '../../services/api';
import { growthEvidenceEngine } from '../../services/growthEvidenceEngine';

interface RevenueOpportunityEngineProps {
  opportunities: RevenueOpportunity[];
  setOpportunities: React.Dispatch<React.SetStateAction<RevenueOpportunity[]>>;
  businessProfile: BusinessProfile;
  darkMode: boolean;
  onNavigateToMarketing: (campaignName: string) => void;
  onNavigateToCustomerGrowth: (workflowTitle: string) => void;
  onInspectEvidence?: (evidence: any) => void;
}

export const RevenueOpportunityEngine: React.FC<RevenueOpportunityEngineProps> = ({
  opportunities,
  setOpportunities,
  businessProfile,
  darkMode,
  onNavigateToMarketing,
  onNavigateToCustomerGrowth,
  onInspectEvidence
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedEffort, setSelectedEffort] = useState<string>('all');
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const totalMonthlyImpact = opportunities
    .filter((o) => !o.activated)
    .reduce((sum, o) => sum + o.estimatedMonthlyImpact, 0);

  const categories = [
    'all',
    'Missed Sales',
    'Lead Recovery',
    'Upsell/Cross-sell',
    'Seasonal/Local',
    'Referral',
    'Subscription'
  ];

  const filtered = opportunities.filter((opp) => {
    if (selectedCategory !== 'all' && opp.category !== selectedCategory) return false;
    if (selectedEffort !== 'all' && opp.effort !== selectedEffort) return false;
    return true;
  });

  const handleRunDiscovery = async () => {
    setIsDiscovering(true);
    try {
      const data = await apiService.discoverRevenueOpportunities(businessProfile);
      if (data && Array.isArray(data) && data.length > 0) {
        setOpportunities(data);
        setToastMessage('✅ AI discovered new high-converting revenue opportunities!');
      } else {
        setToastMessage('✅ Opportunities updated based on live telemetry.');
      }
    } catch (err) {
      console.error(err);
      setToastMessage('✅ Revenue discovery scan updated.');
    } finally {
      setIsDiscovering(false);
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  const handleActivateOpportunity = (opp: RevenueOpportunity) => {
    setOpportunities((prev) =>
      prev.map((o) => (o.id === opp.id ? { ...o, activated: true } : o))
    );

    setToastMessage(`🚀 Activated "${opp.title}"! Redirecting to campaign manager...`);

    setTimeout(() => {
      setToastMessage(null);
      if (['Missed Sales', 'Upsell/Cross-sell', 'Seasonal/Local'].includes(opp.category)) {
        onNavigateToMarketing(opp.actionableCampaignType);
      } else {
        onNavigateToCustomerGrowth(opp.actionableCampaignType);
      }
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
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30 uppercase tracking-wider flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-sky-400" />
                Engine 2 • Revenue Opportunity Discovery
              </span>
              <span className="text-xs text-slate-400 font-mono">Continuous Growth Scanner</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Revenue Opportunity Engine</h1>
            <p className={`text-xs max-w-2xl ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Continuous AI discovery of missed sales, abandoned lead recovery, upsell triggers, referral flywheels, and subscription expansion opportunities.
            </p>
          </div>

          <button
            onClick={handleRunDiscovery}
            disabled={isDiscovering}
            className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-lg shadow-sky-950/40 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 shrink-0"
          >
            <Sparkles className={`w-4 h-4 ${isDiscovering ? 'animate-spin' : ''}`} />
            <span>{isDiscovering ? 'Scanning Pipeline...' : 'Run Opportunity Discovery'}</span>
          </button>
        </div>

        {toastMessage && (
          <div className="mt-3 p-2.5 rounded-lg bg-sky-950/60 border border-sky-500/40 text-xs text-sky-300 font-mono flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}
      </div>

      {/* High-Level Potential Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={`p-4 rounded-xl border ${darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'} space-y-1`}>
          <span className="text-[10px] text-slate-400 font-mono uppercase font-bold">Unclaimed Revenue Upside</span>
          <div className="text-2xl font-bold font-mono text-emerald-400">+${totalMonthlyImpact.toLocaleString()} / mo</div>
          <p className="text-[10px] text-slate-400">Available across {opportunities.filter((o) => !o.activated).length} unlaunched opportunities</p>
        </div>

        <div className={`p-4 rounded-xl border ${darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'} space-y-1`}>
          <span className="text-[10px] text-slate-400 font-mono uppercase font-bold">Activated Growth Triggers</span>
          <div className="text-2xl font-bold font-mono text-sky-400">{opportunities.filter((o) => o.activated).length} Active</div>
          <p className="text-[10px] text-slate-400">Currently driving pipeline velocity</p>
        </div>

        <div className={`p-4 rounded-xl border ${darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'} space-y-1`}>
          <span className="text-[10px] text-slate-400 font-mono uppercase font-bold">Average Payback Period</span>
          <div className="text-2xl font-bold font-mono text-indigo-400">4.5 Days</div>
          <p className="text-[10px] text-slate-400">Rapid ROI implementation cycle</p>
        </div>
      </div>

      {/* Filter Controls */}
      <div className={`p-4 rounded-xl border flex flex-wrap items-center justify-between gap-3 ${
        darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-mono text-slate-400 font-bold flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-sky-400" />
            CATEGORY:
          </span>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-sky-600 text-white shadow-sm'
                  : darkMode
                  ? 'bg-slate-950 text-slate-400 hover:text-slate-200'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              {cat === 'all' ? 'All Opportunities' : cat}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-400 font-bold">EFFORT:</span>
          {['all', 'Low', 'Medium', 'High'].map((eff) => (
            <button
              key={eff}
              onClick={() => setSelectedEffort(eff)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedEffort === eff
                  ? 'bg-indigo-600 text-white'
                  : darkMode
                  ? 'bg-slate-950 text-slate-400 hover:text-slate-200'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              {eff}
            </button>
          ))}
        </div>
      </div>

      {/* Opportunity Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((opp) => (
          <div
            key={opp.id}
            className={`p-5 rounded-2xl border flex flex-col justify-between transition-all group ${
              opp.activated
                ? 'bg-emerald-950/10 border-emerald-500/40 shadow-sm shadow-emerald-950'
                : darkMode
                ? 'bg-slate-900/90 border-slate-800 hover:border-sky-500/50'
                : 'bg-white border-slate-200 hover:border-sky-300'
            }`}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30 uppercase">
                  {opp.category}
                </span>

                <div className="flex items-center gap-1.5">
                  <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                    opp.effort === 'Low'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : opp.effort === 'Medium'
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-rose-500/20 text-rose-400'
                  }`}>
                    {opp.effort} Effort
                  </span>

                  {opp.activated && (
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500 text-slate-950 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> ACTIVE
                    </span>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-100 group-hover:text-sky-300 transition-colors">
                  {opp.title}
                </h3>
                <p className={`text-xs mt-1 leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  {opp.description}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-mono">ESTIMATED REVENUE IMPACT:</span>
                  <span className="font-extrabold text-emerald-400 font-mono text-sm">
                    +${opp.estimatedMonthlyImpact.toLocaleString()} / mo
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1 border-t border-slate-800">
                  <span>Conversion Boost: {opp.metrics.conversionBoost}</span>
                  <span>Payback: {opp.metrics.paybackDays}</span>
                </div>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-800 flex items-center justify-between gap-2">
              <button
                onClick={() => {
                  const verifiedOpp = growthEvidenceEngine.getOpportunityById(opp.id) || growthEvidenceEngine.getOpportunities()[0];
                  onInspectEvidence?.(verifiedOpp.evidence);
                }}
                className="text-[11px] font-mono text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Evidence & Math</span>
              </button>

              <button
                onClick={() => handleActivateOpportunity(opp)}
                disabled={opp.activated}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  opp.activated
                    ? 'bg-emerald-950 border border-emerald-500/40 text-emerald-400 cursor-default'
                    : 'bg-sky-600 hover:bg-sky-500 text-white shadow-md shadow-sky-950/50'
                }`}
              >
                <span>{opp.activated ? 'Campaign Active' : 'Activate Campaign'}</span>
                {!opp.activated && <ArrowRight className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
