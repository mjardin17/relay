import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Activity,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  Play,
  Pause,
  Key,
  Lock,
  ArrowRight,
  Check,
  X,
  Clock,
  Layers,
  Database,
  Compass,
  Radio,
  FileText,
  CheckSquare,
  Zap,
  Sliders,
  Eye,
  Server
} from 'lucide-react';
import {
  ConnectorRecord,
  ConnectorVerificationResult,
  CredentialHealthReport,
  ExecutionQueueItem,
  DeadLetterRecord,
  EmergencyControlRecord,
  PilotReadinessReport,
  ExecutionObservabilityMetrics
} from '../../types/connectorRegistry';

interface ControlledLiveOperationsConsoleProps {
  darkMode: boolean;
  tenantId?: string;
}

export const ControlledLiveOperationsConsole: React.FC<ControlledLiveOperationsConsoleProps> = ({
  darkMode,
  tenantId = 'tenant_ma_fresh_launch'
}) => {
  const [activeTab, setActiveTab] = useState<'connectors' | 'queue' | 'dlq' | 'approvals' | 'emergency' | 'pilot' | 'observability'>('connectors');
  const [connectors, setConnectors] = useState<ConnectorRecord[]>([]);
  const [queueItems, setQueueItems] = useState<ExecutionQueueItem[]>([]);
  const [dlqItems, setDlqItems] = useState<DeadLetterRecord[]>([]);
  const [emergencyControls, setEmergencyControls] = useState<EmergencyControlRecord[]>([]);
  const [isEmergencyPaused, setIsEmergencyPaused] = useState(false);
  const [pilotReport, setPilotReport] = useState<PilotReadinessReport | null>(null);
  const [metrics, setMetrics] = useState<ExecutionObservabilityMetrics | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<ConnectorVerificationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Auth token for mock operator calls
  const token = 'token_ma_fresh_launch';

  const fetchAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Connectors
      const connRes = await fetch('/api/controlled-ops/connectors', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (connRes.ok) {
        const data = await connRes.json();
        setConnectors(data.connectors || []);
      }

      // Queue
      const qRes = await fetch('/api/controlled-ops/queue', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (qRes.ok) {
        const data = await qRes.json();
        setQueueItems(data.items || []);
      }

      // DLQ
      const dlqRes = await fetch('/api/controlled-ops/dlq', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (dlqRes.ok) {
        const data = await dlqRes.json();
        setDlqItems(data.items || []);
      }

      // Emergency
      const emgRes = await fetch('/api/controlled-ops/emergency', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (emgRes.ok) {
        const data = await emgRes.json();
        setEmergencyControls(data.controls || []);
        setIsEmergencyPaused(data.isBlocked?.blocked || false);
      }

      // Pilot Readiness
      const pilotRes = await fetch('/api/controlled-ops/pilot/readiness', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (pilotRes.ok) {
        const data = await pilotRes.json();
        setPilotReport(data.report || null);
      }

      // Metrics
      const obsRes = await fetch('/api/controlled-ops/observability/metrics', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (obsRes.ok) {
        const data = await obsRes.json();
        setMetrics(data.metrics || null);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load controlled operations state');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [tenantId]);

  const handleVerifyConnector = async (connectorId: string) => {
    setVerifyingId(connectorId);
    setError(null);
    setVerificationResult(null);
    try {
      const res = await fetch(`/api/controlled-ops/connectors/${connectorId}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          // Mock verification request
          apiKey: 'mock_sample_key'
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed');
      setVerificationResult(data.result);
      setActionSuccess(`Connector verified: ${data.result.status} (${data.result.healthStatus})`);
      fetchAllData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setVerifyingId(null);
    }
  };

  const handleEmergencyToggle = async (pause: boolean) => {
    setError(null);
    try {
      const endpoint = pause ? '/api/controlled-ops/emergency/pause' : '/api/controlled-ops/emergency/resume';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          scope: 'TENANT',
          reason: pause ? 'Manual operator safety pause triggered' : 'Operator resumed live operations'
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Emergency toggle failed');
      setActionSuccess(pause ? 'Emergency stop ACTIVATED.' : 'Operations RESUMED.');
      fetchAllData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleExecuteQueueItem = async (itemId: string) => {
    setError(null);
    try {
      const res = await fetch(`/api/controlled-ops/queue/${itemId}/execute`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Execution failed');
      setActionSuccess(`Queue item executed: ${data.item?.status}`);
      fetchAllData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleResolveDLQ = async (dlqId: string, action: 'RETRIED' | 'CANCELLED' | 'SUPERSEDED') => {
    setError(null);
    try {
      const res = await fetch(`/api/controlled-ops/dlq/${dlqId}/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          action,
          notes: `Resolved by operator as ${action}`
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Resolution failed');
      setActionSuccess(`DLQ item resolved as ${action}`);
      fetchAllData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner with Emergency Status */}
      <div className={`p-6 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all ${
        isEmergencyPaused
          ? 'bg-rose-950/40 border-rose-800'
          : darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded font-bold flex items-center gap-1 ${
              isEmergencyPaused
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                : 'bg-emerald-500/20 text-emerald-400'
            }`}>
              {isEmergencyPaused ? <ShieldAlert className="w-3 h-3" /> : <ShieldCheck className="w-3 h-3" />}
              {isEmergencyPaused ? 'EMERGENCY STOP ACTIVE' : 'FAIL-CLOSED DRY_RUN GOVERNANCE'}
            </span>
            <span className="text-xs font-mono text-slate-400">Reis Electric LLC ({tenantId})</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight">Controlled Live Operations & Connector Registry</h1>
          <p className="text-xs text-slate-400 max-w-3xl">
            Deterministic external execution boundaries with truthful authentication states, durable queueing, Segregation of Duties, and instant emergency isolation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchAllData()}
            disabled={loading}
            className={`px-3 py-2 text-xs font-semibold rounded-xl border flex items-center gap-1.5 transition-all ${
              darkMode ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200' : 'bg-slate-100 border-slate-300 hover:bg-slate-200 text-slate-800'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          {isEmergencyPaused ? (
            <button
              onClick={() => handleEmergencyToggle(false)}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-2 shadow-lg shadow-emerald-900/30"
            >
              <Play className="w-4 h-4 fill-white" />
              Resume Operations
            </button>
          ) : (
            <button
              onClick={() => handleEmergencyToggle(true)}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-2 shadow-lg shadow-rose-900/30"
            >
              <Pause className="w-4 h-4 fill-white" />
              Emergency Stop
            </button>
          )}
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {actionSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        {[
          { id: 'connectors', label: 'Connector Registry', icon: Key, count: connectors.length },
          { id: 'queue', label: 'Durable Queue', icon: Layers, count: queueItems.filter(q => q.status === 'QUEUED' || q.status === 'RETRYABLE_FAILURE').length },
          { id: 'dlq', label: 'Dead Letter Queue', icon: ShieldAlert, count: dlqItems.filter(d => d.status === 'ACTIVE').length },
          { id: 'pilot', label: 'Pilot Readiness Matrix', icon: CheckSquare },
          { id: 'observability', label: 'Telemetry & Metrics', icon: Activity },
          { id: 'emergency', label: 'Emergency Controls', icon: Pause, count: emergencyControls.filter(e => e.isPaused).length }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
                  : darkMode ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-200' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-mono ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-300'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab 1: Connectors Registry */}
      {activeTab === 'connectors' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {connectors.map(c => {
              const isHealthy = c.healthStatus === 'HEALTHY';
              const isAuth = c.authenticationState === 'AUTHENTICATED';
              const isVerifying = verifyingId === c.id;

              return (
                <div
                  key={c.id}
                  className={`p-5 rounded-2xl border flex flex-col justify-between space-y-4 ${
                    darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        {c.provider}
                      </span>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                        isAuth
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : c.authenticationState === 'AUTH_FAILED'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : 'bg-amber-500/20 text-amber-400'
                      }`}>
                        {c.authenticationState}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold">{c.capability}</h3>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">{c.id}</p>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-slate-800/80 text-[11px]">
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Execution Mode:</span>
                        <span className={`font-mono font-bold ${c.executionMode === 'LIVE' ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {c.executionMode}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Health:</span>
                        <span className={`font-mono font-bold ${isHealthy ? 'text-emerald-400' : 'text-slate-400'}`}>
                          {c.healthStatus}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Last Verified:</span>
                        <span className="font-mono text-slate-300">
                          {c.lastVerificationAt ? new Date(c.lastVerificationAt).toLocaleTimeString() : 'Never'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleVerifyConnector(c.id)}
                      disabled={isVerifying}
                      className={`w-full py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                        darkMode ? 'bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                      }`}
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
                      {isVerifying ? 'Verifying...' : 'Run Verification'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {verificationResult && (
            <div className={`p-4 rounded-xl border ${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-300'} space-y-2`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold">Verification Evidence Log</span>
                <span className="text-[10px] font-mono text-slate-400">{verificationResult.verifiedAt}</span>
              </div>
              <p className="text-xs text-slate-300">{verificationResult.sanitizedMessage}</p>
              <div className="text-[11px] font-mono text-slate-400 flex items-center gap-4">
                <span>Latency: {verificationResult.latencyMs}ms</span>
                <span>Status: {verificationResult.status}</span>
                <span>Health: {verificationResult.healthStatus}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Durable Execution Queue */}
      {activeTab === 'queue' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold">Active & Historical Queue Items</h3>
            <span className="text-xs font-mono text-slate-400">{queueItems.length} total items</span>
          </div>

          <div className="space-y-2">
            {queueItems.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                No active items currently enqueued.
              </div>
            ) : (
              queueItems.map(item => (
                <div
                  key={item.id}
                  className={`p-4 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                    darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase ${
                        item.status === 'SUCCEEDED'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : item.status === 'RETRYABLE_FAILURE'
                          ? 'bg-amber-500/20 text-amber-400'
                          : item.status === 'DEAD_LETTERED'
                          ? 'bg-rose-500/20 text-rose-400'
                          : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        {item.status}
                      </span>
                      <span className="text-xs font-bold">{item.operation}</span>
                      <span className="text-[11px] text-slate-400 font-mono">({item.executionMode})</span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Target: <span className="font-mono text-slate-200">{item.target}</span> • Connector: <span className="font-mono text-slate-300">{item.connectorId}</span> • Attempts: <span className="font-mono">{item.attempts}/{item.maxAttempts}</span>
                    </p>
                    {item.lastError && (
                      <p className="text-[11px] text-rose-400 font-mono">{item.lastError}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {item.status !== 'SUCCEEDED' && item.status !== 'DEAD_LETTERED' && (
                      <button
                        onClick={() => handleExecuteQueueItem(item.id)}
                        className="px-3 py-1.5 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-500 text-white"
                      >
                        Execute
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Dead Letter Queue */}
      {activeTab === 'dlq' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold">Terminal Failure Inspector (Dead Letter Queue)</h3>
            <span className="text-xs font-mono text-slate-400">{dlqItems.length} records</span>
          </div>

          <div className="space-y-3">
            {dlqItems.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                No items in Dead Letter Queue. All external side-effects operating cleanly.
              </div>
            ) : (
              dlqItems.map(item => (
                <div
                  key={item.id}
                  className={`p-4 rounded-xl border space-y-3 ${
                    darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase bg-rose-500/20 text-rose-400 border border-rose-500/30">
                        {item.sanitizedFailureClassification}
                      </span>
                      <span className="text-xs font-bold">{item.operation}</span>
                      <span className="text-[10px] font-mono text-slate-400">{item.id}</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">{item.lastAttemptAt}</span>
                  </div>

                  <p className="text-xs text-slate-300 font-mono bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                    {item.resolutionNotes || 'Terminal execution failure occurred.'}
                  </p>

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800">
                    <span className="text-slate-400">Retries Attempted: <strong className="text-slate-200">{item.retryCount}</strong></span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleResolveDLQ(item.id, 'CANCELLED')}
                        className="px-3 py-1 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleResolveDLQ(item.id, 'SUPERSEDED')}
                        className="px-3 py-1 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                      >
                        Supersede
                      </button>
                      <button
                        onClick={() => handleResolveDLQ(item.id, 'RETRIED')}
                        className="px-3 py-1 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-500 text-white"
                      >
                        Retry Now
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Pilot Readiness Matrix */}
      {activeTab === 'pilot' && pilotReport && (
        <div className="space-y-4">
          <div className={`p-5 rounded-2xl border flex items-center justify-between gap-4 ${
            darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div>
              <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-blue-500/20 text-blue-400">
                DYNAMIC PILOT READINESS
              </span>
              <h2 className="text-lg font-black mt-1">{pilotReport.businessName} — {pilotReport.operatingBase}</h2>
              <p className="text-xs text-slate-400">Evidence-backed operational readiness checklist</p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-blue-400">{pilotReport.readinessScore}%</span>
              <p className="text-[10px] font-mono uppercase text-slate-400">{pilotReport.overallStatus}</p>
            </div>
          </div>

          <div className="space-y-2">
            {pilotReport.items.map(item => (
              <div
                key={item.id}
                className={`p-4 rounded-xl border flex items-start justify-between gap-4 ${
                  darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono uppercase text-slate-400 px-1.5 py-0.5 rounded bg-slate-800">
                      {item.category}
                    </span>
                    <span className="text-xs font-bold">{item.label}</span>
                  </div>
                  <p className="text-xs text-slate-400">{item.reason}</p>
                </div>

                <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase shrink-0 ${
                  item.status === 'PASS'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                }`}>
                  {item.status}
                </span>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400">
            <strong>Mandatory Governance Statement:</strong> {pilotReport.mandatoryDisclaimer}
          </div>
        </div>
      )}

      {/* Tab 5: Observability & Telemetry */}
      {activeTab === 'observability' && metrics && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className={`p-4 rounded-xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
              <span className="text-xs text-slate-400">Connector Availability</span>
              <p className="text-2xl font-black mt-1 text-emerald-400">{metrics.connectorAvailabilityPercent}%</p>
            </div>
            <div className={`p-4 rounded-xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
              <span className="text-xs text-slate-400">Execution Success Rate</span>
              <p className="text-2xl font-black mt-1 text-blue-400">{metrics.executionSuccessRatePercent}%</p>
            </div>
            <div className={`p-4 rounded-xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
              <span className="text-xs text-slate-400">Total Retries</span>
              <p className="text-2xl font-black mt-1 text-amber-400">{metrics.retryCount}</p>
            </div>
            <div className={`p-4 rounded-xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
              <span className="text-xs text-slate-400">Dead Letter Count</span>
              <p className="text-2xl font-black mt-1 text-rose-400">{metrics.deadLetterCount}</p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 6: Emergency Controls */}
      {activeTab === 'emergency' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold">Emergency Stop & Isolation Controls</h3>
          </div>

          <div className="space-y-2">
            {emergencyControls.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                No active emergency stops recorded in ledger.
              </div>
            ) : (
              emergencyControls.map(c => (
                <div
                  key={c.id}
                  className={`p-4 rounded-xl border flex items-center justify-between gap-4 ${
                    c.isPaused ? 'bg-rose-950/20 border-rose-800/60' : 'bg-slate-900 border-slate-800'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                        c.isPaused ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {c.scope} — {c.isPaused ? 'ACTIVE STOP' : 'RESOLVED'}
                      </span>
                      <span className="text-xs font-bold">{c.reason}</span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Paused By: <span className="font-mono text-slate-300">{c.pausedBy}</span> at <span className="font-mono">{c.pausedAt}</span>
                    </p>
                  </div>

                  {c.isPaused && (
                    <button
                      onClick={() => handleEmergencyToggle(false)}
                      className="px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white"
                    >
                      Resume
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
