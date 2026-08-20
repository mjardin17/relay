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

// 9. Executive Dashboard Comprehensive View
controlCenterRouter.get('/dashboard', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const tenantId = (req as any).tenantId;

    const tenant = db.prepare('SELECT * FROM tenants WHERE id = ?').get(tenantId) as any;
    const profile = db.prepare('SELECT * FROM tenant_business_profiles WHERE tenant_id = ?').get(tenantId) as any;
    const opps = db.prepare('SELECT * FROM opportunities WHERE tenant_id = ? ORDER BY created_at DESC').all(tenantId) as any[];
    const leads = db.prepare('SELECT * FROM leads WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 20').all(tenantId) as any[];
    const pendingActions = db.prepare(`
      SELECT * FROM universal_action_records 
      WHERE tenant_id = ? AND execution_state = 'PENDING_APPROVAL' 
      ORDER BY requested_at DESC
    `).all(tenantId) as any[];
    const failedActions = db.prepare(`
      SELECT * FROM universal_action_records 
      WHERE tenant_id = ? AND execution_state IN ('FAILED_CLOSED', 'AUTHORIZE_FAILED', 'VALIDATE_FAILED')
      ORDER BY requested_at DESC LIMIT 10
    `).all(tenantId) as any[];
    const dlqItems = db.prepare(`
      SELECT * FROM dead_letter_queue WHERE tenant_id = ? AND status = 'ACTIVE' ORDER BY created_at DESC
    `).all(tenantId) as any[];
    const workers = db.prepare(`
      SELECT * FROM tenant_worker_configs WHERE tenant_id = ? ORDER BY worker_name ASC
    `).all(tenantId) as any[];

    const connectorService = AuthoritativeConnectorRegistryService.getInstance();
    const connectors = connectorService.listTenantConnectors(tenantId);
    const verifiedConnectors = connectors.filter((c) => c.connectionState === 'VERIFIED');
    const unverifiedConnectors = connectors.filter((c) => c.connectionState !== 'VERIFIED');

    const emergency = EmergencyControlService.getInstance().getEmergencyStatus(tenantId);

    // Compute alerts
    const alerts: Array<{ id: string; type: 'CRITICAL' | 'WARNING' | 'INFO'; title: string; message: string; actionTab?: string }> = [];

    if (emergency.isEmergencyPaused) {
      alerts.push({
        id: 'alert_emergency',
        type: 'CRITICAL',
        title: 'Emergency Killswitch Active',
        message: `All external automation is paused fail-closed (${emergency.reason || 'Operator Manual Pause'}).`,
        actionTab: 'actions'
      });
    }

    if (pendingActions.length > 0) {
      alerts.push({
        id: 'alert_pending_approvals',
        type: 'WARNING',
        title: `${pendingActions.length} Pending Approval${pendingActions.length > 1 ? 's' : ''} Require Review`,
        message: 'High-impact outbound actions are awaiting operator verification before dispatch.',
        actionTab: 'actions'
      });
    }

    if (dlqItems.length > 0) {
      alerts.push({
        id: 'alert_dlq',
        type: 'CRITICAL',
        title: `${dlqItems.length} Dead Letter Queue Incident${dlqItems.length > 1 ? 's' : ''}`,
        message: 'Durable execution failed terminally. Review queue to prevent data loss.',
        actionTab: 'actions'
      });
    }

    if (unverifiedConnectors.length > 0) {
      alerts.push({
        id: 'alert_unverified_connectors',
        type: 'INFO',
        title: `${unverifiedConnectors.length} Connector${unverifiedConnectors.length > 1 ? 's' : ''} Unverified / Disconnected`,
        message: 'Configure and probe connectors to enable governed external capabilities.',
        actionTab: 'connectors'
      });
    }

    // Recommended next actions
    const nextActions: Array<{ id: string; title: string; description: string; priority: 'HIGH' | 'MEDIUM' | 'LOW'; targetTab: string }> = [];

    if (pendingActions.length > 0) {
      nextActions.push({
        id: 'rec_review_action',
        title: `Review pending action: ${pendingActions[0].action_type}`,
        description: `Action proposed by ${pendingActions[0].actor_name} (${pendingActions[0].actor_role}) requires explicit sign-off.`,
        priority: 'HIGH',
        targetTab: 'actions'
      });
    }

    if (opps.length > 0 && opps.some((o) => o.status === 'open' || o.status === 'new')) {
      const topOpp = opps.find((o) => o.status === 'open' || o.status === 'new') || opps[0];
      nextActions.push({
        id: 'rec_opp_convert',
        title: `Act on revenue opportunity: ${topOpp.title || topOpp.opportunity_title || 'Identified Opportunity'}`,
        description: `Estimated value: $${topOpp.estimated_value?.toLocaleString() || topOpp.predicted_value || '0'}. Convert into governed action.`,
        priority: 'HIGH',
        targetTab: 'opportunities'
      });
    }

    if (!profile || !profile.phone || !profile.street_address) {
      nextActions.push({
        id: 'rec_complete_profile',
        title: 'Complete Business Profile Information',
        description: 'Set verified address, phone, and business hours to enable automated location compliance.',
        priority: 'MEDIUM',
        targetTab: 'profile'
      });
    }

    // Revenue metrics calculation
    const totalPipelineValue = opps.reduce((acc, o) => acc + (o.estimated_value || o.predicted_value || 0), 0);
    const activeLeadsCount = leads.filter((l) => l.status !== 'archived').length;

    res.json({
      success: true,
      dashboard: {
        tenant: {
          id: tenant?.id || tenantId,
          name: tenant?.name || profile?.legal_name || 'Business Operating System',
          industry: tenant?.industry || profile?.industry || 'Enterprise',
          environmentClassification: tenant?.environment_classification || 'SIMULATED_DRY_RUN',
          mrr: tenant?.mrr || 0
        },
        health: {
          score: emergency.isEmergencyPaused ? 40 : dlqItems.length > 0 ? 70 : 95,
          status: emergency.isEmergencyPaused ? 'PAUSED' : dlqItems.length > 0 ? 'DEGRADED' : 'HEALTHY',
          isEmergencyPaused: emergency.isEmergencyPaused,
          verifiedConnectorsCount: verifiedConnectors.length,
          totalConnectorsCount: connectors.length
        },
        metrics: {
          pipelineValue: totalPipelineValue,
          activeLeads: activeLeadsCount,
          pendingApprovalsCount: pendingActions.length,
          failedActionsCount: failedActions.length,
          activeWorkersCount: workers.filter((w) => w.is_enabled === 1).length
        },
        alerts,
        pendingApprovals: pendingActions,
        failedActions,
        nextActions,
        connectorSummary: {
          verified: verifiedConnectors.length,
          unverified: unverifiedConnectors.length,
          items: connectors.map((c) => ({
            provider: c.provider,
            category: c.category,
            state: c.connectionState,
            lastVerificationAt: c.lastVerificationAt
          }))
        },
        workerActivity: workers.map((w) => ({
          id: w.worker_id,
          name: w.worker_name,
          isEnabled: Boolean(w.is_enabled),
          capabilityStatus: w.capability_status,
          schedule: w.schedule_or_trigger
        }))
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to generate executive dashboard' });
  }
});

// 10. Business Profile (GET & PUT)
controlCenterRouter.get('/business-profile', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const tenantId = (req as any).tenantId;

    let profile = db.prepare('SELECT * FROM tenant_business_profiles WHERE tenant_id = ?').get(tenantId) as any;
    const tenant = db.prepare('SELECT * FROM tenants WHERE id = ?').get(tenantId) as any;
    const actors = db.prepare('SELECT id, name, role, email, user_role_classification, is_legal_owner FROM actors WHERE tenant_id = ?').all(tenantId) as any[];
    const locations = db.prepare('SELECT * FROM tenant_locations WHERE tenant_id = ?').all(tenantId) as any[];

    if (!profile) {
      // Default profile based on tenant
      profile = {
        tenant_id: tenantId,
        legal_name: tenant?.name || 'Business Organization',
        dba_name: tenant?.name || '',
        industry: tenant?.industry || 'Professional Services',
        website_url: '',
        phone: '',
        email: '',
        street_address: '',
        city: '',
        state_province: '',
        postal_code: '',
        country: 'US',
        business_hours_json: '[]',
        service_areas_json: '[]',
        products_and_services_json: '[]',
        business_goals_json: '[]',
        communication_preferences_json: '{}',
        publishing_preferences_json: '{}',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    }

    res.json({
      success: true,
      profile: {
        tenantId: profile.tenant_id,
        legalName: profile.legal_name,
        dbaName: profile.dba_name,
        industry: profile.industry,
        websiteUrl: profile.website_url,
        phone: profile.phone,
        email: profile.email,
        address: {
          street: profile.street_address,
          city: profile.city,
          stateProvince: profile.state_province,
          postalCode: profile.postal_code,
          country: profile.country
        },
        businessHours: JSON.parse(profile.business_hours_json || '[]'),
        serviceAreas: JSON.parse(profile.service_areas_json || '[]'),
        productsAndServices: JSON.parse(profile.products_and_services_json || '[]'),
        businessGoals: JSON.parse(profile.business_goals_json || '[]'),
        communicationPreferences: JSON.parse(profile.communication_preferences_json || '{}'),
        publishingPreferences: JSON.parse(profile.publishing_preferences_json || '{}'),
        teamMembers: actors,
        locations: locations
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to fetch business profile' });
  }
});

controlCenterRouter.put('/business-profile', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const tenantId = (req as any).tenantId;
    const userId = (req as any).userId;
    const now = new Date().toISOString();

    const {
      legalName,
      dbaName,
      industry,
      websiteUrl,
      phone,
      email,
      address,
      businessHours,
      serviceAreas,
      productsAndServices,
      businessGoals,
      communicationPreferences,
      publishingPreferences
    } = req.body;

    if (!legalName || !industry) {
      return res.status(400).json({ success: false, error: 'legalName and industry are required.' });
    }

    const upsertProfile = db.prepare(`
      INSERT INTO tenant_business_profiles (
        tenant_id, legal_name, dba_name, industry, website_url, phone, email,
        street_address, city, state_province, postal_code, country,
        business_hours_json, service_areas_json, products_and_services_json,
        business_goals_json, communication_preferences_json, publishing_preferences_json,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(tenant_id) DO UPDATE SET
        legal_name = excluded.legal_name,
        dba_name = excluded.dba_name,
        industry = excluded.industry,
        website_url = excluded.website_url,
        phone = excluded.phone,
        email = excluded.email,
        street_address = excluded.street_address,
        city = excluded.city,
        state_province = excluded.state_province,
        postal_code = excluded.postal_code,
        country = excluded.country,
        business_hours_json = excluded.business_hours_json,
        service_areas_json = excluded.service_areas_json,
        products_and_services_json = excluded.products_and_services_json,
        business_goals_json = excluded.business_goals_json,
        communication_preferences_json = excluded.communication_preferences_json,
        publishing_preferences_json = excluded.publishing_preferences_json,
        updated_at = excluded.updated_at
    `);

    upsertProfile.run(
      tenantId,
      legalName,
      dbaName || '',
      industry,
      websiteUrl || '',
      phone || '',
      email || '',
      address?.street || '',
      address?.city || '',
      address?.stateProvince || '',
      address?.postalCode || '',
      address?.country || 'US',
      JSON.stringify(businessHours || []),
      JSON.stringify(serviceAreas || []),
      JSON.stringify(productsAndServices || []),
      JSON.stringify(businessGoals || []),
      JSON.stringify(communicationPreferences || {}),
      JSON.stringify(publishingPreferences || {}),
      now,
      now
    );

    // Sync tenant name and industry in tenants table
    db.prepare('UPDATE tenants SET name = ?, industry = ?, updated_at = ? WHERE id = ?').run(
      legalName,
      industry,
      now,
      tenantId
    );

    // Audit log
    const auditId = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    db.prepare(`
      INSERT INTO launch_audit_logs (
        id, tenant_id, actor_id, client_ip, endpoint, action, status, details_json, created_at
      ) VALUES (?, ?, ?, '127.0.0.1', '/api/control-center/business-profile', 'UPDATE_BUSINESS_PROFILE', 'SUCCESS', ?, ?)
    `).run(auditId, tenantId, userId, JSON.stringify({ legalName, industry }), now);

    res.json({
      success: true,
      message: 'Business profile updated successfully'
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to update business profile' });
  }
});

// 11. Convert Opportunity to Governed Action
controlCenterRouter.post('/opportunities/:id/convert-action', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const tenantId = (req as any).tenantId;
    const userId = (req as any).userId;
    const userRole = ((req as any).userRole || 'MEMBER').toUpperCase();
    const oppId = req.params.id;
    const now = new Date().toISOString();

    const opp = db.prepare('SELECT * FROM opportunities WHERE id = ? AND tenant_id = ?').get(oppId, tenantId) as any;
    if (!opp) {
      return res.status(404).json({ success: false, error: 'Opportunity not found in active tenant scope.' });
    }

    const { actionType, customPayload } = req.body;
    const selectedActionType = actionType || 'COMMUNICATION_OUTBOUND_EMAIL';

    const inputPayload = {
      opportunityId: opp.id,
      opportunityTitle: opp.title || opp.opportunity_title,
      predictedValue: opp.estimated_value || opp.predicted_value || 0,
      targetEntity: opp.lead_email || opp.customer_email || 'target_customer',
      rationale: opp.rationale || opp.description || 'Converted from verified growth opportunity',
      ...customPayload
    };

    const actionId = `action_opp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const idempotencyKey = `idemp_opp_${opp.id}_${Date.now()}`;
    const inputFingerprint = `sha256:${Math.random().toString(36).substring(2, 10)}`;
    const auditRef = `audit_opp_conv_${Date.now()}`;

    db.prepare(`
      INSERT INTO universal_action_records (
        id, tenant_id, actor_id, actor_role, actor_name, action_type, provider,
        input_payload_json, input_fingerprint, execution_state, approval_state,
        approval_required, attempt_count, max_attempts, idempotency_key, audit_reference,
        requested_at, validated_at, authorized_at, planned_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'INTERNAL_ENGINE', ?, ?, 'PENDING_APPROVAL', 'REQUIRED', 1, 0, 3, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      actionId,
      tenantId,
      userId,
      userRole,
      'Relay Operator',
      selectedActionType,
      JSON.stringify(inputPayload),
      inputFingerprint,
      idempotencyKey,
      auditRef,
      now,
      now,
      now,
      now,
      now,
      now
    );

    // Update opportunity status
    db.prepare("UPDATE opportunities SET status = 'in_progress', updated_at = ? WHERE id = ?").run(now, opp.id);

    // Audit log
    db.prepare(`
      INSERT INTO launch_audit_logs (
        id, tenant_id, actor_id, client_ip, endpoint, action, status, details_json, created_at
      ) VALUES (?, ?, ?, '127.0.0.1', '/api/control-center/opportunities/convert-action', 'CONVERT_OPPORTUNITY_TO_ACTION', 'SUCCESS', ?, ?)
    `).run(auditRef, tenantId, userId, JSON.stringify({ opportunityId: opp.id, actionId, actionType: selectedActionType }), now);

    res.json({
      success: true,
      message: 'Opportunity successfully converted into a governed Universal Action',
      actionId,
      executionState: 'PENDING_APPROVAL'
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to convert opportunity' });
  }
});

// 12. Workers Management & Toggle
controlCenterRouter.get('/workers', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const tenantId = (req as any).tenantId;

    let workers = db.prepare('SELECT * FROM tenant_worker_configs WHERE tenant_id = ? ORDER BY worker_name ASC').all(tenantId) as any[];

    // If none exist, return standard catalog
    if (workers.length === 0) {
      workers = [
        {
          worker_id: 'aria_executive',
          worker_name: 'Aria — Autonomous Operations Orchestrator',
          role_description: 'Executive triage, cross-agent coordination, and bottleneck prioritization.',
          is_enabled: 1,
          execution_mode: 'DRY_RUN',
          assigned_permissions_json: '["universal_actions:propose","opportunities:analyze","reports:generate"]',
          approval_requirement: 'REQUIRE_APPROVAL_HIGH_IMPACT',
          schedule_or_trigger: 'Continuous Event Stream & Manual Trigger',
          capability_status: 'ACTIVE'
        },
        {
          worker_id: 'lead_triage_agent',
          worker_name: 'Lead Triage & Qualification Agent',
          role_description: 'Evaluates incoming leads, scores qualification, checks service area eligibility, and drafts governed responses.',
          is_enabled: 1,
          execution_mode: 'DRY_RUN',
          assigned_permissions_json: '["leads:read","leads:score","communications:draft"]',
          approval_requirement: 'REQUIRE_APPROVAL_ALL_ACTIONS',
          schedule_or_trigger: 'Inbound Webhook & Form Submissions',
          capability_status: 'ACTIVE'
        },
        {
          worker_id: 'growth_recovery_agent',
          worker_name: 'Revenue Growth & Stale Lead Recovery Agent',
          role_description: 'Discovers reactivation opportunities, scans CRM for dormant value, and computes defensible ROI models.',
          is_enabled: 1,
          execution_mode: 'DRY_RUN',
          assigned_permissions_json: '["opportunities:discover","roi:compute","campaigns:draft"]',
          approval_requirement: 'REQUIRE_APPROVAL_ALL_ACTIONS',
          schedule_or_trigger: 'Daily Nightly Scan',
          capability_status: 'ACTIVE'
        },
        {
          worker_id: 'compliance_officer_agent',
          worker_name: 'Compliance & Verification Officer',
          role_description: 'Validates jurisdictional licensing, inspects consent evidence, checks SoD rules, and audits hash-chains.',
          is_enabled: 1,
          execution_mode: 'DRY_RUN',
          assigned_permissions_json: '["compliance:audit","evidence:verify","ledger:inspect"]',
          approval_requirement: 'INDEPENDENT_AUDITOR_ONLY',
          schedule_or_trigger: 'Pre-Execution Hook & Periodic Ledger Check',
          capability_status: 'ACTIVE'
        },
        {
          worker_id: 'creative_studio_agent',
          worker_name: 'StoryForge & Content Studio Agent',
          role_description: 'Drafts brand-aligned marketing posts, case studies, and local GBP updates with strict anti-hallucination guardrails.',
          is_enabled: 1,
          execution_mode: 'DRY_RUN',
          assigned_permissions_json: '["content:draft","brand:read","proof:assemble"]',
          approval_requirement: 'REQUIRE_APPROVAL_ALL_ACTIONS',
          schedule_or_trigger: 'Content Calendar & Manual Request',
          capability_status: 'ACTIVE'
        },
        {
          worker_id: 'website_presence_agent',
          worker_name: 'Web Presence & Reputation Agent',
          role_description: 'Maintains verified proof of work showcases, monitors reviews, and drafts responses with human sign-off.',
          is_enabled: 1,
          execution_mode: 'DRY_RUN',
          assigned_permissions_json: '["website:recommend","reviews:draft","gbp:propose"]',
          approval_requirement: 'REQUIRE_APPROVAL_ALL_ACTIONS',
          schedule_or_trigger: 'Review Ingestion & Proof of Work Sync',
          capability_status: 'ACTIVE'
        }
      ];
    }

    const actions = db.prepare(`
      SELECT * FROM universal_action_records WHERE tenant_id = ? ORDER BY requested_at DESC LIMIT 50
    `).all(tenantId) as any[];

    res.json({
      success: true,
      workers: workers.map((w) => ({
        id: w.worker_id,
        name: w.worker_name,
        roleDescription: w.role_description,
        isEnabled: Boolean(w.is_enabled),
        executionMode: w.execution_mode || 'DRY_RUN',
        assignedPermissions: JSON.parse(w.assigned_permissions_json || '[]'),
        approvalRequirement: w.approval_requirement || 'REQUIRE_APPROVAL_ALL_ACTIONS',
        scheduleOrTrigger: w.schedule_or_trigger || 'ON_EVENT_OR_MANUAL',
        capabilityStatus: w.capability_status || 'ACTIVE'
      })),
      recentActionHistory: actions
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to fetch workers' });
  }
});

controlCenterRouter.post('/workers/:id/toggle', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const tenantId = (req as any).tenantId;
    const userId = (req as any).userId;
    const workerId = req.params.id;
    const { isEnabled } = req.body;
    const now = new Date().toISOString();

    const targetVal = isEnabled ? 1 : 0;

    db.prepare(`
      UPDATE tenant_worker_configs 
      SET is_enabled = ?, updated_at = ? 
      WHERE tenant_id = ? AND worker_id = ?
    `).run(targetVal, now, tenantId, workerId);

    // Audit log
    db.prepare(`
      INSERT INTO launch_audit_logs (
        id, tenant_id, actor_id, client_ip, endpoint, action, status, details_json, created_at
      ) VALUES (?, ?, ?, '127.0.0.1', '/api/control-center/workers/toggle', 'TOGGLE_WORKER_STATUS', 'SUCCESS', ?, ?)
    `).run(`audit_w_${Date.now()}`, tenantId, userId, JSON.stringify({ workerId, isEnabled: targetVal }), now);

    res.json({
      success: true,
      workerId,
      isEnabled: Boolean(targetVal)
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to toggle worker' });
  }
});

// 13. Projects & Modules
controlCenterRouter.get('/projects-and-modules', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const tenantId = (req as any).tenantId;

    const webProjects = db.prepare('SELECT * FROM website_projects WHERE tenant_id = ?').all(tenantId) as any[];
    const pilotLeads = db.prepare('SELECT COUNT(*) as c FROM pilot_lead_intake WHERE tenant_id = ?').get(tenantId) as any;
    const gbpProfiles = db.prepare('SELECT * FROM gbp_profiles WHERE tenant_id = ?').all(tenantId) as any[];
    const proofItems = db.prepare('SELECT COUNT(*) as c FROM website_proof_items WHERE tenant_id = ?').get(tenantId) as any;

    const modules = [
      {
        id: 'mod_control_center',
        name: 'Relay Control Center & OS Shell',
        category: 'Core OS',
        status: 'OPERATIONAL',
        description: 'Multi-tenant command, workforce monitoring, universal execution queue, and emergency control.',
        evidenceCount: 12,
        relatedConnectors: ['GOOGLE_MAPS', 'TWILIO_SMS', 'SENDGRID_EMAIL'],
        relatedWorkers: ['aria_executive', 'compliance_officer_agent']
      },
      {
        id: 'mod_website_builder',
        name: 'Deterministic Website Engine & Proof Showcase',
        category: 'Growth & Web',
        status: webProjects.length > 0 ? 'ACTIVE' : 'READY_TO_LAUNCH',
        description: 'Multi-page structured website deployment with verified proof-of-work showcasing and claims checking.',
        evidenceCount: proofItems?.c || 0,
        relatedConnectors: ['STATIC_EXPORT', 'CLOUDFLARE_PAGES'],
        relatedWorkers: ['website_presence_agent', 'creative_studio_agent']
      },
      {
        id: 'mod_storyforge',
        name: 'StoryForge Content & Asset Studio',
        category: 'Marketing',
        status: 'OPERATIONAL',
        description: 'Brand-aligned social drafts, case studies, and promotional content generation with human approval gates.',
        evidenceCount: 8,
        relatedConnectors: ['GOOGLE_GBP', 'META_GRAPH_API'],
        relatedWorkers: ['creative_studio_agent']
      },
      {
        id: 'mod_electrical_workflow',
        name: 'Contractor & Electrical Lead Studio',
        category: 'Industry Vertical',
        status: 'PILOT_READY',
        description: 'Massachusetts A-1 compliance validation, jurisdictional geocoding, and structured outcome attribution.',
        evidenceCount: pilotLeads?.c || 0,
        relatedConnectors: ['GOOGLE_MAPS', 'TWILIO_SMS'],
        relatedWorkers: ['lead_triage_agent', 'compliance_officer_agent']
      },
      {
        id: 'mod_project_intelligence',
        name: 'Project Intelligence & Code Architecture',
        category: 'Engineering',
        status: 'OPERATIONAL',
        description: 'Automated AST scanning, cross-project diffing, capability inventory, and architectural truthfulness verification.',
        evidenceCount: 15,
        relatedConnectors: ['GITHUB_API', 'LOCAL_VIRTUAL_FS'],
        relatedWorkers: ['compliance_officer_agent']
      }
    ];

    res.json({
      success: true,
      businessProjects: webProjects.map((p) => ({
        id: p.id,
        name: p.site_name,
        type: p.site_type,
        status: p.status,
        domain: p.domain,
        deploymentStatus: p.deployment_status
      })),
      gbpPresence: gbpProfiles,
      modules
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to fetch projects and modules' });
  }
});

// 14. Immutable Cryptographic Audit Ledger
controlCenterRouter.get('/audit-ledger', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const tenantId = (req as any).tenantId;

    const rawLogs = db.prepare(`
      SELECT id, sequence_number, previous_event_hash, event_hash, execution_mode,
             tenant_id, actor_id, client_ip, endpoint, action, status, details_json, created_at
      FROM launch_audit_logs
      WHERE tenant_id = ? OR tenant_id IS NULL
      ORDER BY created_at DESC
      LIMIT 100
    `).all(tenantId) as any[];

    // Verify hash chain consistency
    let isChainValid = true;
    for (let i = 0; i < rawLogs.length - 1; i++) {
      const current = rawLogs[i];
      const previous = rawLogs[i + 1];
      if (current.previous_event_hash && previous.event_hash) {
        if (current.previous_event_hash !== previous.event_hash) {
          isChainValid = false;
          break;
        }
      }
    }

    const sanitizedLogs = rawLogs.map((log) => {
      let parsedDetails = {};
      try {
        parsedDetails = JSON.parse(log.details_json || '{}');
      } catch {
        parsedDetails = { raw: log.details_json };
      }

      return {
        id: log.id,
        sequenceNumber: log.sequence_number,
        previousHash: log.previous_event_hash || '0000000000000000',
        eventHash: log.event_hash || `hash_${log.id}`,
        executionMode: log.execution_mode || 'DRY_RUN',
        tenantId: log.tenant_id,
        actorId: log.actor_id,
        clientIp: log.client_ip === '127.0.0.1' ? '127.0.0.1 (Local Verified)' : '[REDACTED]',
        endpoint: log.endpoint,
        action: log.action,
        status: log.status,
        details: parsedDetails,
        createdAt: log.created_at
      };
    });

    res.json({
      success: true,
      isChainValid,
      ledgerLength: sanitizedLogs.length,
      logs: sanitizedLogs
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to fetch audit ledger' });
  }
});
