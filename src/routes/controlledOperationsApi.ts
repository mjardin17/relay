import { Router, Request, Response, NextFunction } from 'express';
import { ConnectorRegistryService } from '../services/connectorRegistryService';
import { DurableExecutionQueueService } from '../services/durableExecutionQueueService';
import { EmergencyControlService } from './../services/emergencyControlService';
import { DeadLetterQueueService } from '../services/deadLetterQueueService';
import { OperatorApprovalConsoleService } from '../services/operatorApprovalConsoleService';
import { PilotReadinessService } from '../services/pilotReadinessService';
import { ExecutionObservabilityService } from '../services/executionObservabilityService';
import { ControlledLiveOperationsFacade } from '../services/controlledLiveOperationsFacade';
import { AuthService } from '../services/authService';

export const controlledOperationsRouter = Router();

const authService = AuthService.getInstance();
const connectorRegistry = ConnectorRegistryService.getInstance();
const queueService = DurableExecutionQueueService.getInstance();
const emergencyService = EmergencyControlService.getInstance();
const dlqService = DeadLetterQueueService.getInstance();
const approvalConsole = OperatorApprovalConsoleService.getInstance();
const pilotReadiness = PilotReadinessService.getInstance();
const observability = ExecutionObservabilityService.getInstance();
const operationsFacade = ControlledLiveOperationsFacade.getInstance();

// Auth Middleware: extracts session, strictly ignores x-tenant-id injection
function authenticateSession(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'AUTHENTICATION_REQUIRED: Missing or malformed Authorization header.'
    });
  }

  const token = authHeader.substring(7);
  const session = authService.validateSession(token);
  if (!session) {
    return res.status(401).json({
      success: false,
      error: 'INVALID_SESSION: Bearer token is invalid or expired.'
    });
  }

  (req as any).session = session;
  (req as any).tenantId = session.tenantId;
  (req as any).actorId = session.actorId;
  (req as any).role = session.role;
  next();
}

controlledOperationsRouter.use(authenticateSession);

// ---------------------------------------------------------------------------
// 1. Connector Registry & Verification
// ---------------------------------------------------------------------------

controlledOperationsRouter.get('/connectors', (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const connectors = connectorRegistry.listConnectors(tenantId);
    res.json({ success: true, count: connectors.length, connectors });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

controlledOperationsRouter.post('/connectors', (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const connector = connectorRegistry.registerConnector(tenantId, req.body);
    res.json({ success: true, connector });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

controlledOperationsRouter.post('/connectors/:id/verify', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { id } = req.params;
    const { apiKey, oauthToken, simulatedOutcome } = req.body;

    const result = await connectorRegistry.verifyConnector(tenantId, id, {
      apiKey,
      oauthToken,
      simulatedOutcome
    });

    res.json({ success: true, result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

controlledOperationsRouter.get('/connectors/:id/health', (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { id } = req.params;
    const health = connectorRegistry.getCredentialHealth(tenantId, id);
    res.json({ success: true, health });
  } catch (err: any) {
    res.status(404).json({ success: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// 2. Emergency Controls (Emergency Stop / Resume)
// ---------------------------------------------------------------------------

controlledOperationsRouter.get('/emergency', (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const controls = emergencyService.getEmergencyControls(tenantId);
    const isBlocked = emergencyService.isExecutionBlocked(tenantId);
    res.json({ success: true, isBlocked, controls });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

controlledOperationsRouter.post('/emergency/pause', (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const actorId = (req as any).actorId;
    const { scope = 'TENANT', targetIdentifier, reason = 'Operator triggered emergency pause' } = req.body;

    const record = emergencyService.pause({
      scope,
      tenantId: scope === 'GLOBAL' ? undefined : tenantId,
      targetIdentifier,
      reason,
      pausedBy: actorId
    });

    res.json({ success: true, message: 'Emergency pause activated.', record });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

controlledOperationsRouter.post('/emergency/resume', (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const actorId = (req as any).actorId;
    const { scope = 'TENANT', targetIdentifier, reason } = req.body;

    const resumed = emergencyService.resume({
      scope,
      tenantId: scope === 'GLOBAL' ? undefined : tenantId,
      targetIdentifier,
      resumedBy: actorId,
      reason
    });

    res.json({ success: resumed, message: resumed ? 'Emergency pause resumed.' : 'No active pause matched parameters.' });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// 3. Durable Execution Queue
// ---------------------------------------------------------------------------

controlledOperationsRouter.get('/queue', (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { status, connectorId } = req.query as { status?: any; connectorId?: string };
    const items = queueService.listQueueItems(tenantId, { status, connectorId });
    res.json({ success: true, count: items.length, items });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

controlledOperationsRouter.post('/queue', (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const actorId = (req as any).actorId;
    const role = (req as any).role;
    const { connectorId, operation, target, payload, idempotencyKey, executionMode, approvalId, maxAttempts } = req.body;

    if (!connectorId || !operation || !target || !idempotencyKey) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_FAILED: Must specify connectorId, operation, target, and idempotencyKey.'
      });
    }

    const item = queueService.enqueue({
      tenantId,
      connectorId,
      operation,
      target,
      payload: payload || {},
      idempotencyKey,
      proposerId: actorId,
      proposerRole: role,
      executionMode,
      approvalId,
      maxAttempts
    });

    res.json({ success: true, item });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

controlledOperationsRouter.post('/queue/:id/execute', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { id } = req.params;
    const item = await queueService.executeQueueItem(tenantId, id);
    res.json({ success: true, item });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

controlledOperationsRouter.post('/queue/:id/cancel', (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { id } = req.params;
    const { reason = 'Cancelled by operator' } = req.body;
    const item = queueService.cancelQueueItem(tenantId, id, reason);
    res.json({ success: true, item });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// 4. Dead Letter Queue
// ---------------------------------------------------------------------------

controlledOperationsRouter.get('/dlq', (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { status } = req.query as { status?: string };
    const items = dlqService.listDLQ(tenantId, { status });
    res.json({ success: true, count: items.length, items });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

controlledOperationsRouter.post('/dlq/:id/resolve', (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const actorId = (req as any).actorId;
    const { id } = req.params;
    const { action, notes } = req.body;

    if (!action || !['RETRIED', 'CANCELLED', 'SUPERSEDED'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: "VALIDATION_FAILED: action must be one of 'RETRIED', 'CANCELLED', 'SUPERSEDED'"
      });
    }

    const record = dlqService.resolveDLQ(tenantId, id, action, actorId, notes);
    res.json({ success: true, record });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// 5. Operator Approval Console (Segregation of Duties)
// ---------------------------------------------------------------------------

controlledOperationsRouter.get('/approvals/pending', (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const pending = approvalConsole.listPendingApprovals(tenantId);
    res.json({ success: true, count: pending.length, approvals: pending });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

controlledOperationsRouter.get('/approvals/:id', (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { id } = req.params;
    const approval = approvalConsole.getConsoleItem(tenantId, id);
    if (!approval) {
      return res.status(404).json({ success: false, error: 'APPROVAL_NOT_FOUND' });
    }
    res.json({ success: true, approval });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

controlledOperationsRouter.post('/approvals/:id/approve', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const actorId = (req as any).actorId;
    const role = (req as any).role;
    const { id } = req.params;
    const { resumptionToken, notes } = req.body;

    const result = await approvalConsole.approveAction({
      tenantId,
      approvalId: id,
      approverId: actorId,
      approverRole: role,
      resumptionToken,
      notes
    });

    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

controlledOperationsRouter.post('/approvals/:id/reject', (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const actorId = (req as any).actorId;
    const role = (req as any).role;
    const { id } = req.params;
    const { reason = 'Rejected by operator' } = req.body;

    const result = approvalConsole.rejectAction({
      tenantId,
      approvalId: id,
      rejecterId: actorId,
      rejecterRole: role,
      reason
    });

    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// 6. Pilot Readiness & Observability
// ---------------------------------------------------------------------------

controlledOperationsRouter.get('/pilot/readiness', (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const report = pilotReadiness.evaluatePilotReadiness(tenantId);
    res.json({ success: true, report });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

controlledOperationsRouter.get('/observability/metrics', (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const metrics = observability.getTenantMetrics(tenantId);
    res.json({ success: true, metrics });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// 7. End-to-End Real Lead Pipeline
// ---------------------------------------------------------------------------

controlledOperationsRouter.post('/lead/pipeline', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const actorId = (req as any).actorId;
    const role = (req as any).role;
    const { leadData, targetConnectorId, requestedExecutionMode } = req.body;

    if (!leadData || !leadData.fullName || !leadData.phone || !leadData.serviceRequested) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_FAILED: leadData must include fullName, phone, and serviceRequested.'
      });
    }

    const result = await operationsFacade.processLeadPipeline({
      tenantId,
      leadData,
      proposerId: actorId,
      proposerRole: role,
      targetConnectorId,
      requestedExecutionMode
    });

    res.json({ success: true, result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});
