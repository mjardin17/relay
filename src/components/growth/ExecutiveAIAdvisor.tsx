import React, { useState } from 'react';
import {
  BrainCircuit,
  TrendingUp,
  AlertTriangle,
  Send,
  Download,
  Sparkles,
  Zap,
  Target,
  DollarSign,
  ShieldAlert,
  ArrowUpRight,
  Bot,
  User,
  CheckCircle2,
  RefreshCw,
  ShieldCheck
} from 'lucide-react';
import { ExecutiveBriefing, BusinessProfile } from '../../types/relay';
import { apiService } from '../../services/api';
import { growthEvidenceEngine } from '../../services/growthEvidenceEngine';

interface ExecutiveAIAdvisorProps {
  briefing: ExecutiveBriefing;
  businessProfile: BusinessProfile;
  darkMode: boolean;
  onActivateOpportunity?: (title: string) => void;
  onInspectEvidence?: (evidence: any) => void;
}

export const ExecutiveAIAdvisor: React.FC<ExecutiveAIAdvisorProps> = ({
  briefing,
  businessProfile,
  darkMode,
  onActivateOpportunity,
  onInspectEvidence
}) => {
  const [messages, setMessages] = useState<Array<{ sender: 'user' | 'advisor'; text: string; time: string }>>([
    {
      sender: 'advisor',
      text: `Welcome, Founder. I am your Executive AI Growth Advisor inside Empire OS. I have analyzed your MRR ($${businessProfile.mrr.toLocaleString()}), churn rate (${businessProfile.churnRate}%), and lead velocity. What strategic goal or revenue question would you like to address today?`,
      time: 'Just now'
    }
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isConsulting, setIsConsulting] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const quickQuestions = [
    'Where am I losing money right now?',
    'What top 3 actions should I take this week?',
    'Which product is underperforming and how do I fix it?',
    'Where is my biggest growth opportunity?'
  ];

  const handleSendQuery = async (queryText?: string) => {
    const q = queryText || inputQuery;
    if (!q.trim() || isConsulting) return;

    const userMsg = { sender: 'user' as const, text: q, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    setMessages((prev) => [...prev, userMsg]);
    if (!queryText) setInputQuery('');
    setIsConsulting(true);

    try {
      const reply = await apiService.consultGrowthAdvisor(q, businessProfile, messages);
      const advisorMsg = {
        sender: 'advisor' as const,
        text: reply,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, advisorMsg]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsConsulting(false);
    }
  };

  const handleDownloadBriefing = () => {
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className={`p-6 rounded-2xl border relative overflow-hidden ${
        darkMode ? 'bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border-indigo-500/30' : 'bg-gradient-to-r from-indigo-50 via-white to-blue-50 border-indigo-200'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 uppercase tracking-wider flex items-center gap-1">
                <BrainCircuit className="w-3 h-3 text-indigo-400" />
                C-Suite Strategy Engine • V2.0
              </span>
              <span className="text-xs text-slate-400 font-mono">Week of {briefing.weekOf}</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Executive AI Advisor</h1>
            <p className={`text-xs max-w-2xl ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Always-on strategic AI consulting, automated loss-prevention audits, and C-Suite executive briefings designed to maximize enterprise revenue.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadBriefing}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-lg cursor-pointer ${
                downloaded
                  ? 'bg-emerald-600 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-950/50'
              }`}
            >
              {downloaded ? <CheckCircle2 className="w-4 h-4" /> : <Download className="w-4 h-4" />}
              <span>{downloaded ? 'Briefing PDF Exported' : 'Export Executive Briefing'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Top Vital Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`p-4 rounded-xl border ${darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'} space-y-2`}>
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>AI Health Score</span>
            <Sparkles className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400 font-mono">{briefing.overallHealthScore} / 100</div>
          <p className="text-[10px] text-slate-400">Enterprise Growth Grade: A-</p>
        </div>

        <div className={`p-4 rounded-xl border ${darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'} space-y-2`}>
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Current MRR</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 font-mono">{briefing.mrr}</div>
          <p className="text-[10px] text-slate-400">ARR Runway: $1.70M/yr</p>
        </div>

        <div className={`p-4 rounded-xl border ${darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'} space-y-2`}>
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Revenue Leak Risk</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-rose-400 font-mono">-$22,700/mo</div>
          <p className="text-[10px] text-slate-400">Recoverable via Lead Velocity & Nurture</p>
        </div>

        <div className={`p-4 rounded-xl border ${darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'} space-y-2`}>
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Growth Upside Potential</span>
            <TrendingUp className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold text-sky-400 font-mono">+$34,200/mo</div>
          <p className="text-[10px] text-slate-400">30-Day Execution Target</p>
        </div>
      </div>

      {/* Main Grid: Weekly Briefing vs Executive AI Consultation Chat */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Weekly Executive Briefing (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Executive Directives Card */}
          <div className={`p-5 rounded-2xl border ${darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'} space-y-5`}>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-indigo-400" />
                <h2 className="text-sm font-bold uppercase tracking-wider font-mono">Weekly Priority Action Matrix</h2>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 font-mono">
                RANKED BY ROI
              </span>
            </div>

            <div className="space-y-3">
              {briefing.weeklyTopActions.map((action) => (
                <div
                  key={action.priority}
                  className={`p-4 rounded-xl border transition-all ${
                    darkMode
                      ? 'bg-slate-950/60 border-slate-800 hover:border-indigo-500/50'
                      : 'bg-slate-50 border-slate-200 hover:border-indigo-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center font-mono">
                        #{action.priority}
                      </span>
                      <h3 className="text-xs font-bold text-indigo-300">{action.title}</h3>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 shrink-0">
                      {action.impact}
                    </span>
                  </div>

                  <p className={`text-xs leading-relaxed ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    {action.reasoning}
                  </p>

                  <div className="mt-3 flex items-center justify-between border-t border-slate-800/60 pt-2">
                    <button
                      onClick={() => {
                        const opps = growthEvidenceEngine.getOpportunities();
                        const matchingOpp = opps.find((o) => o.title.includes(action.title) || action.title.includes(o.title)) || opps[0];
                        onInspectEvidence?.(matchingOpp.evidence);
                      }}
                      className="text-[11px] font-mono text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Inspect Evidence & Math</span>
                    </button>
                    <button
                      onClick={() => onActivateOpportunity?.(action.title)}
                      className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      <span>Execute Strategy</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Loss Points & Underperforming Product Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Revenue Leak Audit */}
            <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'} space-y-3`}>
              <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-wider font-mono">
                <ShieldAlert className="w-4 h-4" />
                <span>Revenue Loss Audit</span>
              </div>
              <ul className="space-y-2">
                {briefing.lossPoints.map((point, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs text-slate-300 leading-normal">
                    <span className="text-rose-400 font-bold">•</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Underperforming Product Remedy */}
            <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'} space-y-3`}>
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider font-mono">
                <Zap className="w-4 h-4" />
                <span>Underperforming Offer</span>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-200">{briefing.underperformingProduct.name}</p>
                <p className="text-[11px] text-slate-400">{briefing.underperformingProduct.issue}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-indigo-950/40 border border-indigo-500/30 text-[11px] text-indigo-200">
                <strong className="text-indigo-400 font-mono">AI Remedy: </strong>
                {briefing.underperformingProduct.remedy}
              </div>
            </div>
          </div>

          {/* Strategic Advisor Notes */}
          <div className={`p-5 rounded-2xl border ${
            darkMode ? 'bg-gradient-to-br from-slate-900 via-indigo-950/30 to-slate-900 border-indigo-500/30' : 'bg-indigo-50/50 border-indigo-200'
          } space-y-2`}>
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold font-mono">
              <BrainCircuit className="w-4 h-4" />
              <span>C-SUITE STRATEGIC SUMMARY</span>
            </div>
            <p className={`text-xs leading-relaxed italic ${darkMode ? 'text-slate-300' : 'text-slate-800'}`}>
              "{briefing.strategicAdvisorNotes}"
            </p>
          </div>

        </div>

        {/* Right Column: Live Interactive Executive AI Consultation (5 cols) */}
        <div className="lg:col-span-5 space-y-4 flex flex-col h-full min-h-[500px]">
          
          <div className={`p-4 rounded-2xl border flex-1 flex flex-col ${
            darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-indigo-400 animate-pulse" />
                <div>
                  <h3 className="text-xs font-bold font-mono uppercase tracking-wider">Live Growth Advisor Chat</h3>
                  <p className="text-[10px] text-slate-400">Powered by Gemini 3.6 Flash C-Suite Logic</p>
                </div>
              </div>
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono font-bold">
                ONLINE
              </span>
            </div>

            {/* Quick Prompt Pills */}
            <div className="space-y-1 mb-3">
              <p className="text-[10px] text-slate-400 font-mono uppercase">Quick Strategic Prompts:</p>
              <div className="flex flex-wrap gap-1.5">
                {quickQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendQuery(q)}
                    disabled={isConsulting}
                    className="text-[10px] px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 transition-all text-left truncate max-w-full cursor-pointer"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* Messages Feed */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[380px] my-2">
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex gap-2.5 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {m.sender === 'advisor' && (
                    <div className="w-7 h-7 rounded-lg bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 flex items-center justify-center shrink-0">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div className={`max-w-[85%] p-3 rounded-xl text-xs leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-none shadow-md shadow-indigo-950/40'
                      : darkMode
                      ? 'bg-slate-950/80 border border-slate-800 text-slate-200 rounded-bl-none'
                      : 'bg-slate-100 text-slate-800 rounded-bl-none'
                  }`}>
                    <div className="whitespace-pre-wrap">{m.text}</div>
                    <div className={`text-[9px] font-mono mt-1 ${m.sender === 'user' ? 'text-indigo-200 text-right' : 'text-slate-500'}`}>
                      {m.time}
                    </div>
                  </div>

                  {m.sender === 'user' && (
                    <div className="w-7 h-7 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              ))}

              {isConsulting && (
                <div className="flex items-center gap-2 text-indigo-400 text-xs font-mono p-2 rounded-lg bg-indigo-950/40 border border-indigo-500/30">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Executive AI Advisor is analyzing strategy...</span>
                </div>
              )}
            </div>

            {/* Chat Input */}
            <div className="pt-2 border-t border-slate-800 flex items-center gap-2">
              <input
                type="text"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendQuery()}
                placeholder="Ask your Executive AI Advisor a business question..."
                className={`flex-1 px-3 py-2 text-xs rounded-xl border outline-none ${
                  darkMode
                    ? 'bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-500 focus:border-indigo-500'
                    : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500'
                }`}
              />
              <button
                onClick={() => handleSendQuery()}
                disabled={!inputQuery.trim() || isConsulting}
                className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all disabled:opacity-50 cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
