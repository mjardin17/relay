import React, { useState } from 'react';
import {
  Plug,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Zap,
  Lock,
  ExternalLink,
  Clock,
  Server
} from 'lucide-react';
import { AuthoritativeConnectorMetadata, TenantConnectorInstance } from '../../types/authoritativeConnector';

interface ConnectorsViewProps {
  darkMode: boolean;
  tenantId: string;
  catalog: AuthoritativeConnectorMetadata[];
  tenantInstances: TenantConnectorInstance[];
  onRefresh: () => void;
}

export const ConnectorsView: React.FC<ConnectorsViewProps> = ({
  darkMode,
  tenantId,
  catalog,
  tenantInstances,
  onRefresh
}) => {
  const [probingProvider, setProbingProvider] = useState<string | null>(null);
  const [probeResult, setProbeResult] = useState<{ provider: string; success: boolean; message: string } | null>(null);

  const authHeaders = {
    Authorization: 'Bearer demo-session',
    'Content-Type': 'application/json'
  };

  const handleProbeConnector = async (provider: string) => {
    setProbingProvider(provider);
    setProbeResult(null);

    try {
      const res = await fetch('/api/connector-registry/verify', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ provider })
      });

      const d = await res.json();
      if (res.ok && d.success) {
        setProbeResult({
          provider,
          success: true,
          message: `Probe verified! State: ${d.instance?.connectionState || 'VERIFIED'} (Latency: ${d.probeResult?.latencyMs || 25}ms)`
        });
        onRefresh();
      } else {
        setProbeResult({
          provider,
          success: false,
          message: d.error || 'Connector probe failed to verify live credentials.'
        });
      }
    } catch (err: any) {
      setProbeResult({
        provider,
        success: false,
        message: err?.message || 'Network error probing connector.'
      });
    } finally {
      setProbingProvider(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div
        className={`p-5 rounded-xl border flex items-center justify-between gap-4 ${
          darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-sky-500/20 text-sky-400">
            <Plug className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold flex items-center gap-2">
              <span>Authoritative Connector Registry</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-sky-500/20 text-sky-300 font-bold">
                {tenantInstances.filter((t) => t.connectionState === 'VERIFIED').length} /{' '}
                {catalog.length} VERIFIED
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Deterministic external integrations with authoritative health probes, fail-closed isolation, and masked credential vaults.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Probe Notification */}
      {probeResult && (
        <div
          className={`p-4 rounded-xl border text-xs font-medium flex items-center justify-between gap-3 ${
            probeResult.success
              ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-200'
              : 'border-rose-500/40 bg-rose-950/40 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {probeResult.success ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            <span>
              <strong>{probeResult.provider}:</strong> {probeResult.message}
            </span>
          </div>
          <button
            onClick={() => setProbeResult(null)}
            className="text-slate-400 hover:text-white cursor-pointer"
          >
            &times;
          </button>
        </div>
      )}

      {/* 3. Connectors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {catalog.map((cat) => {
          const instance = tenantInstances.find((inst) => inst.provider === cat.provider);
          const state = instance?.connectionState || 'UNCONFIGURED';
          const isVerified = state === 'VERIFIED';
          const isProbing = probingProvider === cat.provider;

          return (
            <div
              key={cat.provider}
              className={`p-5 rounded-xl border flex flex-col justify-between gap-4 transition ${
                darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-200">{cat.displayName}</h3>
                    <div className="text-[10px] text-slate-400 font-mono">Provider: {cat.provider}</div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold inline-flex items-center gap-1 ${
                      isVerified
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : state === 'CONFIGURED_UNVERIFIED'
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {isVerified && <CheckCircle2 className="w-3 h-3" />}
                    {state === 'CONFIGURED_UNVERIFIED' && <AlertTriangle className="w-3 h-3" />}
                    <span>{state}</span>
                  </span>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">{cat.description}</p>

                <div className="space-y-1.5 pt-2 border-t border-slate-800 text-[11px]">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Capability:</span>
                    <span className="font-mono text-slate-200">{cat.capability}</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-400">
                    <span>Auth Mechanism:</span>
                    <span className="font-mono text-slate-200">{cat.authType}</span>
                  </div>

                  {instance?.lastVerificationAt && (
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Last Verified:</span>
                      <span className="font-mono text-[10px]">
                        {new Date(instance.lastVerificationAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>

                <div className="pt-2">
                  <span className="text-[10px] font-semibold text-slate-400 block mb-1">Supported Actions:</span>
                  <div className="flex flex-wrap gap-1">
                    {cat.supportedActions.map((action) => (
                      <span
                        key={action}
                        className="px-1.5 py-0.5 rounded bg-slate-800 text-[9px] font-mono text-slate-300"
                      >
                        {action}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                  <Lock className="w-3 h-3 text-slate-500" />
                  <span>Vault Masked</span>
                </div>

                <button
                  onClick={() => handleProbeConnector(cat.provider)}
                  disabled={isProbing}
                  className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  {isProbing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                  <span>{isProbing ? 'Probing...' : 'Probe Live Health'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
