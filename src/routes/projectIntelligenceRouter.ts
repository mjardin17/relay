import express, { Request, Response } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { RelayProjectIntelligenceService } from '../services/relayProjectIntelligenceService';

export const projectIntelligenceRouter = express.Router();
projectIntelligenceRouter.use(authMiddleware);

// 1. List Projects
projectIntelligenceRouter.get('/projects', (_req: Request, res: Response) => {
  try {
    const projects = RelayProjectIntelligenceService.getInstance().listProjects();
    res.json({ success: true, projects });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to list projects' });
  }
});

// 2. Verified Capability Inventory
projectIntelligenceRouter.get('/capability-inventory', (_req: Request, res: Response) => {
  try {
    const inventory = RelayProjectIntelligenceService.getInstance().getWorkspaceCapabilityInventory();
    res.json({ success: true, capabilityInventory: inventory });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to fetch capability inventory' });
  }
});

// 3. Project Comparison (Read-only, Zero Auto-Merge Governance)
projectIntelligenceRouter.post('/compare', (req: Request, res: Response) => {
  try {
    const { targetId, sourceId } = req.body;
    const report = RelayProjectIntelligenceService.getInstance().compareProjects(
      targetId || 'relay_central',
      sourceId || 'relay_central'
    );
    res.json({ success: true, report });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err?.message || 'Failed to compare projects' });
  }
});
