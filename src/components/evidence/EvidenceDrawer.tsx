import React from 'react';
import { X, ShieldCheck, Database, Calculator, AlertTriangle, Layers, Clock, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { EvidenceItem } from '../../types/evidence';

interface EvidenceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  evidence: EvidenceItem | null;
  itemTitle?: string;
}

export const EvidenceDrawer: React.FC<EvidenceDrawerProps> = ({
  isOpen,
  onClose,
  evidence,
  itemTitle
}) => {
  if (!isOpen || !evidence) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/60 backdrop-blur-sm transition-opacity">
      <div className="absolute inset-y-0 right-0 flex max-w-full pl-10">
        <div className="w-screen max-w-2xl bg-slate-900 border-l border-slate-800 text-slate-100 shadow-2xl flex flex-col">
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/80 sticky top-0 z-10 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-semibold">
                  Growth Evidence & Provenance Graph
                </span>
                <h2 className="text-lg font-bold text-slate-100">
                  {itemTitle || evidence.title}
                </h2>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Top Banner Status */}
            <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-slate-800/60 border border-slate-700/60">
              <div>
                <span className="text-[11px] text-slate-400 font-medium block">Data Confidence</span>
                <div className="flex items-center gap-1.5 mt-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-semibold text-emerald-400">{evidence.confidence}</span>
                </div>
              </div>

              <div>
                <span className="text-[11px] text-slate-400 font-medium block">Source Freshness</span>
                <div className="flex items-center gap-1.5 mt-1">
                  <Clock className="w-4 h-4 text-sky-400" />
                  <span className="text-sm font-semibold text-slate-200">{evidence.dataFreshnessMinutes}m ago</span>
                </div>
              </div>

              <div>
                <span className="text-[11px] text-slate-400 font-medium block">Observation Window</span>
                <div className="flex items-center gap-1.5 mt-1">
                  <Layers className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-semibold text-slate-200 truncate">{evidence.observationPeriod}</span>
                </div>
              </div>
            </div>

            {/* Source Systems connected */}
            <div className="space-y-2">
              <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-400" />
                Connected Source Systems
              </h3>
              <div className="flex flex-wrap gap-2">
                {evidence.sourceSystems.map((sys) => (
                  <span
                    key={sys}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs font-mono text-slate-200 flex items-center gap-2"
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    {sys.toUpperCase()}
                  </span>
                ))}
              </div>
            </div>

            {/* Formula & Calculation Transparency */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-emerald-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-semibold flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-emerald-400" />
                  Deterministic Formula & Calculation
                </h3>
                <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                  ID: {evidence.calculation.formulaIdentifier} v{evidence.calculation.formulaVersion}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 font-mono text-xs text-slate-200">
                <span className="text-slate-500">// Formula Expression:</span>
                <div className="text-emerald-300 font-bold mt-1">{evidence.calculation.formulaExpression}</div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                {Object.entries(evidence.calculation.inputVariables).map(([key, val]) => (
                  <div key={key} className="p-2 rounded bg-slate-900/60 border border-slate-800 flex justify-between">
                    <span className="text-slate-400 font-mono text-[11px]">{key}:</span>
                    <span className="text-slate-200 font-semibold font-mono">{typeof val === 'number' ? val.toLocaleString() : val}</span>
                  </div>
                ))}
              </div>

              <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-200 flex items-center justify-between">
                <span>Calculated Output Value:</span>
                <span className="text-lg font-bold font-mono text-emerald-400">
                  ${evidence.calculation.outputValue.toLocaleString()} / mo
                </span>
              </div>
            </div>

            {/* Assumptions */}
            {evidence.calculation.assumptions.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold">
                  Calculation Assumptions
                </h3>
                <ul className="space-y-1.5">
                  {evidence.calculation.assumptions.map((asm, idx) => (
                    <li key={idx} className="text-xs text-slate-300 flex items-start gap-2 bg-slate-800/40 p-2.5 rounded-lg border border-slate-700/50">
                      <span className="text-emerald-400 font-bold">•</span>
                      <span>{asm}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Sample Verified Records Preview */}
            {evidence.sampleRecordsPreview.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold">
                  Verified Source Records ({evidence.sampleRecordsPreview.length})
                </h3>
                <div className="space-y-2">
                  {evidence.sampleRecordsPreview.map((rec, i) => (
                    <div key={i} className="p-3 rounded-lg bg-slate-800/60 border border-slate-700 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-semibold text-slate-200 block">{rec.label}: {rec.detail}</span>
                        <span className="text-[11px] text-slate-400 font-mono">{rec.value}</span>
                      </div>
                      <span className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-[10px] font-mono text-emerald-400">
                        VERIFIED MATCH
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Warnings */}
            {evidence.missingDataWarnings.length > 0 && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-amber-400">
                  <AlertTriangle className="w-4 h-4" />
                  Data Quality & Completeness Warning
                </div>
                {evidence.missingDataWarnings.map((w, i) => (
                  <p key={i} className="text-[11px] text-amber-200/90 pl-5">• {w}</p>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors"
            >
              Close Evidence Drawer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
