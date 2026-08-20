import React, { useState, useEffect } from 'react';
import { 
  GitBranch, 
  GitCommit, 
  GitPullRequest, 
  UploadCloud, 
  DownloadCloud, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  ShieldCheck, 
  Clock, 
  Layers, 
  Cpu, 
  Terminal, 
  ExternalLink,
  Settings,
  ArrowRight,
  FolderGit2
} from 'lucide-react';
import { GitSyncStatus, SyncLatestResult, CheckpointResult, PushResult } from '../../types/gitSync';

export const GitSyncPanel: React.FC = () => {
  const [status, setStatus] = useState<GitSyncStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [commitMessage, setCommitMessage] = useState<string>('Relay feature checkpoint');
  const [selectedAgent, setSelectedAgent] = useState<string>('Google AI Studio (Gemini)');
  const [remoteUrlInput, setRemoteUrlInput] = useState<string>('');
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [actionLogs, setActionLogs] = useState<string[]>([]);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/git-sync/status?agent=${encodeURIComponent(selectedAgent)}`);
      const data = await res.json();
      if (data.success && data.status) {
        setStatus(data.status);
        if (data.status.repositoryUrl && !remoteUrlInput) {
          setRemoteUrlInput(data.status.repositoryUrl);
        }
      }
    } catch (err: any) {
      addLog(`Error fetching status: ${err.message || String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 8000);
    return () => clearInterval(interval);
  }, [selectedAgent]);

  const addLog = (log: string) => {
    const time = new Date().toLocaleTimeString();
    setActionLogs(prev => [`[${time}] ${log}`, ...prev.slice(0, 49)]);
  };

  const handleSyncLatest = async () => {
    try {
      setActionLoading('sync');
      addLog('Initiating SYNC LATEST (fetch + safe rebase + auto-stash)...');
      const res = await fetch('/api/git-sync/sync-latest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rebase: true, autoStash: true })
      });
      const data: SyncLatestResult = await res.json();
      if (data.success) {
        setNotification({ type: 'success', message: data.message });
        addLog(`✓ ${data.message}`);
      } else {
        setNotification({ type: 'error', message: data.message });
        addLog(`✗ Sync Failed: ${data.message}`);
      }
      await fetchStatus();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Sync failed' });
      addLog(`✗ Error during sync: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSaveCheckpoint = async () => {
    if (!commitMessage.trim()) {
      setNotification({ type: 'error', message: 'Please enter a checkpoint commit message.' });
      return;
    }
    try {
      setActionLoading('checkpoint');
      addLog(`Creating checkpoint commit for ${selectedAgent}...`);
      const res = await fetch('/api/git-sync/checkpoint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: commitMessage, agentName: selectedAgent })
      });
      const data: CheckpointResult = await res.json();
      if (data.success) {
        setNotification({ type: 'success', message: data.message });
        addLog(`✓ Checkpoint saved (${data.commitSha?.substring(0, 7)}): ${data.commitMessage}`);
        setCommitMessage('Relay development checkpoint');
      } else {
        setNotification({ type: 'error', message: data.message });
        addLog(`✗ Checkpoint creation failed: ${data.message}`);
      }
      await fetchStatus();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Checkpoint failed' });
      addLog(`✗ Error during checkpoint: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handlePushCheckpoint = async () => {
    try {
      setActionLoading('push');
      addLog('Verifying remote origin before push...');
      const res = await fetch('/api/git-sync/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branch: status?.branch })
      });
      const data: PushResult = await res.json();
      if (data.success) {
        setNotification({ type: 'success', message: data.message });
        addLog(`✓ ${data.message}`);
      } else {
        setNotification({ type: 'error', message: data.message });
        addLog(`✗ Push Rejected/Failed: ${data.message}`);
      }
      await fetchStatus();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Push failed' });
      addLog(`✗ Error during push: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleAgentHandoff = async () => {
    // 1-click sequence: Save Checkpoint then Push
    addLog(`Initiating Agent Handoff Sequence for ${selectedAgent}...`);
    await handleSaveCheckpoint();
    await handlePushCheckpoint();
  };

  const handleSaveConfig = async () => {
    try {
      setActionLoading('config');
      const res = await fetch('/api/git-sync/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remoteUrl: remoteUrlInput, authorName: selectedAgent })
      });
      const data = await res.json();
      if (data.success) {
        setNotification({ type: 'success', message: 'Git remote configuration updated.' });
        addLog(`✓ Remote origin updated to: ${remoteUrlInput}`);
        setShowConfigModal(false);
      }
      await fetchStatus();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Config update failed' });
    } finally {
      setActionLoading(null);
    }
  };

  const getWriteAuthBadge = (authState?: GitSyncStatus['writeAuthState']) => {
    switch (authState) {
      case 'WRITE_AUTHENTICATED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> WRITE AUTHENTICATED
          </span>
        );
      case 'WRITE_AUTH_FAILED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <XCircle className="w-3.5 h-3.5 text-rose-400" /> NATIVE SYNC RECOMMENDED
          </span>
        );
      case 'NATIVE_AI_STUDIO':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> NATIVE AI STUDIO SYNC
          </span>
        );
    }
  };

  const getSyncStateBadge = (syncState: GitSyncStatus['syncState']) => {
    switch (syncState) {
      case 'IN_SYNC':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" /> IN SYNC WITH GITHUB
          </span>
        );
      case 'AHEAD':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30">
            <UploadCloud className="w-3.5 h-3.5" /> AHEAD ({status?.aheadCount} COMMITS)
          </span>
        );
      case 'BEHIND':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30 animate-pulse">
            <DownloadCloud className="w-3.5 h-3.5" /> BEHIND ({status?.behindCount} COMMITS — SYNC NEEDED)
          </span>
        );
      case 'DIVERGED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/30">
            <GitPullRequest className="w-3.5 h-3.5" /> DIVERGED (+{status?.aheadCount} / -{status?.behindCount})
          </span>
        );
      case 'UNCOMMITTED_CHANGES':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <Layers className="w-3.5 h-3.5" /> UNCOMMITTED CHANGES ({status?.workingTree.modified.length + status?.workingTree.untracked.length + status?.workingTree.staged.length} FILES)
          </span>
        );
      case 'CONFLICT':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <AlertTriangle className="w-3.5 h-3.5" /> CONFLICT REQUIRING REVIEW
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-neutral-800 text-neutral-400 border border-neutral-700">
            <Settings className="w-3.5 h-3.5" /> REMOTE UNCONFIGURED
          </span>
        );
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#222834] pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#D97757] to-[#B85D43] text-white shadow-lg shadow-[#D97757]/20">
              <FolderGit2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#F4F1EB] tracking-tight">Bidirectional Git Synchronization</h1>
              <p className="text-xs font-mono text-[#9AA0A6]">GitHub Canonical Source of Truth • Multi-Agent Handoff Engine</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchStatus}
            disabled={loading}
            className="px-3.5 py-2 rounded-lg bg-[#13171F] border border-[#222834] text-xs font-mono text-[#9AA0A6] hover:text-white hover:border-[#D97757] transition-all flex items-center gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Status</span>
          </button>
          <button
            onClick={() => setShowConfigModal(true)}
            className="px-3.5 py-2 rounded-lg bg-[#13171F] border border-[#222834] text-xs font-mono text-[#9AA0A6] hover:text-white hover:border-[#D97757] transition-all flex items-center gap-2"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Remote Settings</span>
          </button>
        </div>
      </div>

      {/* Notification Banner */}
      {notification && (
        <div className={`p-4 rounded-xl text-xs font-mono flex items-center justify-between gap-3 border ${
          notification.type === 'success' ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200' :
          notification.type === 'error' ? 'bg-rose-950/40 border-rose-500/40 text-rose-200' :
          'bg-blue-950/40 border-blue-500/40 text-blue-200'
        }`}>
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-rose-400" />}
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-neutral-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Hosted Workspace Continuity & No-Token Banner */}
      <div className="bg-[#13171F] border border-[#222834] rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <div className="text-sm font-bold text-white flex items-center gap-2">
              <span>Google AI Studio Hosted Workspace Active</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                CONTINUOUS PERSISTENCE
              </span>
            </div>
            <p className="text-xs text-[#9AA0A6] leading-relaxed">
              Work freely on your computer or phone using this same Google AI Studio project. All file changes and SQLite databases persist in this hosted container without requiring a GitHub Personal Access Token.
            </p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <span className="text-[11px] font-mono text-[#D97757] font-semibold bg-[#0B0D11] px-3 py-1.5 rounded-lg border border-[#222834] block">
            GitHub Canonical: mjardin17/relay
          </span>
        </div>
      </div>
      <div className="bg-[#13171F] border border-[#222834] rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#222834]">
          <div className="flex items-center gap-3">
            <GitBranch className="w-5 h-5 text-[#D97757]" />
            <div>
              <span className="text-xs font-mono text-[#9AA0A6] uppercase tracking-wider">Active Branch</span>
              <div className="text-lg font-bold text-white font-mono">{status?.branch || 'main'}</div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {status && getWriteAuthBadge(status.writeAuthState)}
            {status && getSyncStateBadge(status.syncState)}
          </div>
        </div>

        {/* Git Metrics Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Repository URL */}
          <div className="bg-[#0B0D11] border border-[#222834] rounded-xl p-4 space-y-1">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#9AA0A6]">Remote Repository</span>
            <div className="text-xs font-mono text-white truncate" title={status?.repositoryUrl || 'None'}>
              {status?.repositoryUrl || 'Origin not configured'}
            </div>
            <div className="text-[10px] font-mono text-neutral-500">Canonical upstream</div>
          </div>

          {/* Local HEAD */}
          <div className="bg-[#0B0D11] border border-[#222834] rounded-xl p-4 space-y-1">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#9AA0A6]">Local HEAD</span>
            <div className="text-xs font-mono text-emerald-400 font-bold flex items-center gap-1.5">
              <GitCommit className="w-3.5 h-3.5" />
              <span>{status?.localHead ? status.localHead.substring(0, 7) : 'None'}</span>
            </div>
            <div className="text-[10px] font-mono text-neutral-500 truncate" title={status?.localHead || ''}>
              {status?.localHead || 'No commits yet'}
            </div>
          </div>

          {/* Remote HEAD */}
          <div className="bg-[#0B0D11] border border-[#222834] rounded-xl p-4 space-y-1">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#9AA0A6]">Remote HEAD</span>
            <div className="text-xs font-mono text-blue-400 font-bold flex items-center gap-1.5">
              <UploadCloud className="w-3.5 h-3.5" />
              <span>{status?.remoteHead ? status.remoteHead.substring(0, 7) : 'None'}</span>
            </div>
            <div className="text-[10px] font-mono text-neutral-500">
              Ahead: <span className="text-white font-bold">{status?.aheadCount || 0}</span> • Behind: <span className="text-white font-bold">{status?.behindCount || 0}</span>
            </div>
          </div>

          {/* Last Sync Timestamps */}
          <div className="bg-[#0B0D11] border border-[#222834] rounded-xl p-4 space-y-1">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#9AA0A6]">Sync Timestamps</span>
            <div className="text-[11px] font-mono text-neutral-300">
              Sync: <span className="text-white">{status?.lastSuccessfulSyncAt ? new Date(status.lastSuccessfulSyncAt).toLocaleTimeString() : 'Never'}</span>
            </div>
            <div className="text-[11px] font-mono text-neutral-300">
              Push: <span className="text-white">{status?.lastSuccessfulPushAt ? new Date(status.lastSuccessfulPushAt).toLocaleTimeString() : 'Never'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Multi-Agent Handoff Workflow Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Step 1: SYNC LATEST */}
        <div className="bg-[#13171F] border border-[#222834] rounded-2xl p-6 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 rounded bg-[#0B0D11] border border-[#222834] text-[10px] font-mono text-[#D97757] font-bold">
                STEP 1 • BEFORE WORK
              </span>
              <DownloadCloud className="w-5 h-5 text-[#9AA0A6]" />
            </div>
            <h3 className="text-base font-bold text-white">Sync Latest from GitHub</h3>
            <p className="text-xs text-[#9AA0A6] leading-relaxed">
              Fetches latest commits from GitHub origin/main, safely rebases, auto-stashes uncommitted changes, and guarantees you start from canonical truth.
            </p>
          </div>

          <button
            onClick={handleSyncLatest}
            disabled={actionLoading !== null}
            className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-600/20 disabled:opacity-50"
          >
            <DownloadCloud className={`w-4 h-4 ${actionLoading === 'sync' ? 'animate-bounce' : ''}`} />
            <span>{actionLoading === 'sync' ? 'Synchronizing...' : 'Sync Latest from GitHub'}</span>
          </button>
        </div>

        {/* Step 2: SAVE CHECKPOINT */}
        <div className="bg-[#13171F] border border-[#222834] rounded-2xl p-6 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 rounded bg-[#0B0D11] border border-[#222834] text-[10px] font-mono text-[#D97757] font-bold">
                STEP 2 • SAVE WORK
              </span>
              <GitCommit className="w-5 h-5 text-[#9AA0A6]" />
            </div>
            <h3 className="text-base font-bold text-white">Save Local Checkpoint</h3>
            <div className="space-y-2">
              <label className="text-[10px] font-mono uppercase text-[#9AA0A6]">Commit Message</label>
              <input
                type="text"
                value={commitMessage}
                onChange={e => setCommitMessage(e.target.value)}
                placeholder="Describe your coherent task changes..."
                className="w-full px-3 py-2 rounded-lg bg-[#0B0D11] border border-[#222834] text-xs font-mono text-white focus:outline-none focus:border-[#D97757]"
              />
            </div>
          </div>

          <button
            onClick={handleSaveCheckpoint}
            disabled={actionLoading !== null || status?.workingTree.isClean}
            className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-600/20 disabled:opacity-50"
          >
            <GitCommit className={`w-4 h-4 ${actionLoading === 'checkpoint' ? 'animate-spin' : ''}`} />
            <span>{status?.workingTree.isClean ? 'Working Tree Clean' : 'Create Local Checkpoint'}</span>
          </button>
        </div>

        {/* Step 3: PUSH & AGENT HANDOFF */}
        <div className="bg-[#13171F] border border-[#222834] rounded-2xl p-6 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 rounded bg-[#0B0D11] border border-[#222834] text-[10px] font-mono text-[#D97757] font-bold">
                STEP 3 • HANDOFF & PUSH
              </span>
              <UploadCloud className="w-5 h-5 text-[#9AA0A6]" />
            </div>
            <h3 className="text-base font-bold text-white">Push to GitHub Canonical</h3>
            <div className="space-y-2">
              <label className="text-[10px] font-mono uppercase text-[#9AA0A6]">Active Agent Identity</label>
              <select
                value={selectedAgent}
                onChange={e => setSelectedAgent(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#0B0D11] border border-[#222834] text-xs font-mono text-white focus:outline-none focus:border-[#D97757]"
              >
                <option value="Google AI Studio (Gemini)">Google AI Studio (Gemini)</option>
                <option value="Claude / Anthropic">Claude / Anthropic</option>
                <option value="Goose AI">Goose AI</option>
                <option value="Grok">Grok</option>
                <option value="Codex / OpenAI">Codex / OpenAI</option>
                <option value="Human Developer">Human Developer</option>
              </select>
            </div>
            <div className="p-2.5 rounded-lg bg-[#0B0D11] border border-[#222834] text-[11px] font-mono text-neutral-400">
              <div className="flex items-center justify-between text-[10px] text-[#9AA0A6] uppercase mb-1">
                <span>GitHub Integration Mode</span>
                <span className="text-emerald-400 font-bold">
                  Native AI Studio Sync
                </span>
              </div>
              <p className="text-[10px] text-emerald-300">
                Connected to <code>mjardin17/relay</code> (branch: <code>main</code>). Push and pull operations synchronize directly through the Google AI Studio GitHub integration without requiring tokens or terminal credentials.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <button
              onClick={handlePushCheckpoint}
              disabled={actionLoading !== null || !status?.aheadCount}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#D97757] to-[#B85D43] hover:brightness-110 text-white font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#D97757]/20 disabled:opacity-50"
            >
              <UploadCloud className={`w-4 h-4 ${actionLoading === 'push' ? 'animate-bounce' : ''}`} />
              <span>Push Checkpoint to GitHub ({status?.aheadCount || 0} Ahead)</span>
            </button>
            <button
              onClick={handleAgentHandoff}
              disabled={actionLoading !== null}
              className="w-full py-2 px-3 rounded-lg bg-[#0B0D11] border border-[#222834] hover:border-[#D97757] text-[11px] font-mono text-neutral-300 hover:text-white transition-all flex items-center justify-center gap-2"
            >
              <ArrowRight className="w-3 h-3 text-[#D97757]" />
              <span>1-Click Full Agent Handoff (Save + Push)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Working Tree Details & Activity Log */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Working Tree State */}
        <div className="bg-[#13171F] border border-[#222834] rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#222834]">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#D97757]" />
              <h3 className="text-sm font-bold text-white">Working Tree File State</h3>
            </div>
            <span className="text-xs font-mono text-[#9AA0A6]">
              {status?.workingTree.isClean ? 'Clean (0 changes)' : `${(status?.workingTree.modified.length || 0) + (status?.workingTree.untracked.length || 0) + (status?.workingTree.staged.length || 0)} files changed`}
            </span>
          </div>

          <div className="max-h-60 overflow-y-auto space-y-2 pr-2 font-mono text-xs">
            {status?.workingTree.isClean ? (
              <div className="text-neutral-500 py-6 text-center">Working directory clean. All changes committed.</div>
            ) : (
              <>
                {status?.workingTree.staged.map((f, i) => (
                  <div key={`staged-${i}`} className="flex items-center justify-between p-2 rounded bg-emerald-950/20 border border-emerald-500/20 text-emerald-300">
                    <span className="truncate">{f}</span>
                    <span className="text-[10px] uppercase font-bold text-emerald-400">Staged</span>
                  </div>
                ))}
                {status?.workingTree.modified.map((f, i) => (
                  <div key={`mod-${i}`} className="flex items-center justify-between p-2 rounded bg-amber-950/20 border border-amber-500/20 text-amber-300">
                    <span className="truncate">{f}</span>
                    <span className="text-[10px] uppercase font-bold text-amber-400">Modified</span>
                  </div>
                ))}
                {status?.workingTree.untracked.map((f, i) => (
                  <div key={`untrack-${i}`} className="flex items-center justify-between p-2 rounded bg-blue-950/20 border border-blue-500/20 text-blue-300">
                    <span className="truncate">{f}</span>
                    <span className="text-[10px] uppercase font-bold text-blue-400">Untracked</span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Synchronization Telemetry Logs */}
        <div className="bg-[#13171F] border border-[#222834] rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#222834]">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-[#D97757]" />
              <h3 className="text-sm font-bold text-white">Git Sync Telemetry Logs</h3>
            </div>
            <span className="text-[10px] font-mono text-neutral-500">Live Agent Activity</span>
          </div>

          <div className="bg-[#0B0D11] border border-[#222834] rounded-xl p-3 h-60 overflow-y-auto font-mono text-[11px] text-neutral-400 space-y-1">
            {actionLogs.length === 0 ? (
              <div className="text-neutral-600 py-6 text-center">Ready for Git synchronization events...</div>
            ) : (
              actionLogs.map((log, idx) => (
                <div key={idx} className="leading-tight break-all">
                  {log.includes('✓') ? <span className="text-emerald-400">{log}</span> :
                   log.includes('✗') ? <span className="text-rose-400">{log}</span> :
                   log}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Remote Configuration Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#13171F] border border-[#222834] rounded-2xl max-w-lg w-full p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#222834]">
              <h3 className="text-base font-bold text-white">Configure Remote Origin Repository</h3>
              <button onClick={() => setShowConfigModal(false)} className="text-neutral-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-4 font-mono text-xs">
              <div className="space-y-1.5">
                <label className="text-[#9AA0A6]">GitHub Repository Remote URL (HTTPS or SSH)</label>
                <input
                  type="text"
                  value={remoteUrlInput}
                  onChange={e => setRemoteUrlInput(e.target.value)}
                  placeholder="https://github.com/username/relay.git"
                  className="w-full px-3 py-2.5 rounded-lg bg-[#0B0D11] border border-[#222834] text-white focus:outline-none focus:border-[#D97757]"
                />
              </div>

              <div className="p-3 rounded-lg bg-[#0B0D11] border border-[#222834] text-[11px] text-neutral-400 leading-relaxed">
                <strong>Multi-Agent Rule:</strong> GitHub is the canonical single source of truth. Setting this origin enables real-time fetch, rebase, checkpoint commits, and verified pushes across Claude, Gemini, Goose, Grok, and local workstations.
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#222834]">
              <button
                onClick={() => setShowConfigModal(false)}
                className="px-4 py-2 rounded-lg bg-[#0B0D11] border border-[#222834] text-xs font-mono text-neutral-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveConfig}
                disabled={actionLoading === 'config'}
                className="px-5 py-2 rounded-lg bg-[#D97757] hover:bg-[#B85D43] text-white text-xs font-mono font-bold"
              >
                {actionLoading === 'config' ? 'Saving...' : 'Save Remote Config'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
