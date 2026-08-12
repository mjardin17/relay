import crypto from 'node:crypto';
import { getDatabase } from '../db/database';
import { redactObject } from '../utils/redaction';

export interface AuditRecord {
  id: string;
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
   * - Email addresses
   * - Message bodies, prompt texts, credentials, tokens, secret keys, passwords
   */
  redactSensitiveData(obj: any, visited = new WeakSet()): any {
    return redactObject(obj, visited);
  }

  recordAudit(entry: {
    tenantId?: string | null;
    actorId?: string | null;
    clientIp: string;
    endpoint: string;
    action: string;
    status: string;
    idempotencyKey?: string;
    details: Record<string, any>;
  }): AuditRecord {
    const db = getDatabase();
    const id = `audit-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const createdAt = new Date().toISOString();
    const redactedDetails = this.redactSensitiveData(entry.details || {});
    const detailsJson = JSON.stringify(redactedDetails);

    db.prepare(`
      INSERT INTO launch_audit_logs (id, tenant_id, actor_id, client_ip, endpoint, action, status, idempotency_key, details_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      entry.tenantId || null,
      entry.actorId || null,
      entry.clientIp,
      entry.endpoint,
      entry.action,
      entry.status,
      entry.idempotencyKey || null,
      detailsJson,
      createdAt
    );

    return {
      id,
      tenantId: entry.tenantId,
      actorId: entry.actorId || null,
      clientIp: entry.clientIp,
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
      SELECT id, tenant_id, actor_id, client_ip, endpoint, action, status, idempotency_key, details_json, created_at
      FROM launch_audit_logs
      WHERE tenant_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `).all(tenantId, limit) as Array<{
      id: string;
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
