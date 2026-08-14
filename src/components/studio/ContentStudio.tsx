import React, { useState } from 'react';
import {
  Sparkles,
  Send,
  RefreshCw,
  Copy,
  Check,
  Zap,
  Sliders,
  Type,
  Hash,
  Target,
  Search,
  Eye,
  Calendar,
  Layers,
  ThumbsUp,
  MessageSquare,
  Share2,
  Bookmark,
  Smartphone,
  ShieldCheck,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { SocialPlatform, ContentPost, PlatformId } from '../../types/relay';
import { apiService } from '../../services/api';

interface ContentStudioProps {
  platforms: SocialPlatform[];
  darkMode: boolean;
  onSavePost: (post: Partial<ContentPost>) => void;
  brandVoiceName: string;
}

export const ContentStudio: React.FC<ContentStudioProps> = ({
  platforms,
  darkMode,
  onSavePost,
  brandVoiceName
}) => {
  const [prompt, setPrompt] = useState('');
  const [taskType, setTaskType] = useState('post_generation');
  const [selectedTone, setSelectedTone] = useState('Authoritative & Bold');
  const [selectedPlatforms, setSelectedPlatforms] = useState<PlatformId[]>([
    'linkedin',
    'x',
    'instagram',
    'facebook'
  ]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activePreviewPlatform, setActivePreviewPlatform] = useState<PlatformId>('linkedin');
  const [editingCopy, setEditingCopy] = useState(false);
  const [customPlatformCopies, setCustomPlatformCopies] = useState<Partial<Record<PlatformId, string>>>({});

  // Generated output state
  const [generatedOutput, setGeneratedOutput] = useState<{
    mainPost: string;
    platformCopies: Partial<Record<PlatformId, string>>;
    hashtags: string[];
    cta: string;
    seoKeywords: string[];
    engagementPrediction: number;
  }>({
    mainPost: `🚀 Empire OS v4.2 is live!

Introducing Relay — our native AI Content Distribution & Social Media Automation Engine.

Key Highlights:
• 1-Click Multi-Platform Repurposing
• Real-time Predictive Engagement Scoring
• Native Empire AI Strategy Agents
• Cross-Platform Drip Queue & Analytics

Streamline your brand distribution today 👉 empireos.io/relay`,
    platformCopies: {
      linkedin: `We are excited to roll out Empire OS v4.2 featuring Relay, our flagship Content Distribution & Social Media Engine.

Modern enterprise marketing teams waste up to 25 hours per week reformatting content across fragmented channels. Relay solves this natively inside Empire OS.

With Relay, your teams can:
1. Turn 1 long-form article or video into 12 platform-optimized assets instantly.
2. Maintain strict brand voice guardrails using custom AI Brand Workspaces.
3. Schedule, track, and measure cross-platform ROI in one unified command center.

Discover how Relay streamlines enterprise social workflows. Link in comments below.`,
      x: `🚀 Empire OS v4.2 is live!

Meet Relay — our native social media distribution & AI automation module.

✨ 1-click repurposing
📈 Real-time viral trend scoring
🤖 AI Strategy Agent suite
📅 Unified multi-platform calendar

Empower your brand content engine now 👇 #EmpireOS`,
      instagram: `✨ Empire OS v4.2 featuring Relay Module is officially here!

Transforming how enterprise brands scale visual and text distribution natively inside Empire OS.

.\n.\n.#EmpireOS #ContentMarketing #MarketingTech #EnterpriseSaaS #AIAutomation`,
      facebook: `Empire OS v4.2 is officially live! Discover Relay — our native AI content distribution and social media automation engine. Learn how top brands scale cross-channel ROI.`
    },
    hashtags: ['#EmpireOS', '#ContentStrategy', '#MarketingAutomation', '#EnterpriseAI', '#Productivity'],
    cta: 'Explore Relay inside Empire OS today 👉 empireos.io/relay',
    seoKeywords: ['Content Automation', 'Social Media Scheduling', 'Enterprise SaaS', 'Empire OS'],
    engagementPrediction: 94
  });

  const tones = [
    'Authoritative & Bold',
    'Thought Leader',
    'Technical Precision',
    'Action-Oriented',
    'Playful & Viral',
    'Direct & Minimal'
  ];

  const tasks = [
    { id: 'post_generation', label: 'Generate Post', icon: Sparkles },
    { id: 'rewrite', label: 'Rewrite Content', icon: RefreshCw },
    { id: 'expand_ideas', label: 'Expand Idea', icon: Type },
    { id: 'summarize', label: 'Summarize', icon: Sliders },
    { id: 'hashtags', label: 'Hashtag Generator', icon: Hash },
    { id: 'cta', label: 'CTA Engine', icon: Target },
    { id: 'seo_optimize', label: 'SEO Optimizer', icon: Search }
  ];

  const togglePlatform = (id: PlatformId) => {
    if (selectedPlatforms.includes(id)) {
      if (selectedPlatforms.length > 1) {
        setSelectedPlatforms(selectedPlatforms.filter((p) => p !== id));
      }
    } else {
      setSelectedPlatforms([...selectedPlatforms, id]);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    try {
      const data = await apiService.generateContent({
        task: taskType,
        prompt,
        platforms: selectedPlatforms,
        tone: selectedTone,
        brandVoice: brandVoiceName
      });
      setGeneratedOutput(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleScheduleCurrent = (status: 'draft' | 'scheduled' | 'under_review') => {
    const postBody = generatedOutput.platformCopies[activePreviewPlatform] || generatedOutput.mainPost;
    onSavePost({
      title: prompt ? prompt.slice(0, 40) + '...' : 'New AI Studio Post',
      body: postBody,
      platforms: selectedPlatforms,
      platformSpecificCopy: generatedOutput.platformCopies,
      hashtags: generatedOutput.hashtags,
      status,
      engagementScore: generatedOutput.engagementPrediction,
      author: 'Alex Vance (Admin)',
      scheduledAt: new Date(Date.now() + 86400000).toISOString()
    });
  };

  const handleCopyChange = (platformId: PlatformId, text: string) => {
    setCustomPlatformCopies((prev) => ({ ...prev, [platformId]: text }));
  };

  const getActiveCopyForPlatform = (platformId: PlatformId) => {
    if (customPlatformCopies[platformId] !== undefined) {
      return customPlatformCopies[platformId]!;
    }
    return generatedOutput.platformCopies[platformId] || generatedOutput.mainPost;
  };

  const activeCopy = getActiveCopyForPlatform(activePreviewPlatform);
  const activeCharLimit = platforms.find((p) => p.id === activePreviewPlatform)?.characterLimit || 3000;
  const isOverCharLimit = activeCopy.length > activeCharLimit;

  return (
    <div className="space-y-6">
      {/* Studio Header Banner */}
      <div className={`p-5 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-colors ${
        darkMode ? 'bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border-slate-800' : 'bg-gradient-to-r from-indigo-50/80 via-sky-50 to-white border-slate-200'
      }`}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 font-bold tracking-wider">
              EMPIRE AI CORE
            </span>
            <span className="text-xs text-slate-400 font-medium">Enforcing Brand Style: <strong className="text-indigo-400">{brandVoiceName}</strong></span>
          </div>
          <h1 className="text-xl font-extrabold tracking-tight">AI Content Studio</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Generate, rewrite, expand, and tailor social content across 12 platforms powered by Gemini 3.6 Flash.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-950/60 p-2 rounded-xl border border-slate-800 text-xs font-mono">
          <Zap className="w-4 h-4 text-amber-400 animate-pulse" />
          <div>
            <div className="text-[10px] text-slate-400">Predicted Viral Index</div>
            <div className="text-sm font-bold text-emerald-400">{generatedOutput.engagementPrediction}/100</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Prompt Controls & Platform Toggles */}
        <div className="lg:col-span-5 space-y-5">
          
          {/* Task Selectors */}
          <div className={`p-4 rounded-xl border space-y-3 ${
            darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block font-mono">
              1. Select Studio Task
            </label>
            <div className="grid grid-cols-2 gap-2">
              {tasks.map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTaskType(t.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-all text-left ${
                      taskType === t.id
                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                        : darkMode
                        ? 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:border-slate-600'
                        : 'bg-slate-100 border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Prompt Input */}
          <div className={`p-4 rounded-xl border space-y-3 ${
            darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                2. Prompt / Core Idea
              </label>
              <span className="text-[10px] text-slate-400 font-mono">{prompt.length} chars</span>
            </div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Announce Empire OS v4.2 with Relay Module launch. Highlight 1-click repurposing, real-time engagement scoring, and native AI strategy agents..."
              className={`w-full h-32 p-3 text-xs rounded-lg border outline-none resize-none transition-all ${
                darkMode
                  ? 'bg-slate-950 border-slate-800 text-slate-100 focus:border-indigo-500'
                  : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500'
              }`}
            />

            {/* Tone Selector */}
            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1.5">Desired Tone</label>
              <div className="flex flex-wrap gap-1.5">
                {tones.map((t) => (
                  <button
                    key={t}
                    onClick={() => setSelectedTone(t)}
                    className={`text-[11px] px-2.5 py-1 rounded-md border transition-all ${
                      selectedTone === t
                        ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/50 font-bold'
                        : darkMode
                        ? 'bg-slate-800/40 border-slate-700/50 text-slate-400 hover:text-slate-200'
                        : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Target Platforms Toggle */}
            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1.5">Target Platforms</label>
              <div className="flex flex-wrap gap-1.5">
                {platforms.map((p) => {
                  const isSel = selectedPlatforms.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      onClick={() => togglePlatform(p.id)}
                      className={`text-xs px-2.5 py-1 rounded-lg border flex items-center gap-1.5 transition-all ${
                        isSel
                          ? 'bg-indigo-600 text-white border-indigo-500 font-bold'
                          : darkMode
                          ? 'bg-slate-800/40 border-slate-800 text-slate-500 opacity-60 hover:opacity-100'
                          : 'bg-slate-100 border-slate-200 text-slate-500 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.color }} />
                      <span>{p.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Generate Trigger Button */}
            <button
              onClick={handleGenerate}
              disabled={loading || !prompt.trim()}
              className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer ${
                loading || !prompt.trim()
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white shadow-indigo-600/30 active:scale-95'
              }`}
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-indigo-300" />
                  <span>Gemini 3.6 Processing Copy...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Generate Multi-Platform Copy</span>
                </>
              )}
            </button>
          </div>

          {/* Hashtags & SEO Pill Output */}
          <div className={`p-4 rounded-xl border space-y-3 ${
            darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center justify-between">
              <span>Hashtags & SEO Metadata</span>
              <button
                onClick={() => handleCopy(generatedOutput.hashtags.join(' '))}
                className="text-indigo-400 hover:underline text-[11px] flex items-center gap-1"
              >
                <Copy className="w-3 h-3" /> Copy Tags
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {generatedOutput.hashtags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs font-mono px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-400 border border-indigo-500/30"
                >
                  {tag}
                </span>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-800/60">
              <span className="text-[10px] text-slate-400 uppercase font-mono block mb-1">Generated Call To Action</span>
              <div className="text-xs font-medium text-emerald-400 p-2 rounded bg-emerald-950/40 border border-emerald-500/30">
                {generatedOutput.cta}
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Multi-Platform Live Preview Simulator */}
        <div className="lg:col-span-7 space-y-5">
          
          <div className={`p-5 rounded-2xl border space-y-4 ${
            darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/60 pb-3">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold">Multi-Platform Live Simulator</h3>
              </div>

              {/* Platform Selector Tabs */}
              <div className="flex flex-wrap gap-1">
                {selectedPlatforms.map((pId) => {
                  const platObj = platforms.find((p) => p.id === pId);
                  const isAct = activePreviewPlatform === pId;
                  return (
                    <button
                      key={pId}
                      onClick={() => setActivePreviewPlatform(pId)}
                      className={`text-xs px-2.5 py-1 rounded-md font-medium border transition-all ${
                        isAct
                          ? 'bg-indigo-600 text-white border-indigo-500 font-bold'
                          : darkMode
                          ? 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:bg-slate-800'
                          : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {platObj?.name || pId}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Platform Card Simulator View */}
            <div className={`p-4 rounded-xl border relative ${
              darkMode ? 'bg-slate-950 border-slate-800/80' : 'bg-slate-50 border-slate-200'
            }`}>
              
              {/* Header inside mock card */}
              <div className="flex items-center justify-between mb-3 border-b border-slate-800/40 pb-2">
                <div className="flex items-center gap-2.5">
                  <img
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80"
                    alt="Empire OS Profile"
                    className="w-9 h-9 rounded-full object-cover ring-2 ring-indigo-500/50"
                  />
                  <div>
                    <div className="text-xs font-bold flex items-center gap-1.5 text-slate-100">
                      Empire OS Official
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 fill-blue-500/20" />
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      @empire_os • Scheduled via Relay Module
                    </div>
                  </div>
                </div>

                <div className="text-right flex flex-col items-end gap-1">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setEditingCopy(!editingCopy)}
                      className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 font-bold transition-all"
                    >
                      {editingCopy ? 'Done Editing' : 'Edit Copy'}
                    </button>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {activePreviewPlatform.toUpperCase()} PREVIEW
                    </span>
                  </div>
                  <div className={`text-[10px] font-mono font-bold flex items-center gap-1 ${
                    isOverCharLimit ? 'text-rose-400 animate-pulse' : 'text-slate-400'
                  }`}>
                    {isOverCharLimit && <AlertCircle className="w-3 h-3 text-rose-400 shrink-0" />}
                    <span>{activeCopy.length} / {activeCharLimit} chars</span>
                  </div>
                </div>
              </div>

              {/* Main Copy Area - View Mode vs Edit Mode */}
              {editingCopy ? (
                <div className="my-3 space-y-1">
                  <textarea
                    value={activeCopy}
                    onChange={(e) => handleCopyChange(activePreviewPlatform, e.target.value)}
                    className="w-full h-40 p-3 text-xs rounded-lg border bg-slate-900 border-indigo-500/50 text-slate-100 outline-none resize-none font-sans leading-relaxed"
                    placeholder="Customize copy for this specific platform..."
                  />
                  <div className="text-[10px] text-indigo-300 font-mono">
                    Customizing copy overrides the global AI output for {activePreviewPlatform.toUpperCase()}.
                  </div>
                </div>
              ) : (
                <div className="text-xs leading-relaxed whitespace-pre-wrap text-slate-200 font-sans my-4 min-h-[160px]">
                  {activeCopy}
                </div>
              )}

              {/* Mock Media Graphic Banner inside Preview */}
              <div className="rounded-lg overflow-hidden border border-slate-800 my-3 relative group">
                <img
                  src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80"
                  alt="Relay AI Banner"
                  className="w-full h-44 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end p-3">
                  <span className="text-[10px] font-mono text-slate-300 bg-slate-900/80 px-2 py-1 rounded border border-slate-700">
                    Generated via Gemini AI Graphic Synthesizer
                  </span>
                </div>
              </div>

              {/* Mock Social Interactions */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-800/40 text-slate-400 text-xs">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1 hover:text-indigo-400 cursor-pointer">
                    <ThumbsUp className="w-3.5 h-3.5" /> 1,240
                  </span>
                  <span className="flex items-center gap-1 hover:text-indigo-400 cursor-pointer">
                    <MessageSquare className="w-3.5 h-3.5" /> 84 Comments
                  </span>
                  <span className="flex items-center gap-1 hover:text-indigo-400 cursor-pointer">
                    <Share2 className="w-3.5 h-3.5" /> 312 Shares
                  </span>
                </div>
                <Bookmark className="w-3.5 h-3.5 hover:text-indigo-400 cursor-pointer" />
              </div>

            </div>

            {/* Platform Formatting Rule Box */}
            <div className="p-3 rounded-lg bg-indigo-950/30 border border-indigo-500/20 text-xs text-indigo-300 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0 text-indigo-400 mt-0.5" />
              <div>
                <strong className="font-bold">Platform Formatting Rule:</strong>{' '}
                {platforms.find((p) => p.id === activePreviewPlatform)?.formatRules}
              </div>
            </div>

            {/* Action Buttons for Post Lifecycle */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button
                onClick={() => handleCopy(activeCopy)}
                className={`px-3 py-2 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition-all ${
                  darkMode ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' : 'bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200'
                }`}
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy Copy'}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleScheduleCurrent('draft')}
                  className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700 transition-all cursor-pointer"
                >
                  Save Draft
                </button>
                <button
                  onClick={() => handleScheduleCurrent('under_review')}
                  className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white shadow-md transition-all cursor-pointer"
                >
                  Submit for Approval
                </button>
                <button
                  onClick={() => handleScheduleCurrent('scheduled')}
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Schedule Post</span>
                </button>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
