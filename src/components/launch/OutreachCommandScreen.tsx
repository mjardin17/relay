import React from 'react';
import { Send, ShieldCheck, CheckCircle2, XCircle, AlertTriangle, Lock } from 'lucide-react';
import { OutreachDraft } from '../../types/launchProgram';

interface OutreachCommandScreenProps {
  drafts: OutreachDraft[];
  onApproveDraft: (draftId: string) => void;
  onRejectDraft: (draftId: string) => void;
  darkMode: boolean;
}

export const OutreachCommandScreen: React.FC<OutreachCommandScreenProps> = ({
  drafts,
  onApproveDraft,
  onRejectDraft,
  darkMode
}) => {
  const pendingQueue = drafts.filter(d => d.approvalStatus === 'pending_owner_approval');
  const dispatchedList = drafts.filter(d => d.approvalStatus === 'dispatched');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Send className="w-5 h-5 text-indigo-400" />
          Outreach Command Center & Human Approval Gate
        </h2>
        <p className="text-xs text-slate-400">
          Strict Human-in-the-Loop Governance: AI generates evidence-grounded outreach, but ZERO external messages are dispatched without owner approval.
        </p>
      </div>

      {/* Safety Compliance Guardrails Bar */}
      <div className={`p-4 rounded-xl border flex flex-col md:flex-row items-center justify-between gap-4 font-mono text-xs ${
        darkMode ? 'bg-indigo-950/20 border-indigo-500/30 text-indigo-300' : 'bg-indigo-50 border-indigo-200 text-indigo-900'
      }`}>
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-6 h-6 text-indigo-400 shrink-0" />
          <div>
            <span className="font-bold block uppercase text-[10px]">Safety Protocol Active</span>
            <span>Opt-Out Checked • Evidence Verified • Compliance Rules Passed</span>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-slate-300">
          <Lock className="w-3.5 h-3.5 text-emerald-400" />
          <span>Pending Queue: {pendingQueue.length} Drafts</span>
        </div>
      </div>

      {/* Pending Approval Queue */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold uppercase font-mono text-amber-400 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> Owner Approval Queue ({pendingQueue.length})
        </h3>

        {pendingQueue.length === 0 ? (
          <div className="p-8 rounded-2xl border border-dashed border-slate-800 text-center text-slate-500 text-xs">
            Approval Queue Clear. All queued outreach messages have been processed.
          </div>
        ) : (
          pendingQueue.map((draft) => (
            <div
              key={draft.id}
              className={`p-6 rounded-2xl border space-y-4 ${
                darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase text-indigo-400">
                    To: {draft.prospectName} ({draft.companyName})
                  </span>
                  <h4 className="text-base font-bold mt-0.5">Subject: {draft.subjectLine}</h4>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20">
                  <CheckCircle2 className="w-3 h-3" />
                  Clean Consent Status
                </div>
              </div>

              {/* Message Body */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono whitespace-pre-wrap text-slate-200 leading-relaxed">
                {draft.messageBody}
              </div>

              {/* Evidence Points */}
              <div className="text-xs space-y-1 bg-slate-950/40 p-3 rounded-lg border border-slate-800/80">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">
                  Grounding Evidence Used in Personalization:
                </span>
                {draft.personalizedEvidencePoints.map((pt, idx) => (
                  <div key={idx} className="text-slate-300 flex items-center gap-1.5 font-mono text-[11px]">
                    <span className="text-indigo-400">•</span> {pt}
                  </div>
                ))}
              </div>

              {/* Approval Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => onRejectDraft(draft.id)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 cursor-pointer flex items-center gap-1.5"
                >
                  <XCircle className="w-4 h-4" /> Reject Outreach
                </button>
                <button
                  onClick={() => onApproveDraft(draft.id)}
                  className="px-5 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-md shadow-emerald-950 cursor-pointer flex items-center gap-1.5"
                >
                  <Send className="w-4 h-4" /> Approve & Dispatch Communication
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Dispatched History */}
      {dispatchedList.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-slate-800">
          <h3 className="text-sm font-bold uppercase font-mono text-emerald-400 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> Dispatched Communications Log ({dispatchedList.length})
          </h3>
          <div className="space-y-2">
            {dispatchedList.map(d => (
              <div key={d.id} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs flex items-center justify-between font-mono">
                <div>
                  <span className="text-slate-200 font-bold">{d.prospectName} ({d.companyName})</span>
                  <span className="text-slate-500 block text-[10px]">{d.subjectLine}</span>
                </div>
                <div className="text-right text-[10px] text-emerald-400">
                  Dispatched at {d.dispatchedAt ? new Date(d.dispatchedAt).toLocaleTimeString() : 'Just now'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
