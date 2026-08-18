import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import { creativeProviderRouter, CreativeProviderRouter } from '../services/creativeProviderRouter';
import { CreativeBrief } from '../types/creativeProvider';

export const creativeRouterApi = Router();

// 1. List configured providers and current FREE quota eligibility
creativeRouterApi.get('/providers', async (req, res) => {
  try {
    const evaluations = await creativeProviderRouter.evaluateFreeProviders();
    const providers = creativeProviderRouter.getAllProviders().map(p => ({
      ...p.getMetadata(),
      evaluation: evaluations.find(e => e.providerId === p.id)
    }));

    return res.json({
      success: true,
      policy: 'USE_FREE_CAPACITY_FIRST',
      paidBillingAutoActivationBlocked: true,
      providers,
      evaluations
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// 2. Fast Creative Draft Generation (uses best FREE provider with auto-failover)
creativeRouterApi.post('/generate-draft', async (req, res) => {
  try {
    const brief: CreativeBrief = req.body.brief;
    if (!brief || !brief.brandName) {
      return res.status(400).json({ success: false, error: 'CreativeBrief with brandName is required.' });
    }

    const result = await creativeProviderRouter.generateCreativeDraft(brief);

    // Save to tenant preview directory if tenantId is provided
    if (brief.tenantId) {
      const tenantDir = path.resolve(process.cwd(), 'public/tenants', brief.tenantId);
      if (!fs.existsSync(tenantDir)) {
        fs.mkdirSync(tenantDir, { recursive: true });
      }
      fs.writeFileSync(path.join(tenantDir, 'index.html'), result.preview.renderedHtml, 'utf-8');
      for (const asset of result.preview.assets) {
        const assetPath = path.join(tenantDir, asset.path);
        const parent = path.dirname(assetPath);
        if (!fs.existsSync(parent)) {
          fs.mkdirSync(parent, { recursive: true });
        }
        fs.writeFileSync(assetPath, asset.content, 'utf-8');
      }
    }

    return res.json({
      success: true,
      preview: result.preview,
      routingDecision: result.routingDecision,
      artifact: result.artifact
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// 3. Instant Jardin's Outpost Homepage Generation using CreativeProviderRouter
creativeRouterApi.post('/jardin-draft', async (req, res) => {
  try {
    const brief = CreativeProviderRouter.createJardinsOutpostBrief();
    const result = await creativeProviderRouter.generateCreativeDraft(brief);

    // Write to public/tenants/tenant_jardins_outpost/index.html immediately
    const outpostDir = path.resolve(process.cwd(), 'public/tenants/tenant_jardins_outpost');
    if (!fs.existsSync(outpostDir)) {
      fs.mkdirSync(outpostDir, { recursive: true });
    }
    fs.writeFileSync(path.join(outpostDir, 'index.html'), result.preview.renderedHtml, 'utf-8');
    for (const asset of result.preview.assets) {
      const assetPath = path.join(outpostDir, asset.path);
      const parent = path.dirname(assetPath);
      if (!fs.existsSync(parent)) {
        fs.mkdirSync(parent, { recursive: true });
      }
      fs.writeFileSync(assetPath, asset.content, 'utf-8');
    }

    return res.json({
      success: true,
      message: "Generated and served new Jardin's Outpost homepage visual draft.",
      previewId: result.preview.previewId,
      provider: result.routingDecision.selectedProviderType,
      providerId: result.routingDecision.selectedProviderId,
      generationDurationMs: result.routingDecision.generationDurationMs,
      publicUrl: '/index.html',
      routingAudit: result.routingDecision
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// 4. Retrieve routing decisions audit trail
creativeRouterApi.get('/routing-audit', (req, res) => {
  try {
    const history = creativeProviderRouter.getRoutingAuditHistory();
    return res.json({
      success: true,
      auditHistory: history
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// 5. Human Cost Notice endpoint (requires explicit authorization)
creativeRouterApi.post('/request-paid-authorization', (req, res) => {
  try {
    const { providerId, expectedChargeModel, reasonFreeUnavailable } = req.body;
    const notice = creativeProviderRouter.generateHumanCostNotice(
      providerId || 'provider_unknown',
      expectedChargeModel || 'Usage-based credit card billing',
      reasonFreeUnavailable || 'Free tier quota exhausted across all providers'
    );
    return res.json({
      success: true,
      notice
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});
