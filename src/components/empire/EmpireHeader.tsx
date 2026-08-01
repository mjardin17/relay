import React, { useState } from 'react';
import {
  Layers,
  ChevronDown,
  Sparkles,
  PlusCircle,
  Bell,
  Search,
  CheckCircle2,
  Moon,
  Sun,
  Shield,
  Zap,
  Globe
} from 'lucide-react';

interface EmpireHeaderProps {
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  activeModule: string;
  setActiveModule: (module: string) => void;
  onOpenCreateModal: () => void;
  pendingApprovalsCount: number;
}

export const EmpireHeader: React.FC<EmpireHeaderProps> = ({
  darkMode,
  setDarkMode,
  activeModule,
  setActiveModule,
  onOpenCreateModal,
  pendingApprovalsCount
}) => {
  const [showModuleMenu, setShowModuleMenu] = useState(false);
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState('Empire Global HQ');

  const empireModules = [
    { id: 'relay', name: 'Relay • Social Distribution', desc: 'Content automation & multi-platform publishing', active: true, icon: 'Zap' },
    { id: 'core-vm', name: 'Core VM • Compute Cloud', desc: 'Container orchestration & infrastructure', active: false, icon: 'Layers' },
    { id: 'pulse', name: 'Pulse • Revenue Analytics', desc: 'Real-time financial telemetry & forecasting', active: false, icon: 'Activity' },
    { id: 'command-ai', name: 'Command AI • Multi-Model Hub', desc: 'Generative AI model management & orchestration', active: false, icon: 'Sparkles' },
    { id: 'atlas-crm', name: 'Atlas • Enterprise CRM', desc: 'Customer pipeline & deal intelligence', active: false, icon: 'Globe' }
  ];

  const workspaces = ['Empire Global HQ', 'Apex Holdings Division', 'Skunkworks AI Lab', 'Venture Studio Delta'];

  return (
    <header className={`border-b sticky top-0 z-40 backdrop-blur-md transition-colors duration-200 ${
      darkMode ? 'bg-slate-950/90 border-slate-800 text-slate-100' : 'bg-white/90 border-slate-200 text-slate-900'
    }`}>
      <div className="max-w-[1700px] mx-auto px-4 h-16 flex items-center justify-between gap-4">
        
        {/* Left Branding & Module Selector */}
        <div className="flex items-center gap-3 md:gap-6">
          {/* Empire OS Logo */}
          <div className="flex items-center gap-2 font-bold tracking-wider text-sm uppercase cursor-pointer group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 via-blue-600 to-emerald-400 p-0.5 shadow-md shadow-indigo-500/20 flex items-center justify-center">
              <div className="w-full h-full bg-slate-950 rounded-[6px] flex items-center justify-center">
                <Zap className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
              </div>
            </div>
            <div className="hidden sm:block">
              <span className="bg-gradient-to-r from-indigo-400 via-sky-300 to-emerald-400 bg-clip-text text-transparent font-extrabold text-base">
                EMPIRE OS
              </span>
              <span className="block text-[10px] tracking-widest text-slate-400 font-medium font-mono -mt-1">
                SYSTEM CORE v4.2
              </span>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-700/40 hidden sm:block" />

          {/* Module Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowModuleMenu(!showModuleMenu)}
              className={`flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                darkMode
                  ? 'bg-slate-900 border-slate-800 hover:border-indigo-500/50 text-slate-200'
                  : 'bg-slate-100 border-slate-200 hover:border-indigo-400 text-slate-800'
              }`}
            >
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-mono text-indigo-400">MODULE:</span>
              <span className="font-bold">Relay</span>
              <span className="hidden md:inline text-slate-400 text-[11px] font-normal">
                • Content & Social Engine
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
            </button>

            {showModuleMenu && (
              <div className={`absolute left-0 mt-2 w-80 rounded-xl border shadow-2xl p-2 z-50 ${
                darkMode ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
              }`}>
                <div className="px-3 py-2 text-[10px] font-mono uppercase tracking-wider text-slate-400 border-b border-slate-800/50 mb-1">
                  Native Empire OS Modules
                </div>
                {empireModules.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      setActiveModule(m.id);
                      setShowModuleMenu(false);
                    }}
                    className={`w-full text-left px-3 py-2.5 rounded-lg flex items-start gap-3 transition-colors ${
                      m.id === 'relay'
                        ? darkMode ? 'bg-indigo-950/60 border border-indigo-500/30 text-indigo-300' : 'bg-indigo-50 text-indigo-900 border border-indigo-200'
                        : darkMode ? 'hover:bg-slate-800/60 text-slate-300' : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div className={`p-1.5 rounded-md mt-0.5 ${m.id === 'relay' ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold flex items-center gap-2">
                        {m.name}
                        {m.id === 'relay' && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-400 font-mono">
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 line-clamp-1">{m.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Workspace Data Mode Switcher */}
          <div className="hidden lg:flex items-center gap-1 bg-slate-900/90 border border-slate-800 p-1 rounded-xl">
            <span className="text-[10px] font-mono text-emerald-400 font-bold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              DEMO WORKSPACE
            </span>
            <span className="text-[10px] font-mono text-slate-400 px-1.5">Simulated Provenance</span>
          </div>
          <div className="relative hidden xl:block">
            <button
              onClick={() => setShowWorkspaceMenu(!showWorkspaceMenu)}
              className={`flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-lg border transition-all ${
                darkMode
                  ? 'bg-slate-900/80 border-slate-800/80 hover:bg-slate-800 text-slate-300'
                  : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
              }`}
            >
              <Globe className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-slate-400 font-mono text-[11px]">WS:</span>
              <span className="font-medium text-xs">{selectedWorkspace}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showWorkspaceMenu && (
              <div className={`absolute left-0 mt-2 w-56 rounded-xl border shadow-xl p-2 z-50 ${
                darkMode ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
              }`}>
                <div className="px-2 py-1 text-[10px] font-mono text-slate-400 uppercase">Switch Workspace</div>
                {workspaces.map((ws) => (
                  <button
                    key={ws}
                    onClick={() => {
                      setSelectedWorkspace(ws);
                      setShowWorkspaceMenu(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      ws === selectedWorkspace
                        ? 'bg-indigo-600 text-white'
                        : darkMode ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    {ws}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Action Bar */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* Quick Create Button */}
          <button
            onClick={onOpenCreateModal}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 active:scale-95 transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Create Post</span>
          </button>

          {/* Pending Approval Badge Notification */}
          <div className="relative">
            <button className={`p-2 rounded-lg border transition-all relative ${
              darkMode ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white' : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900'
            }`}>
              <Bell className="w-4 h-4" />
              {pendingApprovalsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-bounce">
                  {pendingApprovalsCount}
                </span>
              )}
            </button>
          </div>

          {/* Theme Switcher */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`p-2 rounded-lg border transition-all ${
              darkMode ? 'bg-slate-900 border-slate-800 text-amber-400 hover:bg-slate-800' : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
            }`}
            title="Toggle Light/Dark Theme"
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Admin Identity Badge */}
          <div className={`hidden md:flex items-center gap-2.5 pl-2 border-l ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
            <div className="relative">
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80"
                alt="Alex Vance Avatar"
                className="w-8 h-8 rounded-lg object-cover ring-2 ring-indigo-500/50"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-slate-950 rounded-full" />
            </div>
            <div className="text-left text-xs">
              <div className="font-bold leading-none flex items-center gap-1 text-slate-200">
                Alex Vance
                <Shield className="w-3 h-3 text-indigo-400" />
              </div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5">Admin • CPO</div>
            </div>
          </div>

        </div>

      </div>
    </header>
  );
};
