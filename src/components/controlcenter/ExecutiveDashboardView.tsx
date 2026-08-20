import React from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Users,
  Zap,
  Plug,
  ArrowRight,
  Clock,
  Sparkles,
  Building2,
  Cpu,
  RefreshCw
} from 'lucide-react';

interface ExecutiveDashboardViewProps {
  darkMode: boolean;
  dashboardData: any;
  loading: boolean;
  onNavigateTab: (tabId: string) => void;
  onApproveAction: (actionId: string, decision: 'APPROVE' | 'REJECT') => void;
  onRefresh: () => void;
}

export const ExecutiveDashboardView: React.FC<ExecutiveDashboardViewProps> = ({
  darkMode,
  dashboardData,
  loading,
  onNavigateTab,
  onApproveAction,
  onRefresh
}) => {
  if (loading && !dashboardData) {
    return (
      <div className="flex items-center justify-center p-12 text-sm text-slate-400">
        <RefreshCw className="w-5 h-5 animate-spin mr-2" />
        Loading Executive Dashboard...
      </div>
    );
  }

  const tenant = dashboardData?.tenant || {};
  const health = dashboardData?.health || {};
  const metrics = dashboardData?.metrics || {};
  const alerts = dashboardData?.alerts || [];
  const pendingApprovals = dashboardData?.pendingApprovals || [];
  const failedActions = dashboardData?.failedActions || [];
  const nextActions = dashboardData?.nextActions || [];
  const connectorSummary = dashboardData?.connectorSummary || {};
  const workerActivity = dashboardData?.workerActivity || [];

  return (
    <div className="space-y-6">
      {/* 1. Alerts Banner */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert: any) => (
            <div
              key={alert.id}
              className={`p-4 rounded-xl border flex items-center justify-between gap-4 transition ${
                alert.type === 'CRITICAL'
                  ? 'border-rose-500/40 bg-rose-950/40 text-rose-200'
                  : alert.type === 'WARNING'
                  ? 'border-amber-500/40 bg-amber-950/40 text-amber-200'
                  : 'border-indigo-500/40 bg-indigo-950/40 text-indigo-200'
              }`}
            >
              <div className="flex items-center gap-3">
                {alert.type === 'CRITICAL' ? (
                  <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
                ) : alert.type === 'WARNING' ? (
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                ) : (
                  <Sparkles className="w-5 h-5 text-indigo-400 shrink-0" />
                )}
                <div>
                  <div className="font-bold text-sm">{alert.title}</div>
                  <div className="text-xs opacity-90">{alert.message}</div>
                </div>
              </div>
              {alert.actionTab && (
                <button
                  onClick={() => onNavigateTab(alert.actionTab)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold border border-current hover:bg-white/10 transition shrink-0 cursor-pointer"
                >
                  Review
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 2. Top Level KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Business Health Score */}
        <div
          className={`p-4 rounded-xl border ${
            darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="text-xs text-slate-400 font-medium flex items-center justify-between">
            <span>Operating Health</span>
            {health.status === 'HEALTHY' ? (
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-rose-400" />
            )}
          </div>
          <div className="text-2xl font-bold mt-2 font-mono">{health.score || 95}/100</div>
          <div className="text-[10px] text-emerald-400 font-medium mt-1">
            {health.status || 'OPERATIONAL'}
          </div>
        </div>

        {/* Pipeline Value */}
        <div
          className={`p-4 rounded-xl border ${
            darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="text-xs text-slate-400 font-medium flex items-center justify-between">
            <span>Pipeline Value</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold mt-2 font-mono">
            ${(metrics.pipelineValue || 0).toLocaleString()}
          </div>
          <div className="text-[10px] text-emerald-400 font-medium mt-1">Verified Attribution</div>
        </div>

        {/* Pending Approvals */}
        <div
          className={`p-4 rounded-xl border ${
            darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="text-xs text-slate-400 font-medium flex items-center justify-between">
            <span>Pending Approvals</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold mt-2 font-mono">
            {metrics.pendingApprovalsCount || 0}
          </div>
          <div className="text-[10px] text-amber-400 font-medium mt-1">
            {metrics.pendingApprovalsCount > 0 ? 'Action Required' : 'All Clear'}
          </div>
        </div>

        {/* Active Workers */}
        <div
          className={`p-4 rounded-xl border ${
            darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="text-xs text-slate-400 font-medium flex items-center justify-between">
            <span>Active Workforce</span>
            <Users className="w-4 h-4 text-violet-400" />
          </div>
          <div className="text-2xl font-bold mt-2 font-mono">
            {metrics.activeWorkersCount || 0} Agents
          </div>
          <div className="text-[10px] text-emerald-400 font-medium mt-1">Tenant Isolated</div>
        </div>

        {/* Connectors */}
        <div
          className={`p-4 rounded-xl border ${
            darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="text-xs text-slate-400 font-medium flex items-center justify-between">
            <span>Connectors</span>
            <Plug className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold mt-2 font-mono">
            {connectorSummary.verified || 0} /{' '}
            {(connectorSummary.verified || 0) + (connectorSummary.unverified || 0)}
          </div>
          <div className="text-[10px] text-sky-400 font-medium mt-1">Probed & Verified</div>
        </div>

        {/* Active Leads */}
        <div
          className={`p-4 rounded-xl border ${
            darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="text-xs text-slate-400 font-medium flex items-center justify-between">
            <span>Active Leads</span>
            <Building2 className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold mt-2 font-mono">{metrics.activeLeads || 0}</div>
          <div className="text-[10px] text-indigo-400 font-medium mt-1">In Triage & Pipeline</div>
        </div>
      </div>

      {/* 3. Main Operational Sections: Pending Approvals & Recommended Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Pending Governance Approvals */}
        <div
          className={`lg:col-span-2 p-5 rounded-xl border ${
            darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-400" />
              <h2 className="text-sm font-bold">Governed Outbound Actions Awaiting Approval</h2>
            </div>
            <button
              onClick={() => onNavigateTab('actions')}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 cursor-pointer"
            >
              Action Center <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {pendingApprovals.length === 0 ? (
            <div className="p-8 text-center border border-dashed rounded-lg border-slate-800 text-xs text-slate-400">
              <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
              No actions currently pending operator sign-off. All automated actions are verified or in queue.
            </div>
          ) : (
            <div className="space-y-3">
              {pendingApprovals.slice(0, 4).map((action: any) => {
                let payload: any = {};
                try {
                  payload = JSON.parse(action.input_payload_json || '{}');
                } catch {
                  payload = {};
                }

                return (
                  <div
                    key={action.id}
                    className={`p-3.5 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      darkMode ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400">
                          {action.action_type}
                        </span>
                        <span className="text-xs text-slate-400">
                          by <strong className="text-slate-300">{action.actor_name}</strong> ({action.actor_role})
                        </span>
                      </div>
                      <p className="text-xs text-slate-300">
                        Target: {payload.targetEntity || payload.recipient || action.provider} —{' '}
                        {payload.rationale || payload.subject || 'Standard governed execution'}
                      </p>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Hash: {action.input_fingerprint?.substring(0, 18)}... | Idemp: {action.idempotency_key}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => onApproveAction(action.id, 'APPROVE')}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                      </button>
                      <button
                        onClick={() => onApproveAction(action.id, 'REJECT')}
                        className="px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer border border-rose-500/30"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right 1 Col: Recommended Next Actions */}
        <div
          className={`p-5 rounded-xl border space-y-4 ${
            darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h2 className="text-sm font-bold">Recommended Next Actions</h2>
          </div>

          {nextActions.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              System is optimal. No urgent interventions recommended.
            </div>
          ) : (
            <div className="space-y-3">
              {nextActions.map((rec: any) => (
                <div
                  key={rec.id}
                  onClick={() => onNavigateTab(rec.targetTab)}
                  className={`p-3 rounded-lg border transition cursor-pointer hover:border-indigo-500/50 ${
                    darkMode ? 'bg-slate-800/40 border-slate-700 hover:bg-slate-800' : 'bg-slate-50 border-slate-200 hover:bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200">{rec.title}</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                        rec.priority === 'HIGH'
                          ? 'bg-rose-500/20 text-rose-400'
                          : 'bg-indigo-500/20 text-indigo-400'
                      }`}
                    >
                      {rec.priority}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">{rec.description}</p>
                  <div className="flex items-center justify-end gap-1 text-[10px] text-indigo-400 font-semibold mt-2">
                    <span>Execute</span>
                    <ArrowRight className="w-3 h-3" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Quick Workforce Status */}
          <div className="border-t border-slate-800 pt-4">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-400 mb-2">
              <span>Autonomous Agents</span>
              <button
                onClick={() => onNavigateTab('workers')}
                className="text-indigo-400 hover:underline cursor-pointer"
              >
                Manage
              </button>
            </div>
            <div className="space-y-2">
              {workerActivity.slice(0, 3).map((w: any) => (
                <div key={w.id} className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 truncate max-w-[170px]">{w.name}</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                      w.isEnabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {w.isEnabled ? 'Active' : 'Disabled'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
