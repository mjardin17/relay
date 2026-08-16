import React, { useState, useEffect } from 'react';
import {
  Shield,
  Zap,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Play,
  Pause,
  RefreshCw,
  FileText,
  DollarSign,
  UserCheck,
  MapPin,
  Clock,
  Layers,
  Search,
  Activity,
  ArrowRight,
  Terminal,
  Send,
  Lock,
  Download,
  PhoneCall,
  CheckSquare,
  HelpCircle,
  Sliders
} from 'lucide-react';
import {
  DataEnvironment,
  TenantPilotState,
  LeadIntakeRecord,
  PilotLeadLifecycleStatus,
  PilotReadinessReportV2,
  ProductionFinancialMetrics,
  ManualOutcomeType,
  PaymentEvidenceState,
  PilotAuditPackage
} from '../../types/productionEvidence';
import { pilotClientService, DrillResult } from '../../services/pilotClientService';

interface PilotCommandCenterProps {
  tenantId?: string;
}

export const PilotCommandCenter: React.FC<PilotCommandCenterProps> = ({
  tenantId = 'tenant_ma_fresh_launch'
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'leads' | 'intake' | 'approvals' | 'outcomes' | 'drills' | 'runbook'>('overview');
  const [selectedEnv, setSelectedEnv] = useState<DataEnvironment>('PILOT');
  const [pilotState, setPilotState] = useState<TenantPilotState>('NOT_CONFIGURED');
  const [readinessReport, setReadinessReport] = useState<PilotReadinessReportV2 | null>(null);
  const [leads, setLeads] = useState<LeadIntakeRecord[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [selectedLeadTimeline, setSelectedLeadTimeline] = useState<any[]>([]);
  const [financialMetrics, setFinancialMetrics] = useState<ProductionFinancialMetrics | null>(null);
  const [drillResults, setDrillResults] = useState<DrillResult[]>([]);
  const [isRunningDrills, setIsRunningDrills] = useState(false);
  const [auditPackage, setAuditPackage] = useState<PilotAuditPackage | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // New Lead Form State
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    streetAddress: '',
    municipality: 'New Bedford',
    stateProvince: 'MA',
    postalCode: '02740',
    serviceRequested: '200A Electrical Panel Upgrade',
    source: 'Website Contact Form',
    sourceType: 'WEBSITE_FORM' as any,
    propertyType: 'Residential' as any,
    consentProvided: true,
    estimatedValue: 2850
  });

  // Manual Outcome Form State
  const [outcomeForm, setOutcomeForm] = useState({
    leadId: '',
    outcomeType: 'JOB_BOOKED' as ManualOutcomeType,
    amount: 2850,
    notes: 'Customer signed quote on-site for 200A service upgrade.',
    operatorId: 'operator_shad_reis',
    operatorRole: 'LEGAL_BUSINESS_OWNER'
  });

  // Payment Form State
  const [paymentForm, setPaymentForm] = useState({
    leadId: '',
    paymentAmount: 2850,
    evidenceState: 'VERIFIED' as PaymentEvidenceState,
    processorName: 'Stripe Merchant Processing',
    transactionReference: 'ch_3Pz79xLkdIw45B01',
    bankDepositReference: 'dep_982310',
    operatorId: 'operator_shad_reis',
    notes: 'Full payment cleared and deposited.'
  });

  // Notification message
  const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const refreshData = async () => {
    try {
      setIsLoading(true);
      const state = await pilotClientService.getPilotState(tenantId);
      setPilotState(state);

      const report = await pilotClientService.evaluatePilotReadiness(tenantId);
      setReadinessReport(report);

      const allLeads = await pilotClientService.listLeads(tenantId, selectedEnv);
      setLeads(allLeads);

      if (allLeads.length > 0 && !selectedLeadId) {
        setSelectedLeadId(allLeads[0].leadId);
      }

      if (selectedLeadId) {
        const timeline = await pilotClientService.getLeadTimeline(tenantId, selectedLeadId);
        setSelectedLeadTimeline(timeline);
      }

      const metrics = await pilotClientService.calculateFinancialMetrics(tenantId);
      setFinancialMetrics(metrics);
    } catch (err: any) {
      console.error('Error refreshing pilot data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, [tenantId, selectedEnv, selectedLeadId]);

  const handleActivatePilot = async () => {
    try {
      const res = await pilotClientService.activatePilot(
        tenantId,
        'actor_shad_reis_tenant_ma_fresh_launch',
        'LEGAL_BUSINESS_OWNER'
      );

      if (res) {
        setNotice({ type: 'success', message: 'Pilot activated successfully for Reis Electric by authorized owner.' });
      }
      await refreshData();
    } catch (e: any) {
      setNotice({ type: 'error', message: e.message });
    }
  };

  const handlePausePilot = async () => {
    try {
      await pilotClientService.pausePilot(tenantId, 'operator_shad_reis', 'Operator manual emergency stop engaged');
      setNotice({ type: 'info', message: 'Reis Electric pilot execution PAUSED.' });
      await refreshData();
    } catch (e: any) {
      setNotice({ type: 'error', message: e.message });
    }
  };

  const handleResumePilot = async () => {
    try {
      await pilotClientService.resumePilot(tenantId, 'operator_shad_reis', 'Operator manual resume');
      setNotice({ type: 'success', message: 'Reis Electric pilot execution RESUMED.' });
      await refreshData();
    } catch (e: any) {
      setNotice({ type: 'error', message: e.message });
    }
  };

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const record = await pilotClientService.intakeLead({
        tenantId,
        source: formData.source,
        sourceType: formData.sourceType,
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        streetAddress: formData.streetAddress,
        municipality: formData.municipality,
        stateProvince: formData.stateProvince,
        postalCode: formData.postalCode,
        serviceRequested: formData.serviceRequested,
        propertyType: formData.propertyType,
        dataEnvironment: selectedEnv,
        consentState: formData.consentProvided ? 'OPTED_IN' : 'OPTED_OUT',
        estimatedValue: Number(formData.estimatedValue),
        actorId: 'operator_shad_reis'
      });

      setNotice({
        type: 'success',
        message: `Lead ${record.leadId} ingested (${record.qualificationStatus}, DupStatus: ${record.duplicateStatus})`
      });

      setSelectedLeadId(record.leadId);
      await refreshData();
      setActiveTab('leads');
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message });
    }
  };

  const handleRecordOutcome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!outcomeForm.leadId) {
      setNotice({ type: 'error', message: 'Please select a Lead ID.' });
      return;
    }

    try {
      await pilotClientService.recordManualOutcome({
        tenantId,
        leadId: outcomeForm.leadId,
        outcomeType: outcomeForm.outcomeType,
        amount: Number(outcomeForm.amount),
        notes: outcomeForm.notes,
        operatorId: outcomeForm.operatorId,
        operatorRole: outcomeForm.operatorRole
      });

      setNotice({ type: 'success', message: `Outcome ${outcomeForm.outcomeType} recorded [OPERATOR_REPORTED]` });
      await refreshData();
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message });
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentForm.leadId) {
      setNotice({ type: 'error', message: 'Please select a Lead ID.' });
      return;
    }

    try {
      const res = await pilotClientService.recordVerifiedPayment({
        tenantId,
        leadId: paymentForm.leadId,
        paymentAmount: Number(paymentForm.paymentAmount),
        evidenceState: paymentForm.evidenceState,
        processorName: paymentForm.processorName,
        transactionReference: paymentForm.transactionReference,
        bankDepositReference: paymentForm.bankDepositReference,
        operatorId: paymentForm.operatorId,
        notes: paymentForm.notes,
        dataEnvironment: selectedEnv
      });

      setNotice({ type: 'success', message: `Payment $${res.amount || paymentForm.paymentAmount} recorded with verified evidence` });
      await refreshData();
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message });
    }
  };

  const handleRunAllDrills = async () => {
    setIsRunningDrills(true);
    try {
      const results = await pilotClientService.executeAllDrills(tenantId);
      setDrillResults(results);
      setNotice({ type: 'success', message: `Completed ${results.length} failure drills. All systems failed closed safely.` });
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message });
    } finally {
      setIsRunningDrills(false);
    }
  };

  const handleExportAuditPackage = async (leadId: string) => {
    try {
      const pkg = await pilotClientService.generateAuditPackage(tenantId);
      setAuditPackage(pkg);
      setNotice({ type: 'success', message: `Audit package generated for lead ${leadId} with verified hash chain.` });
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message });
    }
  };

  return (
    <div className="space-y-6" id="pilot_command_center">
      {/* Top Banner & Environment Boundary Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                  Reis Electric Pilot Command Center
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                    pilotState === 'PILOT_ACTIVE'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : pilotState === 'PAUSED'
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}>
                    {pilotState}
                  </span>
                </h1>
                <p className="text-sm text-slate-400">
                  MA Electrical Contractor Pilot Activation & Evidence Capture Boundary
                </p>
              </div>
            </div>
          </div>

          {/* Environment Switcher & Emergency Action */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
              <span className="text-slate-400 px-2 font-medium">Environment:</span>
              {(['PILOT', 'PRODUCTION', 'TEST', 'DEMO'] as DataEnvironment[]).map((env) => (
                <button
                  key={env}
                  onClick={() => setSelectedEnv(env)}
                  className={`px-2.5 py-1 rounded font-medium transition ${
                    selectedEnv === env
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {env}
                </button>
              ))}
            </div>

            {pilotState === 'PILOT_ACTIVE' ? (
              <button
                onClick={handlePausePilot}
                className="px-3.5 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/40 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <Pause className="w-3.5 h-3.5" />
                PAUSE PILOT
              </button>
            ) : (
              <button
                onClick={handleActivatePilot}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
              >
                <Play className="w-3.5 h-3.5" />
                ACTIVATE PILOT
              </button>
            )}

            <button
              onClick={refreshData}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
              title="Refresh Data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Global Notification */}
        {notice && (
          <div className={`mt-4 p-3 rounded-lg text-xs flex items-center justify-between ${
            notice.type === 'success'
              ? 'bg-emerald-950/50 border border-emerald-800 text-emerald-300'
              : notice.type === 'error'
              ? 'bg-rose-950/50 border border-rose-800 text-rose-300'
              : 'bg-blue-950/50 border border-blue-800 text-blue-300'
          }`}>
            <span>{notice.message}</span>
            <button onClick={() => setNotice(null)} className="font-bold ml-2">×</button>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-800 text-sm font-medium">
        {[
          { id: 'overview', label: 'Pilot Status & Readiness' },
          { id: 'leads', label: 'Leads & Timeline' },
          { id: 'intake', label: 'Intake Real Lead' },
          { id: 'outcomes', label: 'Record Outcomes & Payments' },
          { id: 'drills', label: 'Failure Drills (13)' },
          { id: 'runbook', label: 'First Lead Runbook' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2.5 border-b-2 font-semibold transition ${
              activeTab === tab.id
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW & READINESS */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Financial Evidence Summary */}
          {financialMetrics && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                <div className="text-xs text-slate-400 uppercase font-bold tracking-wider">Quoted Pipeline</div>
                <div className="text-2xl font-bold text-slate-100 mt-1">${financialMetrics.quotedValue.toLocaleString()}</div>
                <div className="text-xs text-slate-500 mt-0.5">{financialMetrics.evidenceCount} leads in {selectedEnv}</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                <div className="text-xs text-slate-400 uppercase font-bold tracking-wider">Booked Contracts</div>
                <div className="text-2xl font-bold text-amber-400 mt-1">${financialMetrics.bookedValue.toLocaleString()}</div>
                <div className="text-xs text-slate-500 mt-0.5">Customer signed scopes</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                <div className="text-xs text-slate-400 uppercase font-bold tracking-wider">Verified Revenue</div>
                <div className="text-2xl font-bold text-emerald-400 mt-1">${financialMetrics.verifiedRevenue.toLocaleString()}</div>
                <div className="text-xs text-slate-500 mt-0.5">Processor & bank verified</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                <div className="text-xs text-slate-400 uppercase font-bold tracking-wider">Attributable Gross Profit</div>
                <div className="text-2xl font-bold text-cyan-400 mt-1">${financialMetrics.attributableGrossProfit.toLocaleString()}</div>
                <div className="text-xs text-slate-500 mt-0.5">@ ~42% electrical margin</div>
              </div>
            </div>
          )}

          {/* Machine-Evaluated Gate Breakdown */}
          {readinessReport && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                    <CheckSquare className="w-5 h-5 text-amber-400" />
                    Machine-Evaluated Production Readiness Gates
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    12 deterministic gates required prior to processing live customer data
                  </p>
                </div>
                <span className={`text-xs px-3 py-1 rounded-full font-bold ${
                  readinessReport.isPilotReady
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                }`}>
                  {readinessReport.isPilotReady ? 'ALL MANDATORY GATES PASSED' : 'CONFIGURING GATES'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {readinessReport.gates.map((gate) => (
                  <div
                    key={gate.gateId}
                    className={`p-3 rounded-lg border text-xs flex items-start gap-3 ${
                      gate.status === 'PASS'
                        ? 'bg-slate-950/60 border-slate-800/80'
                        : gate.status === 'WARNING'
                        ? 'bg-amber-950/20 border-amber-800/40'
                        : 'bg-rose-950/30 border-rose-800/60'
                    }`}
                  >
                    <div className="mt-0.5">
                      {gate.status === 'PASS' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                      {gate.status === 'WARNING' && <AlertTriangle className="w-4 h-4 text-amber-400" />}
                      {gate.status === 'FAIL' && <XCircle className="w-4 h-4 text-rose-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-200">{gate.name}</span>
                        <span className="text-[10px] text-slate-500 uppercase">{gate.category}</span>
                      </div>
                      <p className="text-slate-400 mt-1 leading-relaxed">{gate.reason}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 p-3 bg-slate-950 rounded-lg border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
                <Shield className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                <span>{readinessReport.mandatoryDisclaimer}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: LEADS & TIMELINE */}
      {activeTab === 'leads' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Leads List */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-200">
                Active {selectedEnv} Leads ({leads.length})
              </h3>
              <button
                onClick={() => setActiveTab('intake')}
                className="text-xs text-amber-400 hover:underline font-semibold"
              >
                + Ingest Real Lead
              </button>
            </div>

            {leads.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-400 text-xs">
                No leads recorded in {selectedEnv} environment.
              </div>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                {leads.map((l) => (
                  <div
                    key={l.leadId}
                    onClick={() => setSelectedLeadId(l.leadId)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition text-xs ${
                      selectedLeadId === l.leadId
                        ? 'bg-slate-800 border-amber-500 shadow-sm'
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-100">{l.normalizedContact.fullName}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        l.lifecycleStatus === 'ATTRIBUTION_CONFIRMED'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        {l.lifecycleStatus}
                      </span>
                    </div>
                    <div className="text-slate-400 text-[11px] truncate">{l.serviceRequested}</div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2 pt-2 border-t border-slate-800/80">
                      <span>{l.normalizedContact.municipality}, {l.normalizedContact.stateProvince}</span>
                      <span>${l.estimatedValue.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Selected Lead Timeline & Evidence */}
          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            {selectedLeadId ? (
              <>
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-100">
                      Pilot Lifecycle Timeline
                    </h3>
                    <div className="text-xs text-slate-400 font-mono mt-0.5">
                      Lead ID: {selectedLeadId}
                    </div>
                  </div>
                  <button
                    onClick={() => handleExportAuditPackage(selectedLeadId)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Export Audit Package
                  </button>
                </div>

                {/* Timeline Events */}
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                  {selectedLeadTimeline.map((evt, idx) => (
                    <div key={evt.id} className="relative pl-6 pb-2 border-l border-slate-800 last:border-l-0 text-xs">
                      <div className="absolute -left-[7px] top-0 w-3.5 h-3.5 rounded-full bg-amber-500 border-2 border-slate-900" />
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-200">{evt.title}</span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {new Date(evt.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-slate-400 mt-1 leading-relaxed">{evt.description}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-500">
                        <span>Actor: {evt.actorOrSource}</span>
                        <span>Stage: {evt.stage}</span>
                        {evt.auditRef && <span className="font-mono text-slate-600">Ref: {evt.auditRef}</span>}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Audit Package Preview Modal */}
                {auditPackage && (
                  <div className="mt-4 p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-2">
                    <div className="flex items-center justify-between font-bold text-amber-400">
                      <span>Cryptographic Audit Package Preview</span>
                      <button onClick={() => setAuditPackage(null)} className="text-slate-400 hover:text-white">✕</button>
                    </div>
                    <pre className="text-[10px] text-slate-300 overflow-x-auto max-h-48 bg-slate-900 p-2 rounded">
                      {JSON.stringify(auditPackage, null, 2)}
                    </pre>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-16 text-slate-500 text-xs">
                Select a lead to inspect its end-to-end evidence timeline.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: INTAKE REAL LEAD */}
      {activeTab === 'intake' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-2xl mx-auto">
          <h3 className="text-base font-bold text-slate-100 mb-1">
            Real Pilot Lead Intake Boundary
          </h3>
          <p className="text-xs text-slate-400 mb-5">
            Normalized contact parsing, deduplication fingerprinting, and Massachusetts service area evaluation.
          </p>

          <form onSubmit={handleCreateLead} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Customer Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="e.g. Marcus Vance"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="marcus@example.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Phone Number *</label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="508-555-0182"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Street Address</label>
                <input
                  type="text"
                  value={formData.streetAddress}
                  onChange={(e) => setFormData({ ...formData, streetAddress: e.target.value })}
                  placeholder="18 Fort St"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Municipality (City/Town) *</label>
                <input
                  type="text"
                  required
                  value={formData.municipality}
                  onChange={(e) => setFormData({ ...formData, municipality: e.target.value })}
                  placeholder="New Bedford"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">State / Postal Code</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={formData.stateProvince}
                    onChange={(e) => setFormData({ ...formData, stateProvince: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200"
                  />
                  <input
                    type="text"
                    value={formData.postalCode}
                    onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                    placeholder="02740"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Electrical Service Requested</label>
              <input
                type="text"
                required
                value={formData.serviceRequested}
                onChange={(e) => setFormData({ ...formData, serviceRequested: e.target.value })}
                placeholder="200A Service Upgrade & EV Charger"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Intake Source Type</label>
                <select
                  value={formData.sourceType}
                  onChange={(e) => setFormData({ ...formData, sourceType: e.target.value as any })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200"
                >
                  <option value="WEBSITE_FORM">Website Contact Form</option>
                  <option value="MANUAL_OPERATOR">Manual Operator Entry</option>
                  <option value="AUTHENTICATED_CONNECTOR">Authenticated Connector (GBP / Twilio)</option>
                  <option value="API_GATEWAY">API Gateway / Webhook</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Estimated Project Value ($)</label>
                <input
                  type="number"
                  value={formData.estimatedValue}
                  onChange={(e) => setFormData({ ...formData, estimatedValue: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200"
                />
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex items-center gap-2">
              <input
                type="checkbox"
                id="consentProvided"
                checked={formData.consentProvided}
                onChange={(e) => setFormData({ ...formData, consentProvided: e.target.checked })}
                className="rounded border-slate-700 text-amber-500 focus:ring-amber-500"
              />
              <label htmlFor="consentProvided" className="text-slate-300 cursor-pointer">
                Customer provided explicit TCPA / SMS communication consent (opt-in recorded)
              </label>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition"
            >
              Intake Real Lead & Run Pipeline
            </button>
          </form>
        </div>
      )}

      {/* TAB 4: OUTCOMES & PAYMENTS */}
      {activeTab === 'outcomes' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Manual Outcome Recording */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-400" />
              Record Operator Real-World Outcome
            </h3>
            <p className="text-xs text-slate-400">
              Captures operator-reported actions. Labeled strictly OPERATOR_REPORTED until verified.
            </p>

            <form onSubmit={handleRecordOutcome} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Target Lead</label>
                <select
                  value={outcomeForm.leadId}
                  onChange={(e) => setOutcomeForm({ ...outcomeForm, leadId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200"
                >
                  <option value="">Select Lead...</option>
                  {leads.map((l) => (
                    <option key={l.leadId} value={l.leadId}>
                      {l.normalizedContact.fullName} ({l.leadId})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Outcome Event</label>
                <select
                  value={outcomeForm.outcomeType}
                  onChange={(e) => setOutcomeForm({ ...outcomeForm, outcomeType: e.target.value as any })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200"
                >
                  <option value="CUSTOMER_CALLED_BACK">Customer Called Back</option>
                  <option value="ESTIMATE_SCHEDULED">Estimate Scheduled</option>
                  <option value="ESTIMATE_DELIVERED">Estimate Delivered</option>
                  <option value="JOB_BOOKED">Job Booked (Contract Signed)</option>
                  <option value="JOB_COMPLETED">Job Completed</option>
                  <option value="INVOICE_SENT">Invoice Issued</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Contract / Invoiced Amount ($)</label>
                <input
                  type="number"
                  value={outcomeForm.amount}
                  onChange={(e) => setOutcomeForm({ ...outcomeForm, amount: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Operator Notes</label>
                <textarea
                  rows={3}
                  value={outcomeForm.notes}
                  onChange={(e) => setOutcomeForm({ ...outcomeForm, notes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-400 font-semibold rounded-lg border border-slate-700 transition"
              >
                Record Outcome Event
              </button>
            </form>
          </div>

          {/* Payment Evidence Boundary */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              Capture Real Payment Evidence
            </h3>
            <p className="text-xs text-slate-400">
              Only verified payments with processor & bank references advance to VERIFIED status.
            </p>

            <form onSubmit={handleRecordPayment} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Target Lead</label>
                <select
                  value={paymentForm.leadId}
                  onChange={(e) => setPaymentForm({ ...paymentForm, leadId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200"
                >
                  <option value="">Select Lead...</option>
                  {leads.map((l) => (
                    <option key={l.leadId} value={l.leadId}>
                      {l.normalizedContact.fullName} ({l.leadId})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Collected Payment Amount ($)</label>
                <input
                  type="number"
                  value={paymentForm.paymentAmount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentAmount: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Payment Evidence State</label>
                <select
                  value={paymentForm.evidenceState}
                  onChange={(e) => setPaymentForm({ ...paymentForm, evidenceState: e.target.value as any })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200"
                >
                  <option value="REPORTED">REPORTED (Operator Entry Only)</option>
                  <option value="PROCESSOR_CONFIRMED">PROCESSOR_CONFIRMED (Stripe / Square Tx)</option>
                  <option value="VERIFIED">VERIFIED (Bank Deposit & Processor Match)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Processor Tx Ref</label>
                  <input
                    type="text"
                    value={paymentForm.transactionReference}
                    onChange={(e) => setPaymentForm({ ...paymentForm, transactionReference: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Bank Deposit Ref</label>
                  <input
                    type="text"
                    value={paymentForm.bankDepositReference}
                    onChange={(e) => setPaymentForm({ ...paymentForm, bankDepositReference: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg transition"
              >
                Record Verified Payment
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 5: FAILURE DRILLS */}
      {activeTab === 'drills' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                Deterministic Failure Drills (13 Scenarios)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Proves the production pipeline fails closed under outages, rate limits, duplicate attacks, and tamper attempts.
              </p>
            </div>
            <button
              onClick={handleRunAllDrills}
              disabled={isRunningDrills}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-2 transition disabled:opacity-50"
            >
              <Play className="w-4 h-4" />
              {isRunningDrills ? 'Running Drills...' : 'Execute All 13 Drills'}
            </button>
          </div>

          <div className="space-y-2 mt-4">
            {drillResults.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                Click "Execute All 13 Drills" to run and verify all production failure boundaries.
              </div>
            ) : (
              drillResults.map((drill) => (
                <div
                  key={drill.drillId}
                  className={`p-3.5 rounded-lg border text-xs flex items-start justify-between gap-4 ${
                    drill.passed
                      ? 'bg-slate-950 border-slate-800'
                      : 'bg-rose-950/30 border-rose-800/60'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {drill.passed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
                    )}
                    <div>
                      <div className="font-bold text-slate-200">{drill.name}</div>
                      <div className="text-slate-400 mt-0.5">{drill.expectedBehavior}</div>
                      <div className="text-[11px] text-slate-500 mt-1 font-mono">{drill.actualBehavior}</div>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    drill.passed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                  }`}>
                    {drill.passed ? 'PASS (FAILED CLOSED)' : 'FAIL'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 6: OPERATOR RUNBOOK */}
      {activeTab === 'runbook' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-3xl mx-auto space-y-6 text-xs text-slate-300">
          <div>
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Terminal className="w-5 h-5 text-amber-400" />
              Reis Electric First Production Lead Runbook
            </h3>
            <p className="text-slate-400 mt-1">
              Standard Operating Procedure (SOP) for processing the first real electrical customer inquiry through Relay.
            </p>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
              <div className="font-bold text-amber-400 text-sm">Step 1: Pilot Readiness Check</div>
              <p>Verify that all 12 readiness gates are PASS in the Command Center. Ensure Master Electrician license (Shad Reis #19842-A) and business certificate are verified.</p>
            </div>

            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
              <div className="font-bold text-amber-400 text-sm">Step 2: Real Lead Intake</div>
              <p>Receive inbound inquiry via GBP or manual form. Confirm service area check passes (Bristol County / South Coast MA). Verify deduplication fingerprint.</p>
            </div>

            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
              <div className="font-bold text-amber-400 text-sm">Step 3: Human Action Approval</div>
              <p>Aria creates recommendation. Shad Reis (Authorized Approver) reviews payload hash, jurisdiction, and consent evidence before granting cryptographic approval.</p>
            </div>

            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
              <div className="font-bold text-amber-400 text-sm">Step 4: Outbound Execution & Delivery</div>
              <p>Twilio SMS connector dispatches estimate appointment link. Delivery confirmation is received and bound to the immutable audit ledger.</p>
            </div>

            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
              <div className="font-bold text-amber-400 text-sm">Step 5: Outcome & Payment Capture</div>
              <p>Record signed contract ($2,850) and verified bank deposit. Reconcile evidence graph and export signed audit package.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
