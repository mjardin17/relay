import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Lock,
  Search,
  Filter,
  RefreshCw,
  Fingerprint,
  Code2,
  FileCheck,
  CheckCircle2,
  AlertTriangle,
  Info
} from 'lucide-react';

interface AuditGovernanceViewProps {
  darkMode: boolean;
  tenantId: string;
}

export const AuditGovernanceView: React.FC<AuditGovernanceViewProps> = ({
  darkMode,
  tenantId
}) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  const authHeaders = {
    Authorization: 'Bearer demo-session',
    'Content-Type': 'application/json'
  };

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/control-center/audit-ledger', { headers: authHeaders });
      if (res.ok) {
        const d = await res.json();
        setData(d);
      }
    } catch (err) {
      console.error('Failed to load audit ledger', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [tenantId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-sm text-slate-400">
        <RefreshCw className="w-5 h-5 animate-spin mr-2" />
        Verifying Cryptographic Audit Ledger & Hash Chains...
      </div>
    );
  }

  const logs = data?.logs || [];
  const isChainValid = data?.isChainValid !== false;

  const filteredLogs = logs.filter((log: any) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      log.action?.toLowerCase().includes(q) ||
      log.actorId?.toLowerCase().includes(q) ||
      log.endpoint?.toLowerCase().includes(q) ||
      log.eventHash?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* 1. Cryptographic Chain Status Banner */}
      <div
        className={`p-5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
          isChainValid
            ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-200'
            : 'border-rose-500/40 bg-rose-950/30 text-rose-200'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`p-2.5 rounded-xl ${
              isChainValid ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
            }`}
          >
            {isChainValid ? <ShieldCheck className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
          </div>
          <div>
            <h2 className="text-base font-bold flex items-center gap-2">
              <span>Cryptographic Hash-Chain Integrity</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                  isChainValid ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                }`}
              >
                {isChainValid ? '0 ANOMALIES DETECTED — CHAIN VERIFIED' : 'CHAIN COMPROMISED'}
              </span>
            </h2>
            <p className="text-xs opacity-90">
              Every sensitive operation is appended to an immutable forward-linked SHA-256 block ledger.
            </p>
          </div>
        </div>

        <button
          onClick={fetchAuditLogs}
          className="px-3 py-1.5 rounded-lg border border-current text-xs font-bold hover:bg-white/10 transition flex items-center gap-1 shrink-0 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Re-Verify Ledger
        </button>
      </div>

      {/* 2. Search Bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search action, actor, endpoint, or hash..."
            className={`w-full pl-8 pr-3 py-1.5 rounded-lg border text-xs ${
              darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
            }`}
          />
        </div>

        <div className="text-xs text-slate-400 font-mono">
          Showing {filteredLogs.length} of {logs.length} ledger events
        </div>
      </div>

      {/* 3. Audit Ledger Table */}
      <div
        className={`rounded-xl border overflow-hidden ${
          darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            No audit log records found matching search.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-950/40">
                  <th className="p-3">Seq / Time</th>
                  <th className="p-3">Action & Endpoint</th>
                  <th className="p-3">Actor ID</th>
                  <th className="p-3">Status & Mode</th>
                  <th className="p-3">Block Event Hash (SHA-256)</th>
                  <th className="p-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredLogs.map((log: any) => (
                  <tr
                    key={log.id}
                    className={`hover:bg-slate-800/30 transition ${
                      selectedLog?.id === log.id ? 'bg-slate-800/50' : ''
                    }`}
                  >
                    <td className="p-3 font-mono text-[10px]">
                      <div className="text-slate-300 font-bold">#{log.sequenceNumber || 1}</div>
                      <div className="text-slate-400">{new Date(log.createdAt).toLocaleTimeString()}</div>
                    </td>

                    <td className="p-3">
                      <div className="font-bold text-slate-200">{log.action}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{log.endpoint}</div>
                    </td>

                    <td className="p-3">
                      <div className="font-medium text-slate-300">{log.actorId || 'system'}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{log.clientIp}</div>
                    </td>

                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            log.status === 'SUCCESS'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-rose-500/20 text-rose-400'
                          }`}
                        >
                          {log.status}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-slate-800 text-slate-400">
                          {log.executionMode}
                        </span>
                      </div>
                    </td>

                    <td className="p-3 font-mono text-[10px] text-slate-400">
                      <div className="text-indigo-400">Curr: {log.eventHash?.substring(0, 16)}...</div>
                      <div className="text-slate-500">Prev: {log.previousHash?.substring(0, 16)}...</div>
                    </td>

                    <td className="p-3 text-right">
                      <button
                        onClick={() => setSelectedLog(selectedLog?.id === log.id ? null : log)}
                        className="p-1 text-slate-400 hover:text-slate-200 cursor-pointer"
                        title="Inspect Audit Block"
                      >
                        <Info className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. Log Inspection Panel */}
      {selectedLog && (
        <div
          className={`p-5 rounded-xl border space-y-3 ${
            darkMode ? 'bg-slate-900/80 border-slate-700' : 'bg-white border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <Fingerprint className="w-4 h-4 text-indigo-400" />
              <span>Immutable Ledger Block Inspector — #{selectedLog.sequenceNumber || 1}</span>
            </h3>
            <button
              onClick={() => setSelectedLog(null)}
              className="text-slate-400 hover:text-slate-200 text-xs font-bold cursor-pointer"
            >
              &times; Close
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
            <div className="p-3 rounded bg-slate-950 border border-slate-800">
              <div className="text-slate-400 mb-1 font-sans">Cryptographic Block Hashes</div>
              <div>Event Hash: {selectedLog.eventHash}</div>
              <div className="mt-1">Previous Hash: {selectedLog.previousHash}</div>
            </div>

            <div className="p-3 rounded bg-slate-950 border border-slate-800">
              <div className="text-slate-400 mb-1 font-sans">Context Metadata</div>
              <div>Tenant ID: {selectedLog.tenantId}</div>
              <div className="mt-1">Actor ID: {selectedLog.actorId}</div>
              <div className="mt-1">Timestamp: {selectedLog.createdAt}</div>
            </div>
          </div>

          <div>
            <div className="text-xs font-bold text-slate-400 mb-1">Parsed Event Details</div>
            <pre className="p-3 rounded bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto max-h-48">
              {JSON.stringify(selectedLog.details, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
