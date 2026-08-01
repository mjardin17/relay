import React, { useState } from 'react';
import {
  Repeat,
  Sparkles,
  FileText,
  Video,
  Mail,
  Mic,
  Copy,
  Check,
  Download,
  ArrowRight,
  Layers,
  ChevronRight,
  Send,
  Zap,
  Calendar
} from 'lucide-react';
import { SocialPlatform, PlatformId } from '../../types/relay';
import { apiService } from '../../services/api';

interface RepurposingEngineProps {
  platforms: SocialPlatform[];
  darkMode: boolean;
  onSaveRepurposedCampaign: (posts: any[]) => void;
  brandVoiceName: string;
}

export const RepurposingEngine: React.FC<RepurposingEngineProps> = ({
  platforms,
  darkMode,
  onSaveRepurposedCampaign,
  brandVoiceName
}) => {
  const [sourceType, setSourceType] = useState<'article' | 'video_transcript' | 'newsletter' | 'podcast_notes'>('article');
  const [sourceText, setSourceText] = useState(`Building Enterprise AI Modules with Empire OS v4.2

In 2026, enterprise software architecture requires native modularity. Fragmented SaaS applications create data silos, governance risks, and wasted engineering hours.

Empire OS introduces Relay — an integrated content distribution engine that plugs directly into existing brand workspaces, shared security permissions, and Fast API backend pipelines.

Key advantages of native module architecture:
1. Unified Authentication: Single sign-on and role-based permissions across all modules.
2. Shared Data Telemetry: Real-time ROI analytics synchronized with revenue systems.
3. Multi-Agent Reasoning: Gemini 3.6 Flash reasoning models coordinate strategy, copy, SEO, and visual asset generation in parallel.

By moving from fragmented tools to native modules, marketing teams increase content velocity by 10x while maintaining 100% brand compliance.`);

  const [loading, setLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [repurposedResult, setRepurposedResult] = useState<any>({
    title: 'Enterprise AI Modules & Relay Launch',
    linkedin: `📌 Why Enterprise SaaS is Moving to Native Modules in 2026:

Fragmented SaaS tools create data silos, governance risks, and massive overhead.

With Empire OS v4.2 and our new Relay Module, marketing teams can:
• Turn 1 master article into 12 platform-native social assets instantly.
• Maintain strict brand voice guardrails using custom AI Brand Workspaces.
• Track unified cross-platform ROI in real-time.

Read the full breakdown inside Empire OS. Link below 👇`,
    xThread: [
      `1/ Fragmented SaaS tools are killing content velocity in 2026. Here is why top 1% enterprise marketing teams are switching to native modules 🧵👇`,
      `2/ Data Silos: Copying & pasting posts across 8 social media tools wastes 25 hours per week per manager.`,
      `3/ Relay Module integrates directly into Empire OS: 1 click converts a single master prompt into platform-perfect copy.`,
      `4/ Multi-Agent AI: Gemini 3.6 Flash coordinates copy, SEO, tone, and visual graphics in parallel.`,
      `5/ Want to scale content output by 10x without hiring more staff? Try Relay today: empireos.io/relay`
    ],
    instagramCaption: `✨ Why enterprise brands are choosing Empire OS Relay Module in 2026.

1 Master Post → 12 Platform Assets in 1 click.

.\n.\n.#EmpireOS #ContentMarketing #EnterpriseAI #SaaS #MarketingTech`,
    tiktokScript: `[Visual: Founder pointing at Empire OS dashboard on screen]\nHook: "Stop paying for 5 different social media tools!"\nBody: "Here is how Empire OS repurposes 1 long blog post into a LinkedIn post, X thread, and TikTok script in 3 seconds..."\nCTA: "Try Relay inside Empire OS today!"`,
    carouselSlides: [
      { slideNumber: 1, headline: 'The Native Module Advantage', body: 'Why enterprise SaaS is moving away from fragmented single-purpose tools.', visualTip: 'Dark neon banner with Empire OS logo' },
      { slideNumber: 2, headline: '1. Unified Security', body: 'Role-based access control across all modules.', visualTip: 'Shield & key icon' },
      { slideNumber: 3, headline: '2. Multi-Agent AI', body: 'Gemini 3.6 Flash coordinates strategy & copy.', visualTip: 'Brain network diagram' },
      { slideNumber: 4, headline: '3. 10x Velocity', body: 'Generate platform-native content in seconds.', visualTip: 'Rocket boost chart' }
    ],
    hashtags: ['#EmpireOS', '#ContentStrategy', '#EnterpriseAI', '#Productivity', '#GrowthSaaS']
  });

  const sourceOptions = [
    { id: 'article', label: 'Blog Article / Essay', icon: FileText },
    { id: 'video_transcript', label: 'Video Transcript', icon: Video },
    { id: 'newsletter', label: 'Email Newsletter', icon: Mail },
    { id: 'podcast_notes', label: 'Podcast Episode Notes', icon: Mic }
  ];

  const handleRepurpose = async () => {
    if (!sourceText.trim()) return;
    setLoading(true);
    try {
      const data = await apiService.repurposeContent({
        sourceType,
        sourceText,
        brandVoice: brandVoiceName
      });
      setRepurposedResult(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleBatchSchedule = () => {
    const postsToSave = [
      {
        title: `${repurposedResult.title || 'Repurposed Post'} - LinkedIn`,
        body: repurposedResult.linkedin,
        platforms: ['linkedin'],
        status: 'scheduled',
        author: 'Alex Vance (Admin)'
      },
      {
        title: `${repurposedResult.title || 'Repurposed Post'} - X Thread`,
        body: repurposedResult.xThread?.join('\n\n') || '',
        platforms: ['x'],
        status: 'scheduled',
        author: 'Alex Vance (Admin)'
      }
    ];
    onSaveRepurposedCampaign(postsToSave);
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className={`p-5 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-colors ${
        darkMode ? 'bg-gradient-to-r from-slate-900 via-emerald-950/40 to-slate-900 border-slate-800' : 'bg-gradient-to-r from-emerald-50/80 via-teal-50 to-white border-slate-200'
      }`}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold tracking-wider">
              1-CLICK MULTI-FORMAT ENGINE
            </span>
            <span className="text-xs text-slate-400 font-medium">Brand Style: <strong className="text-emerald-400">{brandVoiceName}</strong></span>
          </div>
          <h1 className="text-xl font-extrabold tracking-tight">AI Repurposing Engine</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Convert long articles, video transcripts, podcasts, or newsletters into LinkedIn posts, X threads, TikTok scripts, and carousels.
          </p>
        </div>

        <button
          onClick={handleBatchSchedule}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 flex items-center gap-2 cursor-pointer transition-all"
        >
          <Calendar className="w-4 h-4" />
          <span>Batch Schedule All Outputs</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Source Input */}
        <div className="lg:col-span-5 space-y-4">
          <div className={`p-5 rounded-2xl border space-y-4 ${
            darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono block">
              1. Select Source Content Type
            </label>

            <div className="grid grid-cols-2 gap-2">
              {sourceOptions.map((opt) => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setSourceType(opt.id as any)}
                    className={`p-2.5 rounded-xl border text-left flex items-center gap-2 text-xs font-medium transition-all ${
                      sourceType === opt.id
                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                        : darkMode
                        ? 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:border-slate-600'
                        : 'bg-slate-100 border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{opt.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono block">
                2. Paste Source Text
              </label>
              <textarea
                value={sourceText}
                onChange={(e) => setSourceText(e.target.value)}
                placeholder="Paste blog post, transcript, newsletter text here..."
                className={`w-full h-56 p-3 text-xs rounded-xl border outline-none resize-none font-sans leading-relaxed transition-all ${
                  darkMode
                    ? 'bg-slate-950 border-slate-800 text-slate-100 focus:border-emerald-500'
                    : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-emerald-500'
                }`}
              />
            </div>

            <button
              onClick={handleRepurpose}
              disabled={loading || !sourceText.trim()}
              className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer ${
                loading || !sourceText.trim()
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white shadow-emerald-600/30 active:scale-95'
              }`}
            >
              {loading ? (
                <>
                  <Repeat className="w-4 h-4 animate-spin text-emerald-300" />
                  <span>Repurposing Content...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Run Repurposing Engine</span>
                </>
              )}
            </button>

          </div>
        </div>

        {/* Right Column: Repurposed Assets Tabs & Outputs */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* LinkedIn Output Card */}
          <div className={`p-4 rounded-xl border space-y-2 ${
            darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
              <span className="text-xs font-bold text-indigo-400 flex items-center gap-1.5 font-mono">
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                LINKEDIN LONG-FORM POST
              </span>
              <button
                onClick={() => handleCopy(repurposedResult.linkedin, 'linkedin')}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-mono"
              >
                {copiedKey === 'linkedin' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedKey === 'linkedin' ? 'Copied' : 'Copy'}
              </button>
            </div>
            <p className="text-xs leading-relaxed whitespace-pre-wrap text-slate-200 pt-1">
              {repurposedResult.linkedin}
            </p>
          </div>

          {/* X Thread Output Card */}
          <div className={`p-4 rounded-xl border space-y-2 ${
            darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
              <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5 font-mono">
                <span className="w-2 h-2 rounded-full bg-sky-500" />
                X (TWITTER) THREAD ({repurposedResult.xThread?.length || 0} Tweets)
              </span>
              <button
                onClick={() => handleCopy(repurposedResult.xThread?.join('\n\n'), 'xThread')}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-mono"
              >
                {copiedKey === 'xThread' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedKey === 'xThread' ? 'Copied' : 'Copy Thread'}
              </button>
            </div>
            <div className="space-y-2 pt-1">
              {repurposedResult.xThread?.map((tweet: string, idx: number) => (
                <div key={idx} className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 text-xs text-slate-200">
                  {tweet}
                </div>
              ))}
            </div>
          </div>

          {/* Carousel Slides Output */}
          <div className={`p-4 rounded-xl border space-y-2 ${
            darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
              <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5 font-mono">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                INFOGRAPHIC CAROUSEL SLIDES ({repurposedResult.carouselSlides?.length || 0} Slides)
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {repurposedResult.carouselSlides?.map((slide: any, idx: number) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-mono text-amber-400">
                    <span>SLIDE {slide.slideNumber}</span>
                    <span className="text-slate-500">{slide.visualTip}</span>
                  </div>
                  <div className="text-xs font-bold text-slate-100">{slide.headline}</div>
                  <div className="text-[11px] text-slate-400 leading-snug">{slide.body}</div>
                </div>
              ))}
            </div>
          </div>

          {/* TikTok Short Script */}
          <div className={`p-4 rounded-xl border space-y-2 ${
            darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
              <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5 font-mono">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                TIKTOK / REELS / SHORTS SCRIPT
              </span>
              <button
                onClick={() => handleCopy(repurposedResult.tiktokScript, 'tiktok')}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-mono"
              >
                {copiedKey === 'tiktok' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedKey === 'tiktok' ? 'Copied' : 'Copy Script'}
              </button>
            </div>
            <p className="text-xs leading-relaxed whitespace-pre-wrap text-slate-200 pt-1 font-mono bg-slate-950/80 p-3 rounded-lg border border-slate-800">
              {repurposedResult.tiktokScript}
            </p>
          </div>

        </div>

      </div>
    </div>
  );
};
