import React, { useState, useEffect } from 'react';
import {
  Users,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  ToggleLeft,
  ToggleRight,
  Zap,
  Lock,
  Clock,
  RefreshCw,
  Activity,
  AlertTriangle
} from 'lucide-react';

interface WorkersViewProps {
  darkMode: boolean;
  tenantId: string;
}

export const WorkersView: React.FC<WorkersViewProps> = ({ darkMode, tenantId }) => {
  const [workers, setWorkers] = useState<any[]>([]);
  const [recentActions, setRecentActions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const authHeaders = {
    Authorization: 'Bearer demo-session',
    'Content-Type': 'application/json'
  };

  const fetchWorkers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/control-center/workers', { headers: authHeaders });
      if (res.ok) {
        const d = await res.json();
        setWorkers(d.workers || []);
        setRecentActions(d.recentActionHistory || []);
      }
    } catch (err) {
      console.error('Failed to load workers', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkers();
  }, [tenantId]);

  const handleToggleWorker = async (worker: any) => {
    setTogglingId(worker.id);
    const targetState = !worker.isEnabled;

    try {
      const res = await fetch(`/api/control-center/workers/${worker.id}/toggle`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ isEnabled: targetState })
      });

      if (res.ok) {
        setWorkers(
          workers.map((w) => (w.id === worker.id ? { ...w, isEnabled: targetState } : w))
        );
      }
    } catch (err) {
      console.error('Failed to toggle worker', err);
    } finally {
      setTogglingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-sm text-slate-400">
        <RefreshCw className="w-5 h-5 animate-spin mr-2" />
        Loading Workforce Agents & Governance Envelope...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div
        className={`p-5 rounded-xl border flex items-center justify-between gap-4 ${
          darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-violet-500/20 text-violet-400">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold flex items-center gap-2">
              <span>Autonomous Workforce & Agent Governance</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-violet-500/20 text-violet-300 font-bold">
                {workers.filter((w) => w.isEnabled).length} / {workers.length} ACTIVE
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Scoped AI agents operate with least-privilege permission envelopes, human approval gates, and tamper-resistant audit trails.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Worker Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {workers.map((w) => (
          <div
            key={w.id}
            className={`p-5 rounded-xl border flex flex-col justify-between gap-4 transition ${
              w.isEnabled
                ? darkMode
                  ? 'bg-slate-900/60 border-slate-800'
                  : 'bg-white border-slate-200'
                : darkMode
                ? 'bg-slate-950/40 border-slate-800/40 opacity-70'
                : 'bg-slate-50 border-slate-200 opacity-70'
            }`}
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-200">{w.name}</h3>
                  <div className="text-[10px] text-slate-400 font-mono">Agent ID: {w.id}</div>
                </div>

                <button
                  onClick={() => handleToggleWorker(w)}
                  disabled={togglingId === w.id}
                  className="cursor-pointer text-slate-400 hover:text-white transition"
                  title={w.isEnabled ? 'Disable Agent' : 'Enable Agent'}
                >
                  {w.isEnabled ? (
                    <ToggleRight className="w-8 h-8 text-emerald-400" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-slate-600" />
                  )}
                </button>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">{w.roleDescription}</p>

              <div className="space-y-2 pt-2 border-t border-slate-800 text-[11px]">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Capability Status:</span>
                  <span
                    className={`font-mono font-bold px-2 py-0.5 rounded text-[10px] ${
                      w.isEnabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {w.isEnabled ? w.capabilityStatus : 'DISABLED'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-400">
                  <span>Approval Gate:</span>
                  <span className="font-mono text-amber-300 text-[10px]">
                    {w.approvalRequirement === 'REQUIRE_APPROVAL_ALL_ACTIONS'
                      ? 'Strict Sign-Off Required'
                      : w.approvalRequirement}
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-400">
                  <span>Trigger Mode:</span>
                  <span className="font-mono text-slate-300 text-[10px] truncate max-w-[170px]">
                    {w.scheduleOrTrigger}
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <span className="text-[10px] font-semibold text-slate-400 block mb-1.5">
                  Assigned Permission Envelope:
                </span>
                <div className="flex flex-wrap gap-1">
                  {w.assignedPermissions?.map((perm: string) => (
                    <span
                      key={perm}
                      className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-slate-300"
                    >
                      {perm}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="text-[10px] text-slate-500 font-mono border-t border-slate-800 pt-2 flex items-center justify-between">
              <span>Tenant Isolated</span>
              <span>Hash Governed</span>
            </div>
          </div>
        ))}
      </div>

      {/* 3. Recent Execution Activity by Workers */}
      <div
        className={`p-5 rounded-xl border space-y-3 ${
          darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <h3 className="text-sm font-bold flex items-center gap-2">
          <Activity className="w-4 h-4 text-indigo-400" />
          <span>Workforce Execution Log</span>
        </h3>

        {recentActions.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">No worker execution events recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-950/40">
                  <th className="p-3">Agent</th>
                  <th className="p-3">Action Type</th>
                  <th className="p-3">Execution State</th>
                  <th className="p-3">Approval Status</th>
                  <th className="p-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {recentActions.slice(0, 10).map((a) => (
                  <tr key={a.id} className="hover:bg-slate-800/30 transition">
                    <td className="p-3 font-medium text-slate-200">{a.actor_name || a.actor_id}</td>
                    <td className="p-3 font-mono text-indigo-400">{a.action_type}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300">
                        {a.execution_state}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/20 text-amber-300">
                        {a.approval_state}
                      </span>
                    </td>
                    <td className="p-3 text-slate-400 font-mono text-[10px]">
                      {new Date(a.requested_at || a.created_at).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
