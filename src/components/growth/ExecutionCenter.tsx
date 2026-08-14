import React, { useState } from 'react';
import { ShieldAlert, Play, CheckCircle2, Clock, AlertTriangle, RotateCcw, Cpu, UserCheck, Lock, FileCheck } from 'lucide-react';
import { growthEvidenceEngine } from '../../services/growthEvidenceEngine';

interface ExecutionCenterProps {
  darkMode: boolean;
}

export const ExecutionCenter: React.FC<ExecutionCenterProps> = ({ darkMode }) => {
  const [refreshCount, setRefreshCount] = useState(0);
  const approvals = growthEvidenceEngine.getApprovalRequests();
  const ledger = growthEvidenceEngine.getExecutionLedger();

  const handleApprove = (id: string) => {
    growthEvidenceEngine.approveRequest(id, 'Executive Admin');
    setRefreshCount((prev) => prev + 1);
  };

  const handleReject = (id: string) => {
    growthEvidenceEngine.rejectRequest(id, 'Executive Admin');
    setRefreshCount((prev) => prev + 1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20 uppercase tracking-wider">
            Immutable Execution Ledger & Human Governance
          </span>
        </div>
        <h1 className="text-2xl font-bold text-slate-100 mt-1">Execution & Approval Center</h1>
        <p className="text-xs text-slate-400">
          Monitor active AI agent jobs, human approval gates for high-impact actions, and complete audit histories.
        </p>
      </div>

      {/* Human Approval Requests Section */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Lock className="w-5 h-5 text-amber-400" />
            Human Approval Gate Queue
          </h2>
          <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-mono border border-amber-500/20 font-semibold">
            {approvals.filter((a) => a.status === 'pending').length} Pending Review
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {approvals.map((req) => (
            <div
              key={req.id}
              className={`p-4 rounded-xl border transition-all ${
                req.status === 'pending'
                  ? 'bg-amber-950/20 border-amber-500/30'
                  : 'bg-slate-950/60 border-slate-800 opacity-80'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-slate-800 text-slate-200 border border-slate-700">
                      {req.approverRole} Role
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                        req.riskLevel === 'High'
                          ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      {req.riskLevel} Risk
                    </span>
                    <span className="text-xs font-semibold text-slate-100">{req.actionTitle}</span>
                  </div>
                  <p className="text-xs text-slate-400">{req.reasoning}</p>
                  <div className="flex items-center gap-4 text-[11px] text-slate-400 font-mono pt-1">
                    <span>Est. Impact: <strong className="text-emerald-400">${req.financialImpactEstimate.toLocaleString()}</strong></span>
                    <span>Target Records: <strong className="text-slate-200">{req.targetCount}</strong></span>
                    <span>Requested: {new Date(req.createdAt).toLocaleTimeString()}</span>
                  </div>
                </div>

                {req.status === 'pending' ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleReject(req.id)}
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-red-500/20 text-slate-300 hover:text-red-400 border border-slate-700 hover:border-red-500/30 font-bold text-xs flex items-center gap-1 transition-colors"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleApprove(req.id)}
                      className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-lg shadow-emerald-500/20"
                    >
                      <UserCheck className="w-4 h-4" /> Approve & Execute
                    </button>
                  </div>
                ) : req.status === 'approved' ? (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono font-semibold">
                    <CheckCircle2 className="w-4 h-4" /> Approved by {req.decidedBy}
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs text-red-400 font-mono font-semibold">
                    <AlertTriangle className="w-4 h-4" /> Rejected by {req.decidedBy}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Execution Ledger Table */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
          <FileCheck className="w-5 h-5 text-sky-400" />
          Immutable Execution Ledger
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 uppercase font-mono text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-3">Execution ID</th>
                <th className="p-3">Actor / Executor</th>
                <th className="p-3">Action Type</th>
                <th className="p-3">Target Count</th>
                <th className="p-3">Status</th>
                <th className="p-3">Cost / Calls</th>
                <th className="p-3">Output Summary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-mono">
              {ledger.map((exec) => (
                <tr key={exec.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="p-3 text-slate-400">{exec.id}</td>
                  <td className="p-3 font-semibold text-slate-100 font-sans flex items-center gap-1.5">
                    {exec.executorType === 'ai_agent' ? (
                      <Cpu className="w-3.5 h-3.5 text-sky-400" />
                    ) : (
                      <UserCheck className="w-3.5 h-3.5 text-purple-400" />
                    )}
                    {exec.actor}
                  </td>
                  <td className="p-3 text-slate-300">{exec.actionType}</td>
                  <td className="p-3 text-slate-200">{exec.targetEntityCount}</td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        exec.status === 'completed'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : exec.status === 'queued'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : 'bg-red-500/10 text-red-400 border-red-500/20'
                      }`}
                    >
                      {exec.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-3 text-slate-400">
                    ${exec.costIncurred.toFixed(2)} ({exec.apiCallsCount} API)
                  </td>
                  <td className="p-3 text-slate-300 max-w-xs truncate font-sans">{exec.outputSummary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
