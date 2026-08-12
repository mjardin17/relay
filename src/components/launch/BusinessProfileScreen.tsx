import React, { useState } from 'react';
import { Building2, Target, Users, DollarSign, Clock, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { ProviderBusinessProfile } from '../../types/launchProgram';

interface BusinessProfileScreenProps {
  profile: ProviderBusinessProfile;
  onUpdateProfile: (updates: Partial<ProviderBusinessProfile>) => void;
  darkMode: boolean;
}

export const BusinessProfileScreen: React.FC<BusinessProfileScreenProps> = ({
  profile,
  onUpdateProfile,
  darkMode
}) => {
  const [formData, setFormData] = useState(profile);
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile(formData);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-400" />
            Agency & Provider Profile
          </h2>
          <p className="text-xs text-slate-400">
            Define your agency brand, income targets, capacity, and service positioning constraints.
          </p>
        </div>
        {saved && (
          <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Profile Updated
          </span>
        )}
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Core Identity */}
        <div className={`p-5 rounded-xl border space-y-4 ${darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
          <h3 className="text-sm font-semibold flex items-center gap-2 text-indigo-400">
            <Users className="w-4 h-4" /> Provider Identity & Brand
          </h3>
          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Provider Name</label>
              <input
                type="text"
                value={formData.providerName}
                onChange={e => setFormData({ ...formData, providerName: e.target.value })}
                className={`w-full px-3 py-2 rounded-lg border text-xs focus:outline-none focus:border-indigo-500 ${
                  darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Agency Brand Name</label>
              <input
                type="text"
                value={formData.agencyBrand}
                onChange={e => setFormData({ ...formData, agencyBrand: e.target.value })}
                className={`w-full px-3 py-2 rounded-lg border text-xs focus:outline-none focus:border-indigo-500 ${
                  darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Service Vision & Goals</label>
              <textarea
                rows={3}
                value={formData.serviceGoals}
                onChange={e => setFormData({ ...formData, serviceGoals: e.target.value })}
                className={`w-full px-3 py-2 rounded-lg border text-xs focus:outline-none focus:border-indigo-500 ${
                  darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Financial Targets & Capacity */}
        <div className={`p-5 rounded-xl border space-y-4 ${darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
          <h3 className="text-sm font-semibold flex items-center gap-2 text-emerald-400">
            <DollarSign className="w-4 h-4" /> Capacity & Income Targets
          </h3>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Target Monthly Revenue ($)</label>
              <input
                type="number"
                value={formData.targetMonthlyIncome}
                onChange={e => setFormData({ ...formData, targetMonthlyIncome: Number(e.target.value) })}
                className={`w-full px-3 py-2 rounded-lg border text-xs focus:outline-none focus:border-indigo-500 ${
                  darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Current Monthly Revenue ($)</label>
              <input
                type="number"
                value={formData.currentMonthlyIncome}
                onChange={e => setFormData({ ...formData, currentMonthlyIncome: Number(e.target.value) })}
                className={`w-full px-3 py-2 rounded-lg border text-xs focus:outline-none focus:border-indigo-500 ${
                  darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Max Client Capacity</label>
              <input
                type="number"
                value={formData.clientCapacityMax}
                onChange={e => setFormData({ ...formData, clientCapacityMax: Number(e.target.value) })}
                className={`w-full px-3 py-2 rounded-lg border text-xs focus:outline-none focus:border-indigo-500 ${
                  darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Active Clients Count</label>
              <input
                type="number"
                value={formData.currentClientsCount}
                onChange={e => setFormData({ ...formData, currentClientsCount: Number(e.target.value) })}
                className={`w-full px-3 py-2 rounded-lg border text-xs focus:outline-none focus:border-indigo-500 ${
                  darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Baseline Metrics */}
        <div className={`p-5 rounded-xl border space-y-4 md:col-span-2 ${darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
          <h3 className="text-sm font-semibold flex items-center gap-2 text-sky-400">
            <Target className="w-4 h-4" /> Industry Baseline & Operational Constraints
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Industry Lead Response Time (mins)</label>
              <input
                type="number"
                value={formData.baselineMetrics.leadResponseTimeMinutes}
                onChange={e => setFormData({
                  ...formData,
                  baselineMetrics: { ...formData.baselineMetrics, leadResponseTimeMinutes: Number(e.target.value) }
                })}
                className={`w-full px-3 py-2 rounded-lg border text-xs focus:outline-none focus:border-indigo-500 ${
                  darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Average Deal Size ($)</label>
              <input
                type="number"
                value={formData.baselineMetrics.avgDealSize}
                onChange={e => setFormData({
                  ...formData,
                  baselineMetrics: { ...formData.baselineMetrics, avgDealSize: Number(e.target.value) }
                })}
                className={`w-full px-3 py-2 rounded-lg border text-xs focus:outline-none focus:border-indigo-500 ${
                  darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Average Sales Cycle (days)</label>
              <input
                type="number"
                value={formData.baselineMetrics.salesCycleDays}
                onChange={e => setFormData({
                  ...formData,
                  baselineMetrics: { ...formData.baselineMetrics, salesCycleDays: Number(e.target.value) }
                })}
                className={`w-full px-3 py-2 rounded-lg border text-xs focus:outline-none focus:border-indigo-500 ${
                  darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
            </div>
          </div>
          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-950 cursor-pointer"
            >
              Save Profile Configurations
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
