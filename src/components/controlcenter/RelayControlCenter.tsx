import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Zap,
  Building2,
  Users,
  TrendingUp,
  Globe,
  Plug,
  Activity,
  Play,
  Pause,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Layers,
  FileCheck,
  Search,
  ArrowRight,
  Database,
  Lock,
  Compass,
  Cpu,
  Boxes,
  Code2,
  Flame,
  Scale
} from 'lucide-react';
import { AuthoritativeConnectorMetadata, TenantConnectorInstance } from '../../types/authoritativeConnector';
import { UniversalActionRecord } from '../../types/universalActionEngine';
import { ProjectDefinition, ProjectComparisonReport, WorkspaceCapabilityInventoryItem } from '../../types/projectIntelligence';

interface RelayControlCenterProps {
  darkMode: boolean;
  tenantId?: string;
}

export const RelayControlCenter: React.FC<RelayControlCenterProps> = ({
  darkMode,
  tenantId = 'default-tenant'
}) => {
  const [subTab, setSubTab] = useState<
    'overview' | 'tenants' | 'workforce' | 'growth' | 'content' | 'connectors' | 'operations' | 'intelligence'
  >('overview');

  // State
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<any>(null);
  const [tenants, setTenants] = useState<any[]>([]);
  const [workforce, setWorkforce] = useState<any>(null);
  const [growthData, setGrowthData] = useState<any>(null);
  const [contentData, setContentData] = useState<any>(null);
  const [connectorsCatalog, setConnectorsCatalog] = useState<AuthoritativeConnectorMetadata[]>([]);
  const [tenantConnectors, setTenantConnectors] = useState<TenantConnectorInstance[]>([]);
  const [operationsData, setOperationsData] = useState<any>(null);
  const [universalActions, setUniversalActions] = useState<UniversalActionRecord[]>([]);
  const [projects, setProjects] = useState<ProjectDefinition[]>([]);
  const [capabilityInventory, setCapabilityInventory] = useState<WorkspaceCapabilityInventoryItem[]>([]);
  const [comparisonReport, setComparisonReport] = useState<ProjectComparisonReport | null>(null);
  const [selectedTargetProject, setSelectedTargetProject] = useState('relay_central');
  const [selectedSourceProject, setSelectedSourceProject] = useState('storyforge');
  const [isEmergencyPaused, setIsEmergencyPaused] = useState(false);
  const [pauseReason, setPauseReason] = useState('');
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      // 1. Summary
      const resSum = await fetch(`/api/control-center/summary?tenantId=${tenantId}`);
      if (resSum.ok) {
        const d = await resSum.json();
        setSummary(d.summary);
        setIsEmergencyPaused(d.summary?.isEmergencyPaused || false);
        setPauseReason(d.summary?.emergencyReason || '');
      }

      // 2. Tenants
      const resTenants = await fetch('/api/control-center/tenants');
      if (resTenants.ok) {
        const d = await resTenants.json();
        setTenants(d.tenants || []);
      }

      // 3. Workforce
      const resWf = await fetch('/api/control-center/workforce');
      if (resWf.ok) {
        const d = await resWf.json();
        setWorkforce(d.workforce);
      }

      // 4. Growth
      const resGrowth = await fetch(`/api/control-center/growth?tenantId=${tenantId}`);
      if (resGrowth.ok) {
        const d = await resGrowth.json();
        setGrowthData(d.growth);
      }

      // 5. Content
      const resContent = await fetch('/api/control-center/content');
      if (resContent.ok) {
        const d = await resContent.json();
        setContentData(d.content);
      }

      // 6. Connectors
      const resConn = await fetch(`/api/control-center/connectors?tenantId=${tenantId}`);
      if (resConn.ok) {
        const d = await resConn.json();
        setConnectorsCatalog(d.catalog || []);
        setTenantConnectors(d.tenantInstances || []);
      }

      // 7. Operations
      const resOps = await fetch(`/api/control-center/operations?tenantId=${tenantId}`);
      if (resOps.ok) {
        const d = await resOps.json();
        setOperationsData(d.operations);
      }

      // 8. Universal Actions
      const resActions = await fetch(`/api/universal-actions/list?tenantId=${tenantId}`);
      if (resActions.ok) {
        const d = await resActions.json();
        setUniversalActions(d.actions || []);
      }

      // 9. Project Intelligence
      const resProj = await fetch('/api/project-intelligence/projects');
      if (resProj.ok) {
        const d = await resProj.json();
        setProjects(d.projects || []);
      }

      const resCap = await fetch('/api/project-intelligence/capability-inventory');
      if (resCap.ok) {
        const d = await resCap.json();
        setCapabilityInventory(d.capabilityInventory || []);
      }
    } catch (err: any) {
      console.error('Failed to load control center data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [tenantId]);

  const handleToggleEmergencyPause = async () => {
    try {
      const nextState = !isEmergencyPaused;
      const res = await fetch('/api/control-center/emergency-pause', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          paused: nextState,
          reason: nextState ? 'Operator manual pause from Control Center' : undefined,
          actorId: 'operator-admin'
        })
      });
      if (res.ok) {
        const d = await res.json();
        setIsEmergencyPaused(d.isEmergencyPaused);
        setActionFeedback(
          nextState
            ? 'EMERGENCY PAUSE ENGAGED. All external automation suspended.'
            : 'AUTOMATION RESUMED. Execution engine operational.'
        );
        setTimeout(() => setActionFeedback(null), 4000);
        fetchAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleApproveAction = async (actionId: string, decision: 'APPROVE' | 'REJECT') => {
    try {
      const res = await fetch('/api/universal-actions/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionId,
          decision,
          approverId: 'operator-admin',
          approverRole: 'OWNER'
        })
      });
      if (res.ok) {
        setActionFeedback(`Action ${actionId} ${decision === 'APPROVE' ? 'approved & executed' : 'rejected'}.`);
        setTimeout(() => setActionFeedback(null), 4000);
        fetchAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleVerifyConnector = async (provider: string) => {
    try {
      const res = await fetch('/api/connector-registry/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          provider,
          simulateSuccess: true
        })
      });
      if (res.ok) {
        const d = await res.json();
        setActionFeedback(`Verification probe: ${d.probe?.sanitizedMessage}`);
        setTimeout(() => setActionFeedback(null), 5000);
        fetchAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRunProjectComparison = async () => {
    try {
      const res = await fetch('/api/project-intelligence/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetId: selectedTargetProject,
          sourceId: selectedSourceProject
        })
      });
      if (res.ok) {
        const d = await res.json();
        setComparisonReport(d.report);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className={`p-6 max-w-7xl mx-auto space-y-6 ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
      {/* Header & Global Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5 border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-lg shadow-indigo-500/20">
              <Boxes className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">Relay Control Center</h1>
                <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-indigo-500/20 text-indigo-400 font-bold border border-indigo-500/30">
                  AI Business OS v2.0
                </span>
              </div>
              <p className="text-sm text-slate-400">
                Production-grade multi-tenant operations, autonomous workforce, universal execution, and authoritative connectors.
              </p>
            </div>
          </div>
        </div>

        {/* Emergency Stop / Automation Toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={fetchAllData}
            className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
              darkMode ? 'bg-slate-800 border-slate-700 hover:bg-slate-700' : 'bg-white border-slate-300 hover:bg-slate-50'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleToggleEmergencyPause}
            className={`px-4 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-md ${
              isEmergencyPaused
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30'
                : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/30'
            }`}
          >
            {isEmergencyPaused ? (
              <>
                <Play className="w-4 h-4" />
                <span>Resume All Automation</span>
              </>
            ) : (
              <>
                <Pause className="w-4 h-4" />
                <span>Pause All Automation</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Emergency Alert Banner */}
      {isEmergencyPaused && (
        <div className="p-4 rounded-xl border border-rose-500/40 bg-rose-950/40 text-rose-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-6 h-6 text-rose-400 shrink-0" />
            <div>
              <div className="font-bold text-sm">EMERGENCY KILLSWITCH ACTIVE</div>
              <div className="text-xs text-rose-300">
                All outbound actions and automated workers are paused fail-closed. {pauseReason || 'Manual operator hold.'}
              </div>
            </div>
          </div>
          <button
            onClick={handleToggleEmergencyPause}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg transition shrink-0 cursor-pointer"
          >
            Resume Engine
          </button>
        </div>
      )}

      {/* Action Feedback Banner */}
      {actionFeedback && (
        <div className="p-3 rounded-lg border border-indigo-500/40 bg-indigo-950/40 text-indigo-200 text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-indigo-400" />
          <span>{actionFeedback}</span>
        </div>
      )}

      {/* Sub Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-800 scrollbar-none">
        {[
          { id: 'overview', label: 'Command Overview', icon: Activity },
          { id: 'tenants', label: 'Tenants', icon: Building2, count: summary?.tenants },
          { id: 'workforce', label: 'AI Workforce', icon: Users },
          { id: 'growth', label: 'Growth & Leads', icon: TrendingUp, count: summary?.opportunities },
          { id: 'content', label: 'Content & Assets', icon: Globe },
          { id: 'connectors', label: 'Authoritative Connectors', icon: Plug, count: summary?.connectorsVerified },
          { id: 'operations', label: 'Operations & Queue', icon: Cpu, count: universalActions.length },
          { id: 'intelligence', label: 'Project Intelligence', icon: Code2 }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = subTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSubTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-900'
                  : darkMode
                  ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${isActive ? 'bg-indigo-800 text-white' : 'bg-slate-800 text-slate-400'}`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: COMMAND OVERVIEW */}
      {subTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metric Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className={`p-4 rounded-xl border ${darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
              <div className="text-xs text-slate-400 font-medium flex items-center justify-between">
                <span>Active Tenants</span>
                <Building2 className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="text-2xl font-bold mt-2 font-mono">{summary?.tenants || 0}</div>
              <div className="text-[10px] text-emerald-400 font-medium mt-1">Tenant Isolated</div>
            </div>

            <div className={`p-4 rounded-xl border ${darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
              <div className="text-xs text-slate-400 font-medium flex items-center justify-between">
                <span>AI Workforce</span>
                <Users className="w-4 h-4 text-violet-400" />
              </div>
              <div className="text-2xl font-bold mt-2 font-mono">4 Agents</div>
              <div className="text-[10px] text-emerald-400 font-medium mt-1">Operational</div>
            </div>

            <div className={`p-4 rounded-xl border ${darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
              <div className="text-xs text-slate-400 font-medium flex items-center justify-between">
                <span>Opportunities</span>
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold mt-2 font-mono">{summary?.opportunities || 0}</div>
              <div className="text-[10px] text-emerald-400 font-medium mt-1">Discovered</div>
            </div>

            <div className={`p-4 rounded-xl border ${darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
              <div className="text-xs text-slate-400 font-medium flex items-center justify-between">
                <span>Universal Actions</span>
                <Zap className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-bold mt-2 font-mono">{summary?.universalActions || 0}</div>
              <div className="text-[10px] text-amber-400 font-medium mt-1">Audited Ledger</div>
            </div>

            <div className={`p-4 rounded-xl border ${darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
              <div className="text-xs text-slate-400 font-medium flex items-center justify-between">
                <span>Connectors</span>
                <Plug className="w-4 h-4 text-sky-400" />
              </div>
              <div className="text-2xl font-bold mt-2 font-mono">{summary?.connectorsVerified || 0} / {connectorsCatalog.length}</div>
              <div className="text-[10px] text-sky-400 font-medium mt-1">Official & Probed</div>
            </div>

            <div className={`p-4 rounded-xl border ${darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
              <div className="text-xs text-slate-400 font-medium flex items-center justify-between">
                <span>Queue & DLQ</span>
                <Cpu className="w-4 h-4 text-rose-400" />
              </div>
              <div className="text-2xl font-bold mt-2 font-mono">{summary?.queuePending || 0} <span className="text-xs text-slate-400 font-normal">/ {summary?.dlqActive || 0} DLQ</span></div>
              <div className="text-[10px] text-emerald-400 font-medium mt-1">Crash Resilient</div>
            </div>
          </div>

          {/* Quick Universal Actions Queue */}
          <div className={`p-5 rounded-xl border ${darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-indigo-400" />
                <h2 className="text-sm font-bold">Universal Action Engine — Recent Governance Stream</h2>
              </div>
              <button
                onClick={() => setSubTab('operations')}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 cursor-pointer"
              >
                View Full Queue <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {universalActions.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No universal actions recorded yet. Actions submitted across any module will appear here with cryptographic audit tracking.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-[10px] uppercase font-mono text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="pb-2">Action ID</th>
                      <th className="pb-2">Action Type</th>
                      <th className="pb-2">Provider</th>
                      <th className="pb-2">Actor Role</th>
                      <th className="pb-2">Execution State</th>
                      <th className="pb-2">Approval State</th>
                      <th className="pb-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 font-mono">
                    {universalActions.slice(0, 5).map((act) => (
                      <tr key={act.id} className="hover:bg-slate-800/30">
                        <td className="py-2.5 font-bold text-slate-300">{act.id.substring(0, 18)}...</td>
                        <td className="py-2.5 text-indigo-400">{act.actionType}</td>
                        <td className="py-2.5 text-slate-300">{act.provider}</td>
                        <td className="py-2.5 text-slate-400">{act.actorRole}</td>
                        <td className="py-2.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              act.executionState === 'SUCCEEDED'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : act.executionState === 'PENDING_APPROVAL'
                                ? 'bg-amber-500/20 text-amber-400'
                                : act.executionState === 'FAILED_CLOSED'
                                ? 'bg-rose-500/20 text-rose-400'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {act.executionState}
                          </span>
                        </td>
                        <td className="py-2.5 text-slate-300">{act.approvalState}</td>
                        <td className="py-2.5 text-right">
                          {act.approvalState === 'PENDING_APPROVAL' && (
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleApproveAction(act.id, 'APPROVE')}
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-bold cursor-pointer"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleApproveAction(act.id, 'REJECT')}
                                className="px-2 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded text-[10px] font-bold cursor-pointer"
                              >
                                Reject
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: TENANTS */}
      {subTab === 'tenants' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-400" />
              Tenant & Business Registry
            </h2>
            <span className="text-xs text-slate-400 font-mono">{tenants.length} Businesses Registered</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tenants.map((t) => (
              <div key={t.id} className={`p-5 rounded-xl border ${darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'} space-y-3`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-100">{t.name}</h3>
                    <div className="text-xs text-slate-400 font-mono">ID: {t.id} • {t.industry}</div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                    {t.environment_classification || 'PILOT'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs font-mono pt-2 border-t border-slate-800">
                  <div>
                    <div className="text-[10px] text-slate-400">MRR</div>
                    <div className="font-bold text-slate-200">${(t.mrr || 0).toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">Operating Mode</div>
                    <div className="font-bold text-slate-200">{t.operating_mode || 'Guided Manual'}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">Maturity</div>
                    <div className="font-bold text-slate-200">{t.company_maturity || 'Active'}</div>
                  </div>
                </div>

                {t.locations && t.locations.length > 0 && (
                  <div className="pt-2 border-t border-slate-800">
                    <div className="text-[10px] text-slate-400 uppercase font-mono font-semibold">Configured Locations</div>
                    <div className="mt-1 space-y-1">
                      {t.locations.map((loc: any) => (
                        <div key={loc.id} className="text-xs text-slate-300 flex items-center justify-between bg-slate-800/40 px-2 py-1 rounded font-mono">
                          <span>{loc.city}, {loc.state_province} ({loc.location_type})</span>
                          <span className="text-[10px] text-emerald-400">{loc.verification_state}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: AI WORKFORCE */}
      {subTab === 'workforce' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold flex items-center gap-2">
              <Users className="w-4 h-4 text-violet-400" />
              Autonomous Workforce & Agent Orchestration
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(workforce?.activeWorkers || []).map((w: any) => (
              <div key={w.id} className={`p-5 rounded-xl border ${darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'} space-y-3`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-violet-500/20 text-violet-400">
                      <Cpu className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-100">{w.name}</h3>
                      <div className="text-xs text-slate-400">{w.role}</div>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-emerald-500/20 text-emerald-400">
                    {w.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-2 border-t border-slate-800">
                  <div className="p-2 rounded bg-slate-800/40">
                    <div className="text-[10px] text-slate-400">Completed Jobs</div>
                    <div className="text-base font-bold text-emerald-400">{w.completedJobs}</div>
                  </div>
                  <div className="p-2 rounded bg-slate-800/40">
                    <div className="text-[10px] text-slate-400">Failed / Retries</div>
                    <div className="text-base font-bold text-slate-300">{w.failedJobs}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: GROWTH & ATTRIBUTION */}
      {subTab === 'growth' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Verified Revenue Opportunities & Attribution
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(growthData?.opportunities || []).map((opp: any) => (
              <div key={opp.id} className={`p-4 rounded-xl border ${darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'} space-y-2`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-100">{opp.title}</span>
                  <span className="text-xs font-mono font-bold text-emerald-400">+${(opp.estimated_monthly_value || 0).toLocaleString()}/mo</span>
                </div>
                <p className="text-xs text-slate-400">{opp.description}</p>
                <div className="text-[10px] font-mono text-slate-500 pt-2 border-t border-slate-800 flex items-center justify-between">
                  <span>Action: {opp.action_type}</span>
                  <span>Confidence: {opp.confidence}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: CONTENT & ASSETS */}
      {subTab === 'content' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold flex items-center gap-2">
              <Globe className="w-4 h-4 text-sky-400" />
              Websites, Proof of Work & Published Content
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`p-4 rounded-xl border ${darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
              <div className="text-xs font-bold text-slate-300 mb-2">Website Projects</div>
              <div className="text-xl font-bold font-mono text-indigo-400">{contentData?.websiteProjects?.length || 0} Active Sites</div>
              <div className="mt-2 space-y-1">
                {(contentData?.websiteProjects || []).map((p: any) => (
                  <div key={p.id} className="text-xs font-mono text-slate-400 flex items-center justify-between">
                    <span>{p.site_name}</span>
                    <span className="text-[10px] text-emerald-400">{p.status}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className={`p-4 rounded-xl border ${darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
              <div className="text-xs font-bold text-slate-300 mb-2">Website Pages</div>
              <div className="text-xl font-bold font-mono text-emerald-400">{contentData?.websitePages?.length || 0} Pages Published</div>
              <div className="mt-2 space-y-1 max-h-36 overflow-y-auto">
                {(contentData?.websitePages || []).map((page: any) => (
                  <div key={page.id} className="text-xs font-mono text-slate-400 flex items-center justify-between">
                    <span>{page.slug}</span>
                    <span className="text-[10px] text-slate-500">{page.page_type}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className={`p-4 rounded-xl border ${darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
              <div className="text-xs font-bold text-slate-300 mb-2">Verified Proof Items</div>
              <div className="text-xl font-bold font-mono text-amber-400">{contentData?.proofItems?.length || 0} Proof Records</div>
              <div className="mt-2 space-y-1 max-h-36 overflow-y-auto">
                {(contentData?.proofItems || []).map((proof: any) => (
                  <div key={proof.id} className="text-xs font-mono text-slate-400 flex items-center justify-between">
                    <span className="truncate max-w-[140px]">{proof.title}</span>
                    <span className="text-[10px] text-emerald-400">{proof.verification_status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: AUTHORITATIVE CONNECTORS */}
      {subTab === 'connectors' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold flex items-center gap-2">
              <Plug className="w-4 h-4 text-sky-400" />
              Authoritative Connector Registry & Probe Diagnostics
            </h2>
            <span className="text-xs text-slate-400 font-mono">{connectorsCatalog.length} Total Registered Connectors</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {connectorsCatalog.map((c) => {
              const instance = tenantConnectors.find((tc) => tc.provider === c.provider);
              const isVerified = instance?.connectionState === 'VERIFIED' || c.connectorType === 'DRAFT_ONLY';

              return (
                <div key={c.id} className={`p-4 rounded-xl border ${darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'} space-y-3`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-slate-100">{c.displayName}</h3>
                      <div className="text-[10px] text-slate-400 font-mono">{c.category} • {c.authMethod}</div>
                    </div>
                    <span
                      className={`text-[9px] px-2 py-0.5 rounded font-mono font-bold ${
                        c.connectorType === 'OFFICIAL_API'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : c.connectorType === 'APPROVED_PARTNER'
                          ? 'bg-indigo-500/20 text-indigo-400'
                          : c.connectorType === 'DRAFT_ONLY'
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-rose-500/20 text-rose-400'
                      }`}
                    >
                      {c.connectorType}
                    </span>
                  </div>

                  <div className="text-[10px] text-slate-400 space-y-1 font-mono">
                    <div><span className="text-slate-300 font-semibold">Verification:</span> {c.verificationMethod}</div>
                    <div><span className="text-slate-300 font-semibold">Rate Limit:</span> {c.rateLimitHandling.requestsPerMinute} req/min</div>
                    <div><span className="text-slate-300 font-semibold">Write Ops:</span> {c.writeOperations.join(', ')}</div>
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[10px] font-mono">
                      <span className={`w-2 h-2 rounded-full ${isVerified ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                      <span className={isVerified ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                        {isVerified ? 'VERIFIED' : 'UNCONFIGURED'}
                      </span>
                    </div>

                    <button
                      onClick={() => handleVerifyConnector(c.provider)}
                      className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[10px] font-bold transition cursor-pointer"
                    >
                      Probe Verify
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 7: OPERATIONS & GOVERNANCE */}
      {subTab === 'operations' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold flex items-center gap-2">
              <Cpu className="w-4 h-4 text-rose-400" />
              Universal Action Engine & Operational Governance
            </h2>
          </div>

          <div className={`p-4 rounded-xl border ${darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
            <h3 className="text-xs font-bold text-slate-200 mb-3">Live Universal Actions</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="text-[10px] uppercase text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="pb-2">Action ID</th>
                    <th className="pb-2">Action Type</th>
                    <th className="pb-2">Provider</th>
                    <th className="pb-2">State</th>
                    <th className="pb-2">Approval</th>
                    <th className="pb-2">Audit Ref</th>
                    <th className="pb-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {universalActions.map((act) => (
                    <tr key={act.id} className="hover:bg-slate-800/30">
                      <td className="py-2.5 font-bold text-slate-300">{act.id.substring(0, 16)}...</td>
                      <td className="py-2.5 text-indigo-400">{act.actionType}</td>
                      <td className="py-2.5 text-slate-300">{act.provider}</td>
                      <td className="py-2.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            act.executionState === 'SUCCEEDED'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : act.executionState === 'PENDING_APPROVAL'
                              ? 'bg-amber-500/20 text-amber-400'
                              : act.executionState === 'FAILED_CLOSED'
                              ? 'bg-rose-500/20 text-rose-400'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {act.executionState}
                        </span>
                      </td>
                      <td className="py-2.5 text-slate-300">{act.approvalState}</td>
                      <td className="py-2.5 text-slate-500 text-[10px]">{act.auditReference?.substring(0, 20)}...</td>
                      <td className="py-2.5 text-right">
                        {act.approvalState === 'PENDING_APPROVAL' && (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleApproveAction(act.id, 'APPROVE')}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-bold cursor-pointer"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleApproveAction(act.id, 'REJECT')}
                              className="px-2 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded text-[10px] font-bold cursor-pointer"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 8: PROJECT INTELLIGENCE */}
      {subTab === 'intelligence' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold flex items-center gap-2">
              <Code2 className="w-4 h-4 text-indigo-400" />
              Relay Project Intelligence Engine
            </h2>
          </div>

          {/* Capability Inventory Audit Table */}
          <div className={`p-4 rounded-xl border ${darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
            <h3 className="text-xs font-bold text-slate-200 mb-3">Runtime-Backed Capability Inventory (Phase 1 Audit)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="text-[10px] uppercase text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="pb-2">Capability</th>
                    <th className="pb-2">Existing Implementation</th>
                    <th className="pb-2">Status</th>
                    <th className="pb-2">Tests</th>
                    <th className="pb-2">Reusable</th>
                    <th className="pb-2">Highest-Value Next Step</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {capabilityInventory.map((cap, i) => (
                    <tr key={i} className="hover:bg-slate-800/30">
                      <td className="py-2.5 font-bold text-slate-200">{cap.capability}</td>
                      <td className="py-2.5 text-slate-400 text-[10px] truncate max-w-xs">{cap.existingImplementation}</td>
                      <td className="py-2.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                          {cap.status}
                        </span>
                      </td>
                      <td className="py-2.5 text-slate-400 text-[10px]">{cap.testsCoveringIt.length} suites</td>
                      <td className="py-2.5 text-slate-300">{cap.reusableAcrossTenants ? 'Yes' : 'No'}</td>
                      <td className="py-2.5 text-indigo-400 text-[10px]">{cap.highestValueNextImprovement}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Interactive Project Comparison Engine */}
          <div className={`p-5 rounded-xl border ${darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'} space-y-4`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-xs font-bold text-slate-200">Cross-Project Comparison & Compatibility Engine</h3>
              <div className="flex items-center gap-2">
                <select
                  value={selectedTargetProject}
                  onChange={(e) => setSelectedTargetProject(e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-xs rounded px-2.5 py-1 text-slate-200"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>Target: {p.name}</option>
                  ))}
                </select>

                <select
                  value={selectedSourceProject}
                  onChange={(e) => setSelectedSourceProject(e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-xs rounded px-2.5 py-1 text-slate-200"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>Source: {p.name}</option>
                  ))}
                </select>

                <button
                  onClick={handleRunProjectComparison}
                  className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-bold transition cursor-pointer"
                >
                  Analyze
                </button>
              </div>
            </div>

            {comparisonReport && (
              <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800 space-y-4 font-mono text-xs">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <span className="text-slate-400">Comparing: </span>
                    <span className="font-bold text-indigo-400">{comparisonReport.targetProject}</span>
                    <span className="text-slate-400"> vs </span>
                    <span className="font-bold text-violet-400">{comparisonReport.sourceProject}</span>
                  </div>
                  <span className="px-2.5 py-1 rounded text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Recommendation: {comparisonReport.recommendation}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                  <div className="p-3 rounded bg-slate-900 border border-slate-800">
                    <div className="font-bold text-emerald-400 mb-1">Working Features</div>
                    <ul className="list-disc list-inside space-y-0.5 text-slate-300">
                      {comparisonReport.workingFeatures.map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-3 rounded bg-slate-900 border border-slate-800">
                    <div className="font-bold text-amber-400 mb-1">Unique Value & Reusable Logic</div>
                    <ul className="list-disc list-inside space-y-0.5 text-slate-300">
                      {comparisonReport.uniqueValue.map((v, i) => (
                        <li key={i}>{v}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="p-3 rounded bg-slate-900 border border-slate-800">
                  <div className="font-bold text-slate-300 mb-1">Governance & Action Items (Zero Auto-Merge)</div>
                  <ul className="list-disc list-inside space-y-0.5 text-slate-400 text-[11px]">
                    {comparisonReport.actionItems.map((act, i) => (
                      <li key={i}>{act}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
