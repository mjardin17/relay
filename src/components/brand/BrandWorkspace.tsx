import React, { useState } from 'react';
import { ShieldAlert, Check, Plus, Trash2, Sparkles, Palette, Type, Users, Save } from 'lucide-react';
import { BrandVoice } from '../../types/relay';

interface BrandWorkspaceProps {
  brandVoice: BrandVoice;
  setBrandVoice: (bv: BrandVoice) => void;
  darkMode: boolean;
}

export const BrandWorkspace: React.FC<BrandWorkspaceProps> = ({
  brandVoice,
  setBrandVoice,
  darkMode
}) => {
  const [bvState, setBvState] = useState<BrandVoice>(brandVoice);
  const [saved, setSaved] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [newBanned, setNewBanned] = useState('');

  const handleSave = () => {
    setBrandVoice(bvState);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const addHashtag = () => {
    if (!newTag.trim()) return;
    const tagFormatted = newTag.startsWith('#') ? newTag : `#${newTag}`;
    setBvState({
      ...bvState,
      approvedHashtags: [...bvState.approvedHashtags, tagFormatted]
    });
    setNewTag('');
  };

  const removeHashtag = (tag: string) => {
    setBvState({
      ...bvState,
      approvedHashtags: bvState.approvedHashtags.filter((t) => t !== tag)
    });
  };

  const addBannedWord = () => {
    if (!newBanned.trim()) return;
    setBvState({
      ...bvState,
      bannedKeywords: [...bvState.bannedKeywords, newBanned.trim()]
    });
    setNewBanned('');
  };

  const removeBannedWord = (word: string) => {
    setBvState({
      ...bvState,
      bannedKeywords: bvState.bannedKeywords.filter((w) => w !== word)
    });
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className={`p-5 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-colors ${
        darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 font-bold tracking-wider">
              BRAND GOVERNANCE
            </span>
          </div>
          <h1 className="text-xl font-extrabold tracking-tight">Brand Workspace & Style Guard</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure tone, writing style guardrails, target audiences, and approved hashtags automatically enforced across Relay AI generation.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 flex items-center gap-2 cursor-pointer transition-all"
        >
          {saved ? <Check className="w-4 h-4 text-emerald-300" /> : <Save className="w-4 h-4" />}
          <span>{saved ? 'Brand Rules Saved!' : 'Save Brand Settings'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Brand Tone & Guardrails */}
        <div className="lg:col-span-6 space-y-4">
          <div className={`p-5 rounded-2xl border space-y-4 ${
            darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <h3 className="text-sm font-bold font-mono">Brand Identity & Tone</h3>

            <div>
              <label className="text-xs text-slate-400 font-semibold block mb-1">Brand Name</label>
              <input
                type="text"
                value={bvState.name}
                onChange={(e) => setBvState({ ...bvState, name: e.target.value })}
                className={`w-full px-3 py-2 text-xs rounded-lg border outline-none ${
                  darkMode ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 font-semibold block mb-1">Primary Brand Voice Tone</label>
              <input
                type="text"
                value={bvState.primaryTone}
                onChange={(e) => setBvState({ ...bvState, primaryTone: e.target.value })}
                className={`w-full px-3 py-2 text-xs rounded-lg border outline-none ${
                  darkMode ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 font-semibold block mb-1">Style Guardrails (Line by line)</label>
              <textarea
                value={bvState.styleGuardrails.join('\n')}
                onChange={(e) => setBvState({ ...bvState, styleGuardrails: e.target.value.split('\n') })}
                className={`w-full h-36 p-3 text-xs rounded-lg border outline-none font-sans leading-relaxed ${
                  darkMode ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Right Column: Hashtags & Banned Phrases */}
        <div className="lg:col-span-6 space-y-4">
          
          {/* Approved Hashtags */}
          <div className={`p-5 rounded-2xl border space-y-3 ${
            darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <h3 className="text-sm font-bold font-mono">Approved Brand Hashtags</h3>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="e.g. #EmpireOS"
                className={`px-3 py-1.5 text-xs rounded-lg border outline-none flex-1 ${
                  darkMode ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-100 border-slate-200 text-slate-900'
                }`}
              />
              <button
                onClick={addHashtag}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Tag
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5 pt-2">
              {bvState.approvedHashtags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs font-mono px-2.5 py-1 rounded-lg bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 flex items-center gap-1"
                >
                  {tag}
                  <button onClick={() => removeHashtag(tag)} className="hover:text-rose-400 ml-1">×</button>
                </span>
              ))}
            </div>
          </div>

          {/* Banned Keywords */}
          <div className={`p-5 rounded-2xl border space-y-3 ${
            darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <h3 className="text-sm font-bold font-mono text-rose-400">Banned Fluff & Banned Phrases</h3>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newBanned}
                onChange={(e) => setNewBanned(e.target.value)}
                placeholder="e.g. synergize, revolutionary magic"
                className={`px-3 py-1.5 text-xs rounded-lg border outline-none flex-1 ${
                  darkMode ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-100 border-slate-200 text-slate-900'
                }`}
              />
              <button
                onClick={addBannedWord}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Ban Word
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5 pt-2">
              {bvState.bannedKeywords.map((word) => (
                <span
                  key={word}
                  className="text-xs font-mono px-2.5 py-1 rounded-lg bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center gap-1"
                >
                  {word}
                  <button onClick={() => removeBannedWord(word)} className="hover:text-white ml-1">×</button>
                </span>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
