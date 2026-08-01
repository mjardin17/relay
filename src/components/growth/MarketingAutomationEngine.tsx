import React, { useState } from 'react';
import {
  Megaphone,
  Mail,
  FileText,
  Video,
  MessageSquare,
  Sparkles,
  DollarSign,
  TrendingUp,
  Plus,
  Send,
  CheckCircle2,
  Share2,
  BarChart,
  Layers,
  Copy
} from 'lucide-react';
import { MarketingCampaign, MarketingChannelType, BusinessProfile } from '../../types/relay';
import { apiService } from '../../services/api';

interface MarketingAutomationEngineProps {
  campaigns: MarketingCampaign[];
  setCampaigns: React.Dispatch<React.SetStateAction<MarketingCampaign[]>>;
  businessProfile: BusinessProfile;
  darkMode: boolean;
  onNavigateToContentStudio: () => void;
}

export const MarketingAutomationEngine: React.FC<MarketingAutomationEngineProps> = ({
  campaigns,
  setCampaigns,
  businessProfile,
  darkMode,
  onNavigateToContentStudio
}) => {
  const [selectedChannel, setSelectedChannel] = useState<string>('all');
  const [isGenerating, setIsGenerating] = useState(false);
  const [newCampaignGoal, setNewCampaignGoal] = useState('');
  const [generatedOutput, setGeneratedOutput] = useState<any | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const channels: { type: MarketingChannelType; label: string; icon: any }[] = [
    { type: 'blog', label: 'Blog & SEO', icon: FileText },
    { type: 'email', label: 'Email Newsletter', icon: Mail },
    { type: 'landing_page', label: 'Landing Page Copy', icon: Layers },
    { type: 'ad', label: 'Digital Ads', icon: Megaphone },
    { type: 'video', label: 'Video Scripts', icon: Video },
    { type: 'social', label: 'Social Posts', icon: Share2 },
    { type: 'sms', label: 'SMS Broadcast', icon: MessageSquare },
    { type: 'review_request', label: 'Review Requests', icon: Sparkles }
  ];

  const handleGenerateMultiChannelCampaign = async () => {
    if (!newCampaignGoal.trim()) return;
    setIsGenerating(true);
    setGeneratedOutput(null);

    try {
      const res = await apiService.generateContent({
        task: 'Multi-Channel Growth Campaign',
        prompt: `Campaign Goal: ${newCampaignGoal}. Product: ${businessProfile.name}. Industry: ${businessProfile.industry}.`,
        platforms: ['linkedin', 'x', 'email', 'blog'],
        tone: 'High Conversion & Professional',
        brandVoice: 'Authoritative, action-driven, crisp'
      });

      setGeneratedOutput({
        title: `Growth Campaign: ${newCampaignGoal}`,
        blogHeadline: `How ${businessProfile.name} Helps ${businessProfile.industry} Unlock Scale`,
        blogBody: res.mainPost || 'Comprehensive guide detailing ROI and implementation steps.',
        emailSubject: `🚀 Exclusive Briefing: ${newCampaignGoal}`,
        emailBody: `Hi {{first_name}},\n\n${res.mainPost}\n\nBest,\n${businessProfile.name} Team`,
        adHeadline: `Scale Your Business with ${businessProfile.name}`,
        adBody: `Stop losing pipeline revenue. ${res.cta || 'Try our AI Growth Engine today.'}`,
        smsText: `[${businessProfile.name}] Special Update: ${newCampaignGoal}. Tap here to claim your offer: https://empire.ai/growth`,
        socialPosts: res.platformCopies || {}
      });

      const newCamp: MarketingCampaign = {
        id: `camp-${Date.now()}`,
        name: `Campaign: ${newCampaignGoal}`,
        channelTypes: ['blog', 'email', 'social', 'ad'],
        targetAudience: businessProfile.industry,
        projectedROI: '520%',
        status: 'active',
        leadsGenerated: 0,
        revenueAttributed: '$0',
        createdAt: new Date().toISOString().split('T')[0]
      };

      setCampaigns([newCamp, ...campaigns]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className={`p-6 rounded-2xl border relative overflow-hidden ${
        darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 uppercase tracking-wider flex items-center gap-1">
                <Megaphone className="w-3 h-3 text-indigo-400" />
                Engine 3 • Multi-Channel Marketing
              </span>
              <span className="text-xs text-slate-400 font-mono">Measurable ROI Suite</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Marketing Automation Engine</h1>
            <p className={`text-xs max-w-2xl ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Full-spectrum campaign generation spanning blogs, email newsletters, landing page copy, ads, videos, social media, SMS broadcasts, and review requests.
            </p>
          </div>

          <button
            onClick={onNavigateToContentStudio}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-950/40 flex items-center gap-2 transition-all cursor-pointer shrink-0"
          >
            <Sparkles className="w-4 h-4" />
            <span>Open Advanced Studio</span>
          </button>
        </div>
      </div>

      {/* Campaign Generator Form */}
      <div className={`p-5 rounded-2xl border ${darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'} space-y-4`}>
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <Sparkles className="w-5 h-5 text-indigo-400" />
          <h2 className="text-sm font-bold uppercase font-mono tracking-wider">AI Multi-Channel Campaign Generator</h2>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={newCampaignGoal}
            onChange={(e) => setNewCampaignGoal(e.target.value)}
            placeholder="Describe your campaign goal (e.g. Launch Q3 Enterprise Security Upsell or Recover 400 Abandoned Leads)..."
            className={`flex-1 p-3 text-xs rounded-xl border outline-none ${
              darkMode ? 'bg-slate-950 border-slate-800 text-slate-100 focus:border-indigo-500' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-indigo-500'
            }`}
          />
          <button
            onClick={handleGenerateMultiChannelCampaign}
            disabled={!newCampaignGoal.trim() || isGenerating}
            className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-950 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 shrink-0"
          >
            <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
            <span>{isGenerating ? 'Generating Assets...' : 'Generate Multi-Channel Bundle'}</span>
          </button>
        </div>
      </div>

      {/* Generated Assets Preview (if generated) */}
      {generatedOutput && (
        <div className={`p-6 rounded-2xl border space-y-5 ${
          darkMode ? 'bg-gradient-to-br from-slate-900 via-indigo-950/30 to-slate-900 border-indigo-500/40' : 'bg-indigo-50/50 border-indigo-200'
        }`}>
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase">GENERATED CAMPAIGN BUNDLE</span>
              <h3 className="text-base font-bold text-slate-100">{generatedOutput.title}</h3>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-400 px-2.5 py-1 rounded bg-emerald-500/20 border border-emerald-500/30">
              PROJECTED ROI: 520%
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Email Campaign */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                  <Mail className="w-4 h-4" /> Email Drip Asset
                </span>
                <button
                  onClick={() => copyToClipboard(generatedOutput.emailBody, 'email')}
                  className="text-[10px] font-mono text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copiedKey === 'email' ? 'Copied!' : 'Copy Email'}</span>
                </button>
              </div>
              <p className="text-xs font-bold text-slate-200">Subject: {generatedOutput.emailSubject}</p>
              <p className="text-xs text-slate-400 whitespace-pre-wrap leading-relaxed">{generatedOutput.emailBody}</p>
            </div>

            {/* Ad Campaign */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
                  <Megaphone className="w-4 h-4" /> Digital Ad Copy
                </span>
                <button
                  onClick={() => copyToClipboard(generatedOutput.adBody, 'ad')}
                  className="text-[10px] font-mono text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copiedKey === 'ad' ? 'Copied!' : 'Copy Ad'}</span>
                </button>
              </div>
              <p className="text-xs font-bold text-slate-200">{generatedOutput.adHeadline}</p>
              <p className="text-xs text-slate-400 leading-relaxed">{generatedOutput.adBody}</p>
            </div>
          </div>
        </div>
      )}

      {/* Active Campaigns Table */}
      <div className={`p-5 rounded-2xl border ${darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'} space-y-4`}>
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <BarChart className="w-5 h-5 text-indigo-400" />
            <h2 className="text-sm font-bold uppercase font-mono tracking-wider">Active Marketing Campaigns & ROI</h2>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">MEASURED REVENUE ATTRIBUTION</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className={`border-b ${darkMode ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-600'} font-mono uppercase text-[10px]`}>
                <th className="py-2.5 px-3">Campaign Name</th>
                <th className="py-2.5 px-3">Channels</th>
                <th className="py-2.5 px-3">Target Audience</th>
                <th className="py-2.5 px-3">Leads</th>
                <th className="py-2.5 px-3">Revenue</th>
                <th className="py-2.5 px-3">ROI</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {campaigns.map((camp) => (
                <tr key={camp.id} className="hover:bg-slate-900/50 transition-colors">
                  <td className="py-3 px-3 font-bold text-slate-200">{camp.name}</td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-1">
                      {camp.channelTypes.map((ch, idx) => (
                        <span key={idx} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 uppercase">
                          {ch}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-slate-400">{camp.targetAudience}</td>
                  <td className="py-3 px-3 font-mono font-bold text-slate-200">{camp.leadsGenerated}</td>
                  <td className="py-3 px-3 font-mono font-bold text-emerald-400">{camp.revenueAttributed}</td>
                  <td className="py-3 px-3 font-mono font-bold text-indigo-400">{camp.projectedROI}</td>
                  <td className="py-3 px-3">
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                      camp.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {camp.status.toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
