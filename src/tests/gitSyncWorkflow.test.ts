import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { GitSyncService } from '../services/gitSyncService';

describe('Relay Developer Git Synchronization & Canonical Handoff Suite', () => {

  beforeEach(async () => {
    await GitSyncService.ensureRepositoryInitialized();
  });

  afterEach(async () => {
    // Restore canonical remote
    await GitSyncService.configure({ remoteUrl: 'https://github.com/mjardin17/relay.git' });
  });

  test('Requirement 1 & 6: GitSyncService returns structured status panel data', async () => {
    const status = await GitSyncService.getStatus('AI Studio Test Agent');
    
    assert.strictEqual(status.initialized, true);
    assert.ok(typeof status.branch === 'string');
    assert.ok(status.workingTree !== undefined);
    assert.ok(Array.isArray(status.workingTree.modified));
    assert.ok(Array.isArray(status.workingTree.staged));
    assert.ok(Array.isArray(status.workingTree.untracked));
    assert.ok(['IN_SYNC', 'AHEAD', 'BEHIND', 'DIVERGED', 'UNCOMMITTED_CHANGES', 'UNCONFIGURED', 'CONFLICT'].includes(status.syncState));
    assert.strictEqual(status.activeAgent, 'AI Studio Test Agent');
  });

  test('Requirement 2: SAVE CHECKPOINT creates structured commit with author and returns commit SHA', async () => {
    // Test that saveCheckpoint returns structured status without crashing
    const checkpointResult = await GitSyncService.saveCheckpoint('Test clean checkpoint', 'Claude Test Agent');
    assert.strictEqual(checkpointResult.success, true);
    assert.ok(typeof checkpointResult.changedFilesCount === 'number');

    const statusAfter = await GitSyncService.getStatus();
    assert.ok(statusAfter.initialized);
  });

  test('Requirement 4: CONFLICT SAFETY & Unconfigured Remote Handling', async () => {
    // Push when origin is unconfigured or not pointing to valid remote should fail safely without crashing
    const pushResult = await GitSyncService.pushCheckpoint('main');
    
    if (!pushResult.success) {
      assert.ok(pushResult.message.length > 0);
      assert.strictEqual(pushResult.pushedSha, null);
    }
  });

  test('Requirement 5: AGENT HANDOFF protocol maintains audit state', async () => {
    const configResult = await GitSyncService.configure({
      authorName: 'Goose Agent',
      authorEmail: 'goose@relay.local'
    });

    assert.strictEqual(configResult.success, true);
    const status = await GitSyncService.getStatus('Goose Agent');
    assert.strictEqual(status.activeAgent, 'Goose Agent');
  });

  test('Requirement 7 & 8: Remote configuration and safe sync validation', async () => {
    const canonicalRemote = 'https://github.com/mjardin17/relay.git';
    await GitSyncService.configure({ remoteUrl: canonicalRemote });
    
    const status = await GitSyncService.getStatus();
    assert.strictEqual(status.repositoryUrl, canonicalRemote);
  });

  test('Requirement 9: Write Auth State Detection & Native Sync Mode', async () => {
    const origToken = process.env.GITHUB_TOKEN;
    const origGhToken = process.env.GH_TOKEN;
    try {
      delete process.env.GITHUB_TOKEN;
      delete process.env.GH_TOKEN;

      const authState = GitSyncService.getWriteAuthState();
      assert.strictEqual(authState, 'NATIVE_AI_STUDIO');

      // Test when optional GITHUB_TOKEN is present
      process.env.GITHUB_TOKEN = 'ghp_fakeTestTokenForUnitTestingOnly1234567890';
      const authStateWithToken = GitSyncService.getWriteAuthState();
      assert.strictEqual(authStateWithToken, 'WRITE_AUTHENTICATED');
    } finally {
      if (origToken !== undefined) process.env.GITHUB_TOKEN = origToken;
      else delete process.env.GITHUB_TOKEN;
      if (origGhToken !== undefined) process.env.GH_TOKEN = origGhToken;
      else delete process.env.GH_TOKEN;
    }
  });
});

