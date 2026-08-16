import { Router, Request, Response } from 'express';
import { websiteProjectService } from '../services/websiteProjectService';
import { websiteBrandProfileService } from '../services/websiteBrandProfileService';
import { businessWebsiteContextService } from '../services/businessWebsiteContextService';
import { websiteClaimValidatorService } from '../services/websiteClaimValidatorService';
import { websiteDeploymentManager } from '../services/websiteDeploymentService';
import { websiteDomainService } from '../services/websiteDomainService';
import { websiteAnalyticsService } from '../services/websiteAnalyticsService';
import { websiteRoiService } from '../services/websiteRoiService';
import { websiteReconciliationService } from '../services/websiteReconciliationService';
import { webPresenceAgentService } from '../services/webPresenceAgentService';
import { reisElectricWebsiteService } from '../services/reisElectricWebsiteService';
import { syntheticSecondTenantWebsiteService } from '../services/syntheticSecondTenantWebsiteService';
import { jardinOutpostService } from '../services/jardinOutpostService';
import { websiteProofService } from '../services/websiteProofService';
import { websiteRendererService } from '../services/websiteRendererService';

export const websiteBuilderApiRouter = Router();

// 1. Get or Create Project
websiteBuilderApiRouter.get('/projects', (req: Request, res: Response) => {
  try {
    const tenantId = (req.query.tenantId || 'tenant_ma_fresh_launch') as string;
    const project = websiteProjectService.getOrCreateProject(tenantId);
    res.json({ success: true, project });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Get Pages
websiteBuilderApiRouter.get('/pages', (req: Request, res: Response) => {
  try {
    const tenantId = (req.query.tenantId || 'tenant_ma_fresh_launch') as string;
    const projectId = (req.query.projectId || `proj_web_${tenantId}`) as string;
    const pages = websiteProjectService.getPages(projectId, tenantId);
    res.json({ success: true, pages });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Save / Update Page
websiteBuilderApiRouter.post('/pages', (req: Request, res: Response) => {
  try {
    const page = req.body;
    const saved = websiteProjectService.savePage(page);
    res.json({ success: true, page: saved });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Get Brand Profile
websiteBuilderApiRouter.get('/brand-profile', (req: Request, res: Response) => {
  try {
    const tenantId = (req.query.tenantId || 'tenant_ma_fresh_launch') as string;
    const brand = websiteBrandProfileService.getOrCreateBrandProfile(tenantId);
    res.json({ success: true, brand });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Update Brand Profile
websiteBuilderApiRouter.post('/brand-profile', (req: Request, res: Response) => {
  try {
    const { tenantId, updates } = req.body;
    const updated = websiteBrandProfileService.updateBrandProfile(tenantId || 'tenant_ma_fresh_launch', updates || {});
    res.json({ success: true, brand: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Get Business Context
websiteBuilderApiRouter.get('/business-context', (req: Request, res: Response) => {
  try {
    const tenantId = (req.query.tenantId || 'tenant_ma_fresh_launch') as string;
    const context = businessWebsiteContextService.getContext(tenantId);
    res.json({ success: true, context });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. Validate Content Claims
websiteBuilderApiRouter.post('/validate-claims', (req: Request, res: Response) => {
  try {
    const { tenantId, projectId } = req.body;
    const tId = tenantId || 'tenant_ma_fresh_launch';
    const pId = projectId || `proj_web_${tId}`;
    const pages = websiteProjectService.getPages(pId, tId);
    const brand = websiteBrandProfileService.getOrCreateBrandProfile(tId);
    const context = businessWebsiteContextService.getContext(tId);

    const validation = websiteClaimValidatorService.validateWebsiteContent(
      pages,
      context,
      brand.prohibitedClaims
    );

    res.json({ success: true, validation });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 8. Create Version Snapshot
websiteBuilderApiRouter.post('/versions/create', (req: Request, res: Response) => {
  try {
    const { tenantId, projectId, creatorRole } = req.body;
    const tId = tenantId || 'tenant_ma_fresh_launch';
    const pId = projectId || `proj_web_${tId}`;
    const version = websiteProjectService.createVersionSnapshot(pId, tId, creatorRole || 'OPERATOR');
    res.json({ success: true, version });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 9. Approve Version
websiteBuilderApiRouter.post('/versions/approve', (req: Request, res: Response) => {
  try {
    const { tenantId, projectId, versionId, approverId, approverRole } = req.body;
    const tId = tenantId || 'tenant_ma_fresh_launch';
    const pId = projectId || `proj_web_${tId}`;
    const approved = websiteProjectService.approveVersion(
      pId,
      versionId,
      tId,
      approverId || 'operator_shad_reis',
      approverRole || 'HUMAN_OWNER'
    );
    res.json({ success: true, version: approved });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 10. Rollback Version
websiteBuilderApiRouter.post('/versions/rollback', (req: Request, res: Response) => {
  try {
    const { tenantId, projectId, targetVersionId, operatorId } = req.body;
    const tId = tenantId || 'tenant_ma_fresh_launch';
    const pId = projectId || `proj_web_${tId}`;
    const rolledBack = websiteProjectService.rollbackToVersion(
      pId,
      targetVersionId,
      tId,
      operatorId || 'operator_shad_reis'
    );
    res.json({ success: true, version: rolledBack });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 11. Deploy Approved Version
websiteBuilderApiRouter.post('/deploy', async (req: Request, res: Response) => {
  try {
    const { tenantId, projectId, versionId, provider } = req.body;
    const tId = tenantId || 'tenant_ma_fresh_launch';
    const pId = projectId || `proj_web_${tId}`;
    const result = await websiteDeploymentManager.deployApprovedVersion(
      pId,
      versionId,
      tId,
      provider || 'STATIC_EXPORT'
    );
    res.json({ success: true, result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 12. Domain Management
websiteBuilderApiRouter.post('/domains/register', (req: Request, res: Response) => {
  try {
    const { tenantId, projectId, domain } = req.body;
    const tId = tenantId || 'tenant_ma_fresh_launch';
    const pId = projectId || `proj_web_${tId}`;
    const reg = websiteDomainService.registerDomainRequest(pId, tId, domain);
    res.json({ success: true, domain: reg });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

websiteBuilderApiRouter.post('/domains/verify', (req: Request, res: Response) => {
  try {
    const { tenantId, domainId, simulateSuccess } = req.body;
    const tId = tenantId || 'tenant_ma_fresh_launch';
    const verified = websiteDomainService.verifyDomainDNS(
      domainId,
      tId,
      simulateSuccess !== undefined ? simulateSuccess : true
    );
    res.json({ success: true, domain: verified });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 13. Analytics & ROI
websiteBuilderApiRouter.get('/analytics/funnel', (req: Request, res: Response) => {
  try {
    const tenantId = (req.query.tenantId || 'tenant_ma_fresh_launch') as string;
    const projectId = req.query.projectId as string | undefined;
    const funnel = websiteAnalyticsService.calculateConversionFunnel(tenantId, projectId);
    res.json({ success: true, funnel });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

websiteBuilderApiRouter.get('/analytics/roi', (req: Request, res: Response) => {
  try {
    const tenantId = (req.query.tenantId || 'tenant_ma_fresh_launch') as string;
    const projectId = (req.query.projectId || `proj_web_${tenantId}`) as string;
    const roi = websiteRoiService.calculateWebsiteRoi(tenantId, projectId, 'PILOT');
    res.json({ success: true, roi });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 14. Health & Reconciliation
websiteBuilderApiRouter.get('/reconciliation', (req: Request, res: Response) => {
  try {
    const tenantId = (req.query.tenantId || 'tenant_ma_fresh_launch') as string;
    const projectId = (req.query.projectId || `proj_web_${tenantId}`) as string;
    const report = websiteReconciliationService.runReconciliation(tenantId, projectId);
    res.json({ success: true, report });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 15. Web Presence Agent Recommendations
websiteBuilderApiRouter.get('/presence-agent/recommendations', (req: Request, res: Response) => {
  try {
    const tenantId = (req.query.tenantId || 'tenant_ma_fresh_launch') as string;
    const projectId = (req.query.projectId || `proj_web_${tenantId}`) as string;
    const recs = webPresenceAgentService.generateRecommendations(tenantId, projectId);
    res.json({ success: true, recommendations: recs });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 16. Seed / Initialize Reis Electric or Second Tenant
websiteBuilderApiRouter.post('/seed/reis-electric', (req: Request, res: Response) => {
  try {
    const tenantId = (req.body.tenantId || 'tenant_ma_fresh_launch') as string;
    const result = reisElectricWebsiteService.initializeReisElectricWebsite(tenantId);
    res.json({ success: true, result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

websiteBuilderApiRouter.post('/seed/second-tenant', (req: Request, res: Response) => {
  try {
    const tenantId = (req.body.tenantId || 'tenant_apex_climate_hvac') as string;
    const result = syntheticSecondTenantWebsiteService.initializeSecondTenant(tenantId);
    res.json({ success: true, result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 17. Jardin's Outpost Dogfood Build
websiteBuilderApiRouter.post('/seed/jardins-outpost', (req: Request, res: Response) => {
  try {
    const result = jardinOutpostService.executeFullBuildPipeline();
    res.json({ success: true, result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 18. Proof of Work Management
websiteBuilderApiRouter.get('/proofs', (req: Request, res: Response) => {
  try {
    const tenantId = (req.query.tenantId || 'tenant_jardins_outpost') as string;
    const productSlug = req.query.productSlug as string | undefined;
    const proofs = websiteProofService.getProofItemsForTenant(tenantId, productSlug);
    res.json({ success: true, proofs });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

websiteBuilderApiRouter.post('/proofs/approve', (req: Request, res: Response) => {
  try {
    const { proofId, approverId, approverRole } = req.body;
    const result = websiteProofService.approveProofForPublication(proofId, approverId, approverRole);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }
    res.json({ success: true, item: result.item });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 19. Dogfood Feedback Logs
websiteBuilderApiRouter.get('/dogfood/feedback', (req: Request, res: Response) => {
  try {
    const logs = jardinOutpostService.getDogfoodFeedbackLogs();
    res.json({ success: true, logs });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

