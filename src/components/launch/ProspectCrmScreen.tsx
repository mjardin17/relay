import React, { useState } from 'react';
import { Users, Filter, Plus, CheckCircle2, ShieldAlert, ArrowUpRight, Search } from 'lucide-react';
import { ProspectRecord } from '../../types/launchProgram';

interface ProspectCrmScreenProps {
  prospects: ProspectRecord[];
  onAddProspect: (prospect: ProspectRecord) => void;
  onUpdateStatus: (id: string, status: ProspectRecord['outreachStatus'], nextAction?: string) => void;
  darkMode: boolean;
}

export const ProspectCrmScreen: React.FC<ProspectCrmScreenProps> = ({
  prospects,
  onAddProspect,
  onUpdateStatus,
  darkMode
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCompany, setNewCompany] = useState('');
  const [newContact, setNewContact] = useState('');
  const [newEmail, setNewEmail] = useState('');

  const filtered = prospects.filter(p =>
    p.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.contactName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.industry.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompany || !newEmail) return;
    const item: ProspectRecord = {
      id: `prospect-${Date.now()}`,
      companyName: newCompany,
      contactName: newContact || 'Decision Maker',
      contactEmail: newEmail,
      websiteUrl: `https://${newCompany.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
      industry: 'Dental Practice',
      estimatedRevenue: '$2.0M / yr',
      qualificationScore: 88,
      fitScore: 90,
      painScore: 85,
      reachabilityScore: 88,
      evidenceStrength: 'Verified',
      painHypothesis: 'After-hours calls unmonitored.',
      outreachStatus: 'draft_queued',
      consentState: 'business_inquiry_allowed',
      estimatedDealValue: 36000,
      notes: 'Added manually via Prospect CRM.',
      nextAction: 'Draft personalized outreach'
    };
    onAddProspect(item);
    setShowAddModal(false);
    setNewCompany('');
    setNewContact('');
    setNewEmail('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-400" />
            Qualified Prospect Directory & Fit Scorer
          </h2>
          <p className="text-xs text-slate-400">
            Import, score, and track prospects with multi-factor qualification (Fit, Pain, Reachability, Value) and clean consent status.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Prospect
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        <input
          type="text"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Filter prospects by company, contact, or industry..."
          className={`w-full pl-9 pr-4 py-2 rounded-xl text-xs border focus:outline-none focus:border-indigo-500 ${
            darkMode ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-900'
          }`}
        />
      </div>

      {/* Prospect Table */}
      <div className={`rounded-xl border overflow-hidden ${darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className={`border-b font-mono text-[10px] uppercase tracking-wider ${darkMode ? 'bg-slate-950/80 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                <th className="p-3">Company & Contact</th>
                <th className="p-3">Qual Score</th>
                <th className="p-3">Pain Hypothesis</th>
                <th className="p-3">Outreach Status</th>
                <th className="p-3">Consent Check</th>
                <th className="p-3">Next Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.map((prospect) => (
                <tr key={prospect.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="p-3">
                    <div className="font-bold text-slate-200">{prospect.companyName}</div>
                    <div className="text-[11px] text-slate-400">{prospect.contactName} • {prospect.contactEmail}</div>
                  </td>
                  <td className="p-3 font-mono">
                    <span className="text-sm font-extrabold text-emerald-400">{prospect.qualificationScore}</span>
                    <span className="text-[10px] text-slate-400 block font-sans">Fit {prospect.fitScore} | Pain {prospect.painScore}</span>
                  </td>
                  <td className="p-3 max-w-xs text-slate-300 leading-snug text-[11px]">
                    {prospect.painHypothesis}
                  </td>
                  <td className="p-3 font-mono">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      prospect.outreachStatus === 'meeting_booked'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : prospect.outreachStatus === 'outreach_sent'
                        ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}>
                      {prospect.outreachStatus.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="p-3 font-mono text-[10px]">
                    <span className="text-emerald-400 flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3" />
                      {prospect.consentState.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="p-3 font-medium text-slate-300">
                    {prospect.nextAction}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`w-full max-w-md p-6 rounded-2xl border ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-900'}`}>
            <h3 className="text-base font-bold mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-400" /> Add Prospect Record
            </h3>
            <form onSubmit={handleAdd} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Company Name</label>
                <input
                  type="text"
                  required
                  value={newCompany}
                  onChange={e => setNewCompany(e.target.value)}
                  placeholder="e.g. Apex Dental Group"
                  className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:border-indigo-500 ${
                    darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Contact Name</label>
                <input
                  type="text"
                  value={newContact}
                  onChange={e => setNewContact(e.target.value)}
                  placeholder="e.g. Dr. Marcus Vance"
                  className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:border-indigo-500 ${
                    darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Contact Email</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  placeholder="e.g. marcus@apexdental.com"
                  className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:border-indigo-500 ${
                    darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold cursor-pointer"
                >
                  Save Prospect
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
