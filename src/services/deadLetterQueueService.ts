import { getDatabase } from '../db/database';
import { DeadLetterRecord, ExecutionQueueItem } from '../types/connectorRegistry';
import { LaunchAuditService } from './launchAuditService';
import { EvidenceGraphService } from './evidenceGraphService';

export class DeadLetterQueueService {
  private static instance: DeadLetterQueueService;
  private auditService: LaunchAuditService;
  private evidenceGraph: EvidenceGraphService;

  private constructor() {
    this.auditService = LaunchAuditService.getInstance();
    this.evidenceGraph = EvidenceGraphService.getInstance();
  }

  public static getInstance(): DeadLetterQueueService {
    if (!DeadLetterQueueService.instance) {
      DeadLetterQueueService.instance = new DeadLetterQueueService();
    }
    return DeadLetterQueueService.instance;
  }

  public moveToDeadLetter(
    queueItem: ExecutionQueueItem,
    failureClassification: string,
    notes?: string
  ): DeadLetterRecord {
    const db = getDatabase();
    const now = new Date().toISOString();
    const dlqId = `dlq_${queueItem.tenantId}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    // Attach evidence node
    const evNode = this.evidenceGraph.recordNode(queueItem.tenantId, {
      type: 'FAILURE_EVENT',
      sourceLevel: 'INTEGRATION_PROVIDER',
      title: `Dead Letter Queue: ${queueItem.operation} on ${queueItem.target}`,
      summary: `Queue item ${queueItem.id} dead-lettered after ${queueItem.attempts} attempts. Failure: ${failureClassification}`,
      data: {
        dlqId,
        queueItemId: queueItem.id,
        connectorId: queueItem.connectorId,
        operation: queueItem.operation,
        target: queueItem.target,
        attempts: queueItem.attempts,
        failureClassification,
        lastError: queueItem.lastError
      }
    });

    const updatedEvidenceRefs = Array.from(new Set([...(queueItem.evidenceRefs || []), evNode.id]));

    // Audit log
    const auditRecord = this.auditService.logEvent(queueItem.tenantId, {
      actorId: 'system_dlq_router',
      actorRole: 'RELAY_OPERATOR',
      actionType: 'DEAD_LETTER_ITEM',
      resourceType: 'QUEUE_ITEM',
      resourceId: queueItem.id,
      executionMode: queueItem.executionMode,
      description: `Item moved to Dead Letter Queue [${failureClassification}]: ${queueItem.operation} (${queueItem.attempts} attempts)`,
      metadata: {
        dlqId,
        queueItemId: queueItem.id,
        connectorId: queueItem.connectorId,
        failureClassification,
        evidenceRef: evNode.id
      }
    });

    const stmt = db.prepare(`
      INSERT INTO dead_letter_queue (
        id, queue_item_id, tenant_id, connector_id, operation,
        sanitized_failure_classification, retry_count, last_attempt_at,
        next_operator_action, evidence_refs_json, audit_log_ref,
        status, resolution_notes, created_at, resolved_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'INSPECT', ?, ?, 'ACTIVE', ?, ?, NULL)
      ON CONFLICT(queue_item_id) DO UPDATE SET
        sanitized_failure_classification = excluded.sanitized_failure_classification,
        retry_count = excluded.retry_count,
        last_attempt_at = excluded.last_attempt_at,
        evidence_refs_json = excluded.evidence_refs_json,
        audit_log_ref = excluded.audit_log_ref,
        status = 'ACTIVE',
        resolution_notes = excluded.resolution_notes
    `);

    stmt.run(
      dlqId,
      queueItem.id,
      queueItem.tenantId,
      queueItem.connectorId,
      queueItem.operation,
      failureClassification,
      queueItem.attempts,
      now,
      JSON.stringify(updatedEvidenceRefs),
      auditRecord.id,
      notes || queueItem.lastError || null,
      now
    );

    // Update queue item status to DEAD_LETTERED
    db.prepare(`
      UPDATE durable_execution_queue SET
        status = 'DEAD_LETTERED',
        evidence_refs_json = ?,
        updated_at = ?
      WHERE id = ? AND tenant_id = ?
    `).run(
      JSON.stringify(updatedEvidenceRefs),
      now,
      queueItem.id,
      queueItem.tenantId
    );

    return {
      id: dlqId,
      queueItemId: queueItem.id,
      tenantId: queueItem.tenantId,
      connectorId: queueItem.connectorId,
      operation: queueItem.operation,
      sanitizedFailureClassification: failureClassification,
      retryCount: queueItem.attempts,
      lastAttemptAt: now,
      nextOperatorAction: 'INSPECT',
      evidenceRefs: updatedEvidenceRefs,
      auditLogRef: auditRecord.id,
      status: 'ACTIVE',
      resolutionNotes: notes || queueItem.lastError,
      createdAt: now
    };
  }

  public listDLQ(tenantId: string, filter?: { status?: string }): DeadLetterRecord[] {
    const db = getDatabase();
    let query = `SELECT * FROM dead_letter_queue WHERE tenant_id = ?`;
    const params: any[] = [tenantId];

    if (filter?.status) {
      query += ` AND status = ?`;
      params.push(filter.status);
    }
    query += ` ORDER BY created_at DESC`;

    const rows = db.prepare(query).all(...params) as any[];
    return rows.map(r => this.mapDLQRow(r));
  }

  public listDeadLetterItems(tenantId: string, filter?: { status?: string }): DeadLetterRecord[] {
    return this.listDLQ(tenantId, filter);
  }

  public getDLQItem(tenantId: string, dlqId: string): DeadLetterRecord | null {
    const db = getDatabase();
    const row = db.prepare(`SELECT * FROM dead_letter_queue WHERE tenant_id = ? AND id = ?`).get(tenantId, dlqId) as any;
    if (!row) return null;
    return this.mapDLQRow(row);
  }

  public resolveDLQ(
    tenantId: string,
    dlqId: string,
    action: 'RETRIED' | 'CANCELLED' | 'SUPERSEDED',
    operatorId: string,
    notes?: string
  ): DeadLetterRecord {
    const existing = this.getDLQItem(tenantId, dlqId);
    if (!existing) {
      throw new Error(`DLQ_RECORD_NOT_FOUND: ${dlqId}`);
    }

    const db = getDatabase();
    const now = new Date().toISOString();

    const audit = this.auditService.logEvent(tenantId, {
      actorId: operatorId,
      actorRole: 'RELAY_OPERATOR',
      actionType: 'RESOLVE_DLQ_ITEM',
      resourceType: 'DEAD_LETTER_QUEUE',
      resourceId: dlqId,
      executionMode: 'LIVE',
      description: `DLQ Item ${dlqId} resolved as ${action}. Notes: ${notes || 'None'}`,
      metadata: { dlqId, action, operatorId, notes }
    });

    db.prepare(`
      UPDATE dead_letter_queue SET
        status = ?,
        resolution_notes = ?,
        resolved_at = ?
      WHERE tenant_id = ? AND id = ?
    `).run(action, notes || existing.resolutionNotes || null, now, tenantId, dlqId);

    return this.getDLQItem(tenantId, dlqId)!;
  }

  private mapDLQRow(r: any): DeadLetterRecord {
    return {
      id: r.id,
      queueItemId: r.queue_item_id,
      tenantId: r.tenant_id,
      connectorId: r.connector_id,
      operation: r.operation,
      sanitizedFailureClassification: r.sanitized_failure_classification,
      retryCount: r.retry_count,
      lastAttemptAt: r.last_attempt_at,
      nextOperatorAction: r.next_operator_action,
      evidenceRefs: JSON.parse(r.evidence_refs_json || '[]'),
      auditLogRef: r.audit_log_ref,
      status: r.status,
      resolutionNotes: r.resolution_notes || undefined,
      createdAt: r.created_at,
      resolvedAt: r.resolved_at || undefined
    };
  }
}
