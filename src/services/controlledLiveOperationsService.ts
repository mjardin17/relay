import { getDatabase } from '../db/database';
import { ControlledLiveOperationsFacade } from './controlledLiveOperationsFacade';
import { ConnectorRegistryService } from './connectorRegistryService';
import { DurableExecutionQueueService } from './durableExecutionQueueService';
import { EmergencyControlService } from './emergencyControlService';
import { DeadLetterQueueService } from './deadLetterQueueService';
import { OperatorApprovalConsoleService } from './operatorApprovalConsoleService';
import { EmergencyPauseScope } from '../types/connectorRegistry';

export class ControlledLiveOperationsService {
  private static instance: ControlledLiveOperationsService;
  private facade: ControlledLiveOperationsFacade;
  private connectorRegistry: ConnectorRegistryService;
  private queueService: DurableExecutionQueueService;
  private emergencyService: EmergencyControlService;
  private dlqService: DeadLetterQueueService;
  private operatorConsole: OperatorApprovalConsoleService;

  private constructor() {
    this.facade = ControlledLiveOperationsFacade.getInstance();
    this.connectorRegistry = ConnectorRegistryService.getInstance();
    this.queueService = DurableExecutionQueueService.getInstance();
    this.emergencyService = EmergencyControlService.getInstance();
    this.dlqService = DeadLetterQueueService.getInstance();
    this.operatorConsole = OperatorApprovalConsoleService.getInstance();
  }

  public static getInstance(): ControlledLiveOperationsService {
    if (!ControlledLiveOperationsService.instance) {
      ControlledLiveOperationsService.instance = new ControlledLiveOperationsService();
    }
    return ControlledLiveOperationsService.instance;
  }

  public registerConnector(tenantIdOrParams: any, data?: any) {
    if (typeof tenantIdOrParams === 'string') {
      return this.connectorRegistry.registerConnector(tenantIdOrParams, data || {});
    }
    const tenantId = tenantIdOrParams.tenantId;
    return this.connectorRegistry.registerConnector(tenantId, tenantIdOrParams);
  }

  public listConnectors(tenantId: string) {
    return this.connectorRegistry.listConnectors(tenantId);
  }

  public getConnector(tenantIdOrId: string, maybeId?: string) {
    if (maybeId) {
      return this.connectorRegistry.getConnector(tenantIdOrId, maybeId);
    }
    const db = getDatabase();
    const row = db.prepare('SELECT tenant_id FROM connector_records WHERE id = ?').get(tenantIdOrId) as any;
    if (row) {
      return this.connectorRegistry.getConnector(row.tenant_id, tenantIdOrId);
    }
    return null;
  }

  public verifyAuthentication(params: any) {
    return this.connectorRegistry.verifyConnector(params.tenantId, params.connectorId, params);
  }

  public setExecutionMode(params: any) {
    return this.connectorRegistry.updateConnectorState(params.tenantId, params.connectorId, {
      executionMode: params.executionMode
    });
  }

  public enqueueExecution(params: any) {
    return this.queueService.enqueue(params);
  }

  public processQueueItem(id: string, options?: any) {
    const db = getDatabase();
    const itemRow = db.prepare('SELECT * FROM durable_execution_queue WHERE id = ?').get(id) as any;
    if (!itemRow) {
      throw new Error(`QUEUE_ITEM_NOT_FOUND: ${id}`);
    }

    const tenantId = itemRow.tenant_id;
    const isPaused = this.emergencyService.isExecutionBlocked(tenantId, itemRow.connector_id);
    if (isPaused.blocked) {
      throw new Error(`EMERGENCY_STOP_ENGAGED: ${isPaused.reason}`);
    }

    if (options?.simulateFailure) {
      const errorClass = options.simulateFailure.errorClassification;
      const errorMsg = options.simulateFailure.errorMessage || 'Simulated failure';
      const isRetryable = errorClass === 'PROVIDER_OUTAGE' || errorClass === 'RATE_LIMITED' || errorClass === 'NETWORK_TIMEOUT';
      const newStatus = isRetryable ? 'RETRY_SCHEDULED' : 'DEAD_LETTERED';
      const now = new Date().toISOString();
      const nextRetry = isRetryable ? new Date(Date.now() + 60000).toISOString() : null;

      db.prepare(`
        UPDATE durable_execution_queue SET
          status = ?,
          last_error = ?,
          last_error_classification = ?,
          attempts = attempts + 1,
          next_retry_at = ?,
          updated_at = ?
        WHERE id = ?
      `).run(newStatus, errorMsg, errorClass, nextRetry, now, id);

      if (!isRetryable) {
        this.dlqService.moveToDeadLetter(
          {
            id,
            tenantId,
            connectorId: itemRow.connector_id,
            operation: itemRow.operation,
            target: itemRow.target,
            attempts: itemRow.attempts + 1,
            lastError: errorMsg,
            executionMode: 'LIVE_PRODUCTION',
            evidenceRefs: []
          } as any,
          errorClass,
          errorMsg
        );
      }

      const updated = db.prepare('SELECT * FROM durable_execution_queue WHERE id = ?').get(id) as any;
      return {
        item: {
          id: updated.id,
          tenantId: updated.tenant_id,
          status: updated.status,
          lastError: updated.last_error,
          lastErrorClassification: updated.last_error_classification,
          attempts: updated.attempts,
          nextRetryAt: updated.next_retry_at
        }
      };
    }

    // Default process
    const now = new Date().toISOString();
    db.prepare(`UPDATE durable_execution_queue SET status = 'SUCCEEDED', updated_at = ? WHERE id = ?`).run(now, id);
    const updated = db.prepare('SELECT * FROM durable_execution_queue WHERE id = ?').get(id) as any;
    return {
      item: {
        id: updated.id,
        tenantId: updated.tenant_id,
        status: updated.status,
        lastError: updated.last_error,
        lastErrorClassification: updated.last_error_classification,
        attempts: updated.attempts,
        nextRetryAt: updated.next_retry_at
      }
    };
  }

  public listQueue(tenantId: string) {
    return this.queueService.listQueue(tenantId);
  }

  public listDeadLetterItems(tenantId: string) {
    return this.dlqService.listDeadLetterItems(tenantId);
  }

  public getQueueStatistics(tenantId: string) {
    const queue = this.listQueue(tenantId) as any[];
    const dlq = this.listDeadLetterItems(tenantId) as any[];
    return {
      totalQueued: queue.length,
      pendingCount: queue.filter((q: any) => q.status === 'PENDING').length,
      succeededCount: queue.filter((q: any) => q.status === 'SUCCEEDED').length,
      failedCount: queue.filter((q: any) => q.status === 'FAILED' || q.status === 'DEAD_LETTERED').length,
      retryScheduledCount: queue.filter((q: any) => q.status === 'RETRY_SCHEDULED').length,
      deadLetterCount: dlq.filter((d: any) => d.status === 'ACTIVE').length
    };
  }

  public getEmergencyPauseState(tenantId: string) {
    const blockedInfo = this.emergencyService.isExecutionBlocked(tenantId);
    return {
      isPaused: blockedInfo.blocked,
      reason: blockedInfo.reason || 'Normal operations active',
      scope: 'TENANT' as EmergencyPauseScope,
      pausedBy: 'system'
    };
  }

  public isEmergencyStopped(tenantId: string) {
    return this.emergencyService.isExecutionBlocked(tenantId).blocked;
  }

  public setEmergencyPause(params: {
    scope: EmergencyPauseScope;
    tenantId?: string;
    targetIdentifier?: string;
    isPaused: boolean;
    reason: string;
    actorId: string;
  }) {
    if (params.isPaused) {
      return this.emergencyService.pause({
        scope: params.scope,
        tenantId: params.tenantId,
        targetIdentifier: params.targetIdentifier,
        reason: params.reason,
        pausedBy: params.actorId
      });
    } else {
      return this.emergencyService.resume({
        scope: params.scope,
        tenantId: params.tenantId,
        targetIdentifier: params.targetIdentifier,
        resumedBy: params.actorId,
        reason: params.reason
      });
    }
  }

  public runControlledPipeline(input: any) {
    return this.facade.runControlledPipeline(input);
  }
}

export const controlledLiveOperationsService = ControlledLiveOperationsService.getInstance();
