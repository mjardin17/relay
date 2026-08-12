import React from 'react';
import { ShieldCheck, Lock, CheckCircle2, AlertTriangle, Building } from 'lucide-react';
import { ClientOnboardingPortal } from '../../types/launchProgram';

interface ClientOnboardingScreenProps {
  portals: ClientOnboardingPortal[];
  onUpdatePortal: (portalId: string, score: number, missing: string[]) => void;
  darkMode: boolean;
}

export const ClientOnboardingScreen: React.FC<ClientOnboardingScreenProps> = ({
  portals,
  onUpdatePortal,
  darkMode
}) => {
  const portal = portals[0];

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
            Guided Client Onboarding Portal & API Credentials Manager
          </h2>
          <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
            SIMULATED STORE (NON-KMS)
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Collect company details, operating hours, FAQs, policies, and system access through simulated client credential storage.
        </p>
      </div>

      {/* Production Boundary Notice */}
      <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-xs text-amber-200 font-mono">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-amber-300 block">SECURITY NOTICE — SIMULATED LOCAL STORE:</span>
          API keys and tokens in this view are stored in unencrypted local application state for demonstration. For production deployment, connect Google Cloud KMS or HashiCorp Vault.
        </div>
      </div>

      {portal && (
        <div className="space-y-6">
          {/* Completeness Header Card */}
          <div className={`p-6 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
            portal.completenessScore >= 100
              ? 'border-emerald-500/40 bg-emerald-950/20'
              : darkMode
              ? 'bg-slate-900/60 border-slate-800'
              : 'bg-white border-slate-200'
          }`}>
            <div>
              <span className="text-[10px] font-mono font-bold uppercase text-indigo-400">
                Client: {portal.clientCompanyName}
              </span>
              <h3 className="text-xl font-bold mt-0.5">Onboarding Completeness Audit</h3>
              <p className="text-xs text-slate-400 mt-1">
                Required for launching AI Receptionist & Lead Recovery workflows in live environment.
              </p>
            </div>

            <div className="flex items-center gap-4 shrink-0 font-mono">
              <div className="text-right">
                <span className="text-2xl font-extrabold text-emerald-400">{portal.completenessScore}%</span>
                <span className="text-[10px] text-slate-400 block uppercase">Completeness Score</span>
              </div>
              {portal.completenessScore < 100 && (
                <button
                  onClick={() => onUpdatePortal(portal.id, 100, [])}
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer"
                >
                  Mark Onboarding Complete
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Collected Details */}
            <div className={`p-5 rounded-xl border space-y-4 ${darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
              <h4 className="text-xs font-bold uppercase font-mono text-indigo-400 flex items-center gap-1.5">
                <Building className="w-4 h-4" /> Practice Operating Rules & Knowledge Base
              </h4>
              <div className="space-y-2.5 text-xs font-mono">
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Operating Hours</span>
                  <span className="text-slate-200 font-bold">{portal.collectedDetails.businessHours}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Primary Services List</span>
                  <span className="text-slate-200 font-bold">{portal.collectedDetails.primaryServicesList.join(', ')}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Ingested FAQ Count</span>
                  <span className="text-emerald-400 font-bold">{portal.collectedDetails.faqItemsCount} Clinical FAQs Ingested</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Escalation Contact</span>
                  <span className="text-slate-200 font-bold">{portal.collectedDetails.escalationContact}</span>
                </div>
              </div>
            </div>

            {/* Simulated Credentials Store */}
            <div className={`p-5 rounded-xl border space-y-4 ${darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
              <h4 className="text-xs font-bold uppercase font-mono text-amber-400 flex items-center gap-1.5">
                <Lock className="w-4 h-4" /> Client API Credentials Manager (Simulated)
              </h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Credentials Store (Simulation Mode): Access parameters collected for API connectivity testing.
              </p>

              <div className="space-y-2 text-xs font-mono">
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <span>OpenDental / Dentrix API Key</span>
                  <span className="text-amber-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" /> Stored (Plaintext)
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <span>Twilio Voice & SMS Auth Token</span>
                  <span className="text-amber-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" /> Stored (Plaintext)
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <span>Practice Calendar Webhook Secret</span>
                  <span className="text-amber-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" /> Stored (Plaintext)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Implementation Milestone Plan */}
          <div className={`p-5 rounded-xl border space-y-3 ${darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
            <h4 className="text-xs font-bold uppercase font-mono text-sky-400">Implementation Milestone Plan</h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs font-mono">
              {portal.implementationPlan.map((milestone, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 block font-bold">Target: Day {milestone.targetDays}</span>
                  <h5 className="font-bold text-slate-200">{milestone.milestone}</h5>
                  <span className={`inline-block text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                    milestone.status === 'completed'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : milestone.status === 'in_progress'
                      ? 'bg-sky-500/20 text-sky-400'
                      : 'bg-slate-800 text-slate-400'
                  }`}>
                    {milestone.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
