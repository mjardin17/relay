import { getDatabase } from '../db/database';
import { EmergencyControlRecord, EmergencyPauseScope } from '../types/connectorRegistry';
import { LaunchAuditService } from './launchAuditService';
import { EvidenceGraphService } from './evidenceGraphService';

export class EmergencyControlService {
  private static instance: EmergencyControlService;
  private auditService: LaunchAuditService;
  private evidenceGraph: EvidenceGraphService;

  private constructor() {
    this.auditService = LaunchAuditService.getInstance();
    this.evidenceGraph = EvidenceGraphService.getInstance();
  }

  public static getInstance(): EmergencyControlService {
    if (!EmergencyControlService.instance) {
      EmergencyControlService.instance = new EmergencyControlService();
    }
    return EmergencyControlService.instance;
  }

  public isExecutionBlocked(
    tenantId?: string,
    connectorId?: string,
    capability?: string
  ): { blocked: boolean; scope?: EmergencyPauseScope; reason?: string; pausedAt?: string } {
    const db = getDatabase();

    // 1. Check Global Pause
    const globalPause = db.prepare(`
      SELECT * FROM emergency_controls 
      WHERE scope = 'GLOBAL' AND is_paused = 1 
      ORDER BY paused_at DESC LIMIT 1
    `).get() as any;

    if (globalPause) {
      return {
        blocked: true,
        scope: 'GLOBAL',
        reason: `Global emergency stop active: ${globalPause.reason}`,
        pausedAt: globalPause.paused_at
      };
    }

    if (!tenantId) return { blocked: false };

    // 2. Check Tenant-Level Pause
    const tenantPause = db.prepare(`
      SELECT * FROM emergency_controls 
      WHERE scope = 'TENANT' AND tenant_id = ? AND is_paused = 1 
      ORDER BY paused_at DESC LIMIT 1
    `).get(tenantId) as any;

    if (tenantPause) {
      return {
        blocked: true,
        scope: 'TENANT',
        reason: `Tenant emergency stop active: ${tenantPause.reason}`,
        pausedAt: tenantPause.paused_at
      };
    }

    // 3. Check Connector-Level Pause
    if (connectorId) {
      const connectorPause = db.prepare(`
        SELECT * FROM emergency_controls 
        WHERE scope = 'CONNECTOR' AND (tenant_id = ? OR tenant_id IS NULL) AND target_identifier = ? AND is_paused = 1 
        ORDER BY paused_at DESC LIMIT 1
      `).get(tenantId, connectorId) as any;

      if (connectorPause) {
        return {
          blocked: true,
          scope: 'CONNECTOR',
          reason: `Connector emergency stop active for ${connectorId}: ${connectorPause.reason}`,
          pausedAt: connectorPause.paused_at
        };
      }
    }

    // 4. Check Capability-Level Pause
    if (capability) {
      const capPause = db.prepare(`
        SELECT * FROM emergency_controls 
        WHERE scope = 'CAPABILITY' AND (tenant_id = ? OR tenant_id IS NULL) AND target_identifier = ? AND is_paused = 1 
        ORDER BY paused_at DESC LIMIT 1
      `).get(tenantId, capability) as any;

      if (capPause) {
        return {
          blocked: true,
          scope: 'CAPABILITY',
          reason: `Capability emergency stop active for ${capability}: ${capPause.reason}`,
          pausedAt: capPause.paused_at
        };
      }
    }

    return { blocked: false };
  }

  public pause(params: {
    scope: EmergencyPauseScope;
    tenantId?: string;
    targetIdentifier?: string;
    reason: string;
    pausedBy: string;
  }): EmergencyControlRecord {
    const db = getDatabase();
    const now = new Date().toISOString();
    const id = `emg_${params.scope.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    // Record audit event
    const auditRecord = this.auditService.logEvent(params.tenantId || 'system_global', {
      actorId: params.pausedBy,
      actorRole: 'RELAY_OPERATOR',
      actionType: 'EMERGENCY_STOP',
      resourceType: 'EMERGENCY_CONTROL',
      resourceId: id,
      executionMode: 'LIVE',
      description: `Emergency Stop activated [${params.scope}]: ${params.reason} (Target: ${params.targetIdentifier || 'ALL'})`,
      metadata: {
        scope: params.scope,
        tenantId: params.tenantId,
        targetIdentifier: params.targetIdentifier,
        reason: params.reason
      }
    });

    const stmt = db.prepare(`
      INSERT INTO emergency_controls (
        id, tenant_id, scope, target_identifier, is_paused, reason,
        paused_by, audit_log_ref, paused_at, resumed_at, resumed_by
      ) VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, NULL, NULL)
    `);

    stmt.run(
      id,
      params.tenantId || null,
      params.scope,
      params.targetIdentifier || null,
      params.reason,
      params.pausedBy,
      auditRecord.id,
      now
    );

    return {
      id,
      tenantId: params.tenantId,
      scope: params.scope,
      targetIdentifier: params.targetIdentifier,
      isPaused: true,
      reason: params.reason,
      pausedBy: params.pausedBy,
      auditLogRef: auditRecord.id,
      pausedAt: now
    };
  }

  public resume(params: {
    scope: EmergencyPauseScope;
    tenantId?: string;
    targetIdentifier?: string;
    resumedBy: string;
    reason?: string;
  }): boolean {
    const db = getDatabase();
    const now = new Date().toISOString();

    let query = `
      UPDATE emergency_controls SET
        is_paused = 0,
        resumed_at = ?,
        resumed_by = ?
      WHERE scope = ? AND is_paused = 1
    `;
    const queryParams: any[] = [now, params.resumedBy, params.scope];

    if (params.tenantId) {
      query += ` AND tenant_id = ?`;
      queryParams.push(params.tenantId);
    }
    if (params.targetIdentifier) {
      query += ` AND target_identifier = ?`;
      queryParams.push(params.targetIdentifier);
    }

    const res = (db.prepare(query).run(...queryParams) as any).changes;

    if (res > 0) {
      this.auditService.logEvent(params.tenantId || 'system_global', {
        actorId: params.resumedBy,
        actorRole: 'RELAY_OPERATOR',
        actionType: 'EMERGENCY_RESUME',
        resourceType: 'EMERGENCY_CONTROL',
        resourceId: `resume_${params.scope}_${Date.now()}`,
        executionMode: 'LIVE',
        description: `Emergency Stop resumed [${params.scope}] by ${params.resumedBy}. Reason: ${params.reason || 'Normal operation restored'}`,
        metadata: {
          scope: params.scope,
          tenantId: params.tenantId,
          targetIdentifier: params.targetIdentifier
        }
      });
      return true;
    }
    return false;
  }

  public getEmergencyControls(tenantId?: string): EmergencyControlRecord[] {
    const db = getDatabase();
    let rows: any[];
    if (tenantId) {
      rows = db.prepare(`
        SELECT * FROM emergency_controls 
        WHERE tenant_id = ? OR scope = 'GLOBAL' 
        ORDER BY paused_at DESC
      `).all(tenantId);
    } else {
      rows = db.prepare(`
        SELECT * FROM emergency_controls ORDER BY paused_at DESC
      `).all();
    }

    return rows.map(r => ({
      id: r.id,
      tenantId: r.tenant_id || undefined,
      scope: r.scope,
      targetIdentifier: r.target_identifier || undefined,
      isPaused: r.is_paused === 1,
      reason: r.reason,
      pausedBy: r.paused_by,
      auditLogRef: r.audit_log_ref,
      pausedAt: r.paused_at,
      resumedAt: r.resumed_at || undefined,
      resumedBy: r.resumed_by || undefined
    }));
  }
}
