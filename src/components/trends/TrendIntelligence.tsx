import React, { useState } from 'react';
import {
  TrendingUp,
  Flame,
  Search,
  Sparkles,
  ArrowUpRight,
  Hash,
  Compass,
  Zap,
  Layers,
  Copy,
  Check
} from 'lucide-react';
import { TrendTopic } from '../../types/relay';
import { apiService } from '../../services/api';

interface TrendIntelligenceProps {
  trends: TrendTopic[];
  darkMode: boolean;
  onUseTopicForPost: (topic: string) => void;
}

export const TrendIntelligence: React.FC<TrendIntelligenceProps> = ({
  trends,
  darkMode,
  onUseTopicForPost
}) => {
  const [industry, setIndustry] = useState('Enterprise AI & SaaS Marketing');
  const [loading, setLoading] = useState(false);
  const [activeTrends, setActiveTrends] = useState<TrendTopic[]>(trends);

  const handleFetchTrends = async () => {
    setLoading(true);
    try {
      const data = await apiService.fetchTrends(industry);
      if (data.viralTopics && data.viralTopics.length > 0) {
        const formatted: TrendTopic[] = data.viralTopics.map((vt: any, i: number) => ({
          id: `trend-dynamic-${i}`,
          topic: vt.topic,
          category: industry,
          volume: vt.volume || '250K/day',
          momentum: vt.momentum || 'rising',
          relatedHashtags: data.trendingHashtags || ['#AI', '#Tech', '#Growth'],
          relevanceScore: vt.relevanceScore || 92,
          suggestedAngle: vt.angle || 'Create a breakdown on how to leverage this trend.'
        }));
        setActiveTrends(formatted);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className={`p-5 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-colors ${
        darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold tracking-wider">
              REAL-TIME VIRAL MONITOR
            </span>
            <span className="text-xs text-slate-400 font-medium">Industry: <strong className="text-amber-400">{industry}</strong></span>
          </div>
          <h1 className="text-xl font-extrabold tracking-tight">Trend Intelligence & Viral Radar</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Identify explosive topics, competitor content gaps, and high-engagement hashtag clusters before they peak.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            placeholder="e.g. Web3, E-commerce, Fintech..."
            className={`px-3 py-1.5 rounded-lg border text-xs outline-none w-48 ${
              darkMode ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-100 border-slate-200 text-slate-900'
            }`}
          />
          <button
            onClick={handleFetchTrends}
            disabled={loading}
            className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-200" />
            <span>{loading ? 'Scanning Radar...' : 'Scan Trends'}</span>
          </button>
        </div>
      </div>

      {/* Viral Topics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {activeTrends.map((topic) => (
          <div
            key={topic.id}
            className={`p-5 rounded-2xl border space-y-3 transition-all ${
              darkMode ? 'bg-slate-900/90 border-slate-800 hover:border-amber-500/40' : 'bg-white border-slate-200 hover:border-amber-400'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold flex items-center gap-1 uppercase">
                <Flame className="w-3 h-3" /> {topic.momentum} momentum
              </span>
              <span className="text-xs font-mono font-bold text-emerald-400">
                {topic.relevanceScore}% Relevance Score
              </span>
            </div>

            <div>
              <h3 className="text-sm font-extrabold text-slate-100">{topic.topic}</h3>
              <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                <strong className="text-slate-300">Suggested Angle:</strong> {topic.suggestedAngle}
              </p>
            </div>

            <div className="flex flex-wrap gap-1 pt-1">
              {topic.relatedHashtags.map((tag) => (
                <span key={tag} className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  {tag}
                </span>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between">
              <span className="text-[10px] font-mono text-slate-500">{topic.volume}</span>
              <button
                onClick={() => onUseTopicForPost(topic.suggestedAngle)}
                className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
              >
                Draft Post with Angle <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
