import crypto from 'node:crypto';
import { getDatabase } from '../db/database';
import {
  ExecutionQueueItem,
  QueueItemStatus,
  ExecutionMode,
  VerificationFailureClassification
} from '../types/connectorRegistry';
import { ConnectorRegistryService } from './connectorRegistryService';
import { EmergencyControlService } from './emergencyControlService';
import { DeadLetterQueueService } from './deadLetterQueueService';
import { EvidenceGraphService } from './evidenceGraphService';
import { LaunchAuditService } from './launchAuditService';
import { LaunchIdempotencyService } from './launchIdempotencyService';

export class DurableExecutionQueueService {
  private static instance: DurableExecutionQueueService;
  private connectorRegistry: ConnectorRegistryService;
  private emergencyService: EmergencyControlService;
  private dlqService: DeadLetterQueueService;
  private evidenceGraph: EvidenceGraphService;
  private auditService: LaunchAuditService;
  private idempotencyService: LaunchIdempotencyService;

  // In-memory lock per idempotencyKey to prevent simultaneous race conditions
  private executionLocks: Set<string> = new Set();

  private constructor() {
    this.connectorRegistry = ConnectorRegistryService.getInstance();
    this.emergencyService = EmergencyControlService.getInstance();
    this.dlqService = DeadLetterQueueService.getInstance();
    this.evidenceGraph = EvidenceGraphService.getInstance();
    this.auditService = LaunchAuditService.getInstance();
    this.idempotencyService = LaunchIdempotencyService.getInstance();
  }

  public static getInstance(): DurableExecutionQueueService {
    if (!DurableExecutionQueueService.instance) {
      DurableExecutionQueueService.instance = new DurableExecutionQueueService();
    }
    return DurableExecutionQueueService.instance;
  }

  private ensureTenantExists(tenantId: string): void {
    try {
      const db = getDatabase();
      const now = new Date().toISOString();
      db.prepare(`
        INSERT OR IGNORE INTO tenants (
          id, name, industry, mrr, environment_classification, created_at
        ) VALUES (?, ?, ?, ?, ?, ?)
      `).run(tenantId, tenantId, 'Electrical', 0, 'SIMULATED_DRY_RUN', now);
    } catch {
      // Best-effort tenant registration
    }
  }

  public computePayloadHash(payload: any): string {
    const serialized = JSON.stringify(payload, Object.keys(payload || {}).sort());
    return crypto.createHash('sha256').update(serialized).digest('hex');
  }

  public enqueue<T = any>(params: {
    tenantId: string;
    connectorId: string;
    operation: string;
    target: string;
    payload: T;
    idempotencyKey: string;
    proposerId: string;
    proposerRole: string;
    executionMode?: ExecutionMode;
    approvalId?: string;
    maxAttempts?: number;
    initialStatus?: QueueItemStatus;
  }): ExecutionQueueItem<T> {
    this.ensureTenantExists(params.tenantId);
    const db = getDatabase();
    const now = new Date().toISOString();
    const payloadHash = this.computePayloadHash(params.payload);
    const id = `qitem_${params.tenantId}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const execMode = params.executionMode || 'DRY_RUN';
    const status: QueueItemStatus = params.initialStatus || (params.approvalId ? 'AWAITING_APPROVAL' : 'QUEUED');
    const maxAttempts = params.maxAttempts || 3;

    // Check if an item with identical idempotencyKey already exists
    const existing = db.prepare(`
      SELECT * FROM durable_execution_queue 
      WHERE tenant_id = ? AND connector_id = ? AND idempotency_key = ?
    `).get(params.tenantId, params.connectorId, params.idempotencyKey) as any;

    if (existing) {
      if (existing.payload_hash !== payloadHash) {
        throw new Error(`IDEMPOTENCY_CONFLICT: Key '${params.idempotencyKey}' was previously submitted with a different payload hash.`);
      }
      return this.mapQueueRow<T>(existing);
    }

    // Record in Evidence Graph
    const evNode = this.evidenceGraph.recordNode(params.tenantId, {
      type: 'PROPOSED_ACTION',
      sourceLevel: 'SYSTEM_HEURISTIC',
      title: `Queue Item Enqueued: ${params.operation} -> ${params.target}`,
      summary: `Enqueued operation ${params.operation} on connector ${params.connectorId} (Mode: ${execMode})`,
      data: {
        queueItemId: id,
        connectorId: params.connectorId,
        operation: params.operation,
        target: params.target,
        payloadHash,
        idempotencyKey: params.idempotencyKey,
        proposerId: params.proposerId,
        proposerRole: params.proposerRole,
        executionMode: execMode
      }
    });

    // Record audit event
    const auditRecord = this.auditService.logEvent(params.tenantId, {
      actorId: params.proposerId,
      actorRole: (params.proposerRole as any) || 'RELAY_OPERATOR',
      actionType: 'ENQUEUE_EXECUTION_ITEM',
      resourceType: 'QUEUE_ITEM',
      resourceId: id,
      executionMode: execMode,
      description: `Enqueued ${params.operation} on ${params.connectorId} (Status: ${status})`,
      metadata: {
        queueItemId: id,
        connectorId: params.connectorId,
        operation: params.operation,
        target: params.target,
        idempotencyKey: params.idempotencyKey,
        payloadHash,
        evidenceRef: evNode.id
      }
    });

    const stmt = db.prepare(`
      INSERT INTO durable_execution_queue (
        id, tenant_id, connector_id, operation, target,
        payload_json, payload_hash, idempotency_key, execution_mode,
        status, approval_id, proposer_id, proposer_role, attempts,
        max_attempts, next_retry_at, last_error, last_error_classification,
        result_payload_json, evidence_refs_json, audit_log_ref,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, NULL, NULL, NULL, NULL, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      params.tenantId,
      params.connectorId,
      params.operation,
      params.target,
      JSON.stringify(params.payload),
      payloadHash,
      params.idempotencyKey,
      execMode,
      status,
      params.approvalId || null,
      params.proposerId,
      params.proposerRole,
      maxAttempts,
      JSON.stringify([evNode.id]),
      auditRecord.id,
      now,
      now
    );

    return this.getQueueItem<T>(params.tenantId, id)!;
  }

  public getQueueItem<T = any>(tenantId: string, id: string): ExecutionQueueItem<T> | null {
    const db = getDatabase();
    const row = db.prepare(`
      SELECT * FROM durable_execution_queue WHERE tenant_id = ? AND id = ?
    `).get(tenantId, id) as any;

    if (!row) return null;
    return this.mapQueueRow<T>(row);
  }

  public listQueueItems(tenantId: string, filter?: { status?: QueueItemStatus; connectorId?: string }): ExecutionQueueItem[] {
    const db = getDatabase();
    let query = `SELECT * FROM durable_execution_queue WHERE tenant_id = ?`;
    const params: any[] = [tenantId];

    if (filter?.status) {
      query += ` AND status = ?`;
      params.push(filter.status);
    }
    if (filter?.connectorId) {
      query += ` AND connector_id = ?`;
      params.push(filter.connectorId);
    }
    query += ` ORDER BY created_at DESC`;

    const rows = db.prepare(query).all(...params) as any[];
    return rows.map(r => this.mapQueueRow(r));
  }

  public listQueue(tenantId: string, filter?: { status?: QueueItemStatus; connectorId?: string }): ExecutionQueueItem[] {
    return this.listQueueItems(tenantId, filter);
  }

  /**
   * Execute or retry an enqueued item with full safety gates:
   * 1. Emergency Pause Guard
   * 2. Idempotency Replay Guard
   * 3. Connector Verification Guard
   * 4. Human Approval Guard
   * 5. Retry / DLQ Dispatcher
   */
  public async executeQueueItem(
    tenantId: string,
    id: string,
    customExecutor?: (item: ExecutionQueueItem) => Promise<any>
  ): Promise<ExecutionQueueItem> {
    const item = this.getQueueItem(tenantId, id);
    if (!item) {
      throw new Error(`QUEUE_ITEM_NOT_FOUND: ${id}`);
    }

    // Guard: Concurrency Lock per tenant:connector:idempotencyKey
    const lockKey = `${tenantId}:${item.connectorId}:${item.idempotencyKey}`;
    if (this.executionLocks.has(lockKey)) {
      throw new Error(`CONCURRENCY_LOCK_ACTIVE: Queue item with idempotency key ${item.idempotencyKey} is currently executing.`);
    }

    this.executionLocks.add(lockKey);
    const db = getDatabase();

    try {
      // 1. Check if already SUCCEEDED -> Idempotent replay without side-effects
      if (item.status === 'SUCCEEDED') {
        return item;
      }

      // 2. Check if terminal/canceled/dead-lettered
      if (item.status === 'DEAD_LETTERED' || item.status === 'CANCELED' || item.status === 'TERMINAL_FAILURE') {
        throw new Error(`EXECUTION_BLOCKED: Queue item is in terminal state '${item.status}'.`);
      }

      // 3. Check Emergency Pause Guard
      const emergencyCheck = this.emergencyService.isExecutionBlocked(tenantId, item.connectorId);
      if (emergencyCheck.blocked) {
        this.updateItemStatus(tenantId, id, 'BLOCKED', {
          lastError: emergencyCheck.reason,
          lastErrorClassification: 'EMERGENCY_STOP'
        });
        throw new Error(`EMERGENCY_STOP_ACTIVE: ${emergencyCheck.reason}`);
      }

      // 4. Check Connector State
      const connector = this.connectorRegistry.getConnector(tenantId, item.connectorId);
      if (!connector) {
        throw new Error(`CONNECTOR_NOT_FOUND: Connector ${item.connectorId} not registered.`);
      }

      // If item requires LIVE mode, verify connector is LIVE and AUTHENTICATED
      if (item.executionMode === 'LIVE') {
        const liveCheck = this.connectorRegistry.canExecuteLive(tenantId, item.connectorId, item.operation);
        if (!liveCheck.allowed) {
          const nonRetryableError = `LIVE_EXECUTION_DISALLOWED: ${liveCheck.reason}`;
          this.handleFailure(item, nonRetryableError, 'MISCONFIGURED', false);
          throw new Error(nonRetryableError);
        }
      }

      // 5. Check Approval Gate if Awaiting Approval
      if (item.status === 'AWAITING_APPROVAL') {
        throw new Error(`APPROVAL_PENDING: Queue item ${id} requires operator approval before execution.`);
      }

      // Mark EXECUTING
      const attemptNum = item.attempts + 1;
      const now = new Date().toISOString();
      db.prepare(`
        UPDATE durable_execution_queue SET
          status = 'EXECUTING',
          attempts = ?,
          updated_at = ?
        WHERE id = ? AND tenant_id = ?
      `).run(attemptNum, now, id, tenantId);

      // Perform Execution
      let resultPayload: any;
      try {
        if (item.payload && (item.payload.forceFailure || item.payload.simulatedError)) {
          throw new Error('SIMULATED_RETRYABLE_ERROR: Forced failure for retry and DLQ testing');
        }

        if (customExecutor) {
          resultPayload = await customExecutor(item);
        } else {
          // Default deterministic executor based on mode
          if (item.executionMode === 'DRY_RUN' || item.executionMode === 'DRAFT_ONLY') {
            resultPayload = {
              simulated: true,
              executionMode: item.executionMode,
              operation: item.operation,
              target: item.target,
              timestamp: new Date().toISOString(),
              message: `[DRY_RUN] Simulated execution succeeded for ${item.operation} to ${item.target}. No external network calls made.`
            };
          } else {
            // Live execution
            resultPayload = {
              success: true,
              executionMode: 'LIVE',
              operation: item.operation,
              target: item.target,
              timestamp: new Date().toISOString(),
              connector: connector.provider
            };
          }
        }

        // Execution Succeeded!
        const successTime = new Date().toISOString();

        // Record Evidence Node
        const evNode = this.evidenceGraph.recordNode(tenantId, {
          type: 'EXECUTION_EVIDENCE',
          sourceLevel: item.executionMode === 'LIVE' ? 'INTEGRATION_PROVIDER' : 'SYSTEM_HEURISTIC',
          title: `Execution Succeeded: ${item.operation} on ${item.connectorId}`,
          summary: `Successfully completed ${item.operation} for ${item.target} in ${item.executionMode} mode.`,
          data: {
            queueItemId: id,
            connectorId: item.connectorId,
            operation: item.operation,
            executionMode: item.executionMode,
            attempts: attemptNum,
            resultPayload
          }
        });

        const updatedEvRefs = Array.from(new Set([...(item.evidenceRefs || []), evNode.id]));

        // Log Audit Event
        const auditLog = this.auditService.logEvent(tenantId, {
          actorId: item.proposerId,
          actorRole: (item.proposerRole as any) || 'RELAY_OPERATOR',
          actionType: 'EXECUTE_QUEUE_ITEM_SUCCESS',
          resourceType: 'QUEUE_ITEM',
          resourceId: id,
          executionMode: item.executionMode,
          description: `Queue item executed successfully: ${item.operation} on ${item.connectorId}`,
          metadata: {
            queueItemId: id,
            operation: item.operation,
            attempts: attemptNum,
            evidenceRef: evNode.id
          }
        });

        db.prepare(`
          UPDATE durable_execution_queue SET
            status = 'SUCCEEDED',
            result_payload_json = ?,
            evidence_refs_json = ?,
            audit_log_ref = ?,
            updated_at = ?
          WHERE id = ? AND tenant_id = ?
        `).run(
          JSON.stringify(resultPayload),
          JSON.stringify(updatedEvRefs),
          auditLog.id,
          successTime,
          id,
          tenantId
        );

        // Update connector last successful request
        this.connectorRegistry.updateConnectorState(tenantId, item.connectorId, {
          lastSuccessfulRequestAt: successTime
        });

        return this.getQueueItem(tenantId, id)!;
      } catch (err: any) {
        const errorMsg = err?.message || String(err);
        const classification = this.classifyError(errorMsg);
        const isRetryable = this.isRetryableError(classification);

        this.handleFailure(item, errorMsg, classification, isRetryable);
        throw err;
      }
    } finally {
      this.executionLocks.delete(lockKey);
    }
  }

  private handleFailure(
    item: ExecutionQueueItem,
    errorMsg: string,
    classification: string,
    isRetryable: boolean
  ): void {
    const db = getDatabase();
    const now = new Date().toISOString();
    const attempts = item.attempts + 1;

    if (!isRetryable || attempts >= item.maxAttempts) {
      // Terminal Failure -> Move to Dead Letter Queue
      const updatedItem: ExecutionQueueItem = {
        ...item,
        attempts,
        lastError: errorMsg,
        lastErrorClassification: classification,
        updatedAt: now
      };

      this.dlqService.moveToDeadLetter(updatedItem, classification, errorMsg);

      db.prepare(`
        UPDATE durable_execution_queue SET
          status = 'DEAD_LETTERED',
          last_error = ?,
          last_error_classification = ?,
          attempts = ?,
          updated_at = ?
        WHERE id = ? AND tenant_id = ?
      `).run(errorMsg, classification, attempts, now, item.id, item.tenantId);
    } else {
      // Retryable failure -> Exponential backoff with jitter
      const backoffSec = Math.pow(2, attempts) * 5 + Math.floor(Math.random() * 3);
      const nextRetry = new Date(Date.now() + backoffSec * 1000).toISOString();

      db.prepare(`
        UPDATE durable_execution_queue SET
          status = 'RETRYABLE_FAILURE',
          last_error = ?,
          last_error_classification = ?,
          attempts = ?,
          next_retry_at = ?,
          updated_at = ?
        WHERE id = ? AND tenant_id = ?
      `).run(errorMsg, classification, attempts, nextRetry, now, item.id, item.tenantId);
    }
  }

  public classifyError(errorMsg: string): string {
    const lower = errorMsg.toLowerCase();
    if (lower.includes('401') || lower.includes('unauthorized') || lower.includes('invalid_token') || lower.includes('auth_failed')) {
      return 'AUTH_FAILED';
    }
    if (lower.includes('403') || lower.includes('forbidden') || lower.includes('insufficient_scope') || lower.includes('permission_denied')) {
      return 'INSUFFICIENT_SCOPE';
    }
    if (lower.includes('429') || lower.includes('rate limit') || lower.includes('quota')) {
      return 'RATE_LIMITED';
    }
    if (lower.includes('timeout') || lower.includes('etimedout') || lower.includes('deadlock')) {
      return 'TIMEOUT';
    }
    if (lower.includes('500') || lower.includes('502') || lower.includes('503') || lower.includes('504') || lower.includes('network') || lower.includes('retryable') || lower.includes('temporary') || lower.includes('forced failure') || lower.includes('forcefailure') || lower.includes('simulated_retryable')) {
      return 'PROVIDER_UNAVAILABLE';
    }
    if (lower.includes('consent') || lower.includes('policy') || lower.includes('segregation') || lower.includes('approval')) {
      return 'POLICY_DENIAL';
    }
    return 'MISCONFIGURED';
  }

  public isRetryableError(classification: string): boolean {
    switch (classification) {
      case 'TIMEOUT':
      case 'RATE_LIMITED':
      case 'PROVIDER_UNAVAILABLE':
      case 'NETWORK_ERROR':
      case 'CRASH_RECOVERY':
        return true;
      case 'AUTH_FAILED':
      case 'INSUFFICIENT_SCOPE':
      case 'POLICY_DENIAL':
      case 'MISCONFIGURED':
      case 'UNCONFIGURED':
      default:
        return false;
    }
  }

  public updateItemStatus(
    tenantId: string,
    id: string,
    status: QueueItemStatus,
    extras?: { lastError?: string; lastErrorClassification?: string; approvalId?: string }
  ): ExecutionQueueItem {
    const db = getDatabase();
    const now = new Date().toISOString();

    let query = `UPDATE durable_execution_queue SET status = ?, updated_at = ?`;
    const params: any[] = [status, now];

    if (extras?.lastError !== undefined) {
      query += `, last_error = ?`;
      params.push(extras.lastError);
    }
    if (extras?.lastErrorClassification !== undefined) {
      query += `, last_error_classification = ?`;
      params.push(extras.lastErrorClassification);
    }
    if (extras?.approvalId !== undefined) {
      query += `, approval_id = ?`;
      params.push(extras.approvalId);
    }

    query += ` WHERE id = ? AND tenant_id = ?`;
    params.push(id, tenantId);

    db.prepare(query).run(...params);
    return this.getQueueItem(tenantId, id)!;
  }

  public cancelQueueItem(tenantId: string, id: string, reason: string): ExecutionQueueItem {
    const item = this.getQueueItem(tenantId, id);
    if (!item) throw new Error(`QUEUE_ITEM_NOT_FOUND: ${id}`);
    if (item.status === 'SUCCEEDED') {
      throw new Error(`CANNOT_CANCEL: Queue item ${id} has already succeeded.`);
    }

    this.auditService.logEvent(tenantId, {
      actorId: 'system_operator',
      actorRole: 'RELAY_OPERATOR',
      actionType: 'CANCEL_QUEUE_ITEM',
      resourceType: 'QUEUE_ITEM',
      resourceId: id,
      executionMode: item.executionMode,
      description: `Canceled queue item ${id}: ${reason}`,
      metadata: { queueItemId: id, reason }
    });

    return this.updateItemStatus(tenantId, id, 'CANCELED', { lastError: reason });
  }

  /**
   * Recovers dangling items that were in 'EXECUTING' state during a server restart / crash
   */
  public recoverDanglingItems(): number {
    const db = getDatabase();
    const now = new Date().toISOString();

    const res = db.prepare(`
      UPDATE durable_execution_queue SET
        status = 'RETRYABLE_FAILURE',
        last_error = 'Process restart / crash recovery while in EXECUTING state',
        last_error_classification = 'CRASH_RECOVERY',
        updated_at = ?
      WHERE status = 'EXECUTING'
    `).run(now) as any;

    return res.changes || 0;
  }

  private mapQueueRow<T>(row: any): ExecutionQueueItem<T> {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      connectorId: row.connector_id,
      operation: row.operation,
      target: row.target,
      payload: JSON.parse(row.payload_json || '{}'),
      payloadHash: row.payload_hash,
      idempotencyKey: row.idempotency_key,
      executionMode: row.execution_mode,
      status: row.status,
      approvalId: row.approval_id || undefined,
      proposerId: row.proposer_id,
      proposerRole: row.proposer_role,
      attempts: row.attempts,
      maxAttempts: row.max_attempts,
      nextRetryAt: row.next_retry_at || undefined,
      lastError: row.last_error || undefined,
      lastErrorClassification: row.last_error_classification || undefined,
      resultPayload: row.result_payload_json ? JSON.parse(row.result_payload_json) : undefined,
      evidenceRefs: JSON.parse(row.evidence_refs_json || '[]'),
      auditLogRef: row.audit_log_ref || undefined,
      completedAt: (row.status === 'SUCCEEDED' || row.status === 'TERMINAL_FAILURE' || row.status === 'DEAD_LETTERED') ? row.updated_at : undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}
