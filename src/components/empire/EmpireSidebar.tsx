import React from 'react';
import {
  BrainCircuit,
  Activity,
  TrendingUp,
  Megaphone,
  Users,
  Cpu,
  Sparkles,
  Repeat,
  Calendar,
  BarChart3,
  ShieldAlert,
  Folder,
  Workflow,
  Bot,
  Plug,
  ChevronRight,
  Scale,
  FileCheck,
  Database,
  Rocket,
  Zap
} from 'lucide-react';
import { RelayTab } from '../../types/relay';

interface EmpireSidebarProps {
  activeTab: RelayTab;
  setActiveTab: (tab: RelayTab) => void;
  darkMode: boolean;
  pendingApprovalsCount: number;
}

export const EmpireSidebar: React.FC<EmpireSidebarProps> = ({
  activeTab,
  setActiveTab,
  darkMode,
  pendingApprovalsCount
}) => {
  const growthEngineNav = [
    { id: 'electrical_workflow', label: 'Electrical Lead Studio', icon: Zap, badge: 'Vertical Slice', badgeColor: 'bg-amber-500/20 text-amber-400 font-bold border border-amber-500/30' },
    { id: 'launch_program', label: '60-Day AI Launch', icon: Rocket, badge: 'Program', badgeColor: 'bg-gradient-to-r from-indigo-500/30 to-purple-500/30 text-indigo-300 font-bold border border-indigo-500/30' },
    { id: 'advisor', label: 'Executive AI Advisor', icon: BrainCircuit, badge: 'C-Suite', badgeColor: 'bg-indigo-500/20 text-indigo-400' },
    { id: 'intelligence', label: 'Business Intelligence', icon: Activity, badge: '86 Health', badgeColor: 'bg-emerald-500/20 text-emerald-400' },
    { id: 'revenue', label: 'Revenue Opportunities', icon: TrendingUp, badge: '+$34.2K', badgeColor: 'bg-sky-500/20 text-sky-400' },
    { id: 'roi', label: 'ROI Command Center', icon: Scale, badge: 'Closed-Loop', badgeColor: 'bg-purple-500/20 text-purple-400' },
    { id: 'execution', label: 'Execution & Approvals', icon: FileCheck, badge: 'Ledger', badgeColor: 'bg-sky-500/20 text-sky-400' },
    { id: 'data_quality', label: 'Data Quality & Health', icon: Database, badge: 'Verified', badgeColor: 'bg-emerald-500/20 text-emerald-400' },
    { id: 'recommendations', label: 'Recommendation History', icon: Sparkles, badge: 'AI Learn', badgeColor: 'bg-purple-500/20 text-purple-400' },
    { id: 'marketing', label: 'Marketing Automation', icon: Megaphone, badge: 'Omni', badgeColor: 'bg-amber-500/20 text-amber-400' },
    { id: 'customer_growth', label: 'Customer Growth', icon: Users, badge: 'Lifecycle', badgeColor: 'bg-violet-500/20 text-violet-400' },
    { id: 'operations', label: 'Operations & Margins', icon: Cpu, badge: 'Margin', badgeColor: 'bg-rose-500/20 text-rose-400' }
  ];

  const contentSuiteNav = [
    { id: 'studio', label: 'AI Content Studio', icon: Sparkles, badge: 'Gemini 3.6', badgeColor: 'bg-indigo-500/20 text-indigo-400' },
    { id: 'repurposer', label: 'Repurposing Engine', icon: Repeat },
    { id: 'schedule', label: 'Smart Schedule', icon: Calendar },
    { id: 'analytics', label: 'Analytics & ROI', icon: BarChart3 },
    { id: 'trends', label: 'Trend Intelligence', icon: TrendingUp }
  ];

  const platformNav = [
    { id: 'brand', label: 'Brand Workspace', icon: ShieldAlert },
    { id: 'media', label: 'Media Library', icon: Folder },
    { id: 'team', label: 'Team & Approvals', icon: Users, count: pendingApprovalsCount, countColor: 'bg-rose-500 text-white' },
    { id: 'automation', label: 'Automation Engine', icon: Workflow },
    { id: 'agents', label: 'AI Agents Hub', icon: Bot },
    { id: 'integrations', label: 'Integrations Hub', icon: Plug }
  ];

  const renderNavGroup = (title: string, items: any[]) => (
    <div className="space-y-1 mb-4">
      <div className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold flex items-center justify-between">
        <span>{title}</span>
      </div>
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id as RelayTab)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all group cursor-pointer ${
              isActive
                ? darkMode
                  ? 'bg-gradient-to-r from-indigo-900/80 to-blue-900/50 text-white border border-indigo-500/30 shadow-sm shadow-indigo-950'
                  : 'bg-white text-indigo-950 border border-indigo-200 shadow-sm shadow-indigo-100'
                : darkMode
                ? 'text-slate-400 hover:bg-slate-900/80 hover:text-slate-200'
                : 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Icon className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                isActive ? 'text-indigo-400' : darkMode ? 'text-slate-400' : 'text-slate-500'
              }`} />
              <span className="truncate font-medium">{item.label}</span>
            </div>

            <div className="flex items-center gap-1 shrink-0 ml-1">
              {item.badge && (
                <span className={`text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded ${item.badgeColor}`}>
                  {item.badge}
                </span>
              )}
              {item.count !== undefined && item.count > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${item.countColor}`}>
                  {item.count}
                </span>
              )}
              <ChevronRight className={`w-3 h-3 transition-transform ${
                isActive ? 'opacity-100 translate-x-0 text-indigo-400' : 'opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 text-slate-500'
              }`} />
            </div>
          </button>
        );
      })}
    </div>
  );

  return (
    <aside className={`w-64 border-r shrink-0 flex flex-col justify-between hidden lg:flex select-none transition-colors duration-200 ${
      darkMode ? 'bg-slate-950/60 border-slate-800/80 text-slate-300' : 'bg-slate-50/80 border-slate-200 text-slate-700'
    }`}>
      <div className="p-3 overflow-y-auto max-h-[calc(100vh-100px)]">
        {renderNavGroup('Growth OS Engines', growthEngineNav)}
        {renderNavGroup('Content Studio', contentSuiteNav)}
        {renderNavGroup('Platform & Ops', platformNav)}
      </div>

      {/* System Status Footer */}
      <div className={`p-3 m-3 rounded-xl border text-xs ${
        darkMode ? 'bg-slate-900/90 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
      }`}>
        <div className="flex items-center justify-between text-[11px] font-bold mb-1">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            AI Growth Platform
          </span>
          <span className="font-mono text-[9px] text-emerald-400">v2.0 ONLINE</span>
        </div>
        <p className="text-[10px] text-slate-400 leading-tight">
          6 Core Engines Active • Gemini 3.6 Flash
        </p>
      </div>
    </aside>
  );
};
