import React, { useState, useEffect } from 'react';
import {
  Building2,
  MapPin,
  Clock,
  Briefcase,
  Target,
  Users,
  Sliders,
  CheckCircle2,
  Plus,
  Trash2,
  Save,
  RefreshCw,
  Globe,
  Phone,
  Mail,
  ShieldCheck
} from 'lucide-react';

interface BusinessProfileViewProps {
  darkMode: boolean;
  tenantId: string;
  onProfileUpdated?: () => void;
}

export const BusinessProfileView: React.FC<BusinessProfileViewProps> = ({
  darkMode,
  tenantId,
  onProfileUpdated
}) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form State
  const [legalName, setLegalName] = useState('');
  const [dbaName, setDbaName] = useState('');
  const [industry, setIndustry] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [city, setCity] = useState('');
  const [stateProvince, setStateProvince] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('US');

  const [businessHours, setBusinessHours] = useState<any[]>([]);
  const [serviceAreas, setServiceAreas] = useState<string[]>([]);
  const [newArea, setNewArea] = useState('');

  const [productsAndServices, setProductsAndServices] = useState<any[]>([]);
  const [newServiceName, setNewServiceName] = useState('');
  const [newServiceCategory, setNewServiceCategory] = useState('Services');
  const [newServicePrice, setNewServicePrice] = useState('');

  const [businessGoals, setBusinessGoals] = useState<any[]>([]);
  const [newGoalText, setNewGoalText] = useState('');
  const [newGoalMetric, setNewGoalMetric] = useState('');

  const [communicationPreferences, setCommunicationPreferences] = useState<any>({
    channel: 'EMAIL_AND_DASHBOARD',
    requireApprovalForOutbound: true,
    tone: 'DIRECT_PROFESSIONAL',
    escalationContact: ''
  });

  const [publishingPreferences, setPublishingPreferences] = useState<any>({
    autoPublishApprovedPosts: false,
    proofOfWorkWatermark: true,
    requireTwoPersonIntegrity: true
  });

  const [teamMembers, setTeamMembers] = useState<any[]>([]);

  const authHeaders = {
    Authorization: 'Bearer demo-session',
    'Content-Type': 'application/json'
  };

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/control-center/business-profile', { headers: authHeaders });
      if (res.ok) {
        const d = await res.json();
        const p = d.profile;
        if (p) {
          setLegalName(p.legalName || '');
          setDbaName(p.dbaName || '');
          setIndustry(p.industry || '');
          setWebsiteUrl(p.websiteUrl || '');
          setPhone(p.phone || '');
          setEmail(p.email || '');
          setStreetAddress(p.address?.street || '');
          setCity(p.address?.city || '');
          setStateProvince(p.address?.stateProvince || '');
          setPostalCode(p.address?.postalCode || '');
          setCountry(p.address?.country || 'US');

          setBusinessHours(
            p.businessHours && p.businessHours.length > 0
              ? p.businessHours
              : [
                  { day: 'Monday', open: '08:00', close: '17:00', isClosed: false },
                  { day: 'Tuesday', open: '08:00', close: '17:00', isClosed: false },
                  { day: 'Wednesday', open: '08:00', close: '17:00', isClosed: false },
                  { day: 'Thursday', open: '08:00', close: '17:00', isClosed: false },
                  { day: 'Friday', open: '08:00', close: '17:00', isClosed: false },
                  { day: 'Saturday', open: '09:00', close: '14:00', isClosed: false },
                  { day: 'Sunday', open: '00:00', close: '00:00', isClosed: true }
                ]
          );

          setServiceAreas(p.serviceAreas || []);
          setProductsAndServices(p.productsAndServices || []);
          setBusinessGoals(p.businessGoals || []);
          setCommunicationPreferences(p.communicationPreferences || {
            channel: 'EMAIL_AND_DASHBOARD',
            requireApprovalForOutbound: true,
            tone: 'DIRECT_PROFESSIONAL',
            escalationContact: p.email || ''
          });
          setPublishingPreferences(p.publishingPreferences || {
            autoPublishApprovedPosts: false,
            proofOfWorkWatermark: true,
            requireTwoPersonIntegrity: true
          });
          setTeamMembers(p.teamMembers || []);
        }
      }
    } catch (err: any) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [tenantId]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    try {
      const payload = {
        legalName,
        dbaName,
        industry,
        websiteUrl,
        phone,
        email,
        address: {
          street: streetAddress,
          city,
          stateProvince,
          postalCode,
          country
        },
        businessHours,
        serviceAreas,
        productsAndServices,
        businessGoals,
        communicationPreferences,
        publishingPreferences
      };

      const res = await fetch('/api/control-center/business-profile', {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setFeedback({ type: 'success', message: 'Business profile successfully saved and synchronized across Relay.' });
        if (onProfileUpdated) onProfileUpdated();
        setTimeout(() => setFeedback(null), 4000);
      } else {
        const err = await res.json();
        setFeedback({ type: 'error', message: err.error || 'Failed to save business profile.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Network error saving profile.' });
    } finally {
      setSaving(false);
    }
  };

  const handleAddServiceArea = () => {
    if (newArea.trim() && !serviceAreas.includes(newArea.trim())) {
      setServiceAreas([...serviceAreas, newArea.trim()]);
      setNewArea('');
    }
  };

  const handleRemoveServiceArea = (area: string) => {
    setServiceAreas(serviceAreas.filter((a) => a !== area));
  };

  const handleAddProductService = () => {
    if (newServiceName.trim()) {
      setProductsAndServices([
        ...productsAndServices,
        {
          id: `prod_${Date.now()}`,
          name: newServiceName.trim(),
          category: newServiceCategory,
          priceRange: newServicePrice || 'Custom Quote',
          status: 'ACTIVE'
        }
      ]);
      setNewServiceName('');
      setNewServicePrice('');
    }
  };

  const handleRemoveProductService = (id: string) => {
    setProductsAndServices(productsAndServices.filter((p) => p.id !== id));
  };

  const handleAddGoal = () => {
    if (newGoalText.trim()) {
      setBusinessGoals([
        ...businessGoals,
        {
          goal: newGoalText.trim(),
          targetMetric: newGoalMetric.trim() || 'Tracked in ROI ledger',
          status: 'IN_PROGRESS'
        }
      ]);
      setNewGoalText('');
      setNewGoalMetric('');
    }
  };

  const handleRemoveGoal = (idx: number) => {
    setBusinessGoals(businessGoals.filter((_, i) => i !== idx));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-sm text-slate-400">
        <RefreshCw className="w-5 h-5 animate-spin mr-2" />
        Loading Business Profile...
      </div>
    );
  }

  return (
    <form onSubmit={handleSaveProfile} className="space-y-6">
      {/* Header with Save Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-400" />
            <span>Business Profile & Operations Config</span>
          </h2>
          <p className="text-xs text-slate-400">
            Authoritative multi-tenant business identity, service territories, operational parameters, and governance settings.
          </p>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-md shadow-indigo-900/30"
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>{saving ? 'Saving...' : 'Save Profile Changes'}</span>
        </button>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-3 rounded-lg border text-xs font-medium flex items-center gap-2 ${
            feedback.type === 'success'
              ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-200'
              : 'border-rose-500/40 bg-rose-950/40 text-rose-200'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{feedback.message}</span>
        </div>
      )}

      {/* SECTION 1: Identity & Contact */}
      <div
        className={`p-5 rounded-xl border space-y-4 ${
          darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-indigo-400" /> Business Identity & Registration
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Legal Business Name *</label>
            <input
              type="text"
              required
              value={legalName}
              onChange={(e) => setLegalName(e.target.value)}
              className={`w-full p-2.5 rounded-lg border text-xs ${
                darkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-900'
              }`}
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">DBA / Trade Name</label>
            <input
              type="text"
              value={dbaName}
              onChange={(e) => setDbaName(e.target.value)}
              className={`w-full p-2.5 rounded-lg border text-xs ${
                darkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-900'
              }`}
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Industry / Trade *</label>
            <input
              type="text"
              required
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className={`w-full p-2.5 rounded-lg border text-xs ${
                darkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-900'
              }`}
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Public Website URL</label>
            <input
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://..."
              className={`w-full p-2.5 rounded-lg border text-xs ${
                darkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-900'
              }`}
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Primary Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 000-0000"
              className={`w-full p-2.5 rounded-lg border text-xs ${
                darkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-900'
              }`}
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Contact Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="contact@business.com"
              className={`w-full p-2.5 rounded-lg border text-xs ${
                darkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-900'
              }`}
            />
          </div>
        </div>
      </div>

      {/* SECTION 2: Physical Address & Service Areas */}
      <div
        className={`p-5 rounded-xl border space-y-4 ${
          darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-indigo-400" /> Physical Headquarters & Service Territories
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="lg:col-span-2">
            <label className="block text-xs text-slate-400 mb-1">Street Address</label>
            <input
              type="text"
              value={streetAddress}
              onChange={(e) => setStreetAddress(e.target.value)}
              placeholder="100 Main St, Suite 200"
              className={`w-full p-2.5 rounded-lg border text-xs ${
                darkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-900'
              }`}
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">City</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className={`w-full p-2.5 rounded-lg border text-xs ${
                darkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-900'
              }`}
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">State / Province</label>
            <input
              type="text"
              value={stateProvince}
              onChange={(e) => setStateProvince(e.target.value)}
              className={`w-full p-2.5 rounded-lg border text-xs ${
                darkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-900'
              }`}
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Postal Code</label>
            <input
              type="text"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              className={`w-full p-2.5 rounded-lg border text-xs ${
                darkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-900'
              }`}
            />
          </div>
        </div>

        {/* Service Areas Tag Manager */}
        <div className="pt-2">
          <label className="block text-xs font-semibold text-slate-400 mb-2">Service Areas & Target Municipalities</label>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {serviceAreas.map((area) => (
              <span
                key={area}
                className="px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5"
              >
                <span>{area}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveServiceArea(area)}
                  className="hover:text-rose-400 cursor-pointer"
                >
                  &times;
                </button>
              </span>
            ))}
          </div>

          <div className="flex items-center gap-2 max-w-md">
            <input
              type="text"
              value={newArea}
              onChange={(e) => setNewArea(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddServiceArea();
                }
              }}
              placeholder="Add city or region (e.g. New Bedford, MA)"
              className={`flex-1 p-2 rounded-lg border text-xs ${
                darkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-900'
              }`}
            />
            <button
              type="button"
              onClick={handleAddServiceArea}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Add
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 3: Business Hours */}
      <div
        className={`p-5 rounded-xl border space-y-4 ${
          darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <Clock className="w-4 h-4 text-indigo-400" /> Weekly Operating Hours
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2">
          {businessHours.map((bh, idx) => (
            <div
              key={bh.day}
              className={`p-3 rounded-lg border text-xs space-y-2 ${
                darkMode ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="font-bold text-slate-300">{bh.day}</div>
              <div className="flex items-center gap-1 text-[11px]">
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bh.isClosed}
                    onChange={(e) => {
                      const updated = [...businessHours];
                      updated[idx].isClosed = e.target.checked;
                      setBusinessHours(updated);
                    }}
                    className="rounded"
                  />
                  <span>Closed</span>
                </label>
              </div>

              {!bh.isClosed && (
                <div className="space-y-1">
                  <div>
                    <span className="text-[10px] text-slate-400">Open:</span>
                    <input
                      type="time"
                      value={bh.open}
                      onChange={(e) => {
                        const updated = [...businessHours];
                        updated[idx].open = e.target.value;
                        setBusinessHours(updated);
                      }}
                      className="w-full p-1 rounded bg-slate-900 border border-slate-700 text-xs"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400">Close:</span>
                    <input
                      type="time"
                      value={bh.close}
                      onChange={(e) => {
                        const updated = [...businessHours];
                        updated[idx].close = e.target.value;
                        setBusinessHours(updated);
                      }}
                      className="w-full p-1 rounded bg-slate-900 border border-slate-700 text-xs"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 4: Products & Services & Goals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Products and Services */}
        <div
          className={`p-5 rounded-xl border space-y-4 ${
            darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-indigo-400" /> Products & Core Services Catalog
          </h3>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {productsAndServices.map((prod) => (
              <div
                key={prod.id}
                className="p-2.5 rounded-lg border border-slate-800 bg-slate-800/40 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-bold text-slate-200">{prod.name}</div>
                  <div className="text-[10px] text-slate-400">
                    Category: {prod.category} | Range: {prod.priceRange}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveProductService(prod.id)}
                  className="p-1 text-slate-400 hover:text-rose-400 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-slate-800">
            <input
              type="text"
              value={newServiceName}
              onChange={(e) => setNewServiceName(e.target.value)}
              placeholder="Service name"
              className="flex-1 p-2 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-100"
            />
            <input
              type="text"
              value={newServicePrice}
              onChange={(e) => setNewServicePrice(e.target.value)}
              placeholder="Price/Range"
              className="w-28 p-2 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-100"
            />
            <button
              type="button"
              onClick={handleAddProductService}
              className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Add
            </button>
          </div>
        </div>

        {/* Business Goals */}
        <div
          className={`p-5 rounded-xl border space-y-4 ${
            darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Target className="w-4 h-4 text-emerald-400" /> Strategic Business Goals
          </h3>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {businessGoals.map((g, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-lg border border-slate-800 bg-slate-800/40 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-bold text-slate-200">{g.goal}</div>
                  <div className="text-[10px] text-emerald-400">Target: {g.targetMetric}</div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveGoal(idx)}
                  className="p-1 text-slate-400 hover:text-rose-400 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-slate-800">
            <input
              type="text"
              value={newGoalText}
              onChange={(e) => setNewGoalText(e.target.value)}
              placeholder="Goal description"
              className="flex-1 p-2 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-100"
            />
            <input
              type="text"
              value={newGoalMetric}
              onChange={(e) => setNewGoalMetric(e.target.value)}
              placeholder="Target metric"
              className="w-32 p-2 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-100"
            />
            <button
              type="button"
              onClick={handleAddGoal}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Add
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 5: Team Members & Preferences */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Team Members */}
        <div
          className={`p-5 rounded-xl border space-y-4 ${
            darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-400" /> Authenticated Team Members & Roles
          </h3>

          <div className="space-y-2">
            {teamMembers.map((m) => (
              <div
                key={m.id}
                className="p-3 rounded-lg border border-slate-800 bg-slate-800/40 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-bold text-slate-200 flex items-center gap-2">
                    <span>{m.name}</span>
                    {m.is_legal_owner === 1 && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                        Legal Owner
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {m.email} — Role: <strong className="text-slate-300">{m.role}</strong> ({m.user_role_classification || 'Standard'})
                  </div>
                </div>
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </div>
            ))}
          </div>
        </div>

        {/* Communication & Publishing Preferences */}
        <div
          className={`p-5 rounded-xl border space-y-4 ${
            darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-violet-400" /> Communication & Governance Preferences
          </h3>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/40 border border-slate-800">
              <div>
                <div className="font-bold text-slate-200">Mandatory Human Approval for Outbound Actions</div>
                <div className="text-[11px] text-slate-400">
                  Require operator cryptographic sign-off before executing SMS, emails, or posts.
                </div>
              </div>
              <input
                type="checkbox"
                checked={communicationPreferences.requireApprovalForOutbound}
                onChange={(e) =>
                  setCommunicationPreferences({
                    ...communicationPreferences,
                    requireApprovalForOutbound: e.target.checked
                  })
                }
                className="rounded"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/40 border border-slate-800">
              <div>
                <div className="font-bold text-slate-200">Proof of Work Evidence Watermarking</div>
                <div className="text-[11px] text-slate-400">
                  Attach immutable evidence hash references to all published case studies & posts.
                </div>
              </div>
              <input
                type="checkbox"
                checked={publishingPreferences.proofOfWorkWatermark}
                onChange={(e) =>
                  setPublishingPreferences({
                    ...publishingPreferences,
                    proofOfWorkWatermark: e.target.checked
                  })
                }
                className="rounded"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Tone & Brand Persona</label>
              <select
                value={communicationPreferences.tone}
                onChange={(e) =>
                  setCommunicationPreferences({
                    ...communicationPreferences,
                    tone: e.target.value
                  })
                }
                className="w-full p-2.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-100"
              >
                <option value="DIRECT_PROFESSIONAL">Direct & Professional</option>
                <option value="HELPFUL_CONTRACTOR">Friendly & Responsive Local Contractor</option>
                <option value="EXECUTIVE_B2B">Executive B2B Strategic</option>
                <option value="CLINICAL_HEALTHCARE">Empathetic & Clinical</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
};
