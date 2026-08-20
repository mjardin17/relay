import crypto from 'node:crypto';
import { getDatabase } from '../db/database';
import { redactObject } from '../utils/redaction';

export interface AuditRecord {
  id: string;
  sequenceNumber: number;
  previousEventHash: string;
  eventHash: string;
  previousHash?: string;
  currentHash?: string;
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
  private static instance: LaunchAuditService;

  public static getInstance(): LaunchAuditService {
    if (!LaunchAuditService.instance) {
      LaunchAuditService.instance = new LaunchAuditService();
    }
    return LaunchAuditService.instance;
  }
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

  public logEvent(
    tenantIdOrEvent: string | any,
    maybeEvent?: {
      actorId?: string;
      actorRole?: string;
      actionType?: string;
      action?: string;
      resourceType?: string;
      resourceId?: string;
      executionMode?: string;
      description?: string;
      metadata?: Record<string, any>;
      clientIp?: string;
      endpoint?: string;
      status?: string;
      details?: Record<string, any>;
    }
  ): { id: string; eventHash: string; sequenceNumber: number; previousEventHash: string } {
    let tenantId: string = 'system_global';
    let event: any = {};

    if (typeof tenantIdOrEvent === 'string') {
      tenantId = tenantIdOrEvent;
      event = maybeEvent || {};
    } else if (tenantIdOrEvent && typeof tenantIdOrEvent === 'object') {
      tenantId = tenantIdOrEvent.tenantId || 'system_global';
      event = tenantIdOrEvent;
    }

    const action = event.actionType || event.action || 'EVENT_LOGGED';
    const actorId = event.actorId || 'system';
    const clientIp = event.clientIp || '127.0.0.1';
    const endpoint = event.endpoint || `/api/${event.resourceType?.toLowerCase() || 'events'}`;
    const status = event.status || 'LOGGED';
    const executionMode = event.executionMode || 'DRY_RUN';
    const details = {
      description: event.description,
      resourceType: event.resourceType,
      resourceId: event.resourceId,
      actorRole: event.actorRole,
      ...(event.details || event.metadata || {})
    };

    const res = this.recordAudit({
      tenantId,
      actorId,
      clientIp,
      endpoint,
      action,
      status,
      executionMode,
      details
    });

    return {
      id: res.id,
      eventHash: res.eventHash,
      sequenceNumber: res.sequenceNumber,
      previousEventHash: res.previousEventHash
    };
  }

  public logAuditEvent(event: {
    tenantId?: string;
    actorId?: string;
    action: string;
    endpoint?: string;
    status?: string;
    details?: Record<string, any>;
  }): { id: string; eventHash: string; sequenceNumber: number; previousEventHash: string } {
    return this.logEvent(event.tenantId || 'system_global', {
      actorId: event.actorId,
      action: event.action,
      endpoint: event.endpoint,
      status: event.status,
      details: event.details
    });
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
      previousHash: previousEventHash,
      currentHash: eventHash,
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

  public verifyLedgerIntegrity(tenantIdOrOptions?: string | { tenantId?: string; startSequence?: number; endSequence?: number }): {
    isValid: boolean;
    totalEvents: number;
    genesisHash: string;
    latestHash: string;
    verificationErrors: string[];
  } {
    const db = getDatabase();
    let tenantId: string | undefined;
    let startSequence: number | undefined;
    let endSequence: number | undefined;

    if (typeof tenantIdOrOptions === 'string') {
      tenantId = tenantIdOrOptions;
    } else if (tenantIdOrOptions && typeof tenantIdOrOptions === 'object') {
      tenantId = tenantIdOrOptions.tenantId;
      startSequence = tenantIdOrOptions.startSequence;
      endSequence = tenantIdOrOptions.endSequence;
    }

    let query = `SELECT * FROM launch_audit_logs WHERE sequence_number IS NOT NULL AND canonical_payload_hash IS NOT NULL`;
    const params: any[] = [];
    if (tenantId) {
      query += ` AND tenant_id = ?`;
      params.push(tenantId);
    }
    if (startSequence !== undefined) {
      query += ` AND sequence_number >= ?`;
      params.push(startSequence);
    }
    if (endSequence !== undefined) {
      query += ` AND sequence_number <= ?`;
      params.push(endSequence);
    }
    query += ` ORDER BY sequence_number ASC`;

    const rows = db.prepare(query).all(...params) as any[];
    const errors: string[] = [];

    if (rows.length === 0) {
      return {
        isValid: true,
        totalEvents: 0,
        genesisHash: 'GENESIS_HASH_00000000000000000000000000000000',
        latestHash: 'GENESIS_HASH_00000000000000000000000000000000',
        verificationErrors: []
      };
    }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      // 1. Verify hash chaining continuity against predecessor in the cryptographic ledger
      if (row.sequence_number > 1) {
        const prevRow = db.prepare(`
          SELECT event_hash FROM launch_audit_logs WHERE sequence_number = ?
        `).get(row.sequence_number - 1) as { event_hash: string } | undefined;

        if (prevRow && row.previous_event_hash !== prevRow.event_hash) {
          errors.push(
            `Hash chain break at sequence ${row.sequence_number}: expected previous '${prevRow.event_hash}', got '${row.previous_event_hash}'`
          );
        }
      }

      // 2. Verify canonical payload hash against stored details
      let details = {};
      try {
        details = JSON.parse(row.details_json || '{}');
      } catch {
        details = {};
      }

      const rawPayloadToHash = JSON.stringify({
        tenantId: row.tenant_id || null,
        actorId: row.actor_id || null,
        endpoint: row.endpoint,
        action: row.action,
        status: row.status,
        executionMode: row.execution_mode || 'DRY_RUN',
        idempotencyKey: row.idempotency_key || null,
        details
      });

      const recomputedCanonical = crypto.createHash('sha256').update(rawPayloadToHash).digest('hex');
      if (row.canonical_payload_hash !== recomputedCanonical) {
        errors.push(
          `Payload tampering detected at sequence ${row.sequence_number} (id: ${row.id}): expected canonical hash '${recomputedCanonical}', stored '${row.canonical_payload_hash}'`
        );
      }

      // 3. Verify event hash
      const recomputedEventHash = crypto
        .createHash('sha256')
        .update(`${row.sequence_number}:${row.previous_event_hash}:${row.canonical_payload_hash}:${row.created_at}`)
        .digest('hex');

      if (row.event_hash !== recomputedEventHash) {
        errors.push(
          `Event hash tampering detected at sequence ${row.sequence_number} (id: ${row.id}): expected '${recomputedEventHash}', stored '${row.event_hash}'`
        );
      }
    }

    return {
      isValid: errors.length === 0,
      totalEvents: rows.length,
      genesisHash: rows[0].previous_event_hash || 'GENESIS_HASH_00000000000000000000000000000000',
      latestHash: rows[rows.length - 1].event_hash || '',
      verificationErrors: errors
    };
  }
}

export const launchAuditService = new LaunchAuditService();
