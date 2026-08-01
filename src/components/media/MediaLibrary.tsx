import React, { useState } from 'react';
import { Folder, Sparkles, Image as ImageIcon, Video, FileText, Download, Plus, Search, RefreshCw } from 'lucide-react';
import { MediaAsset } from '../../types/relay';
import { apiService } from '../../services/api';

interface MediaLibraryProps {
  mediaAssets: MediaAsset[];
  darkMode: boolean;
  onAddMediaAsset: (asset: MediaAsset) => void;
}

export const MediaLibrary: React.FC<MediaLibraryProps> = ({
  mediaAssets,
  darkMode,
  onAddMediaAsset
}) => {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [loading, setLoading] = useState(false);
  const [assets, setAssets] = useState<MediaAsset[]>(mediaAssets);

  const handleGenerateGraphic = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    try {
      const url = await apiService.generateGraphicAsset(prompt, aspectRatio);
      const newAsset: MediaAsset = {
        id: `media-gen-${Date.now()}`,
        title: prompt.slice(0, 30),
        type: 'graphic',
        url,
        tags: ['AI Generated', 'Gemini', aspectRatio],
        fileSize: '1.2 MB',
        dimensions: aspectRatio === '1:1' ? '1080x1080' : '1920x1080',
        createdAt: new Date().toISOString().split('T')[0],
        aiGenerated: true
      };
      setAssets([newAsset, ...assets]);
      onAddMediaAsset(newAsset);
      setPrompt('');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner & AI Graphic Generator */}
      <div className={`p-5 rounded-2xl border space-y-4 ${
        darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-violet-500/20 text-violet-400 font-bold tracking-wider">
              GEMINI GRAPHIC SYNTHESIZER
            </span>
          </div>
          <h1 className="text-xl font-extrabold tracking-tight">Media Library & Graphic Studio</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage corporate visual assets or synthesize bespoke graphics for social posts using Gemini 3.1 Flash Image.
          </p>
        </div>

        {/* AI Image Generation Prompt Bar */}
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Modern neon cybernetic glass dashboard banner with blue gradient lighting for Relay Module release..."
              className="flex-1 w-full px-3 py-2 text-xs rounded-lg border border-slate-800 bg-slate-900 text-slate-100 outline-none focus:border-violet-500"
            />

            <select
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value)}
              className="px-3 py-2 text-xs font-mono rounded-lg border border-slate-800 bg-slate-900 text-slate-200 outline-none"
            >
              <option value="1:1">Square 1:1 (Insta/LinkedIn)</option>
              <option value="16:9">Landscape 16:9 (X/YouTube)</option>
              <option value="9:16">Portrait 9:16 (TikTok/Reels)</option>
            </select>

            <button
              onClick={handleGenerateGraphic}
              disabled={loading || !prompt.trim()}
              className="w-full sm:w-auto px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs shadow-lg shadow-violet-600/30 flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Synthesizing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Generate Graphic</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Media Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {assets.map((asset) => (
          <div
            key={asset.id}
            className={`rounded-2xl border overflow-hidden flex flex-col justify-between transition-all group ${
              darkMode ? 'bg-slate-900/90 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200'
            }`}
          >
            <div className="relative h-40 bg-slate-950 overflow-hidden">
              <img
                src={asset.url}
                alt={asset.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              {asset.aiGenerated && (
                <span className="absolute top-2 left-2 text-[9px] font-mono px-2 py-0.5 rounded bg-violet-600/90 text-white font-bold backdrop-blur-md">
                  AI GRAPHIC
                </span>
              )}
            </div>

            <div className="p-3 space-y-2">
              <div className="text-xs font-bold text-slate-100 truncate">{asset.title}</div>
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span>{asset.fileSize}</span>
                <span>{asset.dimensions || 'Vector'}</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {asset.tags.map((tag) => (
                  <span key={tag} className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
