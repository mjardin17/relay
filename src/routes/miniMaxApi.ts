import { Router } from 'express';
import { MiniMaxH3CreativeProvider } from '../services/providers/miniMaxH3CreativeProvider';
import { CommercialFactoryService } from '../services/commercialFactoryService';
import { MiniMaxPromptBuilder } from '../services/minimaxPromptBuilder';
import { MiniMaxCostCalculator } from '../services/minimaxCostCalculator';

export const miniMaxApi = Router();

const commercialService = CommercialFactoryService.getInstance();
const miniMaxProvider = commercialService.getProvider();

// 1. Status & Connector State
miniMaxApi.get('/status', async (req, res) => {
  try {
    const connState = miniMaxProvider.getConnectionState();
    const pricing = MiniMaxCostCalculator.getPricingConfig();
    const availability = await miniMaxProvider.checkAvailability();
    const quota = await miniMaxProvider.checkFreeQuota();

    return res.json({
      success: true,
      model: 'MiniMax-H3',
      provider: 'MINIMAX_H3',
      connectionState: connState,
      availability,
      quota,
      pricingConfig: pricing,
      officialTrialUrl: miniMaxProvider.officialTrialUrl,
      officialGithubDocsUrl: miniMaxProvider.officialGithubDocsUrl,
      guidelines: {
        maxPromptChars: MiniMaxPromptBuilder.MAX_PROMPT_CHARS,
        maxImages: MiniMaxPromptBuilder.MAX_IMAGES,
        maxVideos: MiniMaxPromptBuilder.MAX_VIDEOS,
        maxAudio: MiniMaxPromptBuilder.MAX_AUDIO,
        maxTotalFiles: MiniMaxPromptBuilder.MAX_TOTAL_FILES,
        minDurationSec: 4,
        maxDurationSec: 15,
        officialRatios: MiniMaxPromptBuilder.OFFICIAL_RATIOS
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Verify API Key Probe (Server-side execution only)
miniMaxApi.post('/verify', async (req, res) => {
  try {
    const { apiKey } = req.body;
    const result = await miniMaxProvider.verifyApiKey(apiKey);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Cost Estimate Calculator
miniMaxApi.post('/estimate-cost', (req, res) => {
  try {
    const {
      durationSeconds,
      resolution,
      imageReferencesCount,
      videoReferencesCount,
      videoReferencesTotalDurationSeconds,
      audioReferencesCount,
      isRegenerationFrom768p,
      humanApproved,
      approvedBy
    } = req.body;

    const estimate = MiniMaxCostCalculator.calculateEstimate({
      durationSeconds: Number(durationSeconds) || 6,
      resolution: resolution || '768p',
      imageReferencesCount: Number(imageReferencesCount) || 0,
      videoReferencesCount: Number(videoReferencesCount) || 0,
      videoReferencesTotalDurationSeconds: Number(videoReferencesTotalDurationSeconds) || 0,
      audioReferencesCount: Number(audioReferencesCount) || 0,
      isRegenerationFrom768p: Boolean(isRegenerationFrom768p),
      humanApproved: Boolean(humanApproved),
      approvedBy
    });

    return res.json({ success: true, estimate });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Compose & Validate MiniMax H3 Prompt
miniMaxApi.post('/compose-prompt', (req, res) => {
  try {
    const { structure } = req.body;
    if (!structure) {
      return res.status(400).json({ success: false, error: 'structure object is required' });
    }
    const composed = MiniMaxPromptBuilder.composePrompt(structure);
    return res.json({ success: true, composedPrompt: composed });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

miniMaxApi.post('/validate-prompt', (req, res) => {
  try {
    const { prompt, durationSeconds, resolution, aspectRatio, mode, references, firstFrameUrl, lastFrameUrl } = req.body;
    const validation = MiniMaxPromptBuilder.validate({
      prompt: prompt || '',
      durationSeconds: Number(durationSeconds) || 6,
      resolution: resolution || '768p',
      aspectRatio: aspectRatio || '16:9',
      mode: mode || 'TEXT_TO_VIDEO',
      references: references || [],
      firstFrameUrl,
      lastFrameUrl
    });

    return res.json({ success: true, validation });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Tenant Reference Assets (SQLite backed)
miniMaxApi.get('/assets', (req, res) => {
  try {
    const tenantId = (req.query.tenantId as string) || 'tenant_reis_electric';
    const assets = commercialService.listReferenceAssets(tenantId);
    return res.json({ success: true, tenantId, assets });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

miniMaxApi.post('/assets/add', (req, res) => {
  try {
    const {
      tenantId,
      category,
      name,
      mediaType,
      url,
      mimeType,
      fileSizeBytes,
      durationSeconds,
      ownershipDeclaration,
      bindingRole,
      tags
    } = req.body;

    if (!tenantId || !name || !url || !category) {
      return res.status(400).json({ success: false, error: 'tenantId, name, url, and category are required' });
    }

    const created = commercialService.registerReferenceAsset({
      tenantId,
      category,
      name,
      mediaType: mediaType || 'image',
      url,
      mimeType: mimeType || (mediaType === 'audio' ? 'audio/mpeg' : 'image/jpeg'),
      fileSizeBytes: Number(fileSizeBytes) || 1000000,
      durationSeconds: durationSeconds ? Number(durationSeconds) : undefined,
      ownershipDeclaration: ownershipDeclaration || 'User confirmed ownership rights for promotional asset.',
      bindingRole: bindingRole || name,
      tags: tags || []
    });

    return res.json({ success: true, asset: created });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Commercial Factory Projects (SQLite backed)
miniMaxApi.get('/projects', (req, res) => {
  try {
    const tenantId = req.query.tenantId as string | undefined;
    const projects = commercialService.listProjects(tenantId);
    return res.json({ success: true, projects });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

miniMaxApi.post('/projects/create', (req, res) => {
  try {
    const { tenantId, title, commercialType, brandVoice, targetAudience, conceptBrief } = req.body;
    if (!title || !commercialType) {
      return res.status(400).json({ success: false, error: 'title and commercialType are required' });
    }

    const project = commercialService.createProject({
      tenantId: tenantId || 'tenant_reis_electric',
      title,
      commercialType,
      brandVoice: brandVoice || 'Authoritative and trustworthy commercial tone',
      targetAudience: targetAudience || 'Target customers and stakeholders',
      conceptBrief: conceptBrief || title
    });

    return res.json({ success: true, project });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 7. Update Individual Shot
miniMaxApi.post('/projects/update-shot', (req, res) => {
  try {
    const {
      projectId,
      shotId,
      promptStructure,
      customPromptText,
      durationSeconds,
      resolution,
      selectedReferenceAssetIds
    } = req.body;

    if (!projectId || !shotId) {
      return res.status(400).json({ success: false, error: 'projectId and shotId are required' });
    }

    const updated = commercialService.updateShotPrompt({
      projectId,
      shotId,
      promptStructure,
      customPromptText,
      durationSeconds: durationSeconds ? Number(durationSeconds) : undefined,
      resolution,
      selectedReferenceAssetIds
    });

    return res.json({ success: true, shot: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 8. Import Video Result Back Into Relay
miniMaxApi.post('/projects/import-video', (req, res) => {
  try {
    const { projectId, shotId, videoUrl, importedBy, notes } = req.body;
    if (!projectId || !shotId || !videoUrl) {
      return res.status(400).json({ success: false, error: 'projectId, shotId, and videoUrl are required' });
    }

    const shot = commercialService.importVideoResult({
      projectId,
      shotId,
      videoUrl,
      importedBy,
      notes
    });

    return res.json({ success: true, shot });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 9. Submit Official API Job
miniMaxApi.post('/submit-job', async (req, res) => {
  try {
    const { projectId, shotId, idempotencyKey, humanApproved, approvedBy } = req.body;

    if (!projectId || !shotId) {
      return res.status(400).json({ success: false, error: 'projectId and shotId are required' });
    }

    const job = await commercialService.submitApiJob({
      projectId,
      shotId,
      idempotencyKey,
      humanApproved: Boolean(humanApproved),
      approvedBy: approvedBy || 'operator'
    });

    return res.json({ success: true, job });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

// 10. Query / Sync Job Status
miniMaxApi.get('/jobs/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const sync = req.query.sync === 'true';

    let job = commercialService.getJob(jobId);
    if (!job) {
      return res.status(404).json({ success: false, error: `Job ${jobId} not found.` });
    }

    if (sync && job.externalTaskId && job.status !== 'SUCCESS' && job.status !== 'FAILED') {
      try {
        job = await commercialService.syncJobStatus(jobId);
      } catch (syncErr: any) {
        console.warn(`Failed to sync job ${jobId}:`, syncErr.message);
      }
    }

    return res.json({ success: true, job });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

miniMaxApi.post('/jobs/:jobId/sync', async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = await commercialService.syncJobStatus(jobId);
    return res.json({ success: true, job });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

miniMaxApi.get('/jobs', (req, res) => {
  try {
    const tenantId = req.query.tenantId as string | undefined;
    const jobs = commercialService.listJobs(tenantId);
    return res.json({ success: true, jobs });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
