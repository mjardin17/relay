import express, { Request, Response } from 'express';
import { getDatabase } from '../db/database';
import { UniversalActionEngineService } from '../services/universalActionEngineService';
import { AuthoritativeConnectorRegistryService } from '../services/authoritativeConnectorRegistryService';
import { RelayProjectIntelligenceService } from '../services/relayProjectIntelligenceService';
import { EmergencyControlService } from '../services/emergencyControlService';
import { LaunchAuditService } from '../services/launchAuditService';

const router = express.Router();

// 1. Control Center Summary (Aggregated metrics)
router.get('/summary', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const tenantId = (req.query.tenantId as string) || 'default-tenant';

    const tenantCount = (db.prepare('SELECT COUNT(*) as c FROM tenants').get() as any)?.c || 0;
    const leadsCount = (db.prepare('SELECT COUNT(*) as c FROM leads').get() as any)?.c || 0;
    const oppsCount = (db.prepare('SELECT COUNT(*) as c FROM opportunities').get() as any)?.c || 0;
    const queuePendingCount = (db.prepare("SELECT COUNT(*) as c FROM durable_execution_queue WHERE status = 'QUEUED'").get() as any)?.c || 0;
    const dlqCount = (db.prepare("SELECT COUNT(*) as c FROM dead_letter_queue WHERE status = 'ACTIVE'").get() as any)?.c || 0;
    const websitePagesCount = (db.prepare('SELECT COUNT(*) as c FROM website_pages').get() as any)?.c || 0;
    const postsCount = (db.prepare('SELECT COUNT(*) as c FROM gbp_posts').get() as any)?.c || 0;
    const universalActionsCount = (db.prepare('SELECT COUNT(*) as c FROM universal_action_records').get() as any)?.c || 0;

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

// 2. Tenants
router.get('/tenants', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const tenants = db.prepare('SELECT * FROM tenants ORDER BY created_at DESC').all() as any[];
    const locations = db.prepare('SELECT * FROM tenant_locations').all() as any[];

    const enriched = tenants.map((t) => {
      const loc = locations.filter((l) => l.tenant_id === t.id);
      return {
        ...t,
        locations: loc
      };
    });

    res.json({ success: true, tenants: enriched });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to fetch tenants' });
  }
});

// 3. AI Workforce & Agents
router.get('/workforce', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const actions = db.prepare(`
      SELECT * FROM universal_action_records ORDER BY created_at DESC LIMIT 50
    `).all() as any[];

    const workforceStats = {
      activeWorkers: [
        { id: 'aria_executive', name: 'Aria Executive AI', role: 'Strategic Planning & Growth', status: 'ACTIVE', completedJobs: 142, failedJobs: 0 },
        { id: 'lead_triage_agent', name: 'Inbound Lead Triage', role: 'Qualification & Routing', status: 'ACTIVE', completedJobs: 89, failedJobs: 1 },
        { id: 'creative_studio_agent', name: 'Creative Content Agent', role: 'Social & Web Copy Synthesis', status: 'ACTIVE', completedJobs: 64, failedJobs: 0 },
        { id: 'compliance_officer_agent', name: 'Compliance & Audit Guard', role: 'Jurisdiction & Licensing Guardrail', status: 'ACTIVE', completedJobs: 210, failedJobs: 0 }
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

// 4. Growth & Opportunities
router.get('/growth', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const tenantId = (req.query.tenantId as string) || 'default-tenant';

    const opps = db.prepare('SELECT * FROM opportunities WHERE tenant_id = ? OR ? = "default-tenant"').all(tenantId, tenantId) as any[];
    const leads = db.prepare('SELECT * FROM leads WHERE tenant_id = ? OR ? = "default-tenant" ORDER BY created_at DESC LIMIT 30').all(tenantId, tenantId) as any[];
    const attributions = db.prepare('SELECT * FROM explainable_attributions WHERE tenant_id = ? OR ? = "default-tenant" ORDER BY created_at DESC LIMIT 20').all(tenantId, tenantId) as any[];

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

// 5. Content & Assets
router.get('/content', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const projects = db.prepare('SELECT * FROM website_projects').all() as any[];
    const pages = db.prepare('SELECT * FROM website_pages ORDER BY nav_order ASC').all() as any[];
    const proofItems = db.prepare('SELECT * FROM website_proof_items ORDER BY observed_at DESC').all() as any[];
    const posts = db.prepare('SELECT * FROM gbp_posts ORDER BY created_at DESC').all() as any[];

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

// 6. Connectors (Authoritative Catalog & Tenant Instances)
router.get('/connectors', (req: Request, res: Response) => {
  try {
    const tenantId = (req.query.tenantId as string) || 'default-tenant';
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

// 7. Operations & Health
router.get('/operations', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const tenantId = (req.query.tenantId as string) || 'default-tenant';

    const queue = db.prepare('SELECT * FROM durable_execution_queue ORDER BY created_at DESC LIMIT 30').all() as any[];
    const dlq = db.prepare('SELECT * FROM dead_letter_queue ORDER BY created_at DESC LIMIT 30').all() as any[];
    const auditLogs = db.prepare('SELECT * FROM launch_audit_logs ORDER BY created_at DESC LIMIT 40').all() as any[];
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

// 8. Emergency Stop / Pause All Automation
router.post('/emergency-pause', (req: Request, res: Response) => {
  try {
    const { tenantId, paused, reason, actorId } = req.body;
    const emergency = EmergencyControlService.getInstance();

    if (paused) {
      emergency.pauseGlobal({
        reason: reason || 'Operator triggered manual pause of all automations from Control Center',
        actorId: actorId || 'operator-admin'
      });
    } else {
      emergency.resumeGlobal({
        actorId: actorId || 'operator-admin'
      });
    }

    res.json({
      success: true,
      isEmergencyPaused: paused,
      emergencyState: emergency.getEmergencyStatus(tenantId || 'default-tenant')
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to toggle emergency pause' });
  }
});

// 9. Universal Actions API
router.post('/universal-actions/submit', async (req: Request, res: Response) => {
  try {
    const actionEngine = UniversalActionEngineService.getInstance();
    const record = await actionEngine.submitAction(req.body);
    res.json({ success: true, action: record });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err?.message || 'Failed to submit universal action' });
  }
});

router.post('/universal-actions/approve', async (req: Request, res: Response) => {
  try {
    const { actionId, decision, approverId, approverRole, reason } = req.body;
    const actionEngine = UniversalActionEngineService.getInstance();
    const record = await actionEngine.decideApproval(actionId, {
      decision,
      approverId: approverId || 'operator-admin',
      approverRole: approverRole || 'OWNER',
      reason
    });
    res.json({ success: true, action: record });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err?.message || 'Failed to process approval' });
  }
});

router.get('/universal-actions/list', (req: Request, res: Response) => {
  try {
    const tenantId = (req.query.tenantId as string) || 'default-tenant';
    const limit = parseInt(req.query.limit as string) || 50;
    const actions = UniversalActionEngineService.getInstance().listActions(tenantId, limit);
    res.json({ success: true, actions });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to list universal actions' });
  }
});

// 10. Connector Registry API
router.post('/connector-registry/configure', (req: Request, res: Response) => {
  try {
    const { tenantId, provider, credentials, enabledOperations, configuredBy } = req.body;
    const connectorService = AuthoritativeConnectorRegistryService.getInstance();
    const instance = connectorService.configureTenantConnector(tenantId || 'default-tenant', {
      provider,
      credentials,
      enabledOperations,
      configuredBy: configuredBy || 'operator-admin'
    });
    res.json({ success: true, connector: instance });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err?.message || 'Failed to configure connector' });
  }
});

router.post('/connector-registry/verify', (req: Request, res: Response) => {
  try {
    const { tenantId, provider, credentials, simulateSuccess } = req.body;
    const connectorService = AuthoritativeConnectorRegistryService.getInstance();
    const probe = connectorService.verifyTenantConnector(tenantId || 'default-tenant', provider, {
      credentials,
      simulateSuccess
    });
    res.json({ success: true, probe });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err?.message || 'Failed to verify connector' });
  }
});

// 11. Project Intelligence API
router.get('/project-intelligence/projects', (req: Request, res: Response) => {
  try {
    const projects = RelayProjectIntelligenceService.getInstance().listProjects();
    res.json({ success: true, projects });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to list projects' });
  }
});

router.get('/project-intelligence/capability-inventory', (req: Request, res: Response) => {
  try {
    const inventory = RelayProjectIntelligenceService.getInstance().getWorkspaceCapabilityInventory();
    res.json({ success: true, capabilityInventory: inventory });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to fetch capability inventory' });
  }
});

router.post('/project-intelligence/compare', (req: Request, res: Response) => {
  try {
    const { targetId, sourceId } = req.body;
    const report = RelayProjectIntelligenceService.getInstance().compareProjects(targetId || 'relay_central', sourceId || 'storyforge');
    res.json({ success: true, report });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err?.message || 'Failed to compare projects' });
  }
});

export default router;
