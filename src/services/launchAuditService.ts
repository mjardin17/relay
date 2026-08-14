import crypto from 'node:crypto';
import { getDatabase } from '../db/database';
import { redactObject } from '../utils/redaction';

export interface AuditRecord {
  id: string;
  sequenceNumber: number;
  previousEventHash: string;
  eventHash: string;
  canonicalPayloadHash: string;
  executionMode: string;
  tenantId: string | null;
  actorId: string | null;
  clientIp: string;
  endpoint: string;
  action: string;
  status: string;
  idempotencyKey?: string;
  details: Record<string, any>;
  createdAt: string;
}

export class LaunchAuditService {
  /**
   * Redacts sensitive data from audit payloads:
   * - Private street addresses & location details
   * - Email addresses & phone numbers
   * - Message bodies, prompt texts, credentials, tokens, secret keys, passwords
   */
  redactSensitiveData(obj: any, visited = new WeakSet()): any {
    return redactObject(obj, visited);
  }

  public sanitizeIp(ip: string): string {
    if (!ip) return '0.0.0.x';
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.x`;
    }
    return '0.0.0.x';
  }

  recordAudit(entry: {
    tenantId?: string | null;
    actorId?: string | null;
    clientIp: string;
    endpoint: string;
    action: string;
    status: string;
    executionMode?: string;
    idempotencyKey?: string;
    details: Record<string, any>;
  }): AuditRecord {
    const db = getDatabase();
    const id = `audit-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const createdAt = new Date().toISOString();
    const executionMode = entry.executionMode || 'DRY_RUN';
    const sanitizedIp = this.sanitizeIp(entry.clientIp);
    const redactedDetails = this.redactSensitiveData(entry.details || {});
    const detailsJson = JSON.stringify(redactedDetails);

    // Get current max sequence number & previous event hash
    let sequenceNumber = 1;
    let previousEventHash = 'GENESIS_HASH_00000000000000000000000000000000';

    try {
      const lastRow = db.prepare(`
        SELECT sequence_number, event_hash
        FROM launch_audit_logs
        WHERE sequence_number IS NOT NULL
        ORDER BY sequence_number DESC
        LIMIT 1
      `).get() as { sequence_number: number; event_hash: string } | undefined;

      if (lastRow && lastRow.sequence_number) {
        sequenceNumber = lastRow.sequence_number + 1;
        previousEventHash = lastRow.event_hash || previousEventHash;
      }
    } catch {
      // Fallback
    }

    const rawPayloadToHash = JSON.stringify({
      tenantId: entry.tenantId || null,
      actorId: entry.actorId || null,
      endpoint: entry.endpoint,
      action: entry.action,
      status: entry.status,
      executionMode,
      idempotencyKey: entry.idempotencyKey || null,
      details: redactedDetails
    });

    const canonicalPayloadHash = crypto.createHash('sha256').update(rawPayloadToHash).digest('hex');
    const eventHash = crypto
      .createHash('sha256')
      .update(`${sequenceNumber}:${previousEventHash}:${canonicalPayloadHash}:${createdAt}`)
      .digest('hex');

    try {
      db.prepare(`
        INSERT INTO launch_audit_logs (
          id, sequence_number, previous_event_hash, event_hash, canonical_payload_hash,
          execution_mode, tenant_id, actor_id, client_ip, endpoint, action, status, idempotency_key, details_json, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        sequenceNumber,
        previousEventHash,
        eventHash,
        canonicalPayloadHash,
        executionMode,
        entry.tenantId || null,
        entry.actorId || null,
        sanitizedIp,
        entry.endpoint,
        entry.action,
        entry.status,
        entry.idempotencyKey || null,
        detailsJson,
        createdAt
      );
    } catch (err: any) {
      console.error('[LaunchAuditService] Insert error:', err.message);
    }

    return {
      id,
      sequenceNumber,
      previousEventHash,
      eventHash,
      canonicalPayloadHash,
      executionMode,
      tenantId: entry.tenantId || null,
      actorId: entry.actorId || null,
      clientIp: sanitizedIp,
      endpoint: entry.endpoint,
      action: entry.action,
      status: entry.status,
      idempotencyKey: entry.idempotencyKey,
      details: redactedDetails,
      createdAt,
    };
  }

  getTenantAuditLogs(tenantId: string, limit = 100): AuditRecord[] {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT id, sequence_number, previous_event_hash, event_hash, canonical_payload_hash, execution_mode, tenant_id, actor_id, client_ip, endpoint, action, status, idempotency_key, details_json, created_at
      FROM launch_audit_logs
      WHERE tenant_id = ?
      ORDER BY sequence_number DESC
      LIMIT ?
    `).all(tenantId, limit) as Array<{
      id: string;
      sequence_number: number | null;
      previous_event_hash: string | null;
      event_hash: string | null;
      canonical_payload_hash: string | null;
      execution_mode: string | null;
      tenant_id: string;
      actor_id: string | null;
      client_ip: string;
      endpoint: string;
      action: string;
      status: string;
      idempotency_key: string | null;
      details_json: string;
      created_at: string;
    }>;

    return rows.map((r) => {
      let details = {};
      try {
        details = JSON.parse(r.details_json);
      } catch {
        details = {};
      }
      return {
        id: r.id,
        sequenceNumber: r.sequence_number || 0,
        previousEventHash: r.previous_event_hash || '',
        eventHash: r.event_hash || '',
        canonicalPayloadHash: r.canonical_payload_hash || '',
        executionMode: r.execution_mode || 'DRY_RUN',
        tenantId: r.tenant_id,
        actorId: r.actor_id,
        clientIp: r.client_ip,
        endpoint: r.endpoint,
        action: r.action,
        status: r.status,
        idempotencyKey: r.idempotency_key || undefined,
        details,
        createdAt: r.created_at,
      };
    });
  }
}

export const launchAuditService = new LaunchAuditService();
