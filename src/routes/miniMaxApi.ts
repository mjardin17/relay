import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { CommercialFactoryService } from '../services/commercialFactoryService';
import { MiniMaxPromptBuilder } from '../services/minimaxPromptBuilder';
import { MiniMaxCostCalculator } from '../services/minimaxCostCalculator';

export const miniMaxApi = Router();

// Apply strict session authentication and tenant isolation
miniMaxApi.use(authMiddleware);

const commercialService = CommercialFactoryService.getInstance();
const miniMaxProvider = commercialService.getProvider();

// Helper to resolve session tenant & actor
function getSessionContext(req: Request): { tenantId: string; actorId: string; role: string } {
  return {
    tenantId: (req as any).tenantId || 'default',
    actorId: (req as any).userId || 'operator',
    role: (req as any).userRole || 'OPERATOR'
  };
}

// 1. Status & Connector State
miniMaxApi.get('/status', async (req: Request, res: Response) => {
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
    return res.status(500).json({ success: false, error: err.message || String(err) });
  }
});

// 2. Verify API Key Probe (Server-side environment key only, rejects client-supplied key)
miniMaxApi.post('/verify', async (req: Request, res: Response) => {
  try {
    if (req.body && req.body.apiKey !== undefined) {
      return res.status(400).json({
        success: false,
        error: 'CLIENT_SUPPLIED_API_KEY_REJECTED',
        message: 'MINIMAX_API_KEY must be read only from the server environment. Client-supplied API keys are strictly rejected.'
      });
    }

    // Verify key exclusively from server environment
    const result = await miniMaxProvider.verifyApiKey();
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || String(err) });
  }
});

// 3. Cost Estimate Calculator
miniMaxApi.post('/estimate-cost', (req: Request, res: Response) => {
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
    } = req.body || {};

    const estimate = MiniMaxCostCalculator.calculateEstimate({
      durationSeconds: Number(durationSeconds) || 6,
      resolution: resolution || '768p',
      imageReferencesCount: Number(imageReferencesCount) || 0,
      videoReferencesCount: Number(videoReferencesCount) || 0,
      videoReferencesTotalDurationSeconds: Number(videoReferencesTotalDurationSeconds) || 0,
      audioReferencesCount: Number(audioReferencesCount) || 0,
      isRegenerationFrom768p: Boolean(isRegenerationFrom768p),
      humanApproved: Boolean(humanApproved),
      approvedBy: approvedBy || (req as any).userId
    });

    return res.json({ success: true, estimate });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || String(err) });
  }
});

// 4. Compose & Validate MiniMax H3 Prompt
miniMaxApi.post('/compose-prompt', (req: Request, res: Response) => {
  try {
    const { structure } = req.body || {};
    if (!structure) {
      return res.status(400).json({ success: false, error: 'structure object is required' });
    }
    const composed = MiniMaxPromptBuilder.composePrompt(structure);
    return res.json({ success: true, composedPrompt: composed });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || String(err) });
  }
});

miniMaxApi.post('/validate-prompt', (req: Request, res: Response) => {
  try {
    const { prompt, durationSeconds, resolution, aspectRatio, mode, references, firstFrameUrl, lastFrameUrl } = req.body || {};
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
    return res.status(500).json({ success: false, error: err.message || String(err) });
  }
});

// 5. Tenant Reference Assets (Strictly tenant-scoped)
miniMaxApi.get('/assets', (req: Request, res: Response) => {
  try {
    const { tenantId } = getSessionContext(req);
    const assets = commercialService.listReferenceAssets(tenantId);
    return res.json({ success: true, tenantId, assets });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || String(err) });
  }
});

const handleAddAsset = (req: Request, res: Response) => {
  try {
    const { tenantId } = getSessionContext(req);
    const {
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
    } = req.body || {};

    if (!name || !url || !category) {
      return res.status(400).json({ success: false, error: 'name, url, and category are required' });
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
    return res.status(500).json({ success: false, error: err.message || String(err) });
  }
};

miniMaxApi.post('/assets/add', handleAddAsset);
miniMaxApi.post('/assets/register', handleAddAsset);

// 6. Commercial Factory Projects (Strictly tenant-scoped)
miniMaxApi.get('/projects', (req: Request, res: Response) => {
  try {
    const { tenantId } = getSessionContext(req);
    const projects = commercialService.listProjects(tenantId);
    return res.json({ success: true, projects });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || String(err) });
  }
});

const handleCreateProject = (req: Request, res: Response) => {
  try {
    const { tenantId } = getSessionContext(req);
    const { title, commercialType, brandVoice, targetAudience, conceptBrief } = req.body || {};
    if (!title || !commercialType) {
      return res.status(400).json({ success: false, error: 'title and commercialType are required' });
    }

    const project = commercialService.createProject({
      tenantId,
      title,
      commercialType,
      brandVoice: brandVoice || 'Authoritative and trustworthy commercial tone',
      targetAudience: targetAudience || 'Target customers and stakeholders',
      conceptBrief: conceptBrief || title
    });

    return res.json({ success: true, project });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || String(err) });
  }
};

miniMaxApi.post('/projects/create', handleCreateProject);
miniMaxApi.post('/create', handleCreateProject);

// 7. Update Individual Shot (with tenant boundary check)
const handleUpdateShot = (req: Request, res: Response) => {
  try {
    const { tenantId } = getSessionContext(req);
    const {
      projectId,
      shotId,
      promptStructure,
      customPromptText,
      durationSeconds,
      resolution,
      selectedReferenceAssetIds
    } = req.body || {};

    if (!projectId || !shotId) {
      return res.status(400).json({ success: false, error: 'projectId and shotId are required' });
    }

    const project = commercialService.getProject(projectId);
    if (!project) {
      return res.status(404).json({ success: false, error: `Project '${projectId}' not found.` });
    }

    if (project.tenantId !== tenantId) {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: `Project '${projectId}' belongs to another tenant.`
      });
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
    return res.status(500).json({ success: false, error: err.message || String(err) });
  }
};

miniMaxApi.post('/projects/update-shot', handleUpdateShot);
miniMaxApi.post('/update-shot', handleUpdateShot);

// 8. Import Video Result Back Into Relay (with tenant boundary check)
const handleImportVideo = (req: Request, res: Response) => {
  try {
    const { tenantId, actorId } = getSessionContext(req);
    const { projectId, shotId, videoUrl, notes } = req.body || {};
    if (!projectId || !shotId || !videoUrl) {
      return res.status(400).json({ success: false, error: 'projectId, shotId, and videoUrl are required' });
    }

    const project = commercialService.getProject(projectId);
    if (!project) {
      return res.status(404).json({ success: false, error: `Project '${projectId}' not found.` });
    }

    if (project.tenantId !== tenantId) {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: `Project '${projectId}' belongs to another tenant.`
      });
    }

    const shot = commercialService.importVideoResult({
      projectId,
      shotId,
      videoUrl,
      importedBy: actorId,
      notes
    });

    return res.json({ success: true, shot });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || String(err) });
  }
};

miniMaxApi.post('/projects/import-video', handleImportVideo);
miniMaxApi.post('/import-video', handleImportVideo);

// 9. Submit Official API Job (with tenant boundary check & human approval check)
miniMaxApi.post('/submit-job', async (req: Request, res: Response) => {
  try {
    const { tenantId, actorId } = getSessionContext(req);
    const { projectId, shotId, idempotencyKey, humanApproved } = req.body || {};

    if (!projectId || !shotId) {
      return res.status(400).json({ success: false, error: 'projectId and shotId are required' });
    }

    const project = commercialService.getProject(projectId);
    if (!project) {
      return res.status(404).json({ success: false, error: `Project '${projectId}' not found.` });
    }

    if (project.tenantId !== tenantId) {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: `Project '${projectId}' belongs to another tenant.`
      });
    }

    const job = await commercialService.submitApiJob({
      projectId,
      shotId,
      idempotencyKey,
      humanApproved: Boolean(humanApproved),
      approvedBy: actorId
    });

    return res.json({ success: true, job });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message || String(err) });
  }
});

// 10. Query / Sync Job Status (with tenant boundary check)
miniMaxApi.get('/jobs/:jobId', async (req: Request, res: Response) => {
  try {
    const { tenantId } = getSessionContext(req);
    const { jobId } = req.params;
    const sync = req.query.sync === 'true';

    let job = commercialService.getJob(jobId);
    if (!job) {
      return res.status(404).json({ success: false, error: `Job '${jobId}' not found.` });
    }

    if (job.tenantId !== tenantId) {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: `Job '${jobId}' belongs to another tenant.`
      });
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
    return res.status(500).json({ success: false, error: err.message || String(err) });
  }
});

miniMaxApi.post('/jobs/:jobId/sync', async (req: Request, res: Response) => {
  try {
    const { tenantId } = getSessionContext(req);
    const { jobId } = req.params;

    const existingJob = commercialService.getJob(jobId);
    if (!existingJob) {
      return res.status(404).json({ success: false, error: `Job '${jobId}' not found.` });
    }

    if (existingJob.tenantId !== tenantId) {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: `Job '${jobId}' belongs to another tenant.`
      });
    }

    const job = await commercialService.syncJobStatus(jobId);
    return res.json({ success: true, job });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message || String(err) });
  }
});

miniMaxApi.get('/jobs', (req: Request, res: Response) => {
  try {
    const { tenantId } = getSessionContext(req);
    const jobs = commercialService.listJobs(tenantId);
    return res.json({ success: true, jobs });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || String(err) });
  }
});
