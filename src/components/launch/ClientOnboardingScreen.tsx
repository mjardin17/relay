import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Building,
  UserCheck,
  FileText,
  KeyRound,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  HelpCircle,
  Clock,
  Shield,
  Send,
  Eye,
  EyeOff,
  Scale,
  Sparkles,
  Info
} from 'lucide-react';
import { ClientOnboardingPortal } from '../../types/launchProgram';
import {
  GBPOfficialSourceRecord,
  GBP_OFFICIAL_SOURCES,
  GoogleBusinessAuthorizationGrant,
  GBPRoleAttestation,
  GBPWorkflowState,
  GBPOnboardingStageRecord,
  ReisElectricOwnerPacket,
  UnbundledGBPPermission,
  ALL_UNBUNDLED_PERMISSIONS
} from '../../types/gbpGovernance';

interface ClientOnboardingScreenProps {
  portals?: ClientOnboardingPortal[];
  onUpdatePortal?: (portalId: string, score: number, missing: string[]) => void;
  darkMode: boolean;
}

export const ClientOnboardingScreen: React.FC<ClientOnboardingScreenProps> = ({
  portals = [],
  onUpdatePortal,
  darkMode
}) => {
  const [activeSubView, setActiveSubView] = useState<
    'authorization' | 'workflow' | 'roles' | 'packet' | 'sources' | 'verification'
  >('authorization');

  // Governance state
  const [grant, setGrant] = useState<GoogleBusinessAuthorizationGrant | null>(null);
  const [roles, setRoles] = useState<GBPRoleAttestation[]>([]);
  const [workflow, setWorkflow] = useState<{
    businessId: string;
    currentState: GBPWorkflowState;
    stages: GBPOnboardingStageRecord[];
    history: any[];
  } | null>(null);
  const [packet, setPacket] = useState<ReisElectricOwnerPacket | null>(null);
  const officialSources: GBPOfficialSourceRecord[] = GBP_OFFICIAL_SOURCES;
  const [loading, setLoading] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [revokeReason, setRevokeReason] = useState('');
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Grant Form State
  const [selectedPermissions, setSelectedPermissions] = useState<UnbundledGBPPermission[]>([
    'PREPARE_PROFILE_DRAFT',
    'DISCOVER_EXISTING_PROFILE',
    'EDIT_BUSINESS_INFORMATION',
    'UPLOAD_MEDIA',
    'PUBLISH_POST',
    'RESPOND_TO_REVIEW',
    'VIEW_PERFORMANCE_DATA'
  ]);
  const [granteeRole, setGranteeRole] = useState<'googleProfilePrimaryOwner' | 'legalBusinessOwner'>('googleProfilePrimaryOwner');
  const [authorizedPerson, setAuthorizedPerson] = useState('Shad (Field Partner)');

  const fetchGovernanceData = async () => {
    setLoading(true);
    try {
      const headers = {
        'x-tenant-id': 'tenant_smrelec_001',
        'x-user-id': 'owner_shad',
        'x-user-role': 'owner',
        'x-permissions': 'launch:read,launch:write,launch:dispatch,audit:read',
      };

      const [authRes, rolesRes, wfRes, packetRes] = await Promise.all([
        fetch('/api/gbp/authorization', { headers }),
        fetch('/api/gbp/roles', { headers }),
        fetch('/api/gbp/workflow-state?businessId=smrelec', { headers }),
        fetch('/api/gbp/reis-electric-packet', { headers })
      ]);

      if (authRes.ok) {
        const data = await authRes.json();
        if (data.grant) setGrant(data.grant);
      }
      if (rolesRes.ok) {
        const data = await rolesRes.json();
        if (data.roles) setRoles(data.roles);
      }
      if (wfRes.ok) {
        const data = await wfRes.json();
        if (data.workflow) setWorkflow(data.workflow);
      }
      if (packetRes.ok) {
        const data = await packetRes.json();
        if (data.packet) setPacket(data.packet);
      }
    } catch (err) {
      console.error('Failed to load GBP governance data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGovernanceData();
  }, []);

  const handleGrantConsent = async () => {
    setLoading(true);
    setActionMessage(null);
    try {
      const res = await fetch('/api/gbp/authorization/grant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'tenant_smrelec_001',
          'x-user-id': 'owner_shad',
          'x-user-role': 'owner',
          'x-permissions': 'launch:read,launch:write,launch:dispatch,audit:read',
        },
        body: JSON.stringify({
          businessId: 'smrelec',
          authorizedPersonId: 'person_shad_reis',
          assertedAuthorityRole: granteeRole,
          authorityEvidenceClassification: 'SELF_REPORTED_PENDING_EVIDENCE',
          permissionPurpose: 'Guided-manual profile draft preparation and duplicate checks for Shadrick M. Reis Electric dry-run pilot.',
          allowedActions: selectedPermissions,
          prohibitedActions: [
            'MANAGE_PRIMARY_OWNERSHIP',
            'CHANGE_USER_ACCESS_ROLES',
            'DELETE_PROFILE',
            'SUBMIT_VERIFICATION_EVIDENCE',
            'PUBLISH_DIRECT_WITHOUT_APPROVAL'
          ],
          consentMethod: 'OWNER_PORTAL_SIGNATURE',
          consentDisclosureVersion: '2026.1-PILOT',
          consentDisclosureText: 'I, Shad (Field Partner/Intended Google Profile Primary Owner), authorize Relay to prepare profile drafts, perform duplicate listing discovery, and optimize service-area listings in DRY_RUN mode without Google account credentials or direct API access.',
          durationDays: 90
        })
      });

      const data = await res.json();
      if (data.success && data.grant) {
        setGrant(data.grant);
        setActionMessage({ type: 'success', text: 'Customer Authorization Grant successfully recorded with cryptographic hash.' });
        fetchGovernanceData();
      } else {
        setActionMessage({ type: 'error', text: data.message || data.error || 'Failed to record authorization grant.' });
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeGrant = async () => {
    if (!grant) return;
    setLoading(true);
    setActionMessage(null);
    try {
      const res = await fetch('/api/gbp/authorization/revoke', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'tenant_smrelec_001',
          'x-user-id': 'owner_shad',
          'x-user-role': 'owner',
          'x-permissions': 'launch:read,launch:write,launch:dispatch,audit:read',
        },
        body: JSON.stringify({
          authorizationId: grant.authorizationId,
          reason: revokeReason || 'Customer requested full authorization revocation.'
        })
      });

      const data = await res.json();
      if (data.success) {
        setActionMessage({ type: 'success', text: 'Authorization grant has been formally REVOKED. All downstream dispatch gates locked.' });
        setRevoking(false);
        setRevokeReason('');
        fetchGovernanceData();
      } else {
        setActionMessage({ type: 'error', text: data.message || 'Failed to revoke authorization grant.' });
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePermission = (perm: UnbundledGBPPermission) => {
    if (selectedPermissions.includes(perm)) {
      setSelectedPermissions(selectedPermissions.filter((p) => p !== perm));
    } else {
      setSelectedPermissions([...selectedPermissions, perm]);
    }
  };

  const handleWorkflowTransition = async (nextState: GBPWorkflowState, reason: string) => {
    setLoading(true);
    setActionMessage(null);
    try {
      const res = await fetch('/api/gbp/workflow-state/transition', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'tenant_smrelec_001',
          'x-user-id': 'owner_shad',
          'x-user-role': 'owner',
          'x-permissions': 'launch:read,launch:write,launch:dispatch,audit:read',
        },
        body: JSON.stringify({
          businessId: 'smrelec',
          newState: nextState,
          reason
        })
      });

      const data = await res.json();
      if (data.success) {
        setActionMessage({ type: 'success', text: `Workflow advanced to state: ${nextState}` });
        fetchGovernanceData();
      } else {
        setActionMessage({ type: 'error', text: data.message || 'Failed to transition workflow state.' });
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="gbp-customer-authorization-center" className="space-y-6">
      {/* Header & Mission Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-indigo-400" />
              Customer Authorization & Google Business Onboarding Center
            </h2>
            <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              GUIDED-MANUAL / DRY_RUN ONLY
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-3xl">
            Empowering business owners to authorize Relay for preparation while retaining strict primary ownership, Google account credentials, and final human approval.
          </p>
        </div>

        <button
          onClick={fetchGovernanceData}
          disabled={loading}
          className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono flex items-center gap-1.5 self-start md:self-auto cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh State
        </button>
      </div>

      {/* Mandatory Governance & Safety Banner */}
      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs font-mono space-y-2">
        <div className="flex items-center gap-2 font-bold text-amber-300 uppercase">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          Mandatory Controlled-Pilot Governance Boundary
        </div>
        <p className="text-[11px] leading-relaxed text-amber-100/90">
          Relay’s Google Business workflow is limited to guided-manual preparation and locally tested DRY_RUN behavior.
          No Google account was accessed, no Business Profile was created or claimed, no verification was submitted,
          no public information was changed, and no Google Business API or production OAuth credential was used.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[10px]">
          <div className="p-2 rounded bg-black/40 border border-amber-500/20 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Zero Google Credential Ingestion</span>
          </div>
          <div className="p-2 rounded bg-black/40 border border-amber-500/20 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Cryptographic SHA-256 Approval Locks</span>
          </div>
          <div className="p-2 rounded bg-black/40 border border-amber-500/20 flex items-center gap-1.5">
            <Scale className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span>Unbundled Permission Scopes</span>
          </div>
        </div>
      </div>

      {actionMessage && (
        <div className={`p-3.5 rounded-xl border text-xs font-mono flex items-center gap-2 ${
          actionMessage.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
        }`}>
          {actionMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{actionMessage.text}</span>
        </div>
      )}

      {/* Sub-View Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 text-xs font-mono font-bold overflow-x-auto">
        <button
          onClick={() => setActiveSubView('authorization')}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer shrink-0 flex items-center gap-2 ${
            activeSubView === 'authorization'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <KeyRound className="w-4 h-4" /> 1. Customer Authorization Grant
        </button>
        <button
          onClick={() => setActiveSubView('workflow')}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer shrink-0 flex items-center gap-2 ${
            activeSubView === 'workflow'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Clock className="w-4 h-4" /> 2. 12-Stage Onboarding Workflow
        </button>
        <button
          onClick={() => setActiveSubView('roles')}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer shrink-0 flex items-center gap-2 ${
            activeSubView === 'roles'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <UserCheck className="w-4 h-4" /> 3. Role Attestation Matrix
        </button>
        <button
          onClick={() => setActiveSubView('packet')}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer shrink-0 flex items-center gap-2 ${
            activeSubView === 'packet'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" /> 4. Reis Electric Owner Packet
        </button>
        <button
          onClick={() => setActiveSubView('verification')}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer shrink-0 flex items-center gap-2 ${
            activeSubView === 'verification'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Building className="w-4 h-4" /> 5. Guided-Manual Verification
        </button>
        <button
          onClick={() => setActiveSubView('sources')}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer shrink-0 flex items-center gap-2 ${
            activeSubView === 'sources'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ExternalLink className="w-4 h-4" /> 6. Google Official Rules & Citations
        </button>
      </div>

      {/* VIEW 1: CUSTOMER AUTHORIZATION GRANT */}
      {activeSubView === 'authorization' && (
        <div className="space-y-6">
          {/* Active Grant Status Card */}
          <div className={`p-6 rounded-2xl border ${
            grant && grant.status === 'ACTIVE'
              ? 'border-emerald-500/40 bg-emerald-950/20'
              : 'border-slate-800 bg-slate-900/60'
          }`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase text-indigo-400 block">
                  Active Grant Status
                </span>
                <h3 className="text-xl font-bold mt-0.5 flex items-center gap-2">
                  {grant ? `Authorization ID: ${grant.authorizationId}` : 'No Active Authorization Grant'}
                  {grant && (
                    <span className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold ${
                      grant.status === 'ACTIVE'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    }`}>
                      {grant.status}
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {grant
                    ? `Granted on ${new Date(grant.grantedAt).toLocaleString()} • Expires ${new Date(grant.expiresAt).toLocaleDateString()}`
                    : 'A formal customer authorization grant is strictly required before Relay can prepare profile drafts or duplicate checks.'}
                </p>
              </div>

              {grant && grant.status === 'ACTIVE' && (
                <div className="flex items-center gap-3">
                  {!revoking ? (
                    <button
                      onClick={() => setRevoking(true)}
                      className="px-4 py-2 rounded-xl text-xs font-bold font-mono bg-rose-600/80 hover:bg-rose-600 text-white cursor-pointer"
                    >
                      Revoke Authorization
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Reason for revocation..."
                        value={revokeReason}
                        onChange={(e) => setRevokeReason(e.target.value)}
                        className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
                      />
                      <button
                        onClick={handleRevokeGrant}
                        disabled={loading}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold font-mono bg-rose-600 text-white cursor-pointer"
                      >
                        Confirm Revoke
                      </button>
                      <button
                        onClick={() => setRevoking(false)}
                        className="px-2 py-1.5 text-xs text-slate-400 hover:text-white"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {grant && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 pt-6 border-t border-slate-800 text-xs font-mono">
                <div className="space-y-2">
                  <div className="text-slate-400">Authorized Person: <span className="text-white font-bold">{grant.authorizedPersonId}</span></div>
                  <div className="text-slate-400">Asserted Authority: <span className="text-indigo-300 font-bold">{grant.assertedAuthorityRole}</span></div>
                  <div className="text-slate-400">Consent Method: <span className="text-emerald-300">{grant.consentMethod}</span></div>
                  <div className="text-slate-400">Consent Text Hash: <span className="text-slate-300 text-[10px] break-all">{grant.consentDisclosureTextHash}</span></div>
                </div>
                <div className="space-y-2">
                  <div className="text-slate-400">Approval SHA-256 Hash: <span className="text-emerald-400 text-[10px] break-all font-bold">{grant.approvalContentHash}</span></div>
                  <div className="text-slate-400">Allowed Actions Count: <span className="text-indigo-400 font-bold">{grant.allowedActions.length} Actions</span></div>
                  <div className="text-slate-400">Prohibited Actions: <span className="text-rose-400 font-bold">{grant.prohibitedActions.length} Hard Blocks</span></div>
                </div>
              </div>
            )}
          </div>

          {/* Unbundled Scope Configuration & Sign Form */}
          <div className={`p-6 rounded-2xl border ${darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'} space-y-6`}>
            <div>
              <h3 className="text-base font-bold flex items-center gap-2">
                <Scale className="w-5 h-5 text-indigo-400" />
                Unbundled Granular Permission Configuration
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Select only the specific tasks Relay is permitted to prepare on behalf of the business. Each action is checked at runtime before execution.
              </p>
            </div>

            {/* Permission Checkboxes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {ALL_UNBUNDLED_PERMISSIONS.map((perm) => {
                const isSelected = selectedPermissions.includes(perm);
                return (
                  <div
                    key={perm}
                    onClick={() => handleTogglePermission(perm)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                      isSelected
                        ? 'border-indigo-500/60 bg-indigo-950/20 text-white'
                        : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="mt-1 cursor-pointer"
                    />
                    <div className="space-y-0.5">
                      <span className="text-xs font-mono font-bold block">{perm}</span>
                      <span className="text-[11px] text-slate-400 leading-tight block">
                        {perm === 'PREPARE_PROFILE_DRAFT' && 'Draft profile categories, description, and operating hours'}
                        {perm === 'DISCOVER_EXISTING_PROFILE' && 'Scan for duplicate listings without contacting Google'}
                        {perm === 'CREATE_OR_CLAIM_PROFILE' && 'Guided draft package for profile creation'}
                        {perm === 'EDIT_BUSINESS_INFORMATION' && 'Format service menus, business hours, and contact details'}
                        {perm === 'UPLOAD_MEDIA' && 'Format photo metadata and work sample assets'}
                        {perm === 'PUBLISH_POST' && 'Guided draft publication of owner-approved posts'}
                        {perm === 'RESPOND_TO_REVIEW' && 'Draft professional review responses for owner approval'}
                        {perm === 'INVITE_MANAGER' && 'Assist owner with manager invitation process'}
                        {perm === 'VIEW_PERFORMANCE_DATA' && 'Review profile search impressions and engagement insights'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Prohibited Scopes Warning */}
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs font-mono space-y-1 text-rose-300">
              <span className="font-bold flex items-center gap-1.5 text-rose-400">
                <Lock className="w-3.5 h-3.5" /> Immutable Prohibitions (Hardcoded Safety Rails)
              </span>
              <p className="text-[11px] text-rose-200/80 leading-relaxed">
                Relay is strictly forbidden from claiming primary ownership, altering user access roles, deleting profiles, entering Google account credentials, or submitting verification without the owner.
              </p>
            </div>

            {/* Sign and Grant Button */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <div className="text-xs text-slate-400 font-mono">
                Grantee: <span className="text-white font-bold">Shad (Primary Owner)</span> • Target: <span className="text-indigo-400 font-bold">smrelec</span>
              </div>
              <button
                onClick={handleGrantConsent}
                disabled={loading || selectedPermissions.length === 0}
                className="px-6 py-2.5 rounded-xl font-mono font-bold text-xs bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-indigo-950"
              >
                <KeyRound className="w-4 h-4" /> Execute Cryptographic Customer Grant (90 Days)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: 12-STAGE ONBOARDING WORKFLOW */}
      {activeSubView === 'workflow' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold">12-Stage Controlled-Pilot State Machine</h3>
              <p className="text-xs text-slate-400 mt-0.5 font-mono">
                Current Global Workflow State: <span className="text-indigo-400 font-bold uppercase">{workflow?.currentState || 'NOT_STARTED'}</span>
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {(workflow?.stages || []).map((stg) => (
              <div
                key={stg.stageNumber}
                className={`p-4 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  stg.isComplete
                    ? 'border-emerald-500/40 bg-emerald-950/20 text-slate-200'
                    : 'border-slate-800 bg-slate-900/60 text-slate-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-mono font-bold text-xs ${
                    stg.isComplete ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {stg.isComplete ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : stg.stageNumber}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-white">{stg.title}</h4>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-indigo-300 border border-slate-700">
                        {stg.assignedActor}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{stg.description}</p>
                    {stg.completedAt && (
                      <span className="text-[10px] font-mono text-emerald-400 mt-1 block">
                        Completed: {new Date(stg.completedAt).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {stg.stageKey === 'owner_authority_attestation' && (
                    <button
                      onClick={() => handleWorkflowTransition('OWNER_AUTHORIZED', 'Completed owner authorization attestation.')}
                      className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer"
                    >
                      Attest & Authorize
                    </button>
                  )}
                  {stg.stageKey === 'business_identity_intake' && (
                    <button
                      onClick={() => handleWorkflowTransition('DUPLICATE_CHECK_REQUIRED', 'Business identity intake verified.')}
                      className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer"
                    >
                      Submit Intake
                    </button>
                  )}
                  {stg.stageKey === 'duplicate_discovery' && (
                    <button
                      onClick={() => handleWorkflowTransition('PROFILE_DRAFT_READY', 'Duplicate discovery check completed clear.')}
                      className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer"
                    >
                      Run Discovery
                    </button>
                  )}
                  {stg.stageKey === 'profile_plan_human_approval' && (
                    <button
                      onClick={() => handleWorkflowTransition('OWNER_APPROVED', 'Human owner approved profile plan.')}
                      className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
                    >
                      Sign Plan Approval
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW 3: ROLE ATTESTATION MATRIX */}
      {activeSubView === 'roles' && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 space-y-1">
            <span className="font-bold text-white block">Controlled-Pilot Governance Notice:</span>
            <p className="text-slate-400">
              Role attestations document self-reported and evidence-supported authority for the Shadrick M. Reis Electric pilot.
              Relay does not provide legal representation or guarantee ownership standing.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {roles.map((r) => (
              <div key={r.attestationId} className={`p-6 rounded-2xl border space-y-4 ${
                darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-base text-white">{r.personName}</h4>
                    <span className="text-xs font-mono text-slate-400">{r.personIdentifier}</span>
                  </div>
                  <span className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    {r.role}
                  </span>
                </div>

                <div className="space-y-2 text-xs font-mono bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div className="text-slate-400">Status: <span className="text-emerald-400 font-bold">{r.status}</span></div>
                  <div className="text-slate-400">Attested At: <span className="text-slate-300">{new Date(r.attestedAt).toLocaleString()}</span></div>
                  <div className="text-slate-400">Evidence Hash: <span className="text-indigo-400 text-[10px] break-all">{r.evidenceHash}</span></div>
                </div>

                <div className="text-xs text-slate-300 bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
                  <span className="text-[10px] font-bold uppercase font-mono text-slate-500 block mb-1">Governance Notes</span>
                  {r.notes}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW 4: REIS ELECTRIC OWNER PACKET */}
      {activeSubView === 'packet' && packet && (
        <div className="space-y-6">
          <div className={`p-6 rounded-2xl border ${darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'} space-y-6`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase text-indigo-400">
                  Prepared For Primary Owner
                </span>
                <h3 className="text-xl font-bold mt-0.5">{packet.businessDetails.companyName}</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Drafting packet for guided-manual Google Business Profile onboarding.
                </p>
              </div>
              <div className="text-right font-mono text-xs text-slate-400">
                <span>Account Type: <span className="text-emerald-400 font-bold">{packet.businessDetails.accountType}</span></span>
                <span className="block mt-0.5">Primary Category: <span className="text-indigo-400 font-bold">{packet.businessDetails.primaryCategory}</span></span>
              </div>
            </div>

            {/* Service Areas Section */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase font-mono text-slate-300">
                Designated Service Areas (Greater Boston / MetroWest - 20 Municipalities)
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {packet.businessDetails.serviceAreas.map((area, i) => (
                  <span key={i} className="px-2.5 py-1 rounded text-xs font-mono bg-slate-950 border border-slate-800 text-slate-300">
                    {area}
                  </span>
                ))}
              </div>
            </div>

            {/* Address Privacy Guarantee */}
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs font-mono text-emerald-300 space-y-1">
              <span className="font-bold flex items-center gap-1.5 text-emerald-400">
                <CheckCircle2 className="w-4 h-4" /> Service-Area Address Protection Active
              </span>
              <p className="text-[11px] text-emerald-200/90 leading-relaxed">
                Residential address ({packet.businessDetails.serviceAreaPrivacy.privateAddressRedacted}) is kept strictly confidential for verification and will NOT be shown publicly on Google Maps.
              </p>
            </div>

            {/* Ready-to-Copy Description */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase font-mono text-slate-300">
                Owner-Approved Profile Description
              </h4>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 font-mono leading-relaxed">
                {packet.businessDetails.description}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 5: GUIDED-MANUAL VERIFICATION */}
      {activeSubView === 'verification' && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-xs text-indigo-300 font-mono space-y-1">
            <span className="font-bold text-indigo-200 block">Guided-Manual Verification Instructions for Shad:</span>
            <p className="text-indigo-100/90 leading-relaxed">
              Google determines which verification methods are available for your profile. Relay provides preparation guidance, but only the primary owner can complete the verification in Google’s portal.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className={`p-5 rounded-xl border space-y-3 ${darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
              <h4 className="font-bold text-sm text-white flex items-center gap-2">
                <Building className="w-4 h-4 text-amber-400" /> Video Verification Checklist
              </h4>
              <ul className="text-xs text-slate-400 space-y-2 font-mono list-disc pl-4">
                <li>Film official electrical contractor licensing document and state registration.</li>
                <li>Capture branded service vehicle and commercial equipment/tools.</li>
                <li>Record street name sign and surrounding service area context.</li>
                <li>Keep video continuous without cuts or edits.</li>
              </ul>
            </div>

            <div className={`p-5 rounded-xl border space-y-3 ${darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
              <h4 className="font-bold text-sm text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" /> Postcard Verification Process
              </h4>
              <ul className="text-xs text-slate-400 space-y-2 font-mono list-disc pl-4">
                <li>Google mails a 5-digit verification code to the private residential address.</li>
                <li>Typical delivery takes 5 to 14 business days.</li>
                <li>Do NOT edit the business name or category while postcard is in transit.</li>
                <li>Enter the code directly into Google Business Profile Manager when received.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 6: GOOGLE OFFICIAL SOURCE CITATIONS */}
      {activeSubView === 'sources' && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300">
            <span className="font-bold text-white block mb-1">Official Policy Documentation Reference</span>
            All Relay workflows and architectural gates strictly reflect the official Google Business Profile policies and guidelines cited below.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {officialSources.map((source) => (
              <div
                key={source.sourceId}
                className={`p-5 rounded-xl border space-y-3 ${
                  darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-bold text-sm text-white">{source.title}</h4>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-indigo-300 shrink-0">
                    {source.sourceVersion}
                  </span>
                </div>

                <div className="space-y-1 text-xs font-mono text-slate-400">
                  <div>Source ID: <span className="text-slate-200">{source.sourceId}</span></div>
                  <div>Last Updated: <span className="text-slate-200">{source.effectiveOrUpdatedDate}</span></div>
                  <div>Retrieved: <span className="text-slate-200">{source.retrievedDate}</span></div>
                </div>

                <div className="text-xs bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold uppercase font-mono text-indigo-400 block">Governance Constraint</span>
                  <p className="text-slate-300 font-mono text-[11px] leading-relaxed">{source.governanceConstraint}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
