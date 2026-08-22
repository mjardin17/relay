import React, { useState, useEffect } from 'react';
import {
  Video,
  Film,
  Play,
  Copy,
  Check,
  ExternalLink,
  Upload,
  Sparkles,
  Sliders,
  ShieldCheck,
  AlertCircle,
  Clock,
  Layers,
  ChevronRight,
  Info,
  RefreshCw,
  Plus,
  Lock,
  Eye,
  CheckCircle2,
  FileText,
  Volume2,
  Camera,
  Scissors,
  DollarSign
} from 'lucide-react';
import {
  CommercialFactoryProject,
  CommercialSceneShot,
  MiniMaxReferenceAsset,
  MiniMaxManualTrialPackage,
  MiniMaxCostEstimate,
  MiniMaxPromptStructure,
  VideoResolution,
  VideoAspectRatio,
  MiniMaxGenerationMode
} from '../../types/miniMaxH3';

interface CommercialFactoryStudioProps {
  darkMode: boolean;
  tenantId?: string;
}

export const CommercialFactoryStudio: React.FC<CommercialFactoryStudioProps> = ({
  darkMode,
  tenantId = 'tenant_reis_electric'
}) => {
  // State
  const [projects, setProjects] = useState<CommercialFactoryProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedShotId, setSelectedShotId] = useState<string>('');
  const [referenceAssets, setReferenceAssets] = useState<MiniMaxReferenceAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [activeTab, setActiveTab] = useState<'storyboard' | 'prompt_builder' | 'reference_assets' | 'continuity' | 'timeline'>('storyboard');
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importVideoUrl, setImportVideoUrl] = useState('');
  const [addAssetModalOpen, setAddAssetModalOpen] = useState(false);
  const [newAssetForm, setNewAssetForm] = useState({
    name: '',
    category: 'character_face' as any,
    mediaType: 'image' as const,
    url: '',
    bindingRole: '',
    ownershipDeclaration: 'I confirm ownership or licensed promotional rights for this asset.'
  });

  // Load projects & assets
  const fetchProjectsAndAssets = async () => {
    setLoading(true);
    try {
      const projRes = await fetch(`/api/creative/commercial-factory/projects?tenantId=${tenantId}`);
      const projData = await projRes.json();
      if (projData.success && projData.projects.length > 0) {
        setProjects(projData.projects);
        if (!selectedProjectId || !projData.projects.find((p: any) => p.id === selectedProjectId)) {
          setSelectedProjectId(projData.projects[0].id);
          if (projData.projects[0].shots.length > 0) {
            setSelectedShotId(projData.projects[0].shots[0].shotId);
          }
        }
      }

      const assetRes = await fetch(`/api/creative/minimax/assets?tenantId=${tenantId}`);
      const assetData = await assetRes.json();
      if (assetData.success) {
        setReferenceAssets(assetData.assets);
      }
    } catch (err) {
      console.error('Failed to load commercial factory data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectsAndAssets();
  }, [tenantId]);

  const activeProject = projects.find(p => p.id === selectedProjectId) || projects[0];
  const activeShot = activeProject?.shots.find(s => s.shotId === selectedShotId) || activeProject?.shots[0];

  // Handle Shot Updates
  const handleUpdatePromptSection = async (field: keyof MiniMaxPromptStructure, value: string) => {
    if (!activeProject || !activeShot) return;

    const updatedStructure = {
      ...activeShot.promptStructure,
      [field]: value
    };

    try {
      const res = await fetch('/api/creative/commercial-factory/update-shot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: activeProject.id,
          shotId: activeShot.shotId,
          promptStructure: updatedStructure,
          durationSeconds: activeShot.durationSeconds,
          resolution: activeShot.resolution
        })
      });
      const data = await res.json();
      if (data.success) {
        setProjects(prev => prev.map(p => {
          if (p.id === activeProject.id) {
            return {
              ...p,
              shots: p.shots.map(s => s.shotId === activeShot.shotId ? data.shot : s)
            };
          }
          return p;
        }));
      }
    } catch (err) {
      console.error('Failed to update shot prompt:', err);
    }
  };

  const handleCopyPrompt = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2500);
  };

  const handleImportVideo = async () => {
    if (!activeProject || !activeShot || !importVideoUrl.trim()) return;

    try {
      const res = await fetch('/api/creative/commercial-factory/import-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: activeProject.id,
          shotId: activeShot.shotId,
          videoUrl: importVideoUrl.trim(),
          importedBy: 'operator',
          notes: 'Imported from MiniMax Hailuo manual trial render.'
        })
      });
      const data = await res.json();
      if (data.success) {
        setProjects(prev => prev.map(p => {
          if (p.id === activeProject.id) {
            return {
              ...p,
              shots: p.shots.map(s => s.shotId === activeShot.shotId ? data.shot : s),
              assembledVideoUrl: data.shot.importedVideoUrl
            };
          }
          return p;
        }));
        setImportModalOpen(false);
        setImportVideoUrl('');
      }
    } catch (err) {
      console.error('Failed to import video:', err);
    }
  };

  const handleAddReferenceAsset = async () => {
    if (!newAssetForm.name || !newAssetForm.url) return;

    try {
      const res = await fetch('/api/creative/minimax/assets/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: activeProject?.tenantId || tenantId,
          name: newAssetForm.name,
          category: newAssetForm.category,
          mediaType: newAssetForm.mediaType,
          url: newAssetForm.url,
          bindingRole: newAssetForm.bindingRole || newAssetForm.name,
          ownershipVerified: true,
          ownershipDeclaration: newAssetForm.ownershipDeclaration
        })
      });
      const data = await res.json();
      if (data.success) {
        setReferenceAssets(prev => [...prev, data.asset]);
        setAddAssetModalOpen(false);
        setNewAssetForm({
          name: '',
          category: 'character_face',
          mediaType: 'image',
          url: '',
          bindingRole: '',
          ownershipDeclaration: 'I confirm ownership or licensed promotional rights for this asset.'
        });
      }
    } catch (err) {
      console.error('Failed to add reference asset:', err);
    }
  };

  return (
    <div className={`w-full min-h-screen ${darkMode ? 'bg-[#0B0F19] text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      {/* Top Banner: MiniMax H3 Integration Header */}
      <div className={`border-b ${darkMode ? 'border-slate-800 bg-[#0E1322]' : 'border-slate-200 bg-white'} px-6 py-4`}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-600/30 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight">Commercial Factory & Video Studio</h1>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  MiniMax-H3
                </span>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Manual Trial (Zero Key)
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Multi-shot video commercial engine with prompt engineering, character continuity manifests, and direct Hailuo trial sync.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Project Selector */}
            <select
              value={selectedProjectId}
              onChange={(e) => {
                setSelectedProjectId(e.target.value);
                const proj = projects.find(p => p.id === e.target.value);
                if (proj && proj.shots.length > 0) setSelectedShotId(proj.shots[0].shotId);
              }}
              className={`text-xs rounded-lg px-3 py-2 border font-medium ${
                darkMode ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-slate-100 border-slate-300 text-slate-800'
              }`}
            >
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.title} ({p.commercialType.replace(/_/g, ' ')})</option>
              ))}
            </select>

            <a
              href="https://hailuoai.video/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-gradient-to-r from-amber-600 to-orange-600 text-white hover:from-amber-500 hover:to-orange-500 transition-all shadow-sm"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open Hailuo MiniMax Trial
            </a>
          </div>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="max-w-7xl mx-auto mt-4 flex items-center gap-2 border-t border-slate-800/60 pt-3">
          {[
            { id: 'storyboard', label: 'Commercial Storyboard & Shots', icon: Layers },
            { id: 'prompt_builder', label: 'MiniMax H3 Prompt Builder', icon: FileText },
            { id: 'reference_assets', label: `Reference Assets (${referenceAssets.length})`, icon: Camera },
            { id: 'continuity', label: 'Continuity Manifest', icon: ShieldCheck },
            { id: 'timeline', label: 'Assembly & Preview', icon: Play }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Pricing Transparency & Safety Notice */}
        <div className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-3 ${
          darkMode ? 'bg-[#0E1528] border-slate-800' : 'bg-amber-50/50 border-amber-200'
        }`}>
          <div className="flex items-start gap-3">
            <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-0.5">
              <span className="font-semibold text-slate-200">MiniMax H3 Execution & Billing Transparency:</span>
              <p className="text-slate-400">
                Manual browser handoff causes no Relay API charge. Hailuo availability, trial credits, subscriptions, and external charges are controlled by MiniMax and may vary. Official API billing: <strong className="text-amber-400">$0.08/s (768p)</strong> and <strong className="text-amber-400">$0.13/s (2K)</strong>. Relay never charges without explicit human confirmation.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href="https://github.com/MiniMax-AI/MiniMax-H3"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-slate-400 hover:text-amber-400 underline flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3" /> Official Prompt Docs
            </a>
          </div>
        </div>

        {/* TAB 1: STORYBOARD & SHOTS */}
        {activeTab === 'storyboard' && activeProject && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Shot List */}
            <div className="lg:col-span-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold tracking-tight">Commercial Shots ({activeProject.shots.length})</h3>
                <span className="text-xs text-slate-400 font-mono">Total: {activeProject.totalDurationSeconds}s</span>
              </div>

              {activeProject.shots.map((shot, idx) => {
                const isSelected = shot.shotId === selectedShotId;
                return (
                  <div
                    key={shot.shotId}
                    onClick={() => setSelectedShotId(shot.shotId)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-amber-500/60 bg-amber-500/10 shadow-sm'
                        : darkMode
                        ? 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-md bg-amber-500/20 text-amber-400 font-mono text-xs font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <h4 className="text-xs font-semibold">{shot.title}</h4>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        shot.status === 'IMPORTED'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      }`}>
                        {shot.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 mt-2 line-clamp-2">{shot.storyboardDescription}</p>

                    <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                      <span>{shot.durationSeconds}s • {shot.resolution} • {shot.aspectRatio}</span>
                      <span className="text-amber-400 font-semibold">${shot.costEstimate.totalEstimatedCostUsd.toFixed(2)} USD</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right: Active Shot Inspector & Manual Trial Action Box */}
            {activeShot && (
              <div className="lg:col-span-7 space-y-4">
                <div className={`p-5 rounded-xl border ${darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'} space-y-4`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-amber-400 font-bold">Shot #{activeShot.shotNumber}</span>
                        <h3 className="text-sm font-bold">{activeShot.title}</h3>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{activeShot.storyboardDescription}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCopyPrompt(activeShot.composedPrompt)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 transition-all"
                      >
                        {copiedPrompt ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedPrompt ? 'Copied to Clipboard' : 'Copy Prompt'}
                      </button>

                      <button
                        onClick={() => setImportModalOpen(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500 transition-all"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        Import Video
                      </button>
                    </div>
                  </div>

                  {/* Manual Trial Workflow Steps */}
                  <div className={`p-4 rounded-lg border ${darkMode ? 'bg-[#080D1A] border-slate-800' : 'bg-slate-50 border-slate-200'} space-y-2.5`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                        Manual Trial Execution Checklist (Zero API Billing)
                      </span>
                      <a
                        href="https://hailuoai.video/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-amber-400 hover:underline flex items-center gap-1"
                      >
                        Open Hailuo Studio <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <ol className="text-xs text-slate-400 space-y-1.5 list-decimal list-inside">
                      <li>Click <strong className="text-amber-300">"Copy Prompt"</strong> above to copy the MiniMax H3 formatted prompt.</li>
                      <li>Open <strong className="text-amber-300">Hailuo AI Video</strong> in a separate browser tab.</li>
                      <li>Select duration: <strong className="text-slate-200">{activeShot.durationSeconds}s</strong>, Resolution: <strong className="text-slate-200">{activeShot.resolution}</strong>.</li>
                      <li>Upload character/environment reference images as listed below.</li>
                      <li>Once rendered on Hailuo, copy the video URL or download MP4, and click <strong className="text-indigo-400">"Import Video"</strong>.</li>
                    </ol>
                  </div>

                  {/* Composed Prompt Preview */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold font-mono uppercase text-slate-400">
                        Official MiniMax H3 Structured Prompt ({activeShot.composedPrompt.length} / 2000 chars)
                      </label>
                      <button
                        onClick={() => setActiveTab('prompt_builder')}
                        className="text-xs text-amber-400 hover:underline"
                      >
                        Edit Structure & Audio
                      </button>
                    </div>
                    <div className={`p-3 rounded-lg font-mono text-xs max-h-48 overflow-y-auto whitespace-pre-wrap border ${
                      darkMode ? 'bg-[#050811] border-slate-800 text-slate-300' : 'bg-slate-100 border-slate-300 text-slate-800'
                    }`}>
                      {activeShot.composedPrompt}
                    </div>
                  </div>

                  {/* Reference Upload Order Checklist */}
                  {activeShot.trialPackage && activeShot.trialPackage.referenceUploadChecklist.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold font-mono uppercase text-slate-400">
                        Reference Files Upload Order ({activeShot.trialPackage.referenceUploadChecklist.length})
                      </h4>
                      <div className="space-y-1.5">
                        {activeShot.trialPackage.referenceUploadChecklist.map((item) => (
                          <div
                            key={item.order}
                            className={`p-2.5 rounded-lg border flex items-center justify-between text-xs ${
                              darkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="w-5 h-5 rounded bg-amber-500/20 text-amber-400 font-mono text-[10px] font-bold flex items-center justify-center">
                                #{item.order}
                              </span>
                              <div>
                                <span className="font-semibold text-slate-200">{item.assetName}</span>
                                <span className="text-[11px] text-slate-400 ml-2">({item.category.replace(/_/g, ' ')})</span>
                              </div>
                            </div>
                            <span className="text-[10px] font-mono bg-slate-800 px-2 py-0.5 rounded text-slate-400">
                              {item.assetType}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Imported Video Preview If Present */}
                  {activeShot.importedVideoUrl && (
                    <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 space-y-2">
                      <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                        <CheckCircle2 className="w-4 h-4" /> Video Render Attached & Verified
                      </div>
                      <p className="text-xs font-mono text-slate-300 truncate">{activeShot.importedVideoUrl}</p>
                      <span className="text-[10px] text-slate-400 font-mono">Audit Ref: {activeShot.lastAuditRef}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PROMPT BUILDER */}
        {activeTab === 'prompt_builder' && activeShot && (
          <div className={`p-6 rounded-xl border ${darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'} space-y-6`}>
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold">MiniMax H3 Structured Prompt Editor</h3>
                <p className="text-xs text-slate-400">
                  Direct mapping to official GitHub prompt categories. Updates regenerate prompt and recalculate cost dynamically.
                </p>
              </div>
              <button
                onClick={() => handleCopyPrompt(activeShot.composedPrompt)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 transition-all"
              >
                {copiedPrompt ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                Copy Full Prompt
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Subject & Identity */}
              <div className="space-y-1">
                <label className="font-bold text-slate-300">1. Subject & Identity</label>
                <textarea
                  value={activeShot.promptStructure.subjectAndIdentity || ''}
                  onChange={(e) => handleUpdatePromptSection('subjectAndIdentity', e.target.value)}
                  rows={2}
                  className={`w-full rounded-lg p-2.5 border ${
                    darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-300'
                  }`}
                  placeholder="Master Electrician in clean navy uniform..."
                />
              </div>

              {/* Action & Performance */}
              <div className="space-y-1">
                <label className="font-bold text-slate-300">2. Action, Performance & Motion</label>
                <textarea
                  value={activeShot.promptStructure.actionAndPerformance || ''}
                  onChange={(e) => handleUpdatePromptSection('actionAndPerformance', e.target.value)}
                  rows={2}
                  className={`w-full rounded-lg p-2.5 border ${
                    darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-300'
                  }`}
                  placeholder="Carefully testing circuit breaker with digital multimeter..."
                />
              </div>

              {/* Environment */}
              <div className="space-y-1">
                <label className="font-bold text-slate-300">3. Environment & Setting</label>
                <textarea
                  value={activeShot.promptStructure.environmentAndSetting || ''}
                  onChange={(e) => handleUpdatePromptSection('environmentAndSetting', e.target.value)}
                  rows={2}
                  className={`w-full rounded-lg p-2.5 border ${
                    darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-300'
                  }`}
                  placeholder="Immaculate modern residential mechanical room with copper pipes..."
                />
              </div>

              {/* Camera & Lens */}
              <div className="space-y-1">
                <label className="font-bold text-slate-300">4. Camera Movement & Lens</label>
                <textarea
                  value={activeShot.promptStructure.cameraMovement || ''}
                  onChange={(e) => handleUpdatePromptSection('cameraMovement', e.target.value)}
                  rows={2}
                  className={`w-full rounded-lg p-2.5 border ${
                    darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-300'
                  }`}
                  placeholder="Smooth slow push-in tracking shot, 50mm anamorphic lens..."
                />
              </div>

              {/* Lighting & Visual Style */}
              <div className="space-y-1">
                <label className="font-bold text-slate-300">5. Lighting & Visual Style</label>
                <textarea
                  value={activeShot.promptStructure.lightingAndAtmosphere || ''}
                  onChange={(e) => handleUpdatePromptSection('lightingAndAtmosphere', e.target.value)}
                  rows={2}
                  className={`w-full rounded-lg p-2.5 border ${
                    darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-300'
                  }`}
                  placeholder="High-contrast warm tungsten highlights with clean neutral key..."
                />
              </div>

              {/* Native Audio & Dialogue */}
              <div className="space-y-1">
                <label className="font-bold text-slate-300">6. Dialogue & Synchronized Audio</label>
                <textarea
                  value={activeShot.promptStructure.dialogue || ''}
                  onChange={(e) => handleUpdatePromptSection('dialogue', e.target.value)}
                  rows={2}
                  className={`w-full rounded-lg p-2.5 border ${
                    darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-300'
                  }`}
                  placeholder="Exact dialogue to speak in quotes..."
                />
              </div>
            </div>

            <div className="border-t border-slate-800 pt-4 flex items-center justify-between">
              <span className="text-xs text-slate-400 font-mono">
                Total Character Count: {activeShot.composedPrompt.length} / 2000
              </span>
              <button
                onClick={() => setActiveTab('storyboard')}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-amber-500 text-slate-950 hover:bg-amber-400 transition-all font-bold"
              >
                Back to Storyboard
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: REFERENCE ASSETS */}
        {activeTab === 'reference_assets' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold">Tenant-Isolated Reference Asset Library</h3>
                <p className="text-xs text-slate-400">
                  Pre-cleared character portraits, product photos, brand badges, and audio profiles with verified ownership.
                </p>
              </div>
              <button
                onClick={() => setAddAssetModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                Register Reference Asset
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {referenceAssets.map(asset => (
                <div
                  key={asset.id}
                  className={`p-4 rounded-xl border space-y-3 ${
                    darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {asset.category.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> Ownership Verified
                    </span>
                  </div>

                  {asset.mediaType === 'image' ? (
                    <div className="h-32 w-full rounded-lg bg-slate-950 overflow-hidden border border-slate-800">
                      <img src={asset.url} alt={asset.name} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="h-32 w-full rounded-lg bg-slate-950 flex flex-col items-center justify-center border border-slate-800 text-slate-400">
                      <Volume2 className="w-8 h-8 text-amber-400 mb-2" />
                      <span className="text-xs font-mono">{asset.durationSeconds || 10}s Audio Profile</span>
                    </div>
                  )}

                  <div>
                    <h4 className="text-xs font-bold text-slate-200">{asset.name}</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">Role: {asset.bindingRole}</p>
                  </div>

                  <p className="text-[10px] text-slate-500 italic border-t border-slate-800 pt-2">
                    "{asset.ownershipDeclaration}"
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: CONTINUITY MANIFEST */}
        {activeTab === 'continuity' && activeProject && (
          <div className={`p-6 rounded-xl border ${darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'} space-y-4`}>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold">Commercial Continuity Manifest</h3>
                <p className="text-xs text-slate-400">
                  Enforces character, wardrobe, lighting, and soundscape invariants across multi-scene cuts.
                </p>
              </div>
              <span className="text-xs font-mono bg-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded border border-emerald-500/30 font-bold">
                Lock Active
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-lg border border-slate-800 bg-slate-950 space-y-1">
                <span className="font-bold text-slate-400">Lead Character Identity Lock</span>
                <p className="text-slate-200 font-semibold">{activeProject.continuityManifest.leadCharacterIdentity}</p>
              </div>

              <div className="p-3 rounded-lg border border-slate-800 bg-slate-950 space-y-1">
                <span className="font-bold text-slate-400">Wardrobe & Gear Lock</span>
                <p className="text-slate-200 font-semibold">{activeProject.continuityManifest.characterWardrobe}</p>
              </div>

              <div className="p-3 rounded-lg border border-slate-800 bg-slate-950 space-y-1">
                <span className="font-bold text-slate-400">Brand Color Palette Tokens</span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {activeProject.continuityManifest.brandPaletteTokens.map(tok => (
                    <span key={tok} className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 font-mono text-[10px] border border-slate-800">
                      {tok}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-lg border border-slate-800 bg-slate-950 space-y-1">
                <span className="font-bold text-slate-400">Lighting & Atmosphere Tone</span>
                <p className="text-slate-200 font-semibold">{activeProject.continuityManifest.lightingTone}</p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: TIMELINE & ASSEMBLY */}
        {activeTab === 'timeline' && activeProject && (
          <div className={`p-6 rounded-xl border ${darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'} space-y-6`}>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold">Multi-Shot Commercial Timeline & Assembly</h3>
                <p className="text-xs text-slate-400">
                  Sequential timeline of {activeProject.shots.length} shots ({activeProject.totalDurationSeconds}s total duration).
                </p>
              </div>
              <span className={`px-2.5 py-1 rounded text-xs font-mono font-bold ${
                activeProject.overallStatus === 'ASSEMBLED'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              }`}>
                Status: {activeProject.overallStatus}
              </span>
            </div>

            {/* Timeline Graphic Bar */}
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-950 space-y-3">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span>00:00</span>
                <span>{activeProject.totalDurationSeconds}s Commercial Timeline</span>
                <span>00:{activeProject.totalDurationSeconds}</span>
              </div>

              <div className="grid grid-cols-5 gap-2">
                {activeProject.shots.map((shot, idx) => (
                  <div
                    key={shot.shotId}
                    className={`p-3 rounded-lg border text-center space-y-1 ${
                      shot.status === 'IMPORTED'
                        ? 'border-emerald-500/40 bg-emerald-500/10'
                        : 'border-slate-800 bg-slate-900'
                    }`}
                  >
                    <span className="text-[10px] font-mono text-amber-400 font-bold">Shot #{idx + 1} ({shot.durationSeconds}s)</span>
                    <p className="text-[11px] font-semibold text-slate-200 truncate">{shot.title}</p>
                    <span className="text-[10px] font-mono block text-slate-400">{shot.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL: Import Completed Video */}
      {importModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`max-w-md w-full rounded-2xl border p-6 space-y-4 shadow-2xl ${
            darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Upload className="w-4 h-4 text-amber-400" /> Import Video from Hailuo Trial
              </h3>
              <button
                onClick={() => setImportModalOpen(false)}
                className="text-xs text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Paste the public URL or cloud path of the completed video render from MiniMax Hailuo.
            </p>

            <div className="space-y-1 text-xs">
              <label className="font-bold text-slate-300">Video URL / MP4 Link</label>
              <input
                type="text"
                value={importVideoUrl}
                onChange={(e) => setImportVideoUrl(e.target.value)}
                placeholder="https://assets.relay.local/videos/shot_1_reis_electric.mp4"
                className={`w-full rounded-lg px-3 py-2 border font-mono ${
                  darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-300'
                }`}
              />
            </div>

            <div className="flex items-center gap-2 justify-end pt-2">
              <button
                onClick={() => setImportModalOpen(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleImportVideo}
                disabled={!importVideoUrl.trim()}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 disabled:opacity-50 transition-all"
              >
                Confirm Video Import
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Add Reference Asset */}
      {addAssetModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`max-w-md w-full rounded-2xl border p-6 space-y-4 shadow-2xl ${
            darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Camera className="w-4 h-4 text-amber-400" /> Register Reference Asset
              </h3>
              <button onClick={() => setAddAssetModalOpen(false)} className="text-xs text-slate-400 hover:text-slate-200">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-300">Asset Name</label>
                <input
                  type="text"
                  value={newAssetForm.name}
                  onChange={(e) => setNewAssetForm({ ...newAssetForm, name: e.target.value })}
                  placeholder="Master Electrician Face Lock"
                  className={`w-full rounded-lg px-3 py-2 border mt-1 ${
                    darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-300'
                  }`}
                />
              </div>

              <div>
                <label className="font-bold text-slate-300">Category</label>
                <select
                  value={newAssetForm.category}
                  onChange={(e) => setNewAssetForm({ ...newAssetForm, category: e.target.value as any })}
                  className={`w-full rounded-lg px-3 py-2 border mt-1 ${
                    darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-300'
                  }`}
                >
                  <option value="character_face">Character Face</option>
                  <option value="character_turnaround">Character 360 Turnaround</option>
                  <option value="wardrobe">Wardrobe & Uniform</option>
                  <option value="product_photo">Product Photo</option>
                  <option value="brand_logo">Brand Logo</option>
                  <option value="location_environment">Location & Environment</option>
                  <option value="voice_sample">Voice Profile Sample</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-300">Asset Media URL</label>
                <input
                  type="text"
                  value={newAssetForm.url}
                  onChange={(e) => setNewAssetForm({ ...newAssetForm, url: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                  className={`w-full rounded-lg px-3 py-2 border mt-1 font-mono ${
                    darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-300'
                  }`}
                />
              </div>

              <div>
                <label className="font-bold text-slate-300">Ownership Declaration</label>
                <input
                  type="text"
                  value={newAssetForm.ownershipDeclaration}
                  onChange={(e) => setNewAssetForm({ ...newAssetForm, ownershipDeclaration: e.target.value })}
                  className={`w-full rounded-lg px-3 py-2 border mt-1 ${
                    darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-300'
                  }`}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 justify-end pt-2">
              <button
                onClick={() => setAddAssetModalOpen(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleAddReferenceAsset}
                disabled={!newAssetForm.name || !newAssetForm.url}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 disabled:opacity-50 transition-all"
              >
                Register Asset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
