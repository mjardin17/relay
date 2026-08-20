import React, { useState } from 'react';
import {
  Zap,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Plus,
  Lock,
  Search,
  Filter,
  Play,
  Pause,
  ArrowRight,
  Fingerprint,
  Info
} from 'lucide-react';
import { UniversalActionRecord } from '../../types/universalActionEngine';

interface ActionCenterViewProps {
  darkMode: boolean;
  tenantId: string;
  actions: UniversalActionRecord[];
  isEmergencyPaused: boolean;
  pauseReason: string;
  loading: boolean;
  onRefresh: () => void;
  onApproveAction: (actionId: string, decision: 'APPROVE' | 'REJECT') => void;
  onToggleEmergencyPause: (paused: boolean, reason?: string) => void;
}

export const ActionCenterView: React.FC<ActionCenterViewProps> = ({
  darkMode,
  tenantId,
  actions,
  isEmergencyPaused,
  pauseReason,
  loading,
  onRefresh,
  onApproveAction,
  onToggleEmergencyPause
}) => {
  const [filterState, setFilterState] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAction, setSelectedAction] = useState<UniversalActionRecord | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);

  // New Action Request Form State
  const [newActionType, setNewActionType] = useState('COMMUNICATION_OUTBOUND_EMAIL');
  const [newTargetEntity, setNewTargetEntity] = useState('');
  const [newRationale, setNewRationale] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const authHeaders = {
    Authorization: 'Bearer demo-session',
    'Content-Type': 'application/json'
  };

  const filteredActions = actions.filter((a) => {
    if (filterState === 'PENDING' && a.executionState !== 'PENDING_APPROVAL') return false;
    if (filterState === 'SUCCEEDED' && a.executionState !== 'SUCCEEDED') return false;
    if (filterState === 'FAILED' && !['FAILED_CLOSED', 'AUTHORIZE_FAILED', 'VALIDATE_FAILED'].includes(a.executionState))
      return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchType = a.actionType?.toLowerCase().includes(q);
      const matchActor = a.actorName?.toLowerCase().includes(q);
      const matchState = a.executionState?.toLowerCase().includes(q);
      return matchType || matchActor || matchState;
    }

    return true;
  });

  const handleRequestAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingAction(true);
    setActionError(null);

    try {
      const payload = {
        actionType: newActionType,
        inputPayload: {
          targetEntity: newTargetEntity,
          rationale: newRationale,
          subject: newSubject,
          requestedVia: 'RELAY_CONTROL_CENTER_UI'
        }
      };

      const res = await fetch('/api/universal-actions/request', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setShowRequestModal(false);
        setNewTargetEntity('');
        setNewRationale('');
        setNewSubject('');
        onRefresh();
      } else {
        const err = await res.json();
        setActionError(err.error || 'Failed to submit action proposal');
      }
    } catch (err: any) {
      setActionError(err?.message || 'Network error submitting action');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleRetryAction = async (actionId: string) => {
    try {
      const res = await fetch('/api/universal-actions/retry', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ actionId })
      });
      if (res.ok) {
        onRefresh();
      }
    } catch (err) {
      console.error('Failed to retry action', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Emergency Killswitch & Header Controls */}
      <div
        className={`p-5 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
          isEmergencyPaused
            ? 'border-rose-500/50 bg-rose-950/30'
            : darkMode
            ? 'bg-slate-900/60 border-slate-800'
            : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`p-2.5 rounded-xl ${
              isEmergencyPaused ? 'bg-rose-500/20 text-rose-400' : 'bg-indigo-500/20 text-indigo-400'
            }`}
          >
            {isEmergencyPaused ? <ShieldAlert className="w-6 h-6" /> : <Zap className="w-6 h-6" />}
          </div>
          <div>
            <h2 className="text-base font-bold flex items-center gap-2">
              <span>Universal Action Engine & Governance Center</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                  isEmergencyPaused ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'
                }`}
              >
                {isEmergencyPaused ? 'EMERGENCY PAUSED' : 'ACTIVE & GOVERNED'}
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Deterministic 6-stage execution pipeline with cryptographic verification, idempotency locks, and SoD approval gates.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowRequestModal(true)}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-900/30"
          >
            <Plus className="w-4 h-4" /> Propose Action
          </button>

          <button
            onClick={() =>
              onToggleEmergencyPause(
                !isEmergencyPaused,
                !isEmergencyPaused ? 'Operator engaged emergency killswitch from Action Center' : undefined
              )
            }
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
              isEmergencyPaused
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500'
                : 'bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 border-rose-500/40'
            }`}
          >
            {isEmergencyPaused ? (
              <>
                <Play className="w-4 h-4" /> Resume All Automations
              </>
            ) : (
              <>
                <Pause className="w-4 h-4" /> Emergency Stop
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. Filters and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1">
          {['ALL', 'PENDING', 'SUCCEEDED', 'FAILED'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterState(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                filterState === st
                  ? 'bg-indigo-600 text-white'
                  : darkMode
                  ? 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st === 'ALL'
                ? `All (${actions.length})`
                : st === 'PENDING'
                ? `Pending Approval (${actions.filter((a) => a.executionState === 'PENDING_APPROVAL').length})`
                : st === 'SUCCEEDED'
                ? `Succeeded (${actions.filter((a) => a.executionState === 'SUCCEEDED').length})`
                : `Failed / Blocked (${
                    actions.filter((a) =>
                      ['FAILED_CLOSED', 'AUTHORIZE_FAILED', 'VALIDATE_FAILED'].includes(a.executionState)
                    ).length
                  })`}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search actions..."
            className={`w-full pl-8 pr-3 py-1.5 rounded-lg border text-xs ${
              darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
            }`}
          />
        </div>
      </div>

      {/* 3. Action Records Table */}
      <div
        className={`rounded-xl border overflow-hidden ${
          darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        {filteredActions.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            No universal actions found matching current filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-950/40">
                  <th className="p-3">Action Type</th>
                  <th className="p-3">Actor / Proposer</th>
                  <th className="p-3">Target & Provider</th>
                  <th className="p-3">Execution State</th>
                  <th className="p-3">Fingerprint & Idemp</th>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3 text-right">Governance Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredActions.map((a) => {
                  let payload: any = {};
                  try {
                    payload = typeof a.inputPayload === 'string' ? JSON.parse(a.inputPayload) : a.inputPayload || {};
                  } catch {
                    payload = {};
                  }

                  const isPending = a.executionState === 'PENDING_APPROVAL';
                  const isFailed = ['FAILED_CLOSED', 'AUTHORIZE_FAILED', 'VALIDATE_FAILED'].includes(a.executionState);
                  const isSucceeded = a.executionState === 'SUCCEEDED';

                  return (
                    <tr
                      key={a.id}
                      className={`hover:bg-slate-800/30 transition ${
                        selectedAction?.id === a.id ? 'bg-slate-800/50' : ''
                      }`}
                    >
                      <td className="p-3">
                        <span className="font-mono font-bold text-indigo-400">{a.actionType}</span>
                        <div className="text-[10px] text-slate-400 font-mono">ID: {a.id.substring(0, 14)}...</div>
                      </td>

                      <td className="p-3">
                        <div className="font-medium text-slate-200">{a.actorName || a.actorId}</div>
                        <div className="text-[10px] text-slate-400">Role: {a.actorRole}</div>
                      </td>

                      <td className="p-3">
                        <div className="text-slate-300 font-medium">
                          {payload.targetEntity || payload.recipient || a.provider}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Provider: <strong className="text-slate-300">{a.provider}</strong>
                        </div>
                      </td>

                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold inline-flex items-center gap-1 ${
                            isSucceeded
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : isPending
                              ? 'bg-amber-500/20 text-amber-300'
                              : isFailed
                              ? 'bg-rose-500/20 text-rose-400'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {isSucceeded && <CheckCircle2 className="w-3 h-3" />}
                          {isPending && <AlertTriangle className="w-3 h-3" />}
                          {isFailed && <XCircle className="w-3 h-3" />}
                          <span>{a.executionState}</span>
                        </span>
                      </td>

                      <td className="p-3 font-mono text-[10px] text-slate-400">
                        <div>FP: {a.inputFingerprint?.substring(0, 12)}...</div>
                        <div>IDEMP: {a.idempotencyKey?.substring(0, 14)}...</div>
                      </td>

                      <td className="p-3 text-[11px] text-slate-400 whitespace-nowrap">
                        {new Date(a.requestedAt || a.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit'
                        })}
                      </td>

                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isPending && (
                            <>
                              <button
                                onClick={() => onApproveAction(a.id, 'APPROVE')}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                              >
                                <CheckCircle2 className="w-3 h-3" /> Approve
                              </button>
                              <button
                                onClick={() => onApproveAction(a.id, 'REJECT')}
                                className="px-2.5 py-1 bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 rounded text-[11px] font-bold transition border border-rose-500/30 cursor-pointer"
                              >
                                <XCircle className="w-3 h-3" /> Reject
                              </button>
                            </>
                          )}

                          {isFailed && (
                            <button
                              onClick={() => handleRetryAction(a.id)}
                              className="px-2.5 py-1 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 rounded text-[11px] font-bold transition flex items-center gap-1 cursor-pointer border border-indigo-500/30"
                            >
                              <RefreshCw className="w-3 h-3" /> Retry
                            </button>
                          )}

                          <button
                            onClick={() => setSelectedAction(selectedAction?.id === a.id ? null : a)}
                            className="p-1 text-slate-400 hover:text-slate-200 cursor-pointer"
                            title="Inspect Details"
                          >
                            <Info className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. Action Details Inspection Panel */}
      {selectedAction && (
        <div
          className={`p-5 rounded-xl border space-y-3 ${
            darkMode ? 'bg-slate-900/80 border-slate-700' : 'bg-white border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <Fingerprint className="w-4 h-4 text-indigo-400" />
              <span>Governed Action Diagnostic Inspector — {selectedAction.id}</span>
            </h3>
            <button
              onClick={() => setSelectedAction(null)}
              className="text-slate-400 hover:text-slate-200 text-xs font-bold cursor-pointer"
            >
              &times; Close
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
            <div className="p-3 rounded bg-slate-950 border border-slate-800">
              <div className="text-slate-400 mb-1 font-sans">Cryptographic Integrity</div>
              <div>Input Fingerprint: {selectedAction.inputFingerprint}</div>
              <div className="mt-1">Idempotency Key: {selectedAction.idempotencyKey}</div>
              <div className="mt-1">Audit Reference: {selectedAction.auditReference}</div>
            </div>

            <div className="p-3 rounded bg-slate-950 border border-slate-800">
              <div className="text-slate-400 mb-1 font-sans">Pipeline Execution State</div>
              <div>Current State: {selectedAction.executionState}</div>
              <div className="mt-1">Approval State: {selectedAction.approvalState}</div>
              <div className="mt-1">Attempts: {selectedAction.attemptCount} / {selectedAction.maxAttempts}</div>
            </div>

            <div className="p-3 rounded bg-slate-950 border border-slate-800">
              <div className="text-slate-400 mb-1 font-sans">Actor Identity & Verification</div>
              <div>Proposer: {selectedAction.actorName} ({selectedAction.actorId})</div>
              <div className="mt-1">Assigned Role: {selectedAction.actorRole}</div>
              <div className="mt-1">Provider: {selectedAction.provider}</div>
            </div>
          </div>

          <div>
            <div className="text-xs font-bold text-slate-400 mb-1">Payload & Execution Result</div>
            <pre className="p-3 rounded bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto max-h-48">
              {JSON.stringify(
                {
                  inputPayload: selectedAction.inputPayload,
                  executionResult: selectedAction.executionResult
                },
                null,
                2
              )}
            </pre>
          </div>
        </div>
      )}

      {/* 5. Request Action Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div
            className={`w-full max-w-lg p-6 rounded-2xl border shadow-2xl space-y-4 ${
              darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-400" /> Propose Governed Outbound Action
              </h3>
              <button
                onClick={() => setShowRequestModal(false)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                &times;
              </button>
            </div>

            {actionError && (
              <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-500/40 text-rose-200 text-xs">
                {actionError}
              </div>
            )}

            <form onSubmit={handleRequestAction} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Action Type</label>
                <select
                  value={newActionType}
                  onChange={(e) => setNewActionType(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-100"
                >
                  <option value="COMMUNICATION_OUTBOUND_EMAIL">COMMUNICATION_OUTBOUND_EMAIL</option>
                  <option value="COMMUNICATION_OUTBOUND_SMS">COMMUNICATION_OUTBOUND_SMS</option>
                  <option value="GBP_UPDATE_POST">GBP_UPDATE_POST</option>
                  <option value="WEBSITE_PUBLISH_PAGE">WEBSITE_PUBLISH_PAGE</option>
                  <option value="CRM_LEAD_STATUS_UPDATE">CRM_LEAD_STATUS_UPDATE</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Target Entity / Destination</label>
                <input
                  type="text"
                  required
                  value={newTargetEntity}
                  onChange={(e) => setNewTargetEntity(e.target.value)}
                  placeholder="e.g. client@example.com or +15551234567"
                  className="w-full p-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-100"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Subject / Header</label>
                <input
                  type="text"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  placeholder="e.g. Project Update or Scheduled Maintenance"
                  className="w-full p-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-100"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Operational Rationale</label>
                <textarea
                  required
                  rows={3}
                  value={newRationale}
                  onChange={(e) => setNewRationale(e.target.value)}
                  placeholder="Explain why this action is necessary..."
                  className="w-full p-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAction}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  {submittingAction ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                  <span>{submittingAction ? 'Submitting...' : 'Submit to Engine'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
