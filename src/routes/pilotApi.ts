import { Router, Request, Response } from 'express';
import { pilotActivationStateService } from '../services/pilotActivationStateService';
import { pilotLeadIntakeService } from '../services/pilotLeadIntakeService';
import { productionEvidenceService } from '../services/productionEvidenceService';
import { pilotFailureDrillsService } from '../services/pilotFailureDrillsService';
import { controlledLiveOperationsService } from '../services/controlledLiveOperationsService';
import { reisElectricPilotService } from '../services/reisElectricPilotService';

export const pilotApiRouter = Router();

// 1. Seed or Initialize Reis Electric Pilot Scenario
pilotApiRouter.post('/seed', (req: Request, res: Response) => {
  try {
    const tenantId = (req.body.tenantId || req.query.tenantId || 'tenant_ma_fresh_launch') as string;
    const result = reisElectricPilotService.seedPilotScenario(tenantId);
    res.json({ success: true, result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 2. Pilot Activation & Lifecycle State
pilotApiRouter.get('/state', (req: Request, res: Response) => {
  try {
    const tenantId = (req.query.tenantId || 'tenant_ma_fresh_launch') as string;
    const stateInfo = pilotActivationStateService.getTenantPilotState(tenantId);
    res.json({ success: true, state: stateInfo.currentState, stateInfo });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

pilotApiRouter.get('/readiness', (req: Request, res: Response) => {
  try {
    const tenantId = (req.query.tenantId || 'tenant_ma_fresh_launch') as string;
    const readiness = pilotActivationStateService.evaluatePilotReadiness(tenantId);
    res.json({ success: true, readiness });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

pilotApiRouter.post('/activate', (req: Request, res: Response) => {
  try {
    const { tenantId, actorId, role, notes } = req.body;
    const result = pilotActivationStateService.activatePilot({
      tenantId: tenantId || 'tenant_ma_fresh_launch',
      actorId: actorId || 'actor_shad_reis_tenant_ma_fresh_launch',
      actorRole: role || 'LEGAL_BUSINESS_OWNER',
      notes: notes || 'Operator authorized pilot activation for Reis Electric'
    });
    res.json({ success: true, result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

pilotApiRouter.post('/pause', (req: Request, res: Response) => {
  try {
    const { tenantId, actorId, reason } = req.body;
    const result = pilotActivationStateService.pausePilot(
      tenantId || 'tenant_ma_fresh_launch',
      actorId || 'operator_1',
      reason || 'Operator requested pause'
    );
    res.json({ success: true, result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

pilotApiRouter.post('/resume', (req: Request, res: Response) => {
  try {
    const { tenantId, actorId } = req.body;
    const result = pilotActivationStateService.resumePilot(
      tenantId || 'tenant_ma_fresh_launch',
      actorId || 'operator_1'
    );
    res.json({ success: true, result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 3. Lead Intake & Management
pilotApiRouter.get('/leads', (req: Request, res: Response) => {
  try {
    const tenantId = (req.query.tenantId || 'tenant_ma_fresh_launch') as string;
    const env = req.query.environment as any;
    const leads = pilotLeadIntakeService.listLeads(tenantId, env ? { dataEnvironment: env } : undefined);
    res.json({ success: true, count: leads.length, leads });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

pilotApiRouter.post('/leads/intake', (req: Request, res: Response) => {
  try {
    const result = pilotLeadIntakeService.intakeLead(req.body);
    res.json({ success: true, result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

pilotApiRouter.get('/leads/:leadId/timeline', (req: Request, res: Response) => {
  try {
    const tenantId = (req.query.tenantId || 'tenant_ma_fresh_launch') as string;
    const { leadId } = req.params;
    const timeline = pilotLeadIntakeService.getLeadTimeline(tenantId, leadId);
    res.json({ success: true, timeline });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Cryptographic Approvals & SoD
pilotApiRouter.post('/approvals/propose', (req: Request, res: Response) => {
  try {
    const proposal = productionEvidenceService.createApprovalProposal(req.body);
    res.json({ success: true, proposal });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

pilotApiRouter.post('/approvals/decide', (req: Request, res: Response) => {
  try {
    const result = productionEvidenceService.decideApproval(req.body);
    res.json({ success: true, result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 5. Outcomes, Payments, Financials & Audit
pilotApiRouter.post('/outcomes', (req: Request, res: Response) => {
  try {
    const record = productionEvidenceService.recordManualOutcome(req.body);
    res.json({ success: true, record });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

pilotApiRouter.post('/payments', (req: Request, res: Response) => {
  try {
    const record = productionEvidenceService.recordPaymentEvidence(req.body);
    res.json({ success: true, record });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

pilotApiRouter.get('/financials', (req: Request, res: Response) => {
  try {
    const tenantId = (req.query.tenantId || 'tenant_ma_fresh_launch') as string;
    const env = (req.query.environment as any) || 'PILOT';
    const metrics = productionEvidenceService.calculateProductionFinancialMetrics(tenantId, env);
    res.json({ success: true, metrics });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

pilotApiRouter.get('/audit-package', (req: Request, res: Response) => {
  try {
    const tenantId = (req.query.tenantId || 'tenant_ma_fresh_launch') as string;
    let leadId = req.query.leadId as string;
    if (!leadId) {
      const leads = pilotLeadIntakeService.listLeads(tenantId);
      if (leads.length > 0) {
        leadId = leads[0].leadId;
      }
    }
    if (!leadId) {
      return res.status(404).json({ success: false, error: 'No leads available to generate audit package' });
    }
    const auditPackage = productionEvidenceService.generatePilotAuditPackage(tenantId, leadId);
    res.json({ success: true, auditPackage });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Failure Drills & Emergency Controls
pilotApiRouter.post('/drills/execute-all', (req: Request, res: Response) => {
  try {
    const tenantId = (req.body.tenantId || req.query.tenantId || 'tenant_ma_fresh_launch') as string;
    const results = pilotFailureDrillsService.runAllDrills(tenantId);
    res.json({ success: true, count: results.length, results });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

pilotApiRouter.get('/emergency-state', (req: Request, res: Response) => {
  try {
    const state = controlledLiveOperationsService.getEmergencyPauseState('GLOBAL');
    res.json({ success: true, state });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
