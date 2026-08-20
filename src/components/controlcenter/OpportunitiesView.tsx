import React, { useState } from 'react';
import {
  TrendingUp,
  Target,
  Sparkles,
  Zap,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Building2,
  Mail,
  Phone,
  Calendar,
  Layers,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';

interface OpportunitiesViewProps {
  darkMode: boolean;
  tenantId: string;
  growthData: any;
  loading: boolean;
  onRefresh: () => void;
  onNavigateTab: (tabId: string) => void;
}

export const OpportunitiesView: React.FC<OpportunitiesViewProps> = ({
  darkMode,
  tenantId,
  growthData,
  loading,
  onRefresh,
  onNavigateTab
}) => {
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ id: string; message: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'opportunities' | 'leads' | 'attributions'>('opportunities');

  const authHeaders = {
    Authorization: 'Bearer demo-session',
    'Content-Type': 'application/json'
  };

  const opportunities = growthData?.opportunities || [];
  const leads = growthData?.leads || [];
  const attributions = growthData?.attributions || [];

  const handleConvertAction = async (opp: any) => {
    setConvertingId(opp.id);
    setFeedback(null);

    try {
      const res = await fetch(`/api/control-center/opportunities/${opp.id}/convert-action`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          actionType: 'COMMUNICATION_OUTBOUND_EMAIL',
          customPayload: {
            opportunityTitle: opp.title || opp.opportunity_title,
            recipient: opp.lead_email || opp.customer_email || 'client@example.com',
            suggestedAction: 'Outreach to schedule verified project consultation'
          }
        })
      });

      if (res.ok) {
        const d = await res.json();
        setFeedback({
          id: opp.id,
          message: `Converted to governed action (${d.actionId?.substring(0, 12)}...). Awaiting operator sign-off.`
        });
        onRefresh();
      } else {
        const err = await res.json();
        setFeedback({
          id: opp.id,
          message: `Error: ${err.error || 'Failed to convert'}`
        });
      }
    } catch (err: any) {
      setFeedback({
        id: opp.id,
        message: `Error: ${err?.message || 'Network error'}`
      });
    } finally {
      setConvertingId(null);
    }
  };

  const totalPipeline = opportunities.reduce(
    (acc: number, o: any) => acc + (o.estimated_value || o.predicted_value || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* 1. Header with Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          className={`p-4 rounded-xl border ${
            darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="text-xs text-slate-400 font-semibold flex items-center justify-between">
            <span>Total Discovered Pipeline</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-2">
            ${totalPipeline.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Across {opportunities.length} active opportunities</div>
        </div>

        <div
          className={`p-4 rounded-xl border ${
            darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="text-xs text-slate-400 font-semibold flex items-center justify-between">
            <span>Inbound Leads in Pipeline</span>
            <Target className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-200 mt-2">{leads.length}</div>
          <div className="text-[10px] text-indigo-400 mt-1">Qualified & Triage Scored</div>
        </div>

        <div
          className={`p-4 rounded-xl border ${
            darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="text-xs text-slate-400 font-semibold flex items-center justify-between">
            <span>Attribution Signals</span>
            <Layers className="w-4 h-4 text-violet-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-violet-400 mt-2">{attributions.length}</div>
          <div className="text-[10px] text-slate-400 mt-1">Defensible ROI & channel mapping</div>
        </div>
      </div>

      {/* 2. Sub-tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('opportunities')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
            activeTab === 'opportunities'
              ? 'bg-indigo-600 text-white'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          Discovered Opportunities ({opportunities.length})
        </button>

        <button
          onClick={() => setActiveTab('leads')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
            activeTab === 'leads'
              ? 'bg-indigo-600 text-white'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          Inbound Leads & Qualification ({leads.length})
        </button>

        <button
          onClick={() => setActiveTab('attributions')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
            activeTab === 'attributions'
              ? 'bg-indigo-600 text-white'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          Explainable Attributions ({attributions.length})
        </button>
      </div>

      {/* 3. Tab Content */}
      {activeTab === 'opportunities' && (
        <div className="space-y-4">
          {opportunities.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400 border border-dashed rounded-xl border-slate-800">
              No growth opportunities identified in current tenant scope.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {opportunities.map((opp: any) => (
                <div
                  key={opp.id}
                  className={`p-5 rounded-xl border flex flex-col justify-between gap-3 ${
                    darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-bold text-sm text-slate-200">
                        {opp.title || opp.opportunity_title || 'Identified Opportunity'}
                      </div>
                      <span className="font-mono text-sm font-bold text-emerald-400 shrink-0">
                        ${(opp.estimated_value || opp.predicted_value || 0).toLocaleString()}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400">{opp.description || opp.rationale || 'High-probability lead reactivation identified from CRM signal analysis.'}</p>

                    <div className="flex flex-wrap items-center gap-2 text-[10px]">
                      <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono">
                        Type: {opp.opportunity_type || 'UPGRADE / EXPANSION'}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                        Status: {opp.status || 'open'}
                      </span>
                      {opp.confidence_score && (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                          Confidence: {Math.round(opp.confidence_score * 100)}%
                        </span>
                      )}
                    </div>
                  </div>

                  {feedback && feedback.id === opp.id && (
                    <div className="p-2 rounded bg-indigo-950/40 border border-indigo-500/30 text-[11px] text-indigo-300 font-medium">
                      {feedback.message}
                    </div>
                  )}

                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">
                      Target: {opp.lead_email || opp.customer_email || 'Verified Inbound Contact'}
                    </span>

                    <button
                      onClick={() => handleConvertAction(opp)}
                      disabled={convertingId === opp.id || opp.status === 'in_progress'}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-900/20"
                    >
                      {convertingId === opp.id ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Zap className="w-3.5 h-3.5" />
                      )}
                      <span>{opp.status === 'in_progress' ? 'Action Queued' : 'Convert into Action'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'leads' && (
        <div
          className={`rounded-xl border overflow-hidden ${
            darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          {leads.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">No leads recorded.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-950/40">
                    <th className="p-3">Lead Contact</th>
                    <th className="p-3">Service Interest</th>
                    <th className="p-3">Source Channel</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {leads.map((l: any) => (
                    <tr key={l.id} className="hover:bg-slate-800/30 transition">
                      <td className="p-3">
                        <div className="font-bold text-slate-200">{l.name || l.email}</div>
                        <div className="text-[10px] text-slate-400">{l.phone || l.email}</div>
                      </td>
                      <td className="p-3 text-slate-300">{l.service_requested || l.notes || 'General Inquiry'}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300">
                          {l.source || 'Website Form'}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-400">
                          {l.status || 'NEW'}
                        </span>
                      </td>
                      <td className="p-3 text-slate-400 font-mono text-[10px]">
                        {new Date(l.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'attributions' && (
        <div
          className={`rounded-xl border overflow-hidden ${
            darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          {attributions.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">No attribution records recorded.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-950/40">
                    <th className="p-3">Touchpoint Channel</th>
                    <th className="p-3">Event Type</th>
                    <th className="p-3">Attributed Value</th>
                    <th className="p-3">Evidence Hash</th>
                    <th className="p-3">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {attributions.map((a: any) => (
                    <tr key={a.id} className="hover:bg-slate-800/30 transition">
                      <td className="p-3 font-bold text-slate-200">{a.channel || 'DIRECT_ORGANIC'}</td>
                      <td className="p-3 text-slate-300">{a.event_type || 'FORM_SUBMIT'}</td>
                      <td className="p-3 font-mono text-emerald-400 font-bold">${a.attributed_value || 0}</td>
                      <td className="p-3 font-mono text-[10px] text-slate-400">{a.evidence_hash?.substring(0, 16)}...</td>
                      <td className="p-3 text-slate-400 text-[10px] font-mono">
                        {new Date(a.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
