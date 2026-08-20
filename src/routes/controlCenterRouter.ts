import express, { Request, Response } from 'express';
import { getDatabase } from '../db/database';
import { authMiddleware } from '../middleware/authMiddleware';
import { EmergencyControlService } from '../services/emergencyControlService';
import { AuthoritativeConnectorRegistryService } from '../services/authoritativeConnectorRegistryService';

export const controlCenterRouter = express.Router();
controlCenterRouter.use(authMiddleware);

// 1. Control Center Summary (Session-scoped metrics)
controlCenterRouter.get('/summary', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const tenantId = (req as any).tenantId;
    const userRole = ((req as any).userRole || '').toUpperCase();
    const isGlobalAdmin = (userRole === 'OWNER' || userRole === 'ADMIN') && (tenantId === 'default' || tenantId === 'system_global');

    const tenantCount = isGlobalAdmin
      ? (db.prepare('SELECT COUNT(*) as c FROM tenants').get() as any)?.c || 0
      : (db.prepare('SELECT COUNT(*) as c FROM tenants WHERE id = ?').get(tenantId) as any)?.c || 1;

    const leadsCount = (db.prepare('SELECT COUNT(*) as c FROM leads WHERE tenant_id = ?').get(tenantId) as any)?.c || 0;
    const oppsCount = (db.prepare('SELECT COUNT(*) as c FROM opportunities WHERE tenant_id = ?').get(tenantId) as any)?.c || 0;
    const queuePendingCount = (db.prepare("SELECT COUNT(*) as c FROM durable_execution_queue WHERE tenant_id = ? AND status = 'QUEUED'").get(tenantId) as any)?.c || 0;
    const dlqCount = (db.prepare("SELECT COUNT(*) as c FROM dead_letter_queue WHERE tenant_id = ? AND status = 'ACTIVE'").get(tenantId) as any)?.c || 0;
    const websitePagesCount = (db.prepare('SELECT COUNT(*) as c FROM website_pages WHERE tenant_id = ?').get(tenantId) as any)?.c || 0;
    const postsCount = (db.prepare('SELECT COUNT(*) as c FROM gbp_posts WHERE tenant_id = ?').get(tenantId) as any)?.c || 0;
    const universalActionsCount = (db.prepare('SELECT COUNT(*) as c FROM universal_action_records WHERE tenant_id = ?').get(tenantId) as any)?.c || 0;

    const emergency = EmergencyControlService.getInstance().getEmergencyStatus(tenantId);
    const connectorService = AuthoritativeConnectorRegistryService.getInstance();
    const connectors = connectorService.listTenantConnectors(tenantId);
    const verifiedConnectorsCount = connectors.filter((c) => c.connectionState === 'VERIFIED').length;

    res.json({
      success: true,
      summary: {
        tenants: tenantCount,
        leads: leadsCount,
        opportunities: oppsCount,
        universalActions: universalActionsCount,
        queuePending: queuePendingCount,
        dlqActive: dlqCount,
        websitePages: websitePagesCount,
        socialPosts: postsCount,
        connectorsConfigured: connectors.length,
        connectorsVerified: verifiedConnectorsCount,
        isEmergencyPaused: emergency.isEmergencyPaused,
        emergencyReason: emergency.reason
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to fetch summary' });
  }
});

// 2. Tenants (Session-scoped)
controlCenterRouter.get('/tenants', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const tenantId = (req as any).tenantId;
    const userRole = ((req as any).userRole || '').toUpperCase();
    const isGlobalAdmin = (userRole === 'OWNER' || userRole === 'ADMIN') && (tenantId === 'default' || tenantId === 'system_global');

    const tenants = isGlobalAdmin
      ? (db.prepare('SELECT * FROM tenants ORDER BY created_at DESC').all() as any[])
      : (db.prepare('SELECT * FROM tenants WHERE id = ?').all(tenantId) as any[]);

    const locations = isGlobalAdmin
      ? (db.prepare('SELECT * FROM tenant_locations').all() as any[])
      : (db.prepare('SELECT * FROM tenant_locations WHERE tenant_id = ?').all(tenantId) as any[]);

    const enriched = tenants.map((t) => ({
      ...t,
      locations: locations.filter((l) => l.tenant_id === t.id)
    }));

    res.json({ success: true, tenants: enriched });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to fetch tenants' });
  }
});

// 3. AI Workforce & Execution Records (Derived dynamically from SQLite records)
controlCenterRouter.get('/workforce', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const tenantId = (req as any).tenantId;

    const actions = db.prepare(`
      SELECT * FROM universal_action_records WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 50
    `).all(tenantId) as any[];

    // Calculate real dynamic job stats by actor
    const actorStats = new Map<string, { completed: number; failed: number }>();
    for (const a of actions) {
      const actorKey = a.actor_id || a.actor_role || 'system';
      const current = actorStats.get(actorKey) || { completed: 0, failed: 0 };
      if (a.execution_state === 'SUCCEEDED') {
        current.completed += 1;
      } else if (a.execution_state === 'FAILED_CLOSED' || a.execution_state === 'AUTHORIZE_FAILED') {
        current.failed += 1;
      }
      actorStats.set(actorKey, current);
    }

    const workforceStats = {
      activeWorkers: [
        {
          id: 'aria_executive',
          name: 'Aria Executive AI',
          role: 'Strategic Planning & Growth',
          status: 'ACTIVE',
          completedJobs: actorStats.get('aria_executive')?.completed || 0,
          failedJobs: actorStats.get('aria_executive')?.failed || 0
        },
        {
          id: 'lead_triage_agent',
          name: 'Inbound Lead Triage',
          role: 'Qualification & Routing',
          status: 'ACTIVE',
          completedJobs: actorStats.get('lead_triage_agent')?.completed || 0,
          failedJobs: actorStats.get('lead_triage_agent')?.failed || 0
        },
        {
          id: 'creative_studio_agent',
          name: 'Creative Content Agent',
          role: 'Social & Web Copy Synthesis',
          status: 'ACTIVE',
          completedJobs: actorStats.get('creative_studio_agent')?.completed || 0,
          failedJobs: actorStats.get('creative_studio_agent')?.failed || 0
        },
        {
          id: 'compliance_officer_agent',
          name: 'Compliance & Audit Guard',
          role: 'Jurisdiction & Licensing Guardrail',
          status: 'ACTIVE',
          completedJobs: actorStats.get('compliance_officer_agent')?.completed || 0,
          failedJobs: actorStats.get('compliance_officer_agent')?.failed || 0
        }
      ],
      recentJobs: actions.map((a) => ({
        id: a.id,
        tenantId: a.tenant_id,
        actorRole: a.actor_role,
        actionType: a.action_type,
        provider: a.provider,
        state: a.execution_state,
        approvalState: a.approval_state,
        attemptCount: a.attempt_count,
        requestedAt: a.requested_at,
        completedAt: a.completed_at
      }))
    };

    res.json({ success: true, workforce: workforceStats });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to fetch workforce' });
  }
});

// 4. Growth & Opportunities (Session-scoped)
controlCenterRouter.get('/growth', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const tenantId = (req as any).tenantId;

    const opps = db.prepare('SELECT * FROM opportunities WHERE tenant_id = ?').all(tenantId) as any[];
    const leads = db.prepare('SELECT * FROM leads WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 30').all(tenantId) as any[];
    const attributions = db.prepare('SELECT * FROM explainable_attributions WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 20').all(tenantId) as any[];

    res.json({
      success: true,
      growth: {
        opportunities: opps,
        leads,
        attributions
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to fetch growth metrics' });
  }
});

// 5. Content & Assets (Session-scoped)
controlCenterRouter.get('/content', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const tenantId = (req as any).tenantId;

    const projects = db.prepare('SELECT * FROM website_projects WHERE tenant_id = ?').all(tenantId) as any[];
    const pages = db.prepare('SELECT * FROM website_pages WHERE tenant_id = ? ORDER BY nav_order ASC').all(tenantId) as any[];
    const proofItems = db.prepare('SELECT * FROM website_proof_items WHERE tenant_id = ? ORDER BY observed_at DESC').all(tenantId) as any[];
    const posts = db.prepare('SELECT * FROM gbp_posts WHERE tenant_id = ? ORDER BY created_at DESC').all(tenantId) as any[];

    res.json({
      success: true,
      content: {
        websiteProjects: projects,
        websitePages: pages,
        proofItems,
        posts
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to fetch content' });
  }
});

// 6. Connectors (Session-scoped)
controlCenterRouter.get('/connectors', (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const connectorService = AuthoritativeConnectorRegistryService.getInstance();
    const catalog = connectorService.listCatalog();
    const tenantInstances = connectorService.listTenantConnectors(tenantId);

    res.json({
      success: true,
      catalog,
      tenantInstances
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to fetch connectors' });
  }
});

// 7. Operations & Health (Session-scoped)
controlCenterRouter.get('/operations', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const tenantId = (req as any).tenantId;

    const queue = db.prepare('SELECT * FROM durable_execution_queue WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 30').all(tenantId) as any[];
    const dlq = db.prepare('SELECT * FROM dead_letter_queue WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 30').all(tenantId) as any[];
    const auditLogs = db.prepare('SELECT * FROM launch_audit_logs WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 40').all(tenantId) as any[];
    const emergency = EmergencyControlService.getInstance().getEmergencyStatus(tenantId);

    res.json({
      success: true,
      operations: {
        queue,
        dlq,
        auditLogs,
        emergency
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to fetch operations' });
  }
});

// 8. Emergency Stop / Pause All Automation (Role-protected)
controlCenterRouter.post('/emergency-pause', (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userId = (req as any).userId;
    const userRole = ((req as any).userRole || '').toUpperCase();

    if (userRole !== 'OWNER' && userRole !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN: Only owners and administrators may engage or disengage emergency pause controls.'
      });
    }

    const { paused, reason } = req.body;
    const emergency = EmergencyControlService.getInstance();

    if (paused) {
      emergency.pauseGlobal({
        reason: reason || 'Operator triggered manual pause of all automations from Control Center',
        actorId: userId
      });
    } else {
      emergency.resumeGlobal({
        actorId: userId
      });
    }

    res.json({
      success: true,
      isEmergencyPaused: paused,
      emergencyState: emergency.getEmergencyStatus(tenantId)
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to toggle emergency pause' });
  }
});
