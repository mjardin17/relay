import React, { useState, useEffect } from 'react';
import {
  Boxes,
  Globe,
  Flame,
  Zap,
  CheckCircle2,
  ExternalLink,
  Layers,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Code2
} from 'lucide-react';

interface ProjectsModulesViewProps {
  darkMode: boolean;
  tenantId: string;
  onNavigateAppTab?: (tab: string) => void;
}

export const ProjectsModulesView: React.FC<ProjectsModulesViewProps> = ({
  darkMode,
  tenantId,
  onNavigateAppTab
}) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const authHeaders = {
    Authorization: 'Bearer demo-session',
    'Content-Type': 'application/json'
  };

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/control-center/projects-and-modules', { headers: authHeaders });
      if (res.ok) {
        const d = await res.json();
        setData(d);
      }
    } catch (err) {
      console.error('Failed to load projects and modules', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [tenantId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-sm text-slate-400">
        <RefreshCw className="w-5 h-5 animate-spin mr-2" />
        Loading Projects and Modules...
      </div>
    );
  }

  const businessProjects = data?.businessProjects || [];
  const modules = data?.modules || [];
  const gbpPresence = data?.gbpPresence || [];

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div
        className={`p-5 rounded-xl border flex items-center justify-between gap-4 ${
          darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400">
            <Boxes className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold flex items-center gap-2">
              <span>Business Projects & Relay Modular Architecture</span>
            </h2>
            <p className="text-xs text-slate-400">
              Unified business operating system hosting deterministic web engines, content studios, lead qualification, and local presences.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Business Projects */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <Globe className="w-4 h-4 text-emerald-400" /> Active Business Deployments & Web Assets
        </h3>

        {businessProjects.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 border border-dashed rounded-xl border-slate-800">
            No custom websites deployed yet for this tenant. Launch via the Website Builder Hub.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {businessProjects.map((p: any) => (
              <div
                key={p.id}
                className={`p-5 rounded-xl border flex flex-col justify-between gap-3 ${
                  darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-200 text-sm">{p.name}</h4>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                      {p.status || 'ACTIVE'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 font-mono mt-1">Domain: {p.domain || 'staging.relay.local'}</div>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Deployment: {p.deploymentStatus || 'READY'}</span>
                  {onNavigateAppTab && (
                    <button
                      onClick={() => onNavigateAppTab('website_builder')}
                      className="text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <span>Open in Builder</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Core Relay Modular Products */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-400" /> Integrated Relay Operating Modules
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map((m: any) => (
            <div
              key={m.id}
              className={`p-5 rounded-xl border flex flex-col justify-between gap-4 ${
                darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-slate-200 text-sm">{m.name}</h4>
                    <span className="text-[10px] text-slate-400 font-mono">Category: {m.category}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/20 text-indigo-300 font-bold">
                    {m.status}
                  </span>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">{m.description}</p>

                <div className="space-y-1.5 pt-2 border-t border-slate-800 text-[11px]">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Evidence Items:</span>
                    <span className="font-mono text-slate-200">{m.evidenceCount}</span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-semibold text-slate-400 block mb-1">Related Connectors:</span>
                  <div className="flex flex-wrap gap-1">
                    {m.relatedConnectors?.map((conn: string) => (
                      <span key={conn} className="px-1.5 py-0.5 rounded bg-slate-800 text-[9px] font-mono text-slate-300">
                        {conn}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 flex items-center justify-end">
                {onNavigateAppTab && (
                  <button
                    onClick={() => {
                      if (m.id === 'mod_website_builder') onNavigateAppTab('website_builder');
                      else if (m.id === 'mod_storyforge') onNavigateAppTab('storyforge');
                      else if (m.id === 'mod_electrical_workflow') onNavigateAppTab('electrical_lead');
                      else if (m.id === 'mod_project_intelligence') onNavigateAppTab('intelligence');
                    }}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <span>Launch Module</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
