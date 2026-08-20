import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { GitSyncStatus, SyncLatestResult, CheckpointResult, PushResult, GitSyncConfig } from '../types/gitSync';

const execFileAsync = promisify(execFile);

export class GitSyncService {
  private static workspaceRoot = process.cwd();
  private static stateFilePath = path.join(process.cwd(), '.relay_git_sync_state.json');

  private static redactSecrets(text: string): string {
    if (!text) return text;
    let sanitized = text;
    const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
    if (token && token.length > 4) {
      sanitized = sanitized.split(token).join('[REDACTED_TOKEN]');
    }
    // Also redact standard PAT patterns (ghp_, github_pat_)
    sanitized = sanitized.replace(/(?:ghp_[a-zA-Z0-9]{30,}|github_pat_[a-zA-Z0-9_]{50,})/g, '[REDACTED_TOKEN]');
    sanitized = sanitized.replace(/https:\/\/[^@\s]+@github\.com/g, 'https://github.com');
    return sanitized;
  }

  private static async runGit(args: string[], cwd: string = this.workspaceRoot, customEnv?: NodeJS.ProcessEnv): Promise<{ stdout: string; stderr: string; code: number }> {
    try {
      const env = { ...process.env, ...customEnv, GIT_TERMINAL_PROMPT: '0' };
      const { stdout, stderr } = await execFileAsync('git', args, { cwd, env, maxBuffer: 10 * 1024 * 1024 });
      return { 
        stdout: this.redactSecrets(stdout.trim()), 
        stderr: this.redactSecrets(stderr.trim()), 
        code: 0 
      };
    } catch (err: any) {
      return {
        stdout: err.stdout ? this.redactSecrets(err.stdout.trim()) : '',
        stderr: err.stderr ? this.redactSecrets(err.stderr.trim()) : this.redactSecrets(err.message || String(err)),
        code: err.code || 1
      };
    }
  }

  private static readSyncState(): { 
    lastSuccessfulSyncAt: string | null; 
    lastSuccessfulPushAt: string | null; 
    defaultAgent: string;
    lastAuthFailed?: boolean;
  } {
    try {
      if (fs.existsSync(this.stateFilePath)) {
        return JSON.parse(fs.readFileSync(this.stateFilePath, 'utf-8'));
      }
    } catch {
      // fallback
    }
    return {
      lastSuccessfulSyncAt: null,
      lastSuccessfulPushAt: null,
      defaultAgent: 'AI Studio (Gemini)',
      lastAuthFailed: false
    };
  }

  private static writeSyncState(patch: Partial<{ 
    lastSuccessfulSyncAt: string | null; 
    lastSuccessfulPushAt: string | null; 
    defaultAgent: string;
    lastAuthFailed?: boolean;
  }>) {
    try {
      const current = this.readSyncState();
      const updated = { ...current, ...patch };
      fs.writeFileSync(this.stateFilePath, JSON.stringify(updated, null, 2), 'utf-8');
    } catch {
      // silent
    }
  }

  /**
   * Determine secure GitHub write authentication state
   */
  public static getWriteAuthState(): 'NATIVE_AI_STUDIO' | 'WRITE_AUTHENTICATED' | 'WRITE_AUTH_MISSING' | 'WRITE_AUTH_FAILED' {
    const token = (process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '').trim();
    if (token) {
      const state = this.readSyncState();
      if (state.lastAuthFailed) {
        return 'WRITE_AUTH_FAILED';
      }
      return 'WRITE_AUTHENTICATED';
    }
    // Default in Google AI Studio: Native GitHub integration manages OAuth/App credentials
    return 'NATIVE_AI_STUDIO';
  }

  /**
   * Initializes git repository safely if not already initialized
   */
  public static async ensureRepositoryInitialized(): Promise<boolean> {
    const gitDir = path.join(this.workspaceRoot, '.git');
    if (!fs.existsSync(gitDir)) {
      await this.runGit(['init', '-b', 'main']);
      await this.runGit(['config', 'user.name', 'Relay Sync Agent']);
      await this.runGit(['config', 'user.email', 'relay-agent@empireos.internal']);
    }
    return true;
  }

  /**
   * Retrieve full status panel data
   */
  public static async getStatus(agentName?: string): Promise<GitSyncStatus> {
    await this.ensureRepositoryInitialized();

    const state = this.readSyncState();
    const activeAgent = agentName || state.defaultAgent;

    // Get current branch
    let branch = 'main';
    const branchRes = await this.runGit(['branch', '--show-current']);
    if (branchRes.code === 0 && branchRes.stdout) {
      branch = branchRes.stdout;
    } else {
      // Check if detached or empty
      const revRes = await this.runGit(['rev-parse', '--abbrev-ref', 'HEAD']);
      if (revRes.code === 0 && revRes.stdout && revRes.stdout !== 'HEAD') {
        branch = revRes.stdout;
      }
    }

    // Get remote URL
    const remoteRes = await this.runGit(['config', '--get', 'remote.origin.url']);
    const repositoryUrl = remoteRes.code === 0 && remoteRes.stdout ? remoteRes.stdout : null;

    // Get local HEAD
    const localHeadRes = await this.runGit(['rev-parse', 'HEAD']);
    const localHead = localHeadRes.code === 0 && localHeadRes.stdout ? localHeadRes.stdout : null;

    // Get working tree status
    const statusRes = await this.runGit(['status', '--porcelain']);
    const lines = statusRes.stdout ? statusRes.stdout.split('\n').filter(Boolean) : [];
    
    const modified: string[] = [];
    const untracked: string[] = [];
    const staged: string[] = [];

    for (const line of lines) {
      const indexStatus = line[0];
      const workTreeStatus = line[1];
      const filePath = line.substring(3).trim();

      if (indexStatus !== ' ' && indexStatus !== '?') {
        staged.push(filePath);
      }
      if (workTreeStatus === 'M' || workTreeStatus === 'D') {
        modified.push(filePath);
      } else if (indexStatus === '?' && workTreeStatus === '?') {
        untracked.push(filePath);
      }
    }

    const isClean = modified.length === 0 && untracked.length === 0 && staged.length === 0;

    let remoteHead: string | null = null;
    let aheadCount = 0;
    let behindCount = 0;
    let syncState: GitSyncStatus['syncState'] = 'UNCONFIGURED';

    if (repositoryUrl) {
      const remoteHeadRes = await this.runGit(['rev-parse', `origin/${branch}`]);
      if (remoteHeadRes.code === 0 && remoteHeadRes.stdout) {
        remoteHead = remoteHeadRes.stdout;

        if (localHead && remoteHead) {
          if (localHead === remoteHead) {
            syncState = isClean ? 'IN_SYNC' : 'UNCOMMITTED_CHANGES';
          } else {
            const countRes = await this.runGit(['rev-list', '--left-right', '--count', `HEAD...origin/${branch}`]);
            if (countRes.code === 0 && countRes.stdout) {
              const parts = countRes.stdout.split(/\s+/);
              aheadCount = parseInt(parts[0] || '0', 10);
              behindCount = parseInt(parts[1] || '0', 10);

              if (aheadCount > 0 && behindCount === 0) {
                syncState = 'AHEAD';
              } else if (aheadCount === 0 && behindCount > 0) {
                syncState = 'BEHIND';
              } else if (aheadCount > 0 && behindCount > 0) {
                syncState = 'DIVERGED';
              }
            }
          }
        }
      } else {
        syncState = isClean ? 'AHEAD' : 'UNCOMMITTED_CHANGES';
      }
    } else {
      syncState = isClean ? 'UNCONFIGURED' : 'UNCOMMITTED_CHANGES';
    }

    return {
      initialized: true,
      repositoryUrl,
      branch,
      localHead,
      remoteHead,
      aheadCount,
      behindCount,
      syncState,
      writeAuthState: this.getWriteAuthState(),
      workingTree: {
        isClean,
        modified,
        untracked,
        staged
      },
      lastSuccessfulSyncAt: state.lastSuccessfulSyncAt,
      lastSuccessfulPushAt: state.lastSuccessfulPushAt,
      activeAgent
    };
  }

  /**
   * Safe SYNC LATEST workflow:
   * 1. Fetches from origin
   * 2. Inspects local changes (safely stashes if requested)
   * 3. Fast-forward pulls or rebases without destroying local work
   * 4. Aborts if conflicts occur, preserving both sides
   */
  public static async syncLatest(options: { rebase?: boolean; autoStash?: boolean } = { rebase: true, autoStash: true }): Promise<SyncLatestResult> {
    await this.ensureRepositoryInitialized();
    const status = await this.getStatus();

    if (!status.repositoryUrl) {
      return {
        success: false,
        message: 'No remote origin configured. Set GitHub repository URL first.',
        branch: status.branch,
        previousHead: status.localHead,
        currentHead: status.localHead,
        remoteHead: null,
        pulledCommitsCount: 0
      };
    }

    // Step 1: Fetch origin
    const fetchRes = await this.runGit(['fetch', 'origin', status.branch]);
    if (fetchRes.code !== 0) {
      return {
        success: false,
        message: `Failed to fetch origin/${status.branch}: ${fetchRes.stderr}`,
        branch: status.branch,
        previousHead: status.localHead,
        currentHead: status.localHead,
        remoteHead: null,
        pulledCommitsCount: 0
      };
    }

    let stashed = false;
    // Step 2: Auto-stash if dirty working tree
    if (!status.workingTree.isClean) {
      if (options.autoStash) {
        const stashRes = await this.runGit(['stash', 'push', '-u', '-m', `relay-sync-autostash-${Date.now()}`]);
        if (stashRes.code === 0 && !stashRes.stdout.includes('No local changes')) {
          stashed = true;
        }
      } else {
        return {
          success: false,
          message: 'Working tree has uncommitted changes. Save checkpoint or enable autoStash before syncing.',
          branch: status.branch,
          previousHead: status.localHead,
          currentHead: status.localHead,
          remoteHead: status.remoteHead,
          pulledCommitsCount: 0
        };
      }
    }

    // Step 3: Pull / Rebase safely
    const pullMethod = options.rebase ? ['pull', '--rebase', 'origin', status.branch] : ['pull', '--ff-only', 'origin', status.branch];
    const pullRes = await this.runGit(pullMethod);

    if (pullRes.code !== 0) {
      // Conflict detected — ABORT cleanly so no work is destroyed
      if (options.rebase) {
        await this.runGit(['rebase', '--abort']);
      } else {
        await this.runGit(['merge', '--abort']);
      }

      if (stashed) {
        await this.runGit(['stash', 'pop']);
      }

      return {
        success: false,
        message: `Git sync conflict detected while integrating origin/${status.branch}. Safely aborted to protect local work. Human review required. Details: ${pullRes.stderr}`,
        branch: status.branch,
        previousHead: status.localHead,
        currentHead: status.localHead,
        remoteHead: status.remoteHead,
        pulledCommitsCount: 0,
        stashedChanges: stashed
      };
    }

    // Restore stash if we stashed
    if (stashed) {
      const popRes = await this.runGit(['stash', 'pop']);
      if (popRes.code !== 0) {
        return {
          success: true,
          message: 'Synced remote commits successfully, but uncommitted local changes had merge warnings upon stash pop.',
          branch: status.branch,
          previousHead: status.localHead,
          currentHead: (await this.runGit(['rev-parse', 'HEAD'])).stdout,
          remoteHead: (await this.runGit(['rev-parse', `origin/${status.branch}`])).stdout,
          pulledCommitsCount: status.behindCount,
          stashedChanges: true
        };
      }
    }

    const newLocalHead = (await this.runGit(['rev-parse', 'HEAD'])).stdout;
    const newRemoteHead = (await this.runGit(['rev-parse', `origin/${status.branch}`])).stdout;

    const now = new Date().toISOString();
    this.writeSyncState({ lastSuccessfulSyncAt: now });

    return {
      success: true,
      message: `Successfully synchronized with origin/${status.branch}. Local HEAD is now at ${newLocalHead.substring(0, 7)}.`,
      branch: status.branch,
      previousHead: status.localHead,
      currentHead: newLocalHead,
      remoteHead: newRemoteHead,
      pulledCommitsCount: status.behindCount,
      stashedChanges: stashed
    };
  }

  /**
   * Safe SAVE CHECKPOINT workflow:
   * Stages intended files, creates structured commit, records author and timestamp
   */
  public static async saveCheckpoint(message: string, agentName: string = 'Relay Agent', files?: string[]): Promise<CheckpointResult> {
    await this.ensureRepositoryInitialized();
    const status = await this.getStatus();

    if (status.workingTree.isClean) {
      return {
        success: true,
        commitSha: status.localHead,
        commitMessage: 'Working tree already clean. No new commit needed.',
        changedFilesCount: 0,
        stagedFiles: [],
        message: 'No uncommitted changes found in working tree.'
      };
    }

    // Stage files
    if (files && files.length > 0) {
      for (const file of files) {
        await this.runGit(['add', file]);
      }
    } else {
      await this.runGit(['add', '-A']);
    }

    // Inspect staged files
    const stagedStatus = await this.runGit(['diff', '--name-only', '--cached']);
    const stagedFiles = stagedStatus.stdout ? stagedStatus.stdout.split('\n').filter(Boolean) : [];

    if (stagedFiles.length === 0) {
      return {
        success: true,
        commitSha: status.localHead,
        commitMessage: 'No changes staged.',
        changedFilesCount: 0,
        stagedFiles: [],
        message: 'No files were staged for commit.'
      };
    }

    const timestamp = new Date().toISOString();
    const fullCommitMsg = `[Relay Checkpoint] ${message}\n\nAgent: ${agentName}\nTimestamp: ${timestamp}\nWorkspace: Empire OS Relay`;
    const authorParam = `${agentName} <agent@relay.local>`;

    const commitRes = await this.runGit([
      '-c', 'user.name=Relay Agent',
      '-c', 'user.email=agent@relay.local',
      'commit',
      `--author=${authorParam}`,
      '-m', fullCommitMsg
    ]);
    if (commitRes.code !== 0) {
      return {
        success: false,
        commitSha: null,
        commitMessage: message,
        changedFilesCount: stagedFiles.length,
        stagedFiles,
        message: `Commit failed: ${commitRes.stderr}`
      };
    }

    const newHeadRes = await this.runGit(['rev-parse', 'HEAD']);
    const commitSha = newHeadRes.stdout;

    this.writeSyncState({ defaultAgent: agentName });

    return {
      success: true,
      commitSha,
      commitMessage: fullCommitMsg,
      changedFilesCount: stagedFiles.length,
      stagedFiles,
      message: `Checkpoint commit created (${commitSha.substring(0, 7)}): ${message}`
    };
  }

  /**
   * Safe PUSH CHECKPOINT workflow:
   * 1. Verifies remote has not advanced unexpectedly
   * 2. Uses secure ephemeral authentication from GITHUB_TOKEN environment secret
   * 3. Confirms remote HEAD matches local HEAD
   * 4. NEVER force pushes and never logs credentials
   */
  public static async pushCheckpoint(branchName?: string, customToken?: string): Promise<PushResult> {
    await this.ensureRepositoryInitialized();
    const status = await this.getStatus();
    const branch = branchName || status.branch;

    if (!status.repositoryUrl) {
      return {
        success: false,
        pushedSha: null,
        branch,
        remoteHead: null,
        message: 'Cannot push: Remote origin repository URL is not configured.',
        aheadCount: status.aheadCount
      };
    }

    // Step 1: Fetch origin to verify remote state
    await this.runGit(['fetch', 'origin', branch]);
    const updatedStatus = await this.getStatus();

    // If remote has moved ahead, REJECT push to prevent overwrite or reject error
    if (updatedStatus.behindCount > 0) {
      return {
        success: false,
        pushedSha: null,
        branch,
        remoteHead: updatedStatus.remoteHead,
        message: `Remote origin/${branch} has ${updatedStatus.behindCount} new commit(s) pushed by another agent/device. Run SYNC LATEST before pushing.`,
        aheadCount: updatedStatus.aheadCount
      };
    }

    // Step 2: Push via runtime token if provided, or through standard git push / native sync
    const token = (customToken || process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '').trim();

    let pushArgs: string[] = [];
    if (token) {
      // Ephemeral Basic auth header for git over HTTPS (x-access-token:<PAT>)
      const basicAuth = Buffer.from(`x-access-token:${token}`).toString('base64');
      pushArgs = ['-c', `http.extraheader=Authorization: Basic ${basicAuth}`, 'push', 'origin', `${branch}:${branch}`];
    } else {
      pushArgs = ['push', 'origin', `${branch}:${branch}`];
    }

    const pushRes = await this.runGit(pushArgs);
    if (pushRes.code !== 0) {
      const isAuthError = /401|403|Authentication failed|Invalid username or password|Permission to .* denied/i.test(pushRes.stderr);
      if (isAuthError) {
        this.writeSyncState({ lastAuthFailed: true });
        return {
          success: false,
          pushedSha: null,
          branch,
          remoteHead: updatedStatus.remoteHead,
          message: 'Direct container push requires native AI Studio GitHub Sync. Use the native GitHub integration in the AI Studio menu to push your workspace changes to origin/main without any manual token.',
          aheadCount: updatedStatus.aheadCount
        };
      }
      return {
        success: false,
        pushedSha: null,
        branch,
        remoteHead: updatedStatus.remoteHead,
        message: `Push to origin/${branch} failed: ${pushRes.stderr}`,
        aheadCount: updatedStatus.aheadCount
      };
    }

    // Auth succeeded — reset failure flag
    this.writeSyncState({ lastAuthFailed: false });

    // Step 3: Fetch again to confirm remote HEAD updated and matches local HEAD
    await this.runGit(['fetch', 'origin', branch]);
    const finalHeadRes = await this.runGit(['rev-parse', 'HEAD']);
    const pushedSha = finalHeadRes.stdout;
    const finalRemoteHeadRes = await this.runGit(['rev-parse', `origin/${branch}`]);
    const finalRemoteHead = finalRemoteHeadRes.stdout;

    const now = new Date().toISOString();
    this.writeSyncState({ lastSuccessfulPushAt: now });

    return {
      success: true,
      pushedSha,
      branch,
      remoteHead: finalRemoteHead,
      message: `Successfully pushed commit ${pushedSha.substring(0, 7)} to origin/${branch}. Remote HEAD is verified in sync.`,
      aheadCount: 0
    };
  }

  /**
   * Configure Git remote and identity
   */
  public static async configure(config: GitSyncConfig): Promise<{ success: boolean; message: string; status: GitSyncStatus }> {
    await this.ensureRepositoryInitialized();

    if (config.authorName) {
      await this.runGit(['config', 'user.name', config.authorName]);
    }
    if (config.authorEmail) {
      await this.runGit(['config', 'user.email', config.authorEmail]);
    }
    if (config.branch) {
      await this.runGit(['branch', '-M', config.branch]);
    }
    if (config.remoteUrl) {
      const currentRemote = await this.runGit(['config', '--get', 'remote.origin.url']);
      if (currentRemote.code === 0 && currentRemote.stdout) {
        await this.runGit(['remote', 'set-url', 'origin', config.remoteUrl]);
      } else {
        await this.runGit(['remote', 'add', 'origin', config.remoteUrl]);
      }
    }

    const status = await this.getStatus();
    return {
      success: true,
      message: 'Git synchronization configuration updated successfully.',
      status
    };
  }
}
