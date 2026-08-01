import React from 'react';
import { Database, Activity, RefreshCw, AlertTriangle, ShieldCheck, CheckCircle2, Server, FileSpreadsheet } from 'lucide-react';
import { growthEvidenceEngine } from '../../services/growthEvidenceEngine';

interface DataQualityCenterProps {
  darkMode: boolean;
}

export const DataQualityCenter: React.FC<DataQualityCenterProps> = ({ darkMode }) => {
  const sources = growthEvidenceEngine.getDataSources();
  const issues = growthEvidenceEngine.getDataQualityIssues();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
            Integration Health & Provenance
          </span>
        </div>
        <h1 className="text-2xl font-bold text-slate-100 mt-1">Data Quality & Integration Health</h1>
        <p className="text-xs text-slate-400">
          Verify data source reliability, sync freshness, ingested entity volumes, and data completeness warnings.
        </p>
      </div>

      {/* Connected Data Sources Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sources.map((src) => (
          <div key={src.id} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-slate-800 text-emerald-400 border border-slate-700">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">{src.name}</h3>
                  <span className="text-[11px] text-slate-400 font-mono">{src.category}</span>
                </div>
              </div>

              <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {src.status}
              </span>
            </div>

            {/* Ingested Metrics */}
            <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs font-mono">
              <div>
                <span className="text-slate-500 text-[10px] block">Records Ingested</span>
                <span className="text-slate-200 font-bold">{src.recordsIngested.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block">Failed Records</span>
                <span className={src.failedRecords > 0 ? 'text-amber-400 font-bold' : 'text-slate-400'}>
                  {src.failedRecords}
                </span>
              </div>
            </div>

            {/* Health Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400 text-[11px]">Source Quality Health</span>
                <span className="text-emerald-400 font-bold">{src.healthScore}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${src.healthScore}%` }} />
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1 border-t border-slate-800">
              <span>Synced: {src.lastSyncAt}</span>
              <button className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 transition-colors">
                <RefreshCw className="w-3 h-3" /> Re-Sync
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Data Quality Issues & Completeness Warnings */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-400" />
          Data Quality & Completeness Audit
        </h2>

        <div className="space-y-3">
          {issues.map((issue) => (
            <div key={issue.id} className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 font-semibold text-amber-300">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span>{issue.description}</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Severity: {issue.severity}
                </span>
              </div>
              <p className="text-xs text-amber-200/80 pl-6 font-mono">Suggested Fix: {issue.suggestedFix}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
