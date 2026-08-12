import crypto from 'node:crypto';
import { getDatabase } from '../db/database';

export function canonicalize(obj: any): string {
  if (obj === null || obj === undefined) return 'null';
  if (typeof obj === 'number' || typeof obj === 'boolean') return String(obj);
  if (typeof obj === 'string') return JSON.stringify(obj.replace(/\r\n/g, '\n'));
  if (Array.isArray(obj)) return '[' + obj.map((x) => canonicalize(x)).join(',') + ']';
  if (typeof obj === 'object') {
    const keys = Object.keys(obj).sort();
    return '{' + keys.map((k) => `${JSON.stringify(k)}:${canonicalize(obj[k])}`).join(',') + '}';
  }
  return JSON.stringify(String(obj));
}

export interface StoredApprovalRecord {
  id: string;
  tenantId: string;
  resourceId: string;
  approverId: string;
  approverRole: string;
  decision: string;
  contentHash: string;
  metadataJson: string;
  approvedAt: string;
}

export class LaunchApprovalService {
  computeContentHash(content: any): string {
    const serialized = typeof content === 'string' ? content.replace(/\r\n/g, '\n') : canonicalize(content);
    return crypto.createHash('sha256').update(serialized).digest('hex');
  }

  createApproval(
    tenantId: string,
    resourceId: string,
    approverId: string,
    approverRole: string,
    contentToHash: any,
    metadata: Record<string, any> = {}
  ): StoredApprovalRecord {
    const db = getDatabase();
    const id = `appr-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const approvedAt = new Date().toISOString();
    const contentHash = this.computeContentHash(contentToHash);
    const metadataJson = JSON.stringify(metadata);

    db.prepare(`
      INSERT INTO launch_approvals (id, tenant_id, resource_id, approver_id, approver_role, decision, content_hash, metadata_json, approved_at)
      VALUES (?, ?, ?, ?, ?, 'approved', ?, ?, ?)
    `).run(id, tenantId, resourceId, approverId, approverRole, contentHash, metadataJson, approvedAt);

    return {
      id,
      tenantId,
      resourceId,
      approverId,
      approverRole,
      decision: 'approved',
      contentHash,
      metadataJson,
      approvedAt,
    };
  }

  verifyApproval(
    tenantId: string,
    resourceId: string,
    contentToVerify: any
  ): { valid: boolean; reason?: string; approvalRecord?: StoredApprovalRecord } {
    const db = getDatabase();
    const row = db.prepare(`
      SELECT id, tenant_id, resource_id, approver_id, approver_role, decision, content_hash, metadata_json, approved_at
      FROM launch_approvals
      WHERE tenant_id = ? AND resource_id = ? AND decision = 'approved'
      ORDER BY approved_at DESC
      LIMIT 1
    `).get(tenantId, resourceId) as {
      id: string;
      tenant_id: string;
      resource_id: string;
      approver_id: string;
      approver_role: string;
      decision: string;
      content_hash: string;
      metadata_json: string;
      approved_at: string;
    } | undefined;

    if (!row) {
      return { valid: false, reason: 'NO_APPROVAL_RECORD' };
    }

    const currentHash = this.computeContentHash(contentToVerify);
    if (row.content_hash !== currentHash) {
      return { valid: false, reason: 'APPROVAL_CONTENT_MISMATCH' };
    }

    return {
      valid: true,
      approvalRecord: {
        id: row.id,
        tenantId: row.tenant_id,
        resourceId: row.resource_id,
        approverId: row.approver_id,
        approverRole: row.approver_role,
        decision: row.decision,
        contentHash: row.content_hash,
        metadataJson: row.metadata_json,
        approvedAt: row.approved_at,
      },
    };
  }
}

export const launchApprovalService = new LaunchApprovalService();
