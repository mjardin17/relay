import express, { Request, Response } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { UniversalActionEngineService } from '../services/universalActionEngineService';
import { UniversalActionRequest } from '../types/universalActionEngine';

export const universalActionsRouter = express.Router();
universalActionsRouter.use(authMiddleware);

// 1. Submit Action (Session-derived actor & tenant)
universalActionsRouter.post('/submit', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userId = (req as any).userId;
    const userRole = ((req as any).userRole || 'OPERATOR').toUpperCase();
    const actorName = (req as any).userSession?.actorName || userId;

    const request: UniversalActionRequest = {
      tenantId,
      actor: {
        id: userId,
        role: userRole as any,
        name: actorName
      },
      actionType: req.body.actionType,
      provider: req.body.provider,
      input: req.body.input || {},
      idempotencyKey: req.body.idempotencyKey,
      requiresApprovalOverride: req.body.requiresApprovalOverride,
      metadata: req.body.metadata
    };

    const actionEngine = UniversalActionEngineService.getInstance();
    const record = await actionEngine.submitAction(request);
    res.json({ success: true, action: record });
  } catch (err: any) {
    const isConflict = err?.message?.includes('IDEMPOTENCY_CONFLICT');
    const statusCode = isConflict ? 409 : 400;
    res.status(statusCode).json({ success: false, error: err?.message || 'Failed to submit universal action' });
  }
});

// 2. Approve or Reject Action (Strict role check, self-approval prevention)
universalActionsRouter.post('/approve', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userId = (req as any).userId;
    const userRole = ((req as any).userRole || '').toUpperCase();

    if (userRole !== 'OWNER' && userRole !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN: Only owners and administrators may approve consequential actions.'
      });
    }

    const { actionId, decision, reason } = req.body;
    if (!actionId || !decision) {
      return res.status(400).json({ success: false, error: 'Missing actionId or decision' });
    }

    const actionEngine = UniversalActionEngineService.getInstance();
    const existing = actionEngine.getAction(actionId);
    if (!existing) {
      return res.status(404).json({ success: false, error: `Action ${actionId} not found.` });
    }

    if (existing.tenantId !== tenantId) {
      return res.status(403).json({ success: false, error: 'FORBIDDEN: Cross-tenant approval is not permitted.' });
    }

    const record = await actionEngine.decideApproval(actionId, {
      decision,
      approverId: userId,
      approverRole: userRole,
      reason
    });

    res.json({ success: true, action: record });
  } catch (err: any) {
    const isSelfApproval = err?.message?.includes('SELF_APPROVAL_REJECTED');
    const statusCode = isSelfApproval ? 403 : 400;
    res.status(statusCode).json({ success: false, error: err?.message || 'Failed to process approval' });
  }
});

// 3. List Actions (Session-scoped)
universalActionsRouter.get('/list', (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const limit = parseInt(req.query.limit as string) || 50;
    const actions = UniversalActionEngineService.getInstance().listActions(tenantId, limit);
    res.json({ success: true, actions });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to list universal actions' });
  }
});

// 4. Get Single Action
universalActionsRouter.get('/:id', (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const actionId = req.params.id;
    const action = UniversalActionEngineService.getInstance().getAction(actionId);

    if (!action) {
      return res.status(404).json({ success: false, error: 'Action not found' });
    }

    if (action.tenantId !== tenantId) {
      return res.status(403).json({ success: false, error: 'FORBIDDEN: Cross-tenant action access denied.' });
    }

    res.json({ success: true, action });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to fetch action' });
  }
});
