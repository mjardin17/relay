import crypto from 'node:crypto';
import { getDatabase } from '../db/database';
import { canonicalize } from './launchApprovalService';

export interface IdempotencyCheckResult {
  isCached: boolean;
  isConflict: boolean;
  isInProgress?: boolean;
  response?: any;
  errorMessage?: string;
}

export class LaunchIdempotencyService {
  computeRequestHash(body: any): string {
    const serialized = typeof body === 'string' ? body.replace(/\r\n/g, '\n') : canonicalize(body || {});
    return crypto.createHash('sha256').update(serialized).digest('hex');
  }

  claimIdempotency(
    tenantId: string,
    operation: string,
    key: string,
    requestBody: any
  ): IdempotencyCheckResult {
    if (!key) {
      return { isCached: false, isConflict: false };
    }

    const db = getDatabase();
    const currentHash = this.computeRequestHash(requestBody);

    try {
      db.exec('BEGIN IMMEDIATE;');

      const row = db.prepare(`
        SELECT request_hash, response_json
        FROM launch_idempotency
        WHERE tenant_id = ? AND operation = ? AND idempotency_key = ?
      `).get(tenantId, operation, key) as {
        request_hash: string;
        response_json: string | null;
      } | undefined;

      if (row) {
        db.exec('COMMIT;');

        if (row.request_hash !== currentHash) {
          return {
            isCached: false,
            isConflict: true,
            errorMessage: 'Idempotency key was previously used with a different request payload body.',
          };
        }

        if (row.response_json === null) {
          return {
            isCached: false,
            isConflict: true,
            isInProgress: true,
            errorMessage: 'An identical request with this idempotency key is currently executing.',
          };
        }

        let parsedResponse = {};
        try {
          parsedResponse = JSON.parse(row.response_json);
        } catch {
          parsedResponse = {};
        }

        return {
          isCached: true,
          isConflict: false,
          response: parsedResponse,
        };
      }

      // Reserve key in progress
      const createdAt = new Date().toISOString();
      db.prepare(`
        INSERT INTO launch_idempotency (tenant_id, operation, idempotency_key, request_hash, response_json, created_at)
        VALUES (?, ?, ?, ?, '{}', ?)
      `).run(tenantId, operation, key, currentHash, createdAt);

      db.exec('COMMIT;');
      return { isCached: false, isConflict: false };
    } catch (err) {
      try { db.exec('ROLLBACK;'); } catch {}
      console.error('[LaunchIdempotencyService] claim error:', err);
      return { isCached: false, isConflict: false };
    }
  }

  checkIdempotency(
    tenantId: string,
    operation: string,
    key: string,
    requestBody: any
  ): IdempotencyCheckResult {
    return this.claimIdempotency(tenantId, operation, key, requestBody);
  }

  saveIdempotency(
    tenantId: string,
    operation: string,
    key: string,
    requestBody: any,
    responseData: any
  ): void {
    if (!key) return;

    try {
      const db = getDatabase();
      const requestHash = this.computeRequestHash(requestBody);
      const responseJson = JSON.stringify(responseData);
      const createdAt = new Date().toISOString();

      db.prepare(`
        INSERT INTO launch_idempotency (tenant_id, operation, idempotency_key, request_hash, response_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(tenant_id, operation, idempotency_key) DO UPDATE SET
          request_hash = excluded.request_hash,
          response_json = excluded.response_json,
          created_at = excluded.created_at
      `).run(tenantId, operation, key, requestHash, responseJson, createdAt);
    } catch (err) {
      console.error('[LaunchIdempotencyService] save error:', err);
    }
  }
}

export const launchIdempotencyService = new LaunchIdempotencyService();
