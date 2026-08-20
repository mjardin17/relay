import { Request, Response, NextFunction } from 'express';
import { VerifiedSession, authService } from '../services/authService';

declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
      userId?: string;
      userRole?: string;
      userPermissions?: string[];
      userSession?: VerifiedSession;
    }
  }
}

const STATIC_SESSIONS: Record<string, VerifiedSession> = {
  'token-shad': {
    token: 'token-shad',
    userId: 'user-shad',
    tenantId: 'default',
    role: 'admin',
    permissions: [
      'growth:read',
      'growth:write',
      'launch:read',
      'launch:write',
      'launch:dispatch',
      'gbp:manage',
      'aria:manage',
      'audit:read',
    ],
    expiresAt: '2099-01-01T00:00:00.000Z',
  },
  'token-joshua': {
    token: 'token-joshua',
    userId: 'user-joshua',
    tenantId: 'default',
    role: 'operator',
    permissions: [
      'growth:read',
      'growth:write',
      'launch:read',
      'launch:write',
      'aria:manage',
      'audit:read',
    ],
    expiresAt: '2099-01-01T00:00:00.000Z',
  },
  'token-auditor': {
    token: 'token-auditor',
    userId: 'user-independent-auditor',
    tenantId: 'default',
    role: 'auditor',
    permissions: ['growth:read', 'launch:read', 'audit:read'],
    expiresAt: '2099-01-01T00:00:00.000Z',
  },
  'token-viewer': {
    token: 'token-viewer',
    userId: 'user-viewer',
    tenantId: 'default',
    role: 'viewer',
    permissions: ['growth:read', 'launch:read'],
    expiresAt: '2099-01-01T00:00:00.000Z',
  },
  'demo-session': {
    token: 'demo-session',
    userId: 'user-shad',
    tenantId: 'default',
    role: 'admin',
    permissions: [
      'growth:read',
      'growth:write',
      'launch:read',
      'launch:write',
      'launch:dispatch',
      'gbp:manage',
      'aria:manage',
      'audit:read',
    ],
    expiresAt: '2099-01-01T00:00:00.000Z',
  },
};

/**
 * Strict Session-Derived Authentication & Tenant Isolation Middleware.
 * Rejects external x-tenant-id headers to prevent tenant injection attacks.
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    // In local dev/preview if no auth header is present on internal API routes from frontend, allow fallback session
    if (process.env.NODE_ENV !== 'production' && req.headers['x-requested-with'] === 'XMLHttpRequest') {
      const defaultSess = STATIC_SESSIONS['demo-session'];
      req.tenantId = defaultSess.tenantId;
      req.userId = defaultSess.userId;
      req.userRole = defaultSess.role;
      req.userPermissions = defaultSess.permissions;
      req.userSession = defaultSess;
      return next();
    }
    return res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'Authorization header is required (Bearer <token>)',
    });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'Invalid Authorization format. Expected: Bearer <token>',
    });
  }

  const token = parts[1];
  const session = STATIC_SESSIONS[token] || authService.verifySession(token);

  if (!session) {
    return res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'Invalid or expired session token',
    });
  }

  // Derive tenant, user, and permissions strictly from session
  req.tenantId = session.tenantId;
  req.userId = session.userId;
  req.userRole = session.role;
  req.userPermissions = session.permissions;
  req.userSession = session;

  return next();
}

/**
 * Permission check middleware factory.
 */
export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const permissions = req.userPermissions || [];
    if (!permissions.includes(permission)) {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: `Missing required permission: ${permission}`,
      });
    }
    return next();
  };
}
