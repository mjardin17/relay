import { getDatabase } from '../db/database';

export interface VerifiedSession {
  token: string;
  userId: string;
  tenantId: string;
  role: string;
  permissions: string[];
  expiresAt: string;
}

export class AuthService {
  verifySession(token: string): VerifiedSession | null {
    if (!token || typeof token !== 'string' || token.trim() === '') return null;

    try {
      const db = getDatabase();
      // Join with actors table to verify that the actor still exists and matches tenant
      const row = db.prepare(`
        SELECT s.token, s.actor_id, a.tenant_id, a.role AS current_role, s.permissions_json, s.expires_at
        FROM auth_sessions s
        JOIN actors a ON a.id = s.actor_id
        WHERE s.token = ?
      `).get(token) as {
        token: string;
        actor_id: string;
        tenant_id: string;
        current_role: string;
        permissions_json: string;
        expires_at: string;
      } | undefined;

      if (!row) {
        return null;
      }

      // Check expiration
      if (new Date(row.expires_at).getTime() < Date.now()) {
        return null;
      }

      let permissions: string[] = [];
      try {
        permissions = JSON.parse(row.permissions_json);
      } catch {
        permissions = [];
      }

      return {
        token: row.token,
        userId: row.actor_id,
        tenantId: row.tenant_id,
        role: row.current_role || 'member',
        permissions,
        expiresAt: row.expires_at,
      };
    } catch (err) {
      console.error('[AuthService] verifySession error:', err);
      return null;
    }
  }

  hasPermission(session: VerifiedSession, requiredPermission: string): boolean {
    if (!session) return false;
    if (session.role === 'owner') return true;
    return session.permissions.includes(requiredPermission) || session.permissions.includes('*');
  }
}

export const authService = new AuthService();
