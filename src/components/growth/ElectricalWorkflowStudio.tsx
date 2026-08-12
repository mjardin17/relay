import React, { useState, useEffect } from 'react';
import {
  Zap,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Send,
  DollarSign,
  Calendar,
  FileText,
  UserCheck,
  Building,
  Phone,
  Mail,
  MapPin,
  RefreshCw,
  PlusCircle,
  Eye,
  Lock,
  Search,
  Check
} from 'lucide-react';

interface ElectricalLeadUI {
  id: string;
  tenantId: string;
  leadId: string;
  companyName: string;
  name: string;
  email: string;
  phone: string;
  serviceRequested: string;
  propertyType: string;
  addressCity: string;
  addressState: string;
  addressZip?: string;
  consentProvided: boolean;
  consentTimestamp: string;
  qualificationStatus: string;
  qualificationScore: number;
  qualificationConfidence: string;
  verifiedFacts: string[];
  aiAssumptions: string[];
  proposedResponseDraft: string;
  proposedResponseHash: string;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  executionStatus: 'unexecuted' | 'simulated' | 'executed';
  executionMode: 'simulated' | 'production';
  schedulingStatus: 'unscheduled' | 'scheduled' | 'completed' | 'cancelled';
  scheduledTime?: string;
  followUpStatus: 'none' | 'pending' | 'sent' | 'completed';
  bookingStatus: 'pending' | 'booked' | 'lost';
  bookedJobValue: number;
  actualRevenue: number;
  attributionSource: string;
  projectedRoi: {
    projectedJobValue: number;
    projectedGrossMargin: number;
    softwareCost: number;
    projectedRoiPercent: number;
  };
  actualRoi: {
    actualRevenue: number;
    softwareCost: number;
    actualNetProfit: number;
    varianceVsProjected: number;
  };
  createdAt: string;
}

export function ElectricalWorkflowStudio({ darkMode = true }: { darkMode?: boolean }) {
  const [selectedTenantId, setSelectedTenantId] = useState<'tenant_ma_fresh_launch' | 'tenant_demo_1'>('tenant_ma_fresh_launch');
  const [leads, setLeads] = useState<ElectricalLeadUI[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const activeToken = selectedTenantId === 'tenant_ma_fresh_launch' ? 'token_ma_fresh_launch' : 'token_owner_tenant1';

  // Form State for Intake
  const [showIntakeModal, setShowIntakeModal] = useState(false);
  const [intakeForm, setIntakeForm] = useState({
    name: 'Sarah Jenkins',
    email: 'sjenkins@pdxhome.com',
    phone: '+1-503-555-0199',
    serviceRequested: '200A Electrical Panel Upgrade & EV Charger',
    propertyType: 'Residential',
    city: 'Boston',
    state: 'MA',
    zip: '02108',
    consentProvided: true,
    source: 'Google Business Profile Inquiry',
    sourceReference: 'gbp-ref-98231'
  });

  // Draft Edit State
  const [editedDraft, setEditedDraft] = useState('');
  const [isEditingDraft, setIsEditingDraft] = useState(false);

  // MA Electrical Company Compliance State
  const [showMAModal, setShowMAModal] = useState(false);
  const [maProfile, setMAProfile] = useState<any>(null);
  const [maForm, setMAForm] = useState({
    legalBusinessName: '',
    dbaName: '',
    maA1BusinessLicenseNumber: '',
    businessLicenseStatus: 'unverified',
    businessLicenseExpirationDate: '',
    businessLicenseSourceLevel: 'self_reported',
    masterElectricianName: '',
    masterElectricianLicenseNumber: '',
    masterElectricianLicenseStatus: 'unverified',
    masterElectricianLicenseExpirationDate: '',
    masterElectricianSourceLevel: 'self_reported',
    journeymanWorkerName: '',
    journeymanLicenseNumber: '',
    corporateRegistrationSourceLevel: 'self_reported',
    dbaSourceLevel: 'self_reported',
    insuranceSourceLevel: 'self_reported',
    sourceUrl: 'https://mass.gov',
  });

  const fetchMAProfile = async () => {
    try {
      const res = await fetch('/api/growth/ma-compliance/profile', {
        headers: { Authorization: `Bearer ${activeToken}` },
      });
      const data = await res.json();
      if (data.success && data.complianceProfile) {
        setMAProfile(data.complianceProfile);
      } else {
        setMAProfile(null);
      }
    } catch {
      setMAProfile(null);
    }
  };

  const handleMASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const payload = {
        legalBusinessName: maForm.legalBusinessName,
        dbaName: maForm.dbaName || undefined,
        maA1BusinessLicenseNumber: maForm.maA1BusinessLicenseNumber,
        businessLicenseStatus: maForm.businessLicenseStatus,
        businessLicenseExpirationDate: maForm.businessLicenseExpirationDate || undefined,
        businessLicenseSourceLevel: maForm.businessLicenseSourceLevel,
        masterElectricianName: maForm.masterElectricianName,
        masterElectricianLicenseNumber: maForm.masterElectricianLicenseNumber,
        masterElectricianLicenseStatus: maForm.masterElectricianLicenseStatus,
        masterElectricianLicenseExpirationDate: maForm.masterElectricianLicenseExpirationDate || undefined,
        masterElectricianSourceLevel: maForm.masterElectricianSourceLevel,
        journeymanLicenses: maForm.journeymanLicenseNumber
          ? [
              {
                workerName: maForm.journeymanWorkerName,
                licenseNumber: maForm.journeymanLicenseNumber,
                licenseStatus: 'active',
                verificationSourceLevel: 'independently_verified',
              },
            ]
          : [],
        corporateRegistrationSourceLevel: maForm.corporateRegistrationSourceLevel,
        dbaSourceLevel: maForm.dbaSourceLevel,
        insuranceSourceLevel: maForm.insuranceSourceLevel,
        sourceUrl: maForm.sourceUrl,
        evidenceArtifact: {
          lookupPortal: 'Massachusetts ePLACE / Mass.gov Board Lookup',
          verificationTimestamp: new Date().toISOString(),
        },
      };

      const res = await fetch('/api/growth/ma-compliance/intake', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${activeToken}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!data.success) {
        setErrorMsg(data.error || 'Failed to update MA compliance profile');
        return;
      }

      setMAProfile(data.complianceProfile);
      setSuccessMsg('Massachusetts Electrical Business Compliance Profile saved.');
      setShowMAModal(false);
      await fetchAuditLogs();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  // Outcome inputs
  const [scheduleTimeInput, setScheduleTimeInput] = useState('');
  const [bookedValueInput, setBookedValueInput] = useState('2500');
  const [actualRevenueInput, setActualRevenueInput] = useState('2750');

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/growth/electrical-leads', {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.leads)) {
        setLeads(data.leads);
        if (data.leads.length > 0) {
          setSelectedLeadId(data.leads[0].leadId);
          setEditedDraft(data.leads[0].proposedResponseDraft);
        } else {
          setSelectedLeadId(null);
          setEditedDraft('');
        }
      } else {
        setLeads([]);
        setSelectedLeadId(null);
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await fetch('/api/launch-program/audit-logs', {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.logs)) {
        setAuditLogs(data.logs.slice(0, 10));
      } else {
        setAuditLogs([]);
      }
    } catch {}
  };

  useEffect(() => {
    fetchLeads();
    fetchAuditLogs();
    fetchMAProfile();
  }, [selectedTenantId]);

  const activeLead = leads.find((l) => l.leadId === selectedLeadId || l.id === selectedLeadId);

  useEffect(() => {
    if (activeLead) {
      setEditedDraft(activeLead.proposedResponseDraft);
    }
  }, [selectedLeadId]);

  const handleIntakeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch('/api/growth/electrical-leads/intake', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${activeToken}`
        },
        body: JSON.stringify(intakeForm)
      });
      const data = await res.json();
      if (!data.success) {
        if (data.error === 'CONSENT_REQUIRED') {
          setErrorMsg('CONSENT REQUIRED: Lead consent check failed closed.');
        } else {
          setErrorMsg(data.error || 'Failed to intake lead');
        }
        return;
      }

      if (data.isDuplicate) {
        setSuccessMsg('Duplicate Lead Detected & Suppressed.');
      } else {
        setSuccessMsg('Electrical Lead Intake Successful! Qualified & Opportunity Created.');
        setShowIntakeModal(false);
      }
      await fetchLeads();
      await fetchAuditLogs();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleSaveDraft = async () => {
    if (!activeLead) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`/api/growth/electrical-leads/${activeLead.leadId}/draft`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${activeToken}`
        },
        body: JSON.stringify({ newText: editedDraft })
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Response draft updated. Prior approval invalidated.');
        setIsEditingDraft(false);
        await fetchLeads();
        await fetchAuditLogs();
      } else {
        setErrorMsg(data.error);
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleApproveAction = async () => {
    if (!activeLead) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`/api/growth/electrical-leads/${activeLead.leadId}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Action Approved by Human Owner. Content Hash: ${data.approval.contentHash.substring(0, 12)}...`);
        await fetchLeads();
        await fetchAuditLogs();
      } else {
        setErrorMsg(data.error);
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleExecuteAction = async () => {
    if (!activeLead) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`/api/growth/electrical-leads/${activeLead.leadId}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${activeToken}`,
          'x-idempotency-key': `exec-idemp-${Date.now()}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Dispatch Execution Successful (${data.dispatchStatus}). Mode: SIMULATED / DRY_RUN`);
        await fetchLeads();
        await fetchAuditLogs();
      } else {
        setErrorMsg(data.error || 'Execution blocked');
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleRecordStageOutcome = async (stage: string, payload: any) => {
    if (!activeLead) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`/api/growth/electrical-leads/${activeLead.leadId}/outcome`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${activeToken}`
        },
        body: JSON.stringify({ stage, ...payload })
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Recorded stage outcome: ${stage}`);
        await fetchLeads();
        await fetchAuditLogs();
      } else {
        setErrorMsg(data.error);
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Classification Banner */}
      {selectedTenantId === 'tenant_demo_1' ? (
        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>DEMO / SIMULATED — NOT REAL-WORLD EVIDENCE (Oregon Test Fixtures)</span>
          </div>
          <span className="bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-mono text-[11px]">
            CLASSIFICATION: SYNTHETIC_TEST
          </span>
        </div>
      ) : (
        <div className="bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
            <span>MASSACHUSETTS FRESH LAUNCH ENGAGEMENT — UNVERIFIED PENDING OWNER CONFIRMATION</span>
          </div>
          <span className="bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded font-mono text-[11px]">
            CLASSIFICATION: PENDING_VERIFICATION
          </span>
        </div>
      )}

      {/* Header Banner */}
      <div className={`p-6 rounded-2xl border ${darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                Massachusetts Electrical Workflow
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                selectedTenantId === 'tenant_ma_fresh_launch'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              }`}>
                {selectedTenantId === 'tenant_ma_fresh_launch' ? 'Fresh Launch (Guided Manual)' : 'Simulated Test Fixtures'}
              </span>
            </div>
            <h1 className="text-2xl font-bold mt-2 text-slate-100">
              {selectedTenantId === 'tenant_ma_fresh_launch' ? 'Fresh Launch MA Electrical Company' : 'Simulated Demo Contractor Engine'}
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Qualified Lead Intake → Evidence Assessment → Human Approval → Idempotent Execution → Booking & ROI Attribution
            </p>
          </div>

          {/* Tenant Selector & Actions */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs">
              <button
                onClick={() => setSelectedTenantId('tenant_ma_fresh_launch')}
                className={`px-3 py-1.5 rounded-lg font-medium transition ${
                  selectedTenantId === 'tenant_ma_fresh_launch'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Fresh Launch (MA)
              </button>
              <button
                onClick={() => setSelectedTenantId('tenant_demo_1')}
                className={`px-3 py-1.5 rounded-lg font-medium transition ${
                  selectedTenantId === 'tenant_demo_1'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Oregon Demo (Simulated)
              </button>
            </div>
            <button
              onClick={() => setShowMAModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold rounded-xl transition text-sm"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              MA Compliance & Licensing
            </button>
            <button
              onClick={() => setShowIntakeModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold rounded-xl transition text-sm shadow-lg shadow-amber-500/20"
            >
              <PlusCircle className="w-4 h-4" />
              Intake Electrical Lead
            </button>
            <button
              onClick={fetchLeads}
              className={`p-2 rounded-xl border ${darkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'}`}
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Alert Banners */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center gap-3 text-sm">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-3 text-sm">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Massachusetts Electrical Company Compliance Overview Banner */}
      <div className={`p-4 rounded-2xl border ${maProfile?.canClaimLicensedCompany ? 'bg-emerald-950/20 border-emerald-500/30' : 'bg-amber-950/20 border-amber-500/30'}`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className={`w-6 h-6 shrink-0 mt-0.5 ${maProfile?.canClaimLicensedCompany ? 'text-emerald-400' : 'text-amber-400'}`} />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Massachusetts Compliance Model</span>
                {maProfile?.canClaimLicensedCompany ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    CLAIM_ALLOWED: INDEPENDENTLY VERIFIED A1 & MASTER LICENSE
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    CLAIM_BLOCKED: UNVERIFIED A1 OR MASTER LICENSE
                  </span>
                )}
              </div>
              <h3 className="text-sm font-semibold text-slate-200 mt-1">
                {maProfile ? maProfile.legalBusinessName : 'No Massachusetts Electrical Compliance Profile Loaded'}
                {maProfile?.dbaName ? ` (DBA: ${maProfile.dbaName})` : ''}
              </h3>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 mt-1">
                <span>A1 License: <strong className="text-slate-200">{maProfile?.maA1BusinessLicenseNumber || 'Not provided'}</strong> ({maProfile?.businessLicenseSourceLevel || 'self_reported'})</span>
                <span>Master Electrician: <strong className="text-slate-200">{maProfile?.masterElectricianName || 'N/A'} - {maProfile?.masterElectricianLicenseNumber || 'Not provided'}</strong> ({maProfile?.masterElectricianSourceLevel || 'self_reported'})</span>
                <span>Verification Source: <a href={maProfile?.sourceUrl || '#'} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">Official MA Portal</a></span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowMAModal(true)}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold shrink-0"
          >
            {maProfile ? 'Edit MA Credentials' : 'Configure MA Credentials'}
          </button>
        </div>
      </div>

      {/* Main Grid Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Lead Selector & Pipeline List (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">Inbound Electrical Leads</h2>
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {leads.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm">
                  No electrical leads found. Click "Intake Electrical Lead" to simulate inbound inquiry.
                </div>
              ) : (
                leads.map((l) => (
                  <button
                    key={l.leadId}
                    onClick={() => setSelectedLeadId(l.leadId)}
                    className={`w-full text-left p-3 rounded-xl border transition ${
                      selectedLeadId === l.leadId
                        ? 'border-amber-500/50 bg-amber-500/10'
                        : darkMode
                        ? 'border-slate-800 bg-slate-950 hover:bg-slate-800/50'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-200 text-sm">{l.name}</span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        l.approvalStatus === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        {l.approvalStatus.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs text-amber-400 font-medium mt-1">{l.serviceRequested}</p>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-2">
                      <MapPin className="w-3 h-3 text-slate-500" />
                      <span>{l.addressCity}, {l.addressState}</span>
                      <span>•</span>
                      <span className="text-slate-300">${l.projectedRoi.projectedJobValue}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Lead Workflow Detail Workspace (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {activeLead ? (
            <>
              {/* Lead Summary & Evidence Card */}
              <div className={`p-6 rounded-2xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs text-amber-400 font-semibold tracking-wider uppercase">Lead Intake Details & Evidence</span>
                    <h3 className="text-xl font-bold text-slate-100 mt-1">{activeLead.name}</h3>
                    <div className="flex items-center gap-4 text-xs text-slate-400 mt-2">
                      <span className="flex items-center gap-1"><Building className="w-3.5 h-3.5" /> {activeLead.companyName}</span>
                      <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {activeLead.addressCity}, {activeLead.addressState}</span>
                      <span className="flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Consent Timestamp: {new Date(activeLead.consentTimestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-400">Qualification Score</span>
                    <div className="text-2xl font-bold text-emerald-400">{activeLead.qualificationScore}/100</div>
                    <span className="text-[10px] text-slate-400">Confidence: {activeLead.qualificationConfidence}</span>
                  </div>
                </div>

                {/* Verified Facts vs AI Assumptions Separation */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1 mb-2">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Verified Facts (Source Evidence)
                    </span>
                    <ul className="space-y-1.5 text-xs text-slate-300">
                      {activeLead.verifiedFacts.map((fact, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-emerald-500 font-mono">•</span>
                          <span>{fact}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-xs font-bold text-amber-400 flex items-center gap-1 mb-2">
                      <Zap className="w-3.5 h-3.5" /> AI Model Assumptions (Unverified)
                    </span>
                    <ul className="space-y-1.5 text-xs text-slate-400">
                      {activeLead.aiAssumptions.map((asm, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-amber-500 font-mono">•</span>
                          <span>{asm}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Proposed Action Draft & Mandatory Approval Gate */}
              <div className={`p-6 rounded-2xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                      <Lock className="w-4 h-4 text-amber-400" /> Mandatory Human Approval Boundary
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      No outbound message dispatches without recorded human sign-off. Editing content invalidates prior approval.
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    activeLead.approvalStatus === 'approved'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}>
                    STATUS: {activeLead.approvalStatus.toUpperCase()}
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Proposed SMS Response Draft</span>
                    <span className="font-mono text-[10px]">SHA256: {activeLead.proposedResponseHash.substring(0, 16)}...</span>
                  </div>

                  <textarea
                    value={editedDraft}
                    onChange={(e) => {
                      setEditedDraft(e.target.value);
                      setIsEditingDraft(true);
                    }}
                    className={`w-full p-3 rounded-xl border text-sm font-sans ${
                      darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                    rows={3}
                  />

                  {isEditingDraft && (
                    <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs flex items-center justify-between">
                      <span>Draft modified. Save changes to update hash & reset approval status.</span>
                      <button
                        onClick={handleSaveDraft}
                        className="px-3 py-1 bg-amber-500 text-slate-950 font-bold rounded-lg text-xs"
                      >
                        Save & Invalidate Prior Approval
                      </button>
                    </div>
                  )}

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      onClick={handleApproveAction}
                      className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/20"
                    >
                      <UserCheck className="w-4 h-4" /> Approve Action (Human Sign-off)
                    </button>

                    <button
                      onClick={handleExecuteAction}
                      disabled={activeLead.approvalStatus !== 'approved'}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 ${
                        activeLead.approvalStatus === 'approved'
                          ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      <Send className="w-4 h-4" /> Execute Dry-Run Dispatch (SIMULATED)
                    </button>
                  </div>
                </div>
              </div>

              {/* Estimate Scheduling, Follow-Up, Booking & Actual Revenue Stage Actions */}
              <div className={`p-6 rounded-2xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                <h3 className="text-base font-semibold text-slate-100 mb-4">Workflow Lifecycle Progression</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Step 1: Schedule Estimate */}
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-amber-400" /> 1. Estimate Scheduling
                    </span>
                    <p className="text-xs text-slate-400">Current Status: <strong className="text-slate-200">{activeLead.schedulingStatus}</strong></p>
                    <button
                      onClick={() => handleRecordStageOutcome('schedule_estimate', { scheduledTime: new Date(Date.now() + 86400000).toISOString() })}
                      className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold"
                    >
                      Schedule Estimate (Tomorrow 10 AM)
                    </button>
                  </div>

                  {/* Step 2: Follow-up */}
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-blue-400" /> 2. Follow-Up Status
                    </span>
                    <p className="text-xs text-slate-400">Current Status: <strong className="text-slate-200">{activeLead.followUpStatus}</strong></p>
                    <button
                      onClick={() => handleRecordStageOutcome('record_follow_up', {})}
                      className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold"
                    >
                      Record Follow-Up Sent
                    </button>
                  </div>

                  {/* Step 3: Job Booking */}
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" /> 3. Job Booking Outcome
                    </span>
                    <p className="text-xs text-slate-400">Booked Value: <strong className="text-slate-200">${activeLead.bookedJobValue}</strong></p>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={bookedValueInput}
                        onChange={(e) => setBookedValueInput(e.target.value)}
                        className="w-24 px-2 py-1 bg-slate-900 border border-slate-800 text-xs rounded text-slate-200"
                      />
                      <button
                        onClick={() => handleRecordStageOutcome('record_booking', { bookedJobValue: parseFloat(bookedValueInput) || 2500 })}
                        className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold"
                      >
                        Record Booking
                      </button>
                    </div>
                  </div>

                  {/* Step 4: Actual Revenue */}
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4 text-emerald-400" /> 4. Legitimate Revenue Outcome
                    </span>
                    <p className="text-xs text-slate-400">Verified Revenue: <strong className="text-emerald-400">${activeLead.actualRevenue}</strong></p>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={actualRevenueInput}
                        onChange={(e) => setActualRevenueInput(e.target.value)}
                        className="w-24 px-2 py-1 bg-slate-900 border border-slate-800 text-xs rounded text-slate-200"
                      />
                      <button
                        onClick={() => handleRecordStageOutcome('record_revenue', { actualRevenue: parseFloat(actualRevenueInput) || 2750 })}
                        className="flex-1 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg text-xs font-bold"
                      >
                        Record Revenue Outcome
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Attribution & Projected vs Actual ROI Panel */}
              <div className={`p-6 rounded-2xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                <h3 className="text-base font-semibold text-slate-100 mb-4">Source Attribution & Projected-vs-Actual ROI</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-xs text-slate-400">Attribution Source</span>
                    <div className="text-sm font-bold text-slate-200 mt-1">{activeLead.attributionSource}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-xs text-slate-400">Projected Revenue</span>
                    <div className="text-lg font-bold text-slate-300 mt-1">${activeLead.projectedRoi.projectedJobValue}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-xs text-slate-400">Actual Revenue</span>
                    <div className="text-lg font-bold text-emerald-400 mt-1">${activeLead.actualRevenue}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-xs text-slate-400">ROI Variance</span>
                    <div className={`text-lg font-bold mt-1 ${activeLead.actualRoi.varianceVsProjected >= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {activeLead.actualRoi.varianceVsProjected >= 0 ? '+' : ''}${activeLead.actualRoi.varianceVsProjected}
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className={`p-12 text-center rounded-2xl border ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-600'}`}>
              Select a lead from the left pipeline panel or click "Intake Electrical Lead" to get started.
            </div>
          )}

          {/* Append-Only Audit Trail View */}
          <div className={`p-6 rounded-2xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">Append-Only Audit Trail Log</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto text-xs font-mono">
              {auditLogs.map((log, i) => (
                <div key={i} className="p-2 rounded bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-amber-400">{log.action}</span>
                    <span className="text-slate-500 ml-2">by {log.actor_id}</span>
                  </div>
                  <span className="text-slate-500">{new Date(log.created_at).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Intake Modal */}
      {showIntakeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className={`w-full max-w-lg p-6 rounded-2xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <h3 className="text-lg font-bold text-slate-100 mb-4">Intake New Electrical Lead</h3>
            <form onSubmit={handleIntakeSubmit} className="space-y-3">
              <div>
                <label className="text-xs text-slate-400">Contact Name</label>
                <input
                  type="text"
                  value={intakeForm.name}
                  onChange={(e) => setIntakeForm({ ...intakeForm, name: e.target.value })}
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400">Email Address</label>
                  <input
                    type="email"
                    value={intakeForm.email}
                    onChange={(e) => setIntakeForm({ ...intakeForm, email: e.target.value })}
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400">Phone Number</label>
                  <input
                    type="text"
                    value={intakeForm.phone}
                    onChange={(e) => setIntakeForm({ ...intakeForm, phone: e.target.value })}
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400">Service Requested</label>
                <input
                  type="text"
                  value={intakeForm.serviceRequested}
                  onChange={(e) => setIntakeForm({ ...intakeForm, serviceRequested: e.target.value })}
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400">City</label>
                  <input
                    type="text"
                    value={intakeForm.city}
                    onChange={(e) => setIntakeForm({ ...intakeForm, city: e.target.value })}
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400">State</label>
                  <input
                    type="text"
                    value={intakeForm.state}
                    onChange={(e) => setIntakeForm({ ...intakeForm, state: e.target.value })}
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="consentCb"
                  checked={intakeForm.consentProvided}
                  onChange={(e) => setIntakeForm({ ...intakeForm, consentProvided: e.target.checked })}
                  className="rounded border-slate-800 bg-slate-950 text-amber-500"
                />
                <label htmlFor="consentCb" className="text-xs text-slate-300">
                  Customer granted explicit SMS/Email communication consent.
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowIntakeModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 text-slate-950 rounded-xl text-xs font-bold"
                >
                  Submit Intake Form
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Massachusetts Compliance & Licensing Modal */}
      {showMAModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-4 my-8 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-amber-400" />
                  Massachusetts Electrical Business License Intake
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Record and verify separate legal entity, A1 Business License, Master Electrician, and Journeyman credentials.
                </p>
              </div>
              <button
                onClick={() => setShowMAModal(false)}
                className="text-slate-400 hover:text-slate-200 text-lg font-bold"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleMASubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 font-medium">Legal Business Name</label>
                  <input
                    type="text"
                    value={maForm.legalBusinessName}
                    onChange={(e) => setMAForm({ ...maForm, legalBusinessName: e.target.value })}
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 mt-1"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-medium">DBA Name (if applicable)</label>
                  <input
                    type="text"
                    value={maForm.dbaName}
                    onChange={(e) => setMAForm({ ...maForm, dbaName: e.target.value })}
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 mt-1"
                  />
                </div>
              </div>

              {/* A1 Business License Section */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="font-bold text-slate-200 uppercase tracking-wider text-[11px] text-amber-400">
                  Massachusetts A1 Electrical Business License
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="text-slate-400">A1 License Number</label>
                    <input
                      type="text"
                      value={maForm.maA1BusinessLicenseNumber}
                      onChange={(e) => setMAForm({ ...maForm, maA1BusinessLicenseNumber: e.target.value })}
                      className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-100 mt-1"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-slate-400">Status</label>
                    <select
                      value={maForm.businessLicenseStatus}
                      onChange={(e) => setMAForm({ ...maForm, businessLicenseStatus: e.target.value })}
                      className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-100 mt-1"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="expired">Expired</option>
                      <option value="unverified">Unverified</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-400">Source Level</label>
                    <select
                      value={maForm.businessLicenseSourceLevel}
                      onChange={(e) => setMAForm({ ...maForm, businessLicenseSourceLevel: e.target.value })}
                      className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-100 mt-1"
                    >
                      <option value="independently_verified">Independently Verified (Mass.gov)</option>
                      <option value="document_supported">Document Supported</option>
                      <option value="self_reported">Self Reported</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Master Electrician Licensee of Record */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="font-bold text-slate-200 uppercase tracking-wider text-[11px] text-amber-400">
                  Master Electrician Licensee of Record
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="text-slate-400">Licensee Name</label>
                    <input
                      type="text"
                      value={maForm.masterElectricianName}
                      onChange={(e) => setMAForm({ ...maForm, masterElectricianName: e.target.value })}
                      className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-100 mt-1"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-slate-400">Master License Number</label>
                    <input
                      type="text"
                      value={maForm.masterElectricianLicenseNumber}
                      onChange={(e) => setMAForm({ ...maForm, masterElectricianLicenseNumber: e.target.value })}
                      className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-100 mt-1"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-slate-400">Source Level</label>
                    <select
                      value={maForm.masterElectricianSourceLevel}
                      onChange={(e) => setMAForm({ ...maForm, masterElectricianSourceLevel: e.target.value })}
                      className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-100 mt-1"
                    >
                      <option value="independently_verified">Independently Verified (Mass.gov)</option>
                      <option value="document_supported">Document Supported</option>
                      <option value="self_reported">Self Reported</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Source URL & Non-Proof Source Levels */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="font-bold text-slate-200 uppercase tracking-wider text-[11px] text-slate-400">
                  Official Verification Source & Non-Proof Fields
                </div>
                <div>
                  <label className="text-slate-400">Verification Source URL (Must be Mass.gov / ePlace)</label>
                  <input
                    type="url"
                    value={maForm.sourceUrl}
                    onChange={(e) => setMAForm({ ...maForm, sourceUrl: e.target.value })}
                    className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-100 mt-1"
                    required
                  />
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed italic border-l-2 border-amber-500/50 pl-2 mt-2">
                  Rule Enforcement: LLC formation, DBA filing, insurance, or an individual electrician's license DO NOT prove an active Massachusetts electrical business license. Relay is strictly blocked from describing the company as a "licensed electrical company" unless both A1 Business License and Master Electrician are active and independently verified.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowMAModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 text-slate-950 rounded-xl text-xs font-bold"
                >
                  Save & Verify Compliance Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
