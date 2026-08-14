import React, { useState } from 'react';
import { Sparkles, Send, ShieldAlert, CheckCircle2, Clock, AlertTriangle, Cpu } from 'lucide-react';
import { AIAgent } from '../../types/relay';
import { apiService } from '../../services/api';
import { getCapabilitiesForAgent, hasVerifiedRuntime } from '../../data/capabilityRegistry';

interface AIAgentsHubProps {
  agents: AIAgent[];
  darkMode: boolean;
}

export const AIAgentsHub: React.FC<AIAgentsHubProps> = ({
  agents,
  darkMode
}) => {
  const [selectedAgent, setSelectedAgent] = useState<AIAgent>(agents[0]);
  const [messages, setMessages] = useState<Array<{ sender: 'user' | 'agent'; text: string }>>([
    {
      sender: 'agent',
      text: `Hello! I am ${agents[0].name}, your ${agents[0].role}. How can I assist with Reis Electric LLC guided dispatch, growth strategy, or MA compliance verification today?`
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const currentCapabilities = getCapabilitiesForAgent(selectedAgent.id);
  const isVerified = hasVerifiedRuntime(selectedAgent.id);

  const handleSelectAgent = (agent: AIAgent) => {
    setSelectedAgent(agent);
    setMessages([
      {
        sender: 'agent',
        text: `Hello! I am ${agent.name}, your ${agent.role}. How can I assist with Reis Electric LLC guided dispatch, growth strategy, or MA compliance verification today?`
      }
    ]);
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = { sender: 'user' as const, text: input };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    try {
      const reply = await apiService.consultAgent(
        selectedAgent.id,
        selectedAgent.name,
        selectedAgent.promptSystem,
        updatedMessages
      );
      setMessages([...updatedMessages, { sender: 'agent', text: reply }]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className={`p-5 rounded-2xl border flex items-center justify-between gap-4 ${
        darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div>
          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-violet-500/20 text-violet-400 font-bold">
            REIS ELECTRIC AGENT SUITE & CAPABILITY REGISTRY
          </span>
          <h1 className="text-xl font-extrabold tracking-tight mt-1">Reis Electric Business AI Agents</h1>
          <p className="text-xs text-slate-400">
            Guided-manual agent profiles and capability status layer for Reis Electric LLC. All capabilities are classified via the Product Truth Capability Registry.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Agent Cards Selector */}
        <div className="lg:col-span-4 space-y-3">
          {agents.map((ag) => {
            const isSel = selectedAgent.id === ag.id;
            const agVerified = hasVerifiedRuntime(ag.id);
            const caps = getCapabilitiesForAgent(ag.id);
            const statusLabel = agVerified ? 'VERIFIED_RUNTIME' : (caps[0]?.implementationStatus || 'UI_CONFIGURED');

            return (
              <button
                key={ag.id}
                onClick={() => handleSelectAgent(ag)}
                className={`w-full p-3.5 rounded-2xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                  isSel
                    ? 'bg-gradient-to-r from-indigo-950/80 to-slate-900 border-indigo-500 shadow-md ring-1 ring-indigo-500/50'
                    : darkMode
                    ? 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <img src={ag.avatar} alt={ag.name} className="w-10 h-10 rounded-full object-cover ring-2 ring-indigo-500/40" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-100">{ag.name}</span>
                    <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold ${
                      agVerified
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : statusLabel === 'LOCALLY_TESTED'
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      {statusLabel}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 truncate mt-0.5">{ag.role}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Agent Consultation Screen & Capability Matrix */}
        <div className={`lg:col-span-8 p-5 rounded-2xl border flex flex-col justify-between min-h-[520px] ${
          darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          {/* Unverified Warning Banner (Required by Product Truth Layer) */}
          {!isVerified && (
            <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-2.5 text-amber-300 text-xs">
              <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400" />
              <span className="font-semibold">
                Configured specialist profile — autonomous execution has not been verified.
              </span>
            </div>
          )}

          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-3">
              <img src={selectedAgent.avatar} alt={selectedAgent.name} className="w-9 h-9 rounded-full object-cover" />
              <div>
                <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                  {selectedAgent.name}
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div className="text-[10px] text-slate-400 font-mono">{selectedAgent.role}</div>
              </div>
            </div>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300">
              Tenant: tenant-reis-electric
            </span>
          </div>

          {/* Capability Matrix Summary Cards */}
          <div className="my-3 space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-indigo-400" /> Agent Capabilities & Capability Registry Status
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {currentCapabilities.map((cap) => (
                <div key={cap.capabilityId} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200 truncate">{cap.capabilityName}</span>
                    <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold ${
                      cap.implementationStatus === 'LIVE_PRODUCTION' || cap.implementationStatus === 'PROVIDER_VERIFIED'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : cap.implementationStatus === 'LOCALLY_TESTED'
                        ? 'bg-amber-500/20 text-amber-300'
                        : cap.implementationStatus === 'BLOCKED'
                        ? 'bg-rose-500/20 text-rose-300'
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      {cap.implementationStatus}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400">{cap.description}</div>
                  <div className="text-[9px] font-mono text-slate-500 flex items-center gap-2 pt-1">
                    <span>Mode: {cap.executionMode}</span>
                    <span>•</span>
                    <span>Provider: {cap.provider}</span>
                  </div>
                  {cap.blocker && (
                    <div className="text-[9px] text-rose-400 font-mono mt-0.5 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 shrink-0" /> {cap.blocker}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 my-2 space-y-3 overflow-y-auto max-h-[220px] p-2">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex gap-2.5 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.sender === 'agent' && (
                  <img src={selectedAgent.avatar} alt="Agent" className="w-6 h-6 rounded-full object-cover mt-1" />
                )}
                <div className={`max-w-md p-3 rounded-xl text-xs leading-relaxed ${
                  m.sender === 'user'
                    ? 'bg-indigo-600 text-white font-medium rounded-tr-none'
                    : 'bg-slate-950 border border-slate-800 text-slate-200 rounded-tl-none'
                }`}>
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="text-[10px] text-slate-400 font-mono animate-pulse">
                {selectedAgent.name} is processing...
              </div>
            )}
          </div>

          {/* Input Bar */}
          <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={`Consult ${selectedAgent.name}...`}
              className={`flex-1 px-3.5 py-2.5 text-xs rounded-xl border outline-none ${
                darkMode ? 'bg-slate-950 border-slate-800 text-slate-100 focus:border-indigo-500' : 'bg-slate-100 border-slate-200 text-slate-900 focus:border-indigo-500'
              }`}
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <Send className="w-3.5 h-3.5" /> Consult
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
