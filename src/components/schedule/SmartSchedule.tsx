import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  Globe,
  Filter,
  Plus,
  Zap,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Layers,
  Trash2,
  Edit3
} from 'lucide-react';
import { ContentPost, SocialPlatform, PlatformId } from '../../types/relay';

interface SmartScheduleProps {
  posts: ContentPost[];
  platforms: SocialPlatform[];
  darkMode: boolean;
  onOpenCreateModalWithDate?: (dateStr: string) => void;
  onDeletePost: (id: string) => void;
}

export const SmartSchedule: React.FC<SmartScheduleProps> = ({
  posts,
  platforms,
  darkMode,
  onOpenCreateModalWithDate,
  onDeletePost
}) => {
  const [viewMode, setViewMode] = useState<'calendar' | 'queue' | 'drafts'>('calendar');
  const [timezone, setTimezone] = useState('EST (UTC-5)');
  const [selectedPlatformFilter, setSelectedPlatformFilter] = useState<string>('all');

  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const timezones = ['EST (UTC-5)', 'PST (UTC-8)', 'UTC (GMT+0)', 'JST (UTC+9)', 'CET (UTC+1)'];

  const recommendedTimes = [
    { platform: 'LinkedIn', time: 'Tue 09:30 AM EST', score: '98% Engagement Score' },
    { platform: 'X (Twitter)', time: 'Wed 01:15 PM EST', score: '95% Engagement Score' },
    { platform: 'Instagram', time: 'Fri 07:00 PM EST', score: '92% Engagement Score' },
    { platform: 'TikTok', time: 'Sat 04:00 PM EST', score: '89% Engagement Score' }
  ];

  const filteredPosts = posts.filter((p) => {
    if (selectedPlatformFilter !== 'all') {
      return p.platforms.includes(selectedPlatformFilter as PlatformId);
    }
    return true;
  });

  const scheduledPosts = filteredPosts.filter((p) => p.status === 'scheduled');
  const draftPosts = filteredPosts.filter((p) => p.status === 'draft' || p.status === 'under_review');

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className={`p-5 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-colors ${
        darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-sky-500/20 text-sky-400 font-bold tracking-wider">
              AUTO-DRIP ENGINE
            </span>
            <span className="text-xs text-slate-400 font-medium">Timezone: <strong className="text-sky-400">{timezone}</strong></span>
          </div>
          <h1 className="text-xl font-extrabold tracking-tight">Smart Schedule & Queue</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Orchestrate cross-platform drip queues with AI-recommended peak engagement windows.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Timezone selector */}
          <div className="relative">
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-medium outline-none ${
                darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-100 border-slate-200 text-slate-800'
              }`}
            >
              {timezones.map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </div>

          {/* View Toggles */}
          <div className={`p-1 rounded-xl border flex items-center gap-1 ${
            darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
          }`}>
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'calendar' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Calendar
            </button>
            <button
              onClick={() => setViewMode('queue')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'queue' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Drip Queue ({scheduledPosts.length})
            </button>
            <button
              onClick={() => setViewMode('drafts')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'drafts' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Drafts ({draftPosts.length})
            </button>
          </div>
        </div>
      </div>

      {/* AI Optimal Times Banner */}
      <div className={`p-4 rounded-xl border flex flex-wrap items-center justify-between gap-3 text-xs ${
        darkMode ? 'bg-indigo-950/40 border-indigo-500/20 text-indigo-300' : 'bg-indigo-50 border-indigo-200 text-indigo-900'
      }`}>
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400 animate-pulse shrink-0" />
          <span className="font-bold">AI Recommended Peak Windows:</span>
        </div>
        <div className="flex flex-wrap items-center gap-3 font-mono text-[11px]">
          {recommendedTimes.map((rec, i) => (
            <div key={i} className="px-2.5 py-1 rounded bg-slate-900/80 border border-slate-800 text-slate-200 flex items-center gap-1.5">
              <strong className="text-indigo-400">{rec.platform}:</strong>
              <span>{rec.time}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <div className={`p-5 rounded-2xl border space-y-4 ${
          darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          {/* Calendar Navigation Header */}
          <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-bold font-mono">July 2026 Schedule</h2>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono">
                {scheduledPosts.length} POSTS SCHEDULED
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button className={`p-1.5 rounded-lg border text-xs ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-300'}`}>
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button className={`p-1.5 rounded-lg border text-xs ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-300'}`}>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Days Grid Header */}
          <div className="grid grid-cols-7 gap-2 text-center text-xs font-mono font-bold text-slate-400 uppercase">
            {daysOfWeek.map((day) => (
              <div key={day} className="py-1">{day}</div>
            ))}
          </div>

          {/* Calendar Days Matrix (Mock July 2026) */}
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 28 }).map((_, idx) => {
              const dayNum = idx + 1;
              const dateKey = `2026-07-${dayNum < 10 ? '0' + dayNum : dayNum}`;
              const postsOnDay = posts.filter((p) => p.scheduledAt && p.scheduledAt.includes(dateKey));

              return (
                <div
                  key={idx}
                  onClick={() => onOpenCreateModalWithDate && onOpenCreateModalWithDate(dateKey)}
                  className={`min-h-[110px] p-2 rounded-xl border flex flex-col justify-between transition-all cursor-pointer group ${
                    dayNum === 28
                      ? 'border-indigo-500 bg-indigo-950/20'
                      : darkMode
                      ? 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/60'
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className={`font-mono font-bold ${dayNum === 28 ? 'text-indigo-400' : 'text-slate-400'}`}>
                      {dayNum}
                    </span>
                    <Plus className="w-3 h-3 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>

                  <div className="space-y-1 my-1">
                    {postsOnDay.map((p) => (
                      <div
                        key={p.id}
                        className="p-1.5 rounded text-[10px] bg-indigo-600 text-white font-medium line-clamp-2 shadow-sm"
                      >
                        <div className="flex items-center justify-between text-[9px] opacity-80 mb-0.5">
                          <span>{p.platforms.slice(0, 2).join(', ')}</span>
                          <span>14:30</span>
                        </div>
                        {p.title}
                      </div>
                    ))}
                  </div>

                  <div className="text-[9px] text-slate-500 font-mono">
                    {postsOnDay.length > 0 ? `${postsOnDay.length} post` : 'Click to add'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Queue View */}
      {viewMode === 'queue' && (
        <div className={`p-5 rounded-2xl border space-y-4 ${
          darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
            <h3 className="text-sm font-bold font-mono">Automated Drip Queue Manager</h3>
            <span className="text-xs text-slate-400">{scheduledPosts.length} queued items</span>
          </div>

          <div className="space-y-3">
            {scheduledPosts.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">No posts currently in queue.</div>
            ) : (
              scheduledPosts.map((post) => (
                <div
                  key={post.id}
                  className={`p-4 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all ${
                    darkMode ? 'bg-slate-950 border-slate-800 hover:border-slate-700' : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="space-y-1 max-w-xl">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold uppercase">
                        QUEUED
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        Scheduled for: {post.scheduledAt ? new Date(post.scheduledAt).toLocaleString() : 'Tomorrow 14:30 EST'}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-slate-100">{post.title}</div>
                    <p className="text-xs text-slate-400 line-clamp-2">{post.body}</p>
                    <div className="flex items-center gap-2 pt-1">
                      {post.platforms.map((plat) => (
                        <span key={plat} className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase">
                          {plat}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => onDeletePost(post.id)}
                      className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-medium transition-colors"
                      title="Remove from Queue"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Drafts View */}
      {viewMode === 'drafts' && (
        <div className={`p-5 rounded-2xl border space-y-4 ${
          darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
            <h3 className="text-sm font-bold font-mono">Drafts & Pending Approvals</h3>
            <span className="text-xs text-slate-400">{draftPosts.length} drafts</span>
          </div>

          <div className="space-y-3">
            {draftPosts.map((post) => (
              <div
                key={post.id}
                className={`p-4 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all ${
                  darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                      post.status === 'under_review' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {post.status.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">Author: {post.author}</span>
                  </div>
                  <div className="text-xs font-bold text-slate-100">{post.title}</div>
                  <p className="text-xs text-slate-400 line-clamp-2">{post.body}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onDeletePost(post.id)}
                    className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-medium transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
