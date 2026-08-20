import { Router, Request, Response } from 'express';
import { GitSyncService } from '../services/gitSyncService';

export const gitSyncApiRouter = Router();

// GET /api/git-sync/status
gitSyncApiRouter.get('/status', async (req: Request, res: Response) => {
  try {
    const agent = (req.query.agent as string) || undefined;
    const status = await GitSyncService.getStatus(agent);
    res.json({ success: true, status });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || String(err) });
  }
});

// POST /api/git-sync/sync-latest
gitSyncApiRouter.post('/sync-latest', async (req: Request, res: Response) => {
  try {
    const { rebase = true, autoStash = true } = req.body || {};
    const result = await GitSyncService.syncLatest({ rebase, autoStash });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || String(err) });
  }
});

// POST /api/git-sync/checkpoint
gitSyncApiRouter.post('/checkpoint', async (req: Request, res: Response) => {
  try {
    const { message, agentName, files } = req.body || {};
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ success: false, message: 'Commit message is required.' });
    }
    const result = await GitSyncService.saveCheckpoint(message, agentName, files);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || String(err) });
  }
});

// POST /api/git-sync/push
gitSyncApiRouter.post('/push', async (req: Request, res: Response) => {
  try {
    const { branch, githubToken } = req.body || {};
    const result = await GitSyncService.pushCheckpoint(branch, githubToken);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || String(err) });
  }
});

// POST /api/git-sync/config
gitSyncApiRouter.post('/config', async (req: Request, res: Response) => {
  try {
    const config = req.body || {};
    const result = await GitSyncService.configure(config);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || String(err) });
  }
});
