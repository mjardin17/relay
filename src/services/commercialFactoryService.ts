import crypto from 'node:crypto';
import { getDatabase } from '../db/database';
import {
  CommercialFactoryProject,
  CommercialSceneShot,
  CommercialContinuityManifest,
  MiniMaxReferenceAsset,
  MiniMaxManualTrialPackage,
  MiniMaxCostEstimate,
  MiniMaxGenerationJobRecord,
  VideoResolution,
  VideoAspectRatio,
  MiniMaxGenerationMode
} from '../types/miniMaxH3';
import { MiniMaxPromptBuilder } from './minimaxPromptBuilder';
import { MiniMaxCostCalculator } from './minimaxCostCalculator';
import { MiniMaxH3CreativeProvider } from './providers/miniMaxH3CreativeProvider';
import { LaunchAuditService } from './launchAuditService';

export class CommercialFactoryService {
  private static instance: CommercialFactoryService;
  private auditService: LaunchAuditService;
  private miniMaxProvider: MiniMaxH3CreativeProvider;

  // In-memory / cache fallback structures
  private referenceAssets: Map<string, MiniMaxReferenceAsset> = new Map();
  private projects: Map<string, CommercialFactoryProject> = new Map();
  private jobs: Map<string, MiniMaxGenerationJobRecord> = new Map();

  private constructor() {
    this.auditService = LaunchAuditService.getInstance();
    this.miniMaxProvider = new MiniMaxH3CreativeProvider();
    this.seedDefaultAssetsAndProjects();
  }

  public static getInstance(): CommercialFactoryService {
    if (!CommercialFactoryService.instance) {
      CommercialFactoryService.instance = new CommercialFactoryService();
    }
    return CommercialFactoryService.instance;
  }

  private seedDefaultAssetsAndProjects(): void {
    // 1. Seed Tenant Reference Assets
    const seedAssets: MiniMaxReferenceAsset[] = [
      // Reis Electric Assets
      {
        id: 'asset_reis_char_1',
        tenantId: 'tenant_reis_electric',
        category: 'character_face',
        name: 'Master Electrician John — Portrait',
        mediaType: 'image',
        url: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=800&q=80',
        mimeType: 'image/jpeg',
        fileSizeBytes: 1450000,
        ownershipVerified: true,
        ownershipDeclaration: 'Reis Electric Staff Photography — Licensed for brand promotional use.',
        bindingRole: 'Lead Master Electrician Face Lock',
        tags: ['electrician', 'uniform', 'face_ref'],
        createdAt: '2026-08-01T09:00:00.000Z'
      },
      {
        id: 'asset_reis_logo_1',
        tenantId: 'tenant_reis_electric',
        category: 'brand_logo',
        name: 'Reis Electric Emblem & Badge',
        mediaType: 'image',
        url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&q=80',
        mimeType: 'image/png',
        fileSizeBytes: 820000,
        ownershipVerified: true,
        ownershipDeclaration: 'Registered Trademark of Reis Electric LLC.',
        bindingRole: 'Brand Identity & Chest Patch',
        tags: ['logo', 'branding'],
        createdAt: '2026-08-01T09:00:00.000Z'
      },
      {
        id: 'asset_reis_audio_1',
        tenantId: 'tenant_reis_electric',
        category: 'voice_sample',
        name: 'Reis Electric Brand Voiceover Profile',
        mediaType: 'audio',
        url: 'https://assets.relay.local/audio/reis_voice_sample.mp3',
        mimeType: 'audio/mpeg',
        fileSizeBytes: 2100000,
        durationSeconds: 12,
        ownershipVerified: true,
        ownershipDeclaration: 'Commissioned Voice Actor Work-for-Hire Contract on file.',
        bindingRole: 'Authoritative New England Narrator',
        tags: ['voice', 'commercial_audio'],
        createdAt: '2026-08-01T09:00:00.000Z'
      },

      // Jardin's Outpost Assets
      {
        id: 'asset_jardin_creator_1',
        tenantId: 'tenant_jardins_outpost',
        category: 'character_face',
        name: 'Digital Workshop Inventor — Atelier Portrait',
        mediaType: 'image',
        url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80',
        mimeType: 'image/jpeg',
        fileSizeBytes: 1800000,
        ownershipVerified: true,
        ownershipDeclaration: 'Joshua Jardin Creator Identity — Authorized for Outpost releases.',
        bindingRole: 'Lead Inventor & Systems Engineer',
        tags: ['inventor', 'outpost', 'creator'],
        createdAt: '2026-08-01T09:00:00.000Z'
      },
      {
        id: 'asset_jardin_workshop_env',
        tenantId: 'tenant_jardins_outpost',
        category: 'location_environment',
        name: 'Inventor Workbench with Brass & Copper Accents',
        mediaType: 'image',
        url: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=800&q=80',
        mimeType: 'image/jpeg',
        fileSizeBytes: 2300000,
        ownershipVerified: true,
        ownershipDeclaration: 'Jardin\'s Outpost physical workspace photography.',
        bindingRole: 'Primary Workshop Studio Environment',
        tags: ['workbench', 'copper', 'aesthetic'],
        createdAt: '2026-08-01T09:00:00.000Z'
      },

      // BossLister Assets
      {
        id: 'asset_bosslister_prod_1',
        tenantId: 'tenant_bosslister',
        category: 'product_photo',
        name: 'Luxury Vintage Leather Handbag — Macro Studio',
        mediaType: 'image',
        url: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=800&q=80',
        mimeType: 'image/jpeg',
        fileSizeBytes: 3100000,
        ownershipVerified: true,
        ownershipDeclaration: 'BossLister Verified Inventory Photography.',
        bindingRole: 'Hero Product Listing Specimen',
        tags: ['product', 'luxury', 'resale'],
        createdAt: '2026-08-01T09:00:00.000Z'
      },

      // StoryForge Assets
      {
        id: 'asset_storyforge_char_1',
        tenantId: 'tenant_storyforge',
        category: 'character_turnaround',
        name: 'Runic Astral Explorer — 3D Turnaround Sheet',
        mediaType: 'image',
        url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
        mimeType: 'image/jpeg',
        fileSizeBytes: 2800000,
        ownershipVerified: true,
        ownershipDeclaration: 'StoryForge Original IP — Concept Art rights assigned.',
        bindingRole: 'Astral Protagonist 360 Lock',
        tags: ['cgi', 'character_sheet', 'fantasy'],
        createdAt: '2026-08-01T09:00:00.000Z'
      }
    ];

    for (const a of seedAssets) {
      this.referenceAssets.set(a.id, a);
    }

    // 2. Seed Default Commercial Projects
    const reisCommercial = this.createCommercialProject({
      tenantId: 'tenant_reis_electric',
      title: 'Reis Electric 30s Certified Safety Commercial',
      commercialType: '30s_Commercial',
      brandVoice: 'Authoritative, dependable, safety-focused New England craft',
      targetAudience: 'Homeowners and general contractors in Massachusetts',
      conceptBrief: 'A clean, high-production 30-second commercial highlighting certified master electrician inspections, modern circuit panel upgrades, and zero-compromise electrical safety.'
    });

    const outpostCommercial = this.createCommercialProject({
      tenantId: 'tenant_jardins_outpost',
      title: 'Jardin\'s Outpost 15s Product Pipeline Spot',
      commercialType: '15s_Spot',
      brandVoice: 'Editorial inventor, disciplined engineering, tactile craft',
      targetAudience: 'Engineers, founders, and digital artisans',
      conceptBrief: 'A 15-second cinematic spot exploring the transition from real-world problem solving to automated digital products.'
    });

    this.projects.set(reisCommercial.id, reisCommercial);
    this.projects.set(outpostCommercial.id, outpostCommercial);
  }

  /**
   * Reference Asset Management
   */
  public listReferenceAssets(tenantId: string): MiniMaxReferenceAsset[] {
    const all = Array.from(this.referenceAssets.values());
    return all.filter(a => a.tenantId === tenantId || a.tenantId === 'all_tenants');
  }

  public addReferenceAsset(asset: Omit<MiniMaxReferenceAsset, 'id' | 'createdAt'>): MiniMaxReferenceAsset {
    const id = `asset_ref_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const created: MiniMaxReferenceAsset = {
      ...asset,
      id,
      createdAt: new Date().toISOString()
    };
    this.referenceAssets.set(id, created);

    this.auditService.logAuditEvent({
      tenantId: asset.tenantId,
      actorId: 'operator',
      action: 'ADD_REFERENCE_ASSET',
      endpoint: '/api/creative/minimax/assets/add',
      status: 'ASSET_REGISTERED',
      details: {
        assetId: id,
        name: asset.name,
        category: asset.category,
        mediaType: asset.mediaType,
        ownershipVerified: asset.ownershipVerified
      }
    });

    return created;
  }

  /**
   * Creates a multi-shot commercial project with automatic scene decomposition.
   * Breaks longer commercials into 4-15s shots and enforces continuity manifests.
   */
  public createCommercialProject(params: {
    tenantId: string;
    title: string;
    commercialType: '30s_Commercial' | '15s_Spot' | '60s_BrandStory' | 'Social_Reel' | 'Product_Showcase';
    brandVoice: string;
    targetAudience: string;
    conceptBrief: string;
  }): CommercialFactoryProject {
    const projectId = `proj_comm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const tenantId = params.tenantId || 'tenant_reis_electric';

    // 1. Generate Continuity Manifest
    const continuityManifest: CommercialContinuityManifest = {
      manifestId: `manif_${projectId}`,
      tenantId,
      brandName: tenantId === 'tenant_reis_electric' ? 'Reis Electric' : tenantId === 'tenant_jardins_outpost' ? "Jardin's Outpost" : 'Relay Brand',
      leadCharacterIdentity: tenantId === 'tenant_reis_electric' ? 'Lead Master Electrician John' : 'Creator & Systems Architect',
      characterWardrobe: tenantId === 'tenant_reis_electric' ? 'Navy blue clean workwear with logo patch, safety glasses' : 'Charcoal engineer jacket, matte black apron',
      brandPaletteTokens: ['#0B0F19 (Near Black)', '#C26D45 (Copper Rust)', '#10B981 (Emerald Accent)', '#F8FAFC (Bone White)'],
      productAppearance: 'Clean copper conduit & high-grade electrical hardware',
      keyEnvironment: tenantId === 'tenant_reis_electric' ? 'Modern residential mechanical room & panel' : 'Inventor studio workbench',
      lightingTone: 'Cinematic warm tungsten rim with crisp daylight key',
      audioVoiceIdentity: 'Deep, calm, reassuring commercial baritone',
      soundscapeStyle: 'Tactile mechanical switch clicks and gentle acoustic build',
      lockedAssets: [],
      notes: 'Maintain strict color grading and wardrobe consistency across all scene cuts.'
    };

    // 2. Decompose into individual shots (4-15 seconds each)
    let shotPlans: Array<{
      title: string;
      desc: string;
      duration: number;
      mode: MiniMaxGenerationMode;
      resolution: VideoResolution;
      aspectRatio: VideoAspectRatio;
    }> = [];

    if (params.commercialType === '30s_Commercial') {
      shotPlans = [
        {
          title: 'Scene 1: Problem Hook — Power Panel Inspection',
          desc: 'Close-up of outdated, tangled residential breaker box before an electrical upgrade.',
          duration: 6,
          mode: 'TEXT_TO_VIDEO',
          resolution: '768p',
          aspectRatio: '16:9'
        },
        {
          title: 'Scene 2: Craft Demonstration — Precision Conduit Installation',
          desc: 'Electrician smoothly bending copper conduit and locking high-grade breakers into place.',
          duration: 6,
          mode: 'TEXT_TO_VIDEO',
          resolution: '768p',
          aspectRatio: '16:9'
        },
        {
          title: 'Scene 3: Inspection & Voltage Measurement',
          desc: 'Multimeter digital reading stabilizing at optimal 240V with a reassuring green LED indicator.',
          duration: 6,
          mode: 'FIRST_LAST_FRAME_VIDEO',
          resolution: '768p',
          aspectRatio: '16:9'
        },
        {
          title: 'Scene 4: Customer Peace of Mind',
          desc: 'Homeowner smiling warmly as the modern, organized panel cover is secured with clean branding.',
          duration: 6,
          mode: 'TEXT_TO_VIDEO',
          resolution: '768p',
          aspectRatio: '16:9'
        },
        {
          title: 'Scene 5: Brand Outro & Call to Action',
          desc: 'Hero brand lockup with phone number and license number, backed by crisp acoustic theme.',
          duration: 6,
          mode: 'IMAGE_TO_VIDEO',
          resolution: '768p',
          aspectRatio: '16:9'
        }
      ];
    } else if (params.commercialType === '15s_Spot') {
      shotPlans = [
        {
          title: 'Shot 1: The Inventor Spark',
          desc: 'Inventor inspecting real-world problem on workbench and turning console switch.',
          duration: 7,
          mode: 'TEXT_TO_VIDEO',
          resolution: '768p',
          aspectRatio: '16:9'
        },
        {
          title: 'Shot 2: Digital Automation & Product Result',
          desc: 'Automated product telemetry activating on screen, resolving into Outpost hero badge.',
          duration: 8,
          mode: 'FIRST_LAST_FRAME_VIDEO',
          resolution: '768p',
          aspectRatio: '16:9'
        }
      ];
    } else {
      shotPlans = [
        {
          title: 'Scene 1: Hero Introduction',
          desc: 'Compelling cinematic intro establishing core subject and environment.',
          duration: 6,
          mode: 'TEXT_TO_VIDEO',
          resolution: '768p',
          aspectRatio: '16:9'
        },
        {
          title: 'Scene 2: Core Demonstration',
          desc: 'Action-packed demonstration showing precision value and solution.',
          duration: 6,
          mode: 'TEXT_TO_VIDEO',
          resolution: '768p',
          aspectRatio: '16:9'
        },
        {
          title: 'Scene 3: Brand Resolution',
          desc: 'Definitive ending resolving brand promise and next steps.',
          duration: 5,
          mode: 'TEXT_TO_VIDEO',
          resolution: '768p',
          aspectRatio: '16:9'
        }
      ];
    }

    const totalDuration = shotPlans.reduce((sum, s) => sum + s.duration, 0);

    const shots: CommercialSceneShot[] = shotPlans.map((sp, idx) => {
      const shotId = `shot_${projectId}_${idx + 1}`;
      const preset = MiniMaxPromptBuilder.buildTenantPreset(tenantId, sp.title);
      preset.actionAndPerformance = sp.desc;
      const composedPrompt = MiniMaxPromptBuilder.composePrompt(preset);
      const costEstimate = MiniMaxCostCalculator.calculateEstimate({
        durationSeconds: sp.duration,
        resolution: sp.resolution,
        imageReferencesCount: 2
      });

      const trialPackage = this.miniMaxProvider.createManualTrialPackage({
        tenantId,
        sceneTitle: sp.title,
        generationMode: sp.mode,
        durationSeconds: sp.duration,
        resolution: sp.resolution,
        aspectRatio: sp.aspectRatio,
        customPromptText: composedPrompt
      });

      return {
        shotId,
        sceneNumber: 1,
        shotNumber: idx + 1,
        title: sp.title,
        storyboardDescription: sp.desc,
        durationSeconds: sp.duration,
        resolution: sp.resolution,
        aspectRatio: sp.aspectRatio,
        mode: sp.mode,
        promptStructure: preset,
        composedPrompt,
        selectedReferenceAssetIds: [],
        status: 'TRIAL_READY',
        trialPackage,
        costEstimate
      };
    });

    const project: CommercialFactoryProject = {
      id: projectId,
      tenantId,
      title: params.title,
      commercialType: params.commercialType,
      totalDurationSeconds: totalDuration,
      brandVoice: params.brandVoice,
      targetAudience: params.targetAudience,
      conceptBrief: params.conceptBrief,
      continuityManifest,
      shots,
      selectedProvider: 'MINIMAX_H3',
      connectorMode: 'MANUAL_TRIAL',
      overallStatus: 'PLANNING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.projects.set(projectId, project);

    this.auditService.logAuditEvent({
      tenantId,
      actorId: 'operator',
      action: 'CREATE_COMMERCIAL_PROJECT',
      endpoint: '/api/creative/commercial-factory/create',
      status: 'PROJECT_CREATED',
      details: {
        projectId,
        title: project.title,
        commercialType: project.commercialType,
        totalDurationSeconds: totalDuration,
        shotsCount: shots.length
      }
    });

    return project;
  }

  public listProjects(tenantId?: string): CommercialFactoryProject[] {
    const all = Array.from(this.projects.values());
    if (tenantId) {
      return all.filter(p => p.tenantId === tenantId);
    }
    return all;
  }

  public getProject(projectId: string): CommercialFactoryProject | undefined {
    return this.projects.get(projectId);
  }

  /**
   * Updates an individual shot without regenerating the entire commercial
   */
  public updateShotPrompt(params: {
    projectId: string;
    shotId: string;
    promptStructure?: any;
    customPromptText?: string;
    durationSeconds?: number;
    resolution?: VideoResolution;
    selectedReferenceAssetIds?: string[];
  }): CommercialSceneShot {
    const project = this.projects.get(params.projectId);
    if (!project) throw new Error(`Project ${params.projectId} not found.`);

    const shotIndex = project.shots.findIndex(s => s.shotId === params.shotId);
    if (shotIndex === -1) throw new Error(`Shot ${params.shotId} not found in project.`);

    const shot = project.shots[shotIndex];

    if (params.durationSeconds) shot.durationSeconds = params.durationSeconds;
    if (params.resolution) shot.resolution = params.resolution;
    if (params.selectedReferenceAssetIds) shot.selectedReferenceAssetIds = params.selectedReferenceAssetIds;

    if (params.promptStructure) {
      shot.promptStructure = { ...shot.promptStructure, ...params.promptStructure };
      shot.composedPrompt = MiniMaxPromptBuilder.composePrompt(shot.promptStructure);
    } else if (params.customPromptText) {
      shot.composedPrompt = params.customPromptText;
    }

    // Recalculate cost & refresh trial package
    const refAssets = (shot.selectedReferenceAssetIds || [])
      .map(id => this.referenceAssets.get(id))
      .filter((a): a is MiniMaxReferenceAsset => !!a);

    shot.costEstimate = MiniMaxCostCalculator.calculateEstimate({
      durationSeconds: shot.durationSeconds,
      resolution: shot.resolution,
      imageReferencesCount: refAssets.filter(r => r.mediaType === 'image').length,
      videoReferencesCount: refAssets.filter(r => r.mediaType === 'video').length,
      audioReferencesCount: refAssets.filter(r => r.mediaType === 'audio').length
    });

    shot.trialPackage = this.miniMaxProvider.createManualTrialPackage({
      tenantId: project.tenantId,
      sceneTitle: shot.title,
      generationMode: shot.mode,
      durationSeconds: shot.durationSeconds,
      resolution: shot.resolution,
      aspectRatio: shot.aspectRatio,
      references: refAssets,
      customPromptText: shot.composedPrompt
    });

    shot.status = 'TRIAL_READY';
    project.updatedAt = new Date().toISOString();

    return shot;
  }

  /**
   * Imports a completed video generated via manual trial or external render back into Relay
   */
  public importVideoResult(params: {
    projectId: string;
    shotId: string;
    videoUrl: string;
    importedBy?: string;
    notes?: string;
  }): CommercialSceneShot {
    const project = this.projects.get(params.projectId);
    if (!project) throw new Error(`Project ${params.projectId} not found.`);

    const shot = project.shots.find(s => s.shotId === params.shotId);
    if (!shot) throw new Error(`Shot ${params.shotId} not found.`);

    shot.importedVideoUrl = params.videoUrl;
    shot.status = 'IMPORTED';

    const auditRef = `ev_import_video_${shot.shotId}_${Date.now()}`;
    shot.lastAuditRef = auditRef;

    this.auditService.logAuditEvent({
      tenantId: project.tenantId,
      actorId: params.importedBy || 'operator',
      action: 'IMPORT_MINIMAX_VIDEO_RESULT',
      endpoint: '/api/creative/commercial-factory/import-video',
      status: 'VIDEO_IMPORTED',
      details: {
        projectId: project.id,
        shotId: shot.shotId,
        videoUrl: params.videoUrl,
        promptSnippet: shot.composedPrompt.substring(0, 100),
        duration: shot.durationSeconds,
        resolution: shot.resolution,
        auditRef
      }
    });

    // Check if all shots are completed/imported
    const allDone = project.shots.every(s => s.status === 'IMPORTED' || s.status === 'COMPLETED');
    if (allDone) {
      project.overallStatus = 'ASSEMBLED';
      project.assembledVideoUrl = shot.importedVideoUrl; // Demo single-cut preview
    }

    project.updatedAt = new Date().toISOString();
    return shot;
  }

  /**
   * Submits an official API generation job (requires MINIMAX_API_KEY and human approval)
   */
  public async submitApiJob(params: {
    projectId: string;
    shotId: string;
    idempotencyKey?: string;
    humanApproved: boolean;
    approvedBy: string;
  }): Promise<MiniMaxGenerationJobRecord> {
    if (!params.humanApproved) {
      throw new Error('SUBMISSION_BLOCKED: Explicit human approval is required immediately before submitting paid MiniMax API generation.');
    }

    const connState = this.miniMaxProvider.getConnectionState();
    if (connState === 'MANUAL_TRIAL_AVAILABLE' || connState === 'API_NOT_CONFIGURED') {
      throw new Error('API_DISCONNECTED: MINIMAX_API_KEY is not configured or authenticated. Please use the Manual Trial workflow or verify official credentials.');
    }

    const project = this.projects.get(params.projectId);
    if (!project) throw new Error(`Project ${params.projectId} not found.`);

    const shot = project.shots.find(s => s.shotId === params.shotId);
    if (!shot) throw new Error(`Shot ${params.shotId} not found.`);

    const idempotencyKey = params.idempotencyKey || `idem_${shot.shotId}_${Date.now()}`;
    const jobId = `job_minimax_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const jobRecord: MiniMaxGenerationJobRecord = {
      id: jobId,
      tenantId: project.tenantId,
      projectId: project.id,
      shotId: shot.shotId,
      model: 'MiniMax-H3',
      generationMode: shot.mode,
      connectorMode: 'OFFICIAL_API',
      status: 'PROCESSING',
      externalTaskId: `task_${Date.now()}`,
      prompt: shot.composedPrompt,
      durationSeconds: shot.durationSeconds,
      resolution: shot.resolution,
      aspectRatio: shot.aspectRatio,
      referenceAssetCount: shot.selectedReferenceAssetIds.length,
      costEstimateUsd: shot.costEstimate.totalEstimatedCostUsd,
      actualCostIncurredUsd: shot.costEstimate.totalEstimatedCostUsd,
      humanApproved: true,
      approvedBy: params.approvedBy,
      idempotencyKey,
      auditRef: `ev_job_${jobId}`,
      submittedAt: new Date().toISOString()
    };

    this.jobs.set(jobId, jobRecord);
    shot.jobId = jobId;
    shot.status = 'RUNNING';

    this.auditService.logAuditEvent({
      tenantId: project.tenantId,
      actorId: params.approvedBy,
      action: 'SUBMIT_MINIMAX_API_JOB',
      endpoint: '/api/creative/minimax/submit-job',
      status: 'JOB_SUBMITTED',
      details: {
        jobId,
        shotId: shot.shotId,
        costUsd: jobRecord.costEstimateUsd,
        duration: shot.durationSeconds,
        resolution: shot.resolution
      }
    });

    return jobRecord;
  }

  public getJob(jobId: string): MiniMaxGenerationJobRecord | undefined {
    return this.jobs.get(jobId);
  }
}
