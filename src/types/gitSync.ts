export type WriteAuthState = 'NATIVE_AI_STUDIO' | 'WRITE_AUTHENTICATED' | 'WRITE_AUTH_MISSING' | 'WRITE_AUTH_FAILED';

export interface GitSyncStatus {
  initialized: boolean;
  repositoryUrl: string | null;
  branch: string;
  localHead: string | null;
  remoteHead: string | null;
  aheadCount: number;
  behindCount: number;
  syncState: 'IN_SYNC' | 'AHEAD' | 'BEHIND' | 'DIVERGED' | 'UNCOMMITTED_CHANGES' | 'UNCONFIGURED' | 'CONFLICT';
  writeAuthState: WriteAuthState;
  workingTree: {
    isClean: boolean;
    modified: string[];
    untracked: string[];
    staged: string[];
  };
  lastSuccessfulSyncAt: string | null;
  lastSuccessfulPushAt: string | null;
  activeAgent: string;
}

export interface SyncLatestResult {
  success: boolean;
  message: string;
  branch: string;
  previousHead: string | null;
  currentHead: string | null;
  remoteHead: string | null;
  pulledCommitsCount: number;
  conflictFiles?: string[];
  stashedChanges?: boolean;
}

export interface CheckpointResult {
  success: boolean;
  commitSha: string | null;
  commitMessage: string;
  changedFilesCount: number;
  stagedFiles: string[];
  message: string;
}

export interface PushResult {
  success: boolean;
  pushedSha: string | null;
  branch: string;
  remoteHead: string | null;
  message: string;
  aheadCount: number;
}

export interface GitSyncConfig {
  remoteUrl?: string;
  branch?: string;
  authorName?: string;
  authorEmail?: string;
  githubToken?: string;
}
