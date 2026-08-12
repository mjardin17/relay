import { getDatabase } from '../db/database';

export class LaunchRateLimitService {
  checkRateLimit(
    limitKey: string,
    maxHits: number,
    windowMs: number
  ): { allowed: boolean; currentHits: number; resetAt: string } {
    const db = getDatabase();
    const now = Date.now();
    const windowStart = Math.floor(now / windowMs) * windowMs;
    const resetAt = new Date(windowStart + windowMs).toISOString();
    const fullKey = `${limitKey}:${windowStart}`;

    try {
      db.exec('BEGIN IMMEDIATE;');

      const row = db.prepare(`
        SELECT hits FROM launch_rate_limits WHERE key = ?
      `).get(fullKey) as { hits: number } | undefined;

      let currentHits = 1;
      if (row) {
        currentHits = row.hits + 1;
        db.prepare(`UPDATE launch_rate_limits SET hits = ? WHERE key = ?`).run(currentHits, fullKey);
      } else {
        db.prepare(`INSERT INTO launch_rate_limits (key, hits, reset_at) VALUES (?, 1, ?)`).run(fullKey, resetAt);
      }

      db.exec('COMMIT;');

      return {
        allowed: currentHits <= maxHits,
        currentHits,
        resetAt,
      };
    } catch (err) {
      try {
        db.exec('ROLLBACK;');
      } catch {}
      console.error('[LaunchRateLimitService] error:', err);
      return { allowed: true, currentHits: 1, resetAt };
    }
  }
}

export const launchRateLimitService = new LaunchRateLimitService();
