import React, { useState } from 'react';
import {
  TrendingUp,
  BarChart3,
  Users,
  Eye,
  MousePointer,
  Share2,
  DollarSign,
  Sparkles,
  ArrowUpRight,
  Download,
  Filter,
  CheckCircle2,
  Calendar
} from 'lucide-react';
import { AnalyticsSummary, PlatformMetrics, SocialPlatform } from '../../types/relay';

interface AnalyticsDashboardProps {
  analytics: AnalyticsSummary;
  platformMetrics: PlatformMetrics[];
  platforms: SocialPlatform[];
  darkMode: boolean;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  analytics,
  platformMetrics,
  platforms,
  darkMode
}) => {
  const [timeRange, setTimeRange] = useState('30d');
  const [exported, setExported] = useState(false);

  const handleExport = () => {
    setExported(true);
    setTimeout(() => setExported(false), 3000);
  };

  const insights = [
    {
      title: 'LinkedIn Lead Conversion Spike',
      desc: 'Posts containing structured bullet takeaways generate 42% higher click-through rates compared to block text.',
      impact: '+42% CTR'
    },
    {
      title: 'Optimal Video Length on TikTok & Shorts',
      desc: '15-22 second videos with active captions retain 78% of viewers past the 3-second mark.',
      impact: '+31% Retention'
    },
    {
      title: 'Zero-Click Value Distribution on X',
      desc: 'Tweets providing full inline answers receive 3x more retweets and profile visits than link-only posts.',
      impact: '3x Shares'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className={`p-5 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-colors ${
        darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold tracking-wider">
              REAL-TIME TELEMETRY
            </span>
            <span className="text-xs text-slate-400 font-medium">Estimated Channel ROI: <strong className="text-emerald-400">{analytics.estimatedROI}</strong></span>
          </div>
          <h1 className="text-xl font-extrabold tracking-tight">Analytics & Campaign ROI</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Cross-platform reach, impression metrics, engagement rates, and AI-generated performance insights.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-medium outline-none ${
              darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-100 border-slate-200 text-slate-800'
            }`}
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="year">Year to Date</option>
          </select>

          <button
            onClick={handleExport}
            className={`px-3 py-1.5 rounded-lg font-bold text-xs shadow-md flex items-center gap-1.5 transition-all cursor-pointer ${
              exported ? 'bg-emerald-600 text-white' : 'bg-indigo-600 hover:bg-indigo-500 text-white'
            }`}
          >
            {exported ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
            <span>{exported ? 'CSV Downloaded!' : 'Export Report'}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Total Reach */}
        <div className={`p-4 rounded-xl border space-y-1.5 ${
          darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>TOTAL REACH</span>
            <Users className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-xl font-extrabold text-slate-100">
            {(analytics.totalReach / 1000000).toFixed(2)}M
          </div>
          <div className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" /> +{analytics.totalReachChange}% vs last month
          </div>
        </div>

        {/* Card 2: Impressions */}
        <div className={`p-4 rounded-xl border space-y-1.5 ${
          darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>IMPRESSIONS</span>
            <Eye className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-xl font-extrabold text-slate-100">
            {(analytics.impressions / 1000000).toFixed(2)}M
          </div>
          <div className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" /> +{analytics.impressionsChange}% vs last month
          </div>
        </div>

        {/* Card 3: Total Engagement */}
        <div className={`p-4 rounded-xl border space-y-1.5 ${
          darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>TOTAL ENGAGEMENT</span>
            <BarChart3 className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-extrabold text-slate-100">
            {(analytics.totalEngagement / 1000).toFixed(1)}K
          </div>
          <div className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" /> +{analytics.engagementChange}% vs last month
          </div>
        </div>

        {/* Card 4: Total Clicks & Growth */}
        <div className={`p-4 rounded-xl border space-y-1.5 ${
          darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>TOTAL CLICKS</span>
            <MousePointer className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-extrabold text-slate-100">
            {(analytics.totalClicks / 1000).toFixed(1)}K
          </div>
          <div className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" /> +{analytics.clicksChange}% vs last month
          </div>
        </div>

      </div>

      {/* Main Chart & AI Performance Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* SVG Chart Section */}
        <div className={`lg:col-span-8 p-5 rounded-2xl border space-y-4 ${
          darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
            <div>
              <h3 className="text-sm font-bold font-mono">Cross-Platform Reach Telemetry</h3>
              <p className="text-[11px] text-slate-400">Weekly reach progression (thousands)</p>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="flex items-center gap-1 text-indigo-400">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" /> LinkedIn
              </span>
              <span className="flex items-center gap-1 text-sky-400">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-500" /> X (Twitter)
              </span>
            </div>
          </div>

          {/* Interactive Custom SVG Line Graph */}
          <div className="h-64 w-full pt-4">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 500 200">
              <defs>
                <linearGradient id="gradIndigo" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366F1" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#6366F1" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="gradSky" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1="0" y1="40" x2="500" y2="40" stroke="#334155" strokeDasharray="3 3" opacity="0.4" />
              <line x1="0" y1="90" x2="500" y2="90" stroke="#334155" strokeDasharray="3 3" opacity="0.4" />
              <line x1="0" y1="140" x2="500" y2="140" stroke="#334155" strokeDasharray="3 3" opacity="0.4" />

              {/* Area Under Curves */}
              <path
                d="M 10,140 Q 100,120 180,80 T 350,50 T 490,20 L 490,180 L 10,180 Z"
                fill="url(#gradIndigo)"
              />
              <path
                d="M 10,160 Q 100,135 180,110 T 350,85 T 490,45 L 490,180 L 10,180 Z"
                fill="url(#gradSky)"
              />

              {/* Line 1: LinkedIn (Indigo) */}
              <path
                d="M 10,140 Q 100,120 180,80 T 350,50 T 490,20"
                fill="none"
                stroke="#6366F1"
                strokeWidth="3.5"
                strokeLinecap="round"
              />

              {/* Line 2: X (Sky) */}
              <path
                d="M 10,160 Q 100,135 180,110 T 350,85 T 490,45"
                fill="none"
                stroke="#38BDF8"
                strokeWidth="3"
                strokeDasharray="4 2"
                strokeLinecap="round"
              />

              {/* Data Points */}
              <circle cx="180" cy="80" r="5" fill="#6366F1" stroke="#FFFFFF" strokeWidth="2" />
              <circle cx="350" cy="50" r="5" fill="#6366F1" stroke="#FFFFFF" strokeWidth="2" />
              <circle cx="490" cy="20" r="6" fill="#10B981" stroke="#FFFFFF" strokeWidth="2" />

              <text x="440" y="15" fill="#10B981" fontSize="10" fontFamily="monospace" fontWeight="bold">Peak 485K</text>
            </svg>

            <div className="flex justify-between text-[10px] font-mono text-slate-500 pt-2 border-t border-slate-800">
              <span>Week 1 (Jul 1)</span>
              <span>Week 2 (Jul 8)</span>
              <span>Week 3 (Jul 15)</span>
              <span>Week 4 (Jul 22)</span>
              <span>Current (Jul 28)</span>
            </div>
          </div>
        </div>

        {/* AI Insights Sidebar */}
        <div className={`lg:col-span-4 p-5 rounded-2xl border space-y-4 ${
          darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold font-mono">AI Growth Insights</h3>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 font-mono">
              REAL-TIME
            </span>
          </div>

          <div className="space-y-3">
            {insights.map((ins, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200">{ins.title}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-bold">
                    {ins.impact}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">{ins.desc}</p>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Platform Breakdown Table */}
      <div className={`p-5 rounded-2xl border space-y-4 ${
        darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
          <h3 className="text-sm font-bold font-mono">Platform Performance Matrix</h3>
          <span className="text-xs text-slate-400 font-mono">Top Performer: LinkedIn</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead>
              <tr className="border-b border-slate-800/80 text-[11px] font-mono text-slate-400 uppercase">
                <th className="py-2.5 px-3">Platform</th>
                <th className="py-2.5 px-3">Total Reach</th>
                <th className="py-2.5 px-3">Engagement Rate</th>
                <th className="py-2.5 px-3">Posts Count</th>
                <th className="py-2.5 px-3">Growth</th>
                <th className="py-2.5 px-3">Top Performing Post</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {platformMetrics.map((m) => {
                const platObj = platforms.find((p) => p.id === m.platform);
                return (
                  <tr key={m.platform} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3 font-bold flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: platObj?.color || '#3B82F6' }} />
                      {platObj?.name || m.platform}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold">{m.reach.toLocaleString()}</td>
                    <td className="py-3 px-3 font-mono text-emerald-400 font-bold">{m.engagementRate}%</td>
                    <td className="py-3 px-3 font-mono">{m.postsCount}</td>
                    <td className="py-3 px-3 font-mono text-emerald-400">+{m.change}%</td>
                    <td className="py-3 px-3 text-slate-400 max-w-xs truncate">{m.topPostTitle}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
