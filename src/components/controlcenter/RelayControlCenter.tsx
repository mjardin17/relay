import React, { useState, useEffect } from 'react';
import {
  Building2,
  Users,
  TrendingUp,
  Zap,
  Plug,
  Boxes,
  ShieldCheck,
  Code2,
  LayoutDashboard,
  ShieldAlert,
  RefreshCw,
  CheckCircle2,
  XCircle,
  FileText
} from 'lucide-react';
import { AuthoritativeConnectorMetadata, TenantConnectorInstance } from '../../types/authoritativeConnector';
import { UniversalActionRecord } from '../../types/universalActionEngine';
import { ProjectDefinition, ProjectComparisonReport, WorkspaceCapabilityInventoryItem } from '../../types/projectIntelligence';

// Sub-components
import { ExecutiveDashboardView } from './ExecutiveDashboardView';
import { BusinessProfileView } from './BusinessProfileView';
import { ActionCenterView } from './ActionCenterView';
import { OpportunitiesView } from './OpportunitiesView';
import { WorkersView } from './WorkersView';
import { ConnectorsView } from './ConnectorsView';
import { ProjectsModulesView } from './ProjectsModulesView';
import { AuditGovernanceView } from './AuditGovernanceView';

interface RelayControlCenterProps {
  darkMode: boolean;
  tenantId?: string;
  onNavigateAppTab?: (tab: string) => void;
}

export const RelayControlCenter: React.FC<RelayControlCenterProps> = ({
  darkMode,
  tenantId = 'default-tenant',
  onNavigateAppTab
}) => {
  const [subTab, setSubTab] = useState<
    'dashboard' | 'profile' | 'actions' | 'opportunities' | 'workforce' | 'connectors' | 'projects' | 'audit' | 'intelligence'
  >('dashboard');

  // State
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [growthData, setGrowthData] = useState<any>(null);
  const [connectorsCatalog, setConnectorsCatalog] = useState<AuthoritativeConnectorMetadata[]>([]);
  const [tenantConnectors, setTenantConnectors] = useState<TenantConnectorInstance[]>([]);
  const [universalActions, setUniversalActions] = useState<UniversalActionRecord[]>([]);
  const [projects, setProjects] = useState<ProjectDefinition[]>([]);
  const [capabilityInventory, setCapabilityInventory] = useState<WorkspaceCapabilityInventoryItem[]>([]);
  const [comparisonReport, setComparisonReport] = useState<ProjectComparisonReport | null>(null);
  const [selectedTargetProject, setSelectedTargetProject] = useState('relay_central');
  const [selectedSourceProject, setSelectedSourceProject] = useState('storyforge');
  const [isEmergencyPaused, setIsEmergencyPaused] = useState(false);
  const [pauseReason, setPauseReason] = useState('');
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const authHeaders = {
    Authorization: 'Bearer demo-session',
    'Content-Type': 'application/json'
  };

  const fetchAllData = async () => {
    setLoading(true);
    try {
      // 1. Dashboard Comprehensive
      const resDash = await fetch('/api/control-center/dashboard', { headers: authHeaders });
      if (resDash.ok) {
        const d = await resDash.json();
        setDashboardData(d.dashboard);
        setIsEmergencyPaused(d.dashboard?.health?.isEmergencyPaused || false);
      }

      // 2. Growth
      const resGrowth = await fetch('/api/control-center/growth', { headers: authHeaders });
      if (resGrowth.ok) {
        const d = await resGrowth.json();
        setGrowthData(d.growth);
      }

      // 3. Connectors
      const resConn = await fetch('/api/control-center/connectors', { headers: authHeaders });
      if (resConn.ok) {
        const d = await resConn.json();
        setConnectorsCatalog(d.catalog || []);
        setTenantConnectors(d.tenantInstances || []);
      }

      // 4. Universal Actions
      const resActions = await fetch('/api/universal-actions/list', { headers: authHeaders });
      if (resActions.ok) {
        const d = await resActions.json();
        setUniversalActions(d.actions || []);
      }

      // 5. Project Intelligence
      const resProj = await fetch('/api/project-intelligence/projects', { headers: authHeaders });
      if (resProj.ok) {
        const d = await resProj.json();
        setProjects(d.projects || []);
      }

      const resCap = await fetch('/api/project-intelligence/capability-inventory', { headers: authHeaders });
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

  const handleApproveAction = async (actionId: string, decision: 'APPROVE' | 'REJECT') => {
    try {
      const res = await fetch('/api/universal-actions/approve', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ actionId, decision })
      });
      const data = await res.json();
      if (res.ok) {
        setActionFeedback(`Action ${actionId.substring(0, 8)}... ${decision === 'APPROVE' ? 'APPROVED & DISPATCHED' : 'REJECTED'}.`);
        fetchAllData();
      } else {
        setActionFeedback(`Approval Failed: ${data.error || 'Segregation of duties / policy violation'}`);
      }
      setTimeout(() => setActionFeedback(null), 5000);
    } catch (err: any) {
      setActionFeedback(`Network error during approval: ${err?.message}`);
      setTimeout(() => setActionFeedback(null), 5000);
    }
  };

  const handleToggleEmergencyPause = async (paused: boolean, reason?: string) => {
    try {
      const res = await fetch('/api/control-center/emergency-pause', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ paused, reason: reason || 'Operator triggered manual pause' })
      });
      if (res.ok) {
        setIsEmergencyPaused(paused);
        setPauseReason(reason || '');
        fetchAllData();
      }
    } catch (err) {
      console.error('Failed to toggle emergency pause', err);
    }
  };

  const handleRunProjectComparison = async () => {
    try {
      const res = await fetch('/api/project-intelligence/compare', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          targetProjectId: selectedTargetProject,
          sourceProjectId: selectedSourceProject
        })
      });
      if (res.ok) {
        const d = await res.json();
        setComparisonReport(d.report);
      }
    } catch (err) {
      console.error('Failed to run comparison', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {actionFeedback && (
        <div
          className={`p-3 rounded-lg border text-xs font-semibold flex items-center justify-between gap-2 shadow-lg transition ${
            actionFeedback.includes('Failed') || actionFeedback.includes('error')
              ? 'bg-rose-950/80 border-rose-500/50 text-rose-200'
              : 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionFeedback.includes('Failed') || actionFeedback.includes('error') ? (
              <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <span>{actionFeedback}</span>
          </div>
          <button onClick={() => setActionFeedback(null)} className="text-slate-400 hover:text-white cursor-pointer">
            &times;
          </button>
        </div>
      )}

      {/* Control Center Navigation Tabs */}
      <div className="border-b border-slate-800 pb-1">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {[
            { id: 'dashboard', label: 'Executive Dashboard', icon: LayoutDashboard },
            { id: 'profile', label: 'Business Profile', icon: Building2 },
            { id: 'actions', label: 'Action Center', icon: Zap },
            { id: 'opportunities', label: 'Opportunities & Growth', icon: TrendingUp },
            { id: 'workforce', label: 'Workforce & Agents', icon: Users },
            { id: 'connectors', label: 'Connectors & APIs', icon: Plug },
            { id: 'projects', label: 'Projects & Modules', icon: Boxes },
            { id: 'audit', label: 'Audit & Ledger', icon: ShieldCheck },
            { id: 'intelligence', label: 'Project Intelligence', icon: Code2 }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = subTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSubTab(tab.id as any)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/30'
                    : darkMode
                    ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* SUB-VIEW 1: EXECUTIVE DASHBOARD */}
      {subTab === 'dashboard' && (
        <ExecutiveDashboardView
          darkMode={darkMode}
          dashboardData={dashboardData}
          loading={loading}
          onNavigateTab={(tabId) => setSubTab(tabId as any)}
          onApproveAction={handleApproveAction}
          onRefresh={fetchAllData}
        />
      )}

      {/* SUB-VIEW 2: BUSINESS PROFILE */}
      {subTab === 'profile' && (
        <BusinessProfileView
          darkMode={darkMode}
          tenantId={tenantId}
          onProfileUpdated={fetchAllData}
        />
      )}

      {/* SUB-VIEW 3: ACTION CENTER */}
      {subTab === 'actions' && (
        <ActionCenterView
          darkMode={darkMode}
          tenantId={tenantId}
          actions={universalActions}
          isEmergencyPaused={isEmergencyPaused}
          pauseReason={pauseReason}
          loading={loading}
          onRefresh={fetchAllData}
          onApproveAction={handleApproveAction}
          onToggleEmergencyPause={handleToggleEmergencyPause}
        />
      )}

      {/* SUB-VIEW 4: OPPORTUNITIES & GROWTH */}
      {subTab === 'opportunities' && (
        <OpportunitiesView
          darkMode={darkMode}
          tenantId={tenantId}
          growthData={growthData}
          loading={loading}
          onRefresh={fetchAllData}
          onNavigateTab={(tabId) => setSubTab(tabId as any)}
        />
      )}

      {/* SUB-VIEW 5: WORKFORCE & AGENTS */}
      {subTab === 'workforce' && (
        <WorkersView
          darkMode={darkMode}
          tenantId={tenantId}
        />
      )}

      {/* SUB-VIEW 6: CONNECTORS & APIS */}
      {subTab === 'connectors' && (
        <ConnectorsView
          darkMode={darkMode}
          tenantId={tenantId}
          catalog={connectorsCatalog}
          tenantInstances={tenantConnectors}
          onRefresh={fetchAllData}
        />
      )}

      {/* SUB-VIEW 7: PROJECTS & MODULES */}
      {subTab === 'projects' && (
        <ProjectsModulesView
          darkMode={darkMode}
          tenantId={tenantId}
          onNavigateAppTab={onNavigateAppTab}
        />
      )}

      {/* SUB-VIEW 8: AUDIT & LEDGER */}
      {subTab === 'audit' && (
        <AuditGovernanceView
          darkMode={darkMode}
          tenantId={tenantId}
        />
      )}

      {/* SUB-VIEW 9: PROJECT INTELLIGENCE */}
      {subTab === 'intelligence' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold flex items-center gap-2">
              <Code2 className="w-4 h-4 text-indigo-400" />
              <span>Project Intelligence & AST Capability Engine</span>
            </h2>
          </div>

          {/* Capability Inventory */}
          <div
            className={`p-5 rounded-xl border ${
              darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <h3 className="text-xs font-bold text-slate-200 mb-3">
              Runtime-Backed Capability Inventory (Authoritative Audit)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="text-[10px] uppercase text-slate-400 border-b border-slate-800 bg-slate-950/40">
                  <tr>
                    <th className="p-2.5">Capability</th>
                    <th className="p-2.5">Implementation</th>
                    <th className="p-2.5">Status</th>
                    <th className="p-2.5">Tests</th>
                    <th className="p-2.5">Multi-Tenant</th>
                    <th className="p-2.5">Next Improvement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {capabilityInventory.map((cap, i) => (
                    <tr key={i} className="hover:bg-slate-800/30">
                      <td className="p-2.5 font-bold text-slate-200">{cap.capability}</td>
                      <td className="p-2.5 text-slate-400 text-[10px] truncate max-w-xs">{cap.existingImplementation}</td>
                      <td className="p-2.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                          {cap.status}
                        </span>
                      </td>
                      <td className="p-2.5 text-slate-400 text-[10px]">{cap.testsCoveringIt.length} suites</td>
                      <td className="p-2.5 text-slate-300">{cap.reusableAcrossTenants ? 'Yes' : 'No'}</td>
                      <td className="p-2.5 text-indigo-400 text-[10px]">{cap.highestValueNextImprovement}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Interactive Project Comparison */}
          <div
            className={`p-5 rounded-xl border ${
              darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
            } space-y-4`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-xs font-bold text-slate-200">Cross-Project AST Diff & Capability Analysis</h3>
              <div className="flex items-center gap-2">
                <select
                  value={selectedTargetProject}
                  onChange={(e) => setSelectedTargetProject(e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-xs rounded px-2.5 py-1.5 text-slate-200"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>Target: {p.name}</option>
                  ))}
                </select>

                <select
                  value={selectedSourceProject}
                  onChange={(e) => setSelectedSourceProject(e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-xs rounded px-2.5 py-1.5 text-slate-200"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>Source: {p.name}</option>
                  ))}
                </select>

                <button
                  onClick={handleRunProjectComparison}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition cursor-pointer"
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
