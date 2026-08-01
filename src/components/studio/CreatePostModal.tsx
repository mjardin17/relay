import React, { useState } from 'react';
import { X, Sparkles, Send, Calendar, RefreshCw } from 'lucide-react';
import { SocialPlatform, ContentPost, PlatformId } from '../../types/relay';
import { apiService } from '../../services/api';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  platforms: SocialPlatform[];
  darkMode: boolean;
  onSavePost: (post: Partial<ContentPost>) => void;
  initialDate?: string;
}

export const CreatePostModal: React.FC<CreatePostModalProps> = ({
  isOpen,
  onClose,
  platforms,
  darkMode,
  onSavePost,
  initialDate
}) => {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<PlatformId[]>(['linkedin', 'x']);
  const [scheduledAt, setScheduledAt] = useState(initialDate || new Date().toISOString().split('T')[0]);
  const [loadingAi, setLoadingAi] = useState(false);

  if (!isOpen) return null;

  const togglePlatform = (pId: PlatformId) => {
    if (selectedPlatforms.includes(pId)) {
      if (selectedPlatforms.length > 1) {
        setSelectedPlatforms(selectedPlatforms.filter((p) => p !== pId));
      }
    } else {
      setSelectedPlatforms([...selectedPlatforms, pId]);
    }
  };

  const handleAiPolish = async () => {
    if (!body.trim()) return;
    setLoadingAi(true);
    try {
      const data = await apiService.generateContent({
        task: 'rewrite',
        prompt: body,
        platforms: selectedPlatforms
      });
      if (data.mainPost) {
        setBody(data.mainPost);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAi(false);
    }
  };

  const handleSubmit = (status: 'draft' | 'scheduled') => {
    if (!body.trim()) return;
    onSavePost({
      title: title || body.slice(0, 30) + '...',
      body,
      platforms: selectedPlatforms,
      status,
      scheduledAt: `${scheduledAt}T14:30:00.000Z`,
      author: 'Alex Vance (Admin)'
    });
    setTitle('');
    setBody('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className={`w-full max-w-2xl rounded-2xl border shadow-2xl p-6 space-y-4 ${
        darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-indigo-500 animate-pulse" />
            <h2 className="text-base font-bold font-mono">Create Empire OS Post</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Controls */}
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1">Post Title / Campaign Reference</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Q3 Feature Release Announcement"
              className={`w-full px-3 py-2 text-xs rounded-xl border outline-none ${
                darkMode ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'
              }`}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-400 block">Post Body Content</label>
              <button
                type="button"
                onClick={handleAiPolish}
                disabled={loadingAi || !body.trim()}
                className="text-[11px] text-indigo-400 hover:underline flex items-center gap-1 font-mono cursor-pointer"
              >
                {loadingAi ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                <span>AI Polish</span>
              </button>
            </div>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Type your content draft here..."
              className={`w-full h-36 p-3 text-xs rounded-xl border outline-none resize-none leading-relaxed ${
                darkMode ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'
              }`}
            />
          </div>

          {/* Platforms */}
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1.5">Target Platforms</label>
            <div className="flex flex-wrap gap-1.5">
              {platforms.map((p) => {
                const isSel = selectedPlatforms.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => togglePlatform(p.id)}
                    className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-all ${
                      isSel
                        ? 'bg-indigo-600 text-white border-indigo-500 font-bold'
                        : darkMode
                        ? 'bg-slate-800 border-slate-700 text-slate-400'
                        : 'bg-slate-100 border-slate-200 text-slate-600'
                    }`}
                  >
                    {p.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Schedule Date */}
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1">Scheduled Publish Date</label>
            <input
              type="date"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className={`px-3 py-1.5 text-xs font-mono rounded-lg border outline-none ${
                darkMode ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'
              }`}
            />
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
          <button
            onClick={() => handleSubmit('draft')}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs cursor-pointer"
          >
            Save Draft
          </button>
          <button
            onClick={() => handleSubmit('scheduled')}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Schedule Post</span>
          </button>
        </div>

      </div>
    </div>
  );
};
