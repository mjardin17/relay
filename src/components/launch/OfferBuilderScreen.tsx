import React, { useState } from 'react';
import { Award, CheckCircle2, DollarSign, ShieldCheck, Sparkles, Plus, AlertCircle } from 'lucide-react';
import { ProductizedOffer } from '../../types/launchProgram';

interface OfferBuilderScreenProps {
  offers: ProductizedOffer[];
  onApproveOffer: (offerId: string) => void;
  onCreateOffer: (offer: ProductizedOffer) => void;
  darkMode: boolean;
}

export const OfferBuilderScreen: React.FC<OfferBuilderScreenProps> = ({
  offers,
  onApproveOffer,
  onCreateOffer,
  darkMode
}) => {
  const [generating, setGenerating] = useState(false);

  const handleGenerateAI = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/launch-program/generate-offer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nicheName: 'Dental Practices & Specialty Care',
          primaryProblem: 'Unanswered calls and slow lead response'
        })
      });
      const data = await res.json();
      if (data.success && data.offer) {
        onCreateOffer(data.offer);
      }
    } catch {
      // Fallback
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Award className="w-5 h-5 text-indigo-400" />
            Productized AI Service Offer Builder
          </h2>
          <p className="text-xs text-slate-400">
            Construct high-ticket productized service packages ($2.5k setup + $3.5k/mo retainer) with explicit deliverables, exclusions, and risk-reversal guarantees.
          </p>
        </div>
        <button
          onClick={handleGenerateAI}
          disabled={generating}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:opacity-90 transition-all shadow-md cursor-pointer disabled:opacity-50"
        >
          <Sparkles className="w-4 h-4" />
          {generating ? 'Architecting Offer...' : 'Generate New Offer with AI'}
        </button>
      </div>

      <div className="space-y-6">
        {offers.map((offer) => {
          const isApproved = offer.approvalState === 'approved';
          return (
            <div
              key={offer.id}
              className={`p-6 rounded-2xl border transition-all ${
                isApproved
                  ? 'border-emerald-500/40 bg-gradient-to-b from-emerald-950/20 to-slate-900/80'
                  : darkMode
                  ? 'bg-slate-900/60 border-slate-800'
                  : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                      {offer.targetNiche}
                    </span>
                    {isApproved ? (
                      <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Approved Offer
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        Pending Sign-Off
                      </span>
                    )}
                  </div>
                  <h3 className="text-xl font-bold">{offer.offerTitle}</h3>
                </div>

                {/* Pricing Badges */}
                <div className="flex items-center gap-3 font-mono text-xs shrink-0">
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-center">
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">One-Time Setup Fee</span>
                    <span className="text-lg font-extrabold text-indigo-400">${offer.pricing.setupFee.toLocaleString()}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-center">
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Monthly Retainer</span>
                    <span className="text-lg font-extrabold text-emerald-400">${offer.pricing.monthlyRetainer.toLocaleString()}/mo</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800/80 text-xs mb-5 space-y-2">
                <p>
                  <strong className="text-indigo-400">Primary Problem Solved:</strong>{' '}
                  <span className="text-slate-200">{offer.primaryProblemSolved}</span>
                </p>
                <p>
                  <strong className="text-emerald-400">Transformation Outcome:</strong>{' '}
                  <span className="text-slate-200">{offer.transformationOutcome}</span>
                </p>
              </div>

              {/* Scope Deliverables vs Exclusions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs mb-5">
                <div className="p-4 rounded-xl bg-emerald-950/10 border border-emerald-500/20">
                  <h4 className="font-bold text-emerald-400 mb-2 flex items-center gap-1.5 uppercase font-mono text-[11px]">
                    <CheckCircle2 className="w-4 h-4" /> Scope & Included Deliverables
                  </h4>
                  <ul className="space-y-1.5 text-slate-300">
                    {offer.deliverables.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-emerald-400 font-bold">✓</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 rounded-xl bg-rose-950/10 border border-rose-500/20">
                  <h4 className="font-bold text-rose-400 mb-2 flex items-center gap-1.5 uppercase font-mono text-[11px]">
                    <AlertCircle className="w-4 h-4" /> Explicit Exclusions (Scope Protection)
                  </h4>
                  <ul className="space-y-1.5 text-slate-300">
                    {offer.exclusions.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-rose-400 font-bold">✕</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Risk Reversal Guarantee */}
              <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/30 text-xs mb-5">
                <h4 className="font-bold text-indigo-400 mb-1 flex items-center gap-1.5 font-mono text-[11px] uppercase">
                  <ShieldCheck className="w-4 h-4 text-indigo-400" /> Risk-Reversal Guarantee Terms
                </h4>
                <p className="text-slate-300 leading-relaxed font-mono">
                  {offer.guaranteeTerms}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <span className="text-[11px] font-mono text-slate-400">
                  {isApproved && offer.approvedAt
                    ? `Approved by Owner on ${new Date(offer.approvedAt).toLocaleDateString()}`
                    : 'Requires Owner Sign-off before sending proposals'}
                </span>
                {!isApproved && (
                  <button
                    onClick={() => onApproveOffer(offer.id)}
                    className="px-5 py-2.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-md shadow-emerald-950 cursor-pointer flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Approve & Lock Productized Offer
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
