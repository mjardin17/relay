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
  MiniMaxGenerationMode,
  MiniMaxJobStatus
} from '../types/miniMaxH3';
import { MiniMaxPromptBuilder } from './minimaxPromptBuilder';
import { MiniMaxCostCalculator } from './minimaxCostCalculator';
import { MiniMaxH3CreativeProvider } from './providers/miniMaxH3CreativeProvider';
import { LaunchAuditService } from './launchAuditService';
import { MiniMaxH3Client, HttpTransport } from './minimaxH3Client';

export class CommercialFactoryService {
  private static instance: CommercialFactoryService;
  private auditService: LaunchAuditService;
  private miniMaxProvider: MiniMaxH3CreativeProvider;
  private client: MiniMaxH3Client;

  private constructor(options?: { client?: MiniMaxH3Client; transport?: HttpTransport }) {
    this.auditService = LaunchAuditService.getInstance();
    if (options?.client) {
      this.client = options.client;
      this.miniMaxProvider = new MiniMaxH3CreativeProvider({ client: this.client });
    } else {
      this.client = new MiniMaxH3Client({ transport: options?.transport });
      this.miniMaxProvider = new MiniMaxH3CreativeProvider({ client: this.client });
    }
    this.seedDefaultAssetsAndProjects();
  }

  public static getInstance(options?: { client?: MiniMaxH3Client; transport?: HttpTransport }): CommercialFactoryService {
    if (!CommercialFactoryService.instance) {
      CommercialFactoryService.instance = new CommercialFactoryService(options);
    } else if (options?.transport) {
      CommercialFactoryService.instance.setTransport(options.transport);
    }
    return CommercialFactoryService.instance;
  }

  public setApiKey(apiKey: string): void {
    this.client.setApiKey(apiKey);
    this.miniMaxProvider.getClient().setApiKey(apiKey);
  }

  public setTransport(transport: HttpTransport): void {
    const currentKey = this.client.getApiKey();
    this.client = new MiniMaxH3Client({
      apiKey: currentKey || undefined,
      transport
    });
    this.miniMaxProvider.setTransport(transport);
  }

  public getClient(): MiniMaxH3Client {
    return this.client;
  }

  public getProvider(): MiniMaxH3CreativeProvider {
    return this.miniMaxProvider;
  }

  private seedDefaultAssetsAndProjects(): void {
    const db = getDatabase();

    // Ensure referenced tenants exist in tenants table to satisfy foreign key constraints
    const ensureTenantStmt = db.prepare(`
      INSERT OR IGNORE INTO tenants (id, name, industry, mrr, primary_bottleneck, created_at)
      VALUES (?, ?, ?, 0, 'Commercial Video Pipeline', ?)
    `);
    const now = new Date().toISOString();
    ensureTenantStmt.run('tenant_reis_electric', 'Reis Electric LLC', 'Electrical Contracting', now);
    ensureTenantStmt.run('tenant_jardins_outpost', "Jardin's Outpost", 'Hardware & Software Atelier', now);
    ensureTenantStmt.run('tenant_bosslister', 'BossLister Pro', 'E-Commerce & Resale', now);

    // Check if assets already exist
    const existingAssetCount = (db.prepare('SELECT COUNT(*) as count FROM commercial_reference_assets').get() as any)?.count || 0;
    if (existingAssetCount === 0) {
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
          ownershipDeclaration: "Jardin's Outpost physical workspace photography.",
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
        }
      ];

      const stmt = db.prepare(`
        INSERT INTO commercial_reference_assets (
          id, tenant_id, category, name, media_type, url, mime_type, file_size_bytes,
          duration_seconds, dimensions_json, ownership_verified, ownership_declaration,
          binding_role, tags_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const a of seedAssets) {
        stmt.run(
          a.id,
          a.tenantId,
          a.category,
          a.name,
          a.mediaType,
          a.url,
          a.mimeType,
          a.fileSizeBytes,
          a.durationSeconds || null,
          a.dimensions ? JSON.stringify(a.dimensions) : null,
          a.ownershipVerified ? 1 : 0,
          a.ownershipDeclaration,
          a.bindingRole,
          JSON.stringify(a.tags),
          a.createdAt
        );
      }
    }

    // Check if default projects exist
    const existingProjectCount = (db.prepare('SELECT COUNT(*) as count FROM commercial_projects').get() as any)?.count || 0;
    if (existingProjectCount === 0) {
      // Create initial flagship project for Reis Electric
      this.createProject({
        tenantId: 'tenant_reis_electric',
        title: 'Built to Last — 30s Residential Electrical Commercial',
        commercialType: '30s_Commercial',
        brandVoice: 'Authoritative, dependable, safety-first New England craftsmanship.',
        targetAudience: 'Homeowners in Massachusetts planning major panel upgrades, EV charger installations, or whole-home safety inspections.',
        conceptBrief: 'A 5-shot cinematic narrative illustrating the contrast between obsolete dangerous electrical panels and the clean, high-precision standard of Reis Electric certified installations.'
      });
    }
  }

  // ==========================================
  // REFERENCE ASSETS (SQLite-backed)
  // ==========================================

  public listReferenceAssets(tenantId?: string): MiniMaxReferenceAsset[] {
    const db = getDatabase();
    const query = tenantId
      ? 'SELECT * FROM commercial_reference_assets WHERE tenant_id = ? ORDER BY created_at DESC'
      : 'SELECT * FROM commercial_reference_assets ORDER BY created_at DESC';
    const rows = tenantId ? (db.prepare(query).all(tenantId) as any[]) : (db.prepare(query).all() as any[]);

    return rows.map(r => ({
      id: r.id,
      tenantId: r.tenant_id,
      category: r.category,
      name: r.name,
      mediaType: r.media_type,
      url: r.url,
      mimeType: r.mime_type,
      fileSizeBytes: r.file_size_bytes,
      durationSeconds: r.duration_seconds || undefined,
      dimensions: r.dimensions_json ? JSON.parse(r.dimensions_json) : undefined,
      ownershipVerified: Boolean(r.ownership_verified),
      ownershipDeclaration: r.ownership_declaration,
      bindingRole: r.binding_role,
      tags: r.tags_json ? JSON.parse(r.tags_json) : [],
      createdAt: r.created_at
    }));
  }

  public getReferenceAsset(assetId: string): MiniMaxReferenceAsset | undefined {
    const db = getDatabase();
    const r = db.prepare('SELECT * FROM commercial_reference_assets WHERE id = ?').get(assetId) as any;
    if (!r) return undefined;
    return {
      id: r.id,
      tenantId: r.tenant_id,
      category: r.category,
      name: r.name,
      mediaType: r.media_type,
      url: r.url,
      mimeType: r.mime_type,
      fileSizeBytes: r.file_size_bytes,
      durationSeconds: r.duration_seconds || undefined,
      dimensions: r.dimensions_json ? JSON.parse(r.dimensions_json) : undefined,
      ownershipVerified: Boolean(r.ownership_verified),
      ownershipDeclaration: r.ownership_declaration,
      bindingRole: r.binding_role,
      tags: r.tags_json ? JSON.parse(r.tags_json) : [],
      createdAt: r.created_at
    };
  }

  public registerReferenceAsset(params: {
    tenantId: string;
    category: any;
    name: string;
    mediaType: 'image' | 'video' | 'audio';
    url: string;
    mimeType?: string;
    fileSizeBytes?: number;
    durationSeconds?: number;
    ownershipDeclaration: string;
    bindingRole: string;
    tags?: string[];
  }): MiniMaxReferenceAsset {
    const assetId = `asset_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const asset: MiniMaxReferenceAsset = {
      id: assetId,
      tenantId: params.tenantId,
      category: params.category,
      name: params.name,
      mediaType: params.mediaType,
      url: params.url,
      mimeType: params.mimeType || (params.mediaType === 'image' ? 'image/jpeg' : 'audio/mpeg'),
      fileSizeBytes: params.fileSizeBytes || 1024000,
      durationSeconds: params.durationSeconds,
      ownershipVerified: true,
      ownershipDeclaration: params.ownershipDeclaration,
      bindingRole: params.bindingRole,
      tags: params.tags || [],
      createdAt: now
    };

    const db = getDatabase();
    db.prepare(`
      INSERT INTO commercial_reference_assets (
        id, tenant_id, category, name, media_type, url, mime_type, file_size_bytes,
        duration_seconds, dimensions_json, ownership_verified, ownership_declaration,
        binding_role, tags_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      asset.id,
      asset.tenantId,
      asset.category,
      asset.name,
      asset.mediaType,
      asset.url,
      asset.mimeType,
      asset.fileSizeBytes,
      asset.durationSeconds || null,
      null,
      1,
      asset.ownershipDeclaration,
      asset.bindingRole,
      JSON.stringify(asset.tags),
      asset.createdAt
    );

    this.auditService.logAuditEvent({
      tenantId: params.tenantId,
      actorId: 'operator',
      action: 'REGISTER_REFERENCE_ASSET',
      endpoint: '/api/creative/minimax/register-asset',
      status: 'ASSET_REGISTERED',
      details: {
        assetId,
        name: asset.name,
        category: asset.category,
        mediaType: asset.mediaType,
        bindingRole: asset.bindingRole
      }
    });

    return asset;
  }

  // ==========================================
  // PROJECTS (SQLite-backed)
  // ==========================================

  public createProject(params: {
    tenantId: string;
    title: string;
    commercialType: '30s_Commercial' | '15s_Spot' | '60s_BrandStory' | 'Social_Reel' | 'Product_Showcase';
    brandVoice: string;
    targetAudience: string;
    conceptBrief: string;
  }): CommercialFactoryProject {
    const tenantId = params.tenantId;
    const projectId = `proj_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    // Build continuity manifest
    const continuityManifest: CommercialContinuityManifest = {
      manifestId: `manif_${projectId}`,
      tenantId,
      brandName: tenantId === 'tenant_reis_electric' ? 'Reis Electric' : "Jardin's Outpost",
      leadCharacterIdentity: tenantId === 'tenant_reis_electric'
        ? 'Lead Master Electrician John, mid-40s, friendly authoritative demeanor.'
        : 'Joshua Jardin, systems builder & workshop engineer.',
      characterWardrobe: tenantId === 'tenant_reis_electric'
        ? 'Navy blue heavy-duty twill work shirt with embroidered Reis Electric logo chest patch.'
        : 'Black workshop henley, leather work apron, brass caliper in pocket.',
      brandPaletteTokens: tenantId === 'tenant_reis_electric'
        ? ['#0B132B', '#1C2541', '#3A506B', '#F59E0B']
        : ['#0A0D14', '#1E293B', '#D97706', '#10B981'],
      productAppearance: 'High-precision copper conduit runs and organized Siemens breaker panels.',
      keyEnvironment: 'Modern architectural home interior with warm natural lighting.',
      lightingTone: '5600K clean neutral key light with warm 3200K tungsten ambient accents.',
      audioVoiceIdentity: 'Deep, resonant, confident regional voiceover.',
      soundscapeStyle: 'Crisp mechanical tactile sounds mixed with warm acoustic score.',
      lockedAssets: [],
      notes: 'Maintain character uniform patch and tool organization across all camera transitions.'
    };

    // Build shot sequence
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
          title: 'The Problem: The Outdated Panel',
          desc: 'Close-up slow tracking shot of an outdated, humming residential electrical panel with rusted conduit in a dim basement.',
          duration: 6,
          mode: 'TEXT_TO_VIDEO',
          resolution: '768p',
          aspectRatio: '16:9'
        },
        {
          title: 'The Expert Arrives',
          desc: 'Lead Master Electrician in clean Reis Electric uniform opens his tool chest with precision and tests a circuit with an insulated digital multimeter.',
          duration: 6,
          mode: 'TEXT_TO_VIDEO',
          resolution: '768p',
          aspectRatio: '16:9'
        },
        {
          title: 'Precision Craftsmanship',
          desc: 'Dynamic macro dolly shot of perfectly straight copper conduit bending and clean wire bundling into a brand new distribution hub.',
          duration: 6,
          mode: 'TEXT_TO_VIDEO',
          resolution: '768p',
          aspectRatio: '16:9'
        },
        {
          title: 'Safety Verified & Powered Up',
          desc: 'Master Electrician flips the main 200A breaker switch; illuminated digital diagnostics light up green; electrician smiles with confidence.',
          duration: 6,
          mode: 'TEXT_TO_VIDEO',
          resolution: '768p',
          aspectRatio: '16:9'
        },
        {
          title: 'The Outro & Brand Call to Action',
          desc: 'Wide heroic exterior shot of a brightly lit modern home at dusk with the Reis Electric service van parked neatly out front.',
          duration: 6,
          mode: 'TEXT_TO_VIDEO',
          resolution: '768p',
          aspectRatio: '16:9'
        }
      ];
    } else {
      shotPlans = [
        {
          title: 'Hero Product Spotlight',
          desc: 'Dynamic 360-degree rotation of product in pristine studio environment.',
          duration: 6,
          mode: 'TEXT_TO_VIDEO',
          resolution: '768p',
          aspectRatio: '16:9'
        },
        {
          title: 'Core Capability Demo',
          desc: 'Action shot demonstrating primary workflow benefit.',
          duration: 6,
          mode: 'TEXT_TO_VIDEO',
          resolution: '768p',
          aspectRatio: '16:9'
        },
        {
          title: 'Brand Call to Action',
          desc: 'Hero logo resolution and contact callout.',
          duration: 4,
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

    const now = new Date().toISOString();
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
      createdAt: now,
      updatedAt: now
    };

    const db = getDatabase();
    db.prepare(`
      INSERT INTO commercial_projects (
        id, tenant_id, title, commercial_type, total_duration_seconds,
        brand_voice, target_audience, concept_brief, continuity_manifest_json,
        shots_json, selected_provider, connector_mode, overall_status,
        assembled_video_url, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      project.id,
      project.tenantId,
      project.title,
      project.commercialType,
      project.totalDurationSeconds,
      project.brandVoice,
      project.targetAudience,
      project.conceptBrief,
      JSON.stringify(project.continuityManifest),
      JSON.stringify(project.shots),
      project.selectedProvider,
      project.connectorMode,
      project.overallStatus,
      null,
      project.createdAt,
      project.updatedAt
    );

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
    const db = getDatabase();
    const query = tenantId
      ? 'SELECT * FROM commercial_projects WHERE tenant_id = ? ORDER BY created_at DESC'
      : 'SELECT * FROM commercial_projects ORDER BY created_at DESC';
    const rows = tenantId ? (db.prepare(query).all(tenantId) as any[]) : (db.prepare(query).all() as any[]);

    return rows.map(r => ({
      id: r.id,
      tenantId: r.tenant_id,
      title: r.title,
      commercialType: r.commercial_type,
      totalDurationSeconds: r.total_duration_seconds,
      brandVoice: r.brand_voice,
      targetAudience: r.target_audience,
      conceptBrief: r.concept_brief,
      continuityManifest: JSON.parse(r.continuity_manifest_json || '{}'),
      shots: JSON.parse(r.shots_json || '[]'),
      selectedProvider: r.selected_provider,
      connectorMode: r.connector_mode,
      overallStatus: r.overall_status,
      assembledVideoUrl: r.assembled_video_url || undefined,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));
  }

  public getProject(projectId: string): CommercialFactoryProject | undefined {
    const db = getDatabase();
    const r = db.prepare('SELECT * FROM commercial_projects WHERE id = ?').get(projectId) as any;
    if (!r) return undefined;

    return {
      id: r.id,
      tenantId: r.tenant_id,
      title: r.title,
      commercialType: r.commercial_type,
      totalDurationSeconds: r.total_duration_seconds,
      brandVoice: r.brand_voice,
      targetAudience: r.target_audience,
      conceptBrief: r.concept_brief,
      continuityManifest: JSON.parse(r.continuity_manifest_json || '{}'),
      shots: JSON.parse(r.shots_json || '[]'),
      selectedProvider: r.selected_provider,
      connectorMode: r.connector_mode,
      overallStatus: r.overall_status,
      assembledVideoUrl: r.assembled_video_url || undefined,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    };
  }

  public updateProjectInDb(project: CommercialFactoryProject): void {
    const db = getDatabase();
    project.updatedAt = new Date().toISOString();
    db.prepare(`
      UPDATE commercial_projects SET
        title = ?,
        commercial_type = ?,
        total_duration_seconds = ?,
        brand_voice = ?,
        target_audience = ?,
        concept_brief = ?,
        continuity_manifest_json = ?,
        shots_json = ?,
        selected_provider = ?,
        connector_mode = ?,
        overall_status = ?,
        assembled_video_url = ?,
        updated_at = ?
      WHERE id = ?
    `).run(
      project.title,
      project.commercialType,
      project.totalDurationSeconds,
      project.brandVoice,
      project.targetAudience,
      project.conceptBrief,
      JSON.stringify(project.continuityManifest),
      JSON.stringify(project.shots),
      project.selectedProvider,
      project.connectorMode,
      project.overallStatus,
      project.assembledVideoUrl || null,
      project.updatedAt,
      project.id
    );
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
    const project = this.getProject(params.projectId);
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
      .map(id => this.getReferenceAsset(id))
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
    this.updateProjectInDb(project);

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
    const project = this.getProject(params.projectId);
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
      project.assembledVideoUrl = shot.importedVideoUrl;
    }

    this.updateProjectInDb(project);
    return shot;
  }

  // ==========================================
  // OFFICIAL API GENERATION JOBS (SQLite-backed)
  // ==========================================

  /**
   * Submits an official API generation job to MiniMax H3.
   * Requires explicit human approval and server-side MINIMAX_API_KEY.
   */
  public async submitApiJob(params: {
    projectId: string;
    shotId: string;
    idempotencyKey?: string;
    humanApproved: boolean;
    approvedBy: string;
  }): Promise<MiniMaxGenerationJobRecord> {
    if (!params.humanApproved) {
      throw new Error('SUBMISSION_BLOCKED: Explicit human approval is required immediately prior to submitting paid MiniMax API generation.');
    }

    const connState = this.miniMaxProvider.getConnectionState();
    if (connState === 'DISCONNECTED' || connState === 'AUTH_FAILED') {
      throw new Error('API_DISCONNECTED: MINIMAX_API_KEY is not configured or authenticated. Please use the Manual Trial workflow or verify official credentials.');
    }

    const project = this.getProject(params.projectId);
    if (!project) throw new Error(`Project ${params.projectId} not found.`);

    const shot = project.shots.find(s => s.shotId === params.shotId);
    if (!shot) throw new Error(`Shot ${params.shotId} not found.`);

    const idempotencyKey = params.idempotencyKey || `idem_${shot.shotId}_${Date.now()}`;
    const jobId = `job_minimax_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    // Resolve reference asset URLs
    const refAssets = (shot.selectedReferenceAssetIds || [])
      .map(id => this.getReferenceAsset(id))
      .filter((a): a is MiniMaxReferenceAsset => !!a);

    const refImages = refAssets.filter(r => r.mediaType === 'image').map(r => r.url);
    const refVideos = refAssets.filter(r => r.mediaType === 'video').map(r => r.url);
    const refAudio = refAssets.filter(r => r.mediaType === 'audio').map(r => r.url);

    // Call real MiniMax API
    const apiResult = await this.client.submitVideoGeneration({
      prompt: shot.composedPrompt,
      durationSeconds: shot.durationSeconds,
      resolution: shot.resolution,
      aspectRatio: shot.aspectRatio,
      mode: shot.mode,
      firstFrameUrl: shot.firstFrameAssetId ? this.getReferenceAsset(shot.firstFrameAssetId)?.url : undefined,
      lastFrameUrl: shot.lastFrameAssetId ? this.getReferenceAsset(shot.lastFrameAssetId)?.url : undefined,
      referenceImages: refImages.length > 0 ? refImages : undefined,
      referenceVideos: refVideos.length > 0 ? refVideos : undefined,
      referenceAudio: refAudio.length > 0 ? refAudio : undefined
    });

    const jobRecord: MiniMaxGenerationJobRecord = {
      id: jobId,
      tenantId: project.tenantId,
      projectId: project.id,
      shotId: shot.shotId,
      model: 'MiniMax-H3',
      generationMode: shot.mode,
      connectorMode: 'OFFICIAL_API',
      status: 'QUEUED',
      externalTaskId: apiResult.taskId,
      requestHash: apiResult.requestHash,
      prompt: shot.composedPrompt,
      durationSeconds: shot.durationSeconds,
      resolution: shot.resolution,
      aspectRatio: shot.aspectRatio,
      referenceAssetCount: shot.selectedReferenceAssetIds.length,
      costEstimateUsd: shot.costEstimate.totalEstimatedCostUsd,
      actualCostIncurredUsd: shot.costEstimate.totalEstimatedCostUsd,
      humanApproved: true,
      approvedBy: params.approvedBy,
      retryCount: 0,
      idempotencyKey,
      auditRef: `ev_job_${jobId}`,
      submittedAt: now,
      updatedAt: now
    };

    // Save job in SQLite
    const db = getDatabase();
    db.prepare(`
      INSERT INTO minimax_generation_jobs (
        id, tenant_id, project_id, shot_id, model, generation_mode,
        connector_mode, status, external_task_id, request_hash, prompt,
        duration_seconds, resolution, aspect_ratio, reference_asset_count,
        cost_estimate_usd, actual_cost_incurred_usd, human_approved, approved_by,
        output_video_url, temporary_provider_url, error_message, retry_count,
        idempotency_key, audit_ref, submitted_at, completed_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      jobRecord.id,
      jobRecord.tenantId,
      jobRecord.projectId || null,
      jobRecord.shotId || null,
      jobRecord.model,
      jobRecord.generationMode,
      jobRecord.connectorMode,
      jobRecord.status,
      jobRecord.externalTaskId || null,
      jobRecord.requestHash,
      jobRecord.prompt,
      jobRecord.durationSeconds,
      jobRecord.resolution,
      jobRecord.aspectRatio,
      jobRecord.referenceAssetCount,
      jobRecord.costEstimateUsd,
      jobRecord.actualCostIncurredUsd,
      1,
      jobRecord.approvedBy || null,
      null,
      null,
      null,
      0,
      jobRecord.idempotencyKey,
      jobRecord.auditRef,
      jobRecord.submittedAt,
      null,
      jobRecord.updatedAt
    );

    // Update shot status
    shot.jobId = jobId;
    shot.status = 'QUEUED';
    this.updateProjectInDb(project);

    this.auditService.logAuditEvent({
      tenantId: project.tenantId,
      actorId: params.approvedBy,
      action: 'SUBMIT_MINIMAX_API_JOB',
      endpoint: '/api/creative/minimax/submit-job',
      status: 'JOB_SUBMITTED',
      details: {
        jobId,
        externalTaskId: apiResult.taskId,
        requestHash: apiResult.requestHash,
        shotId: shot.shotId,
        costUsd: jobRecord.costEstimateUsd,
        duration: shot.durationSeconds,
        resolution: shot.resolution
      }
    });

    return jobRecord;
  }

  public getJob(jobId: string): MiniMaxGenerationJobRecord | undefined {
    const db = getDatabase();
    const r = db.prepare('SELECT * FROM minimax_generation_jobs WHERE id = ?').get(jobId) as any;
    if (!r) return undefined;

    return {
      id: r.id,
      tenantId: r.tenant_id,
      projectId: r.project_id || undefined,
      shotId: r.shot_id || undefined,
      model: r.model,
      generationMode: r.generation_mode,
      connectorMode: r.connector_mode,
      status: r.status,
      externalTaskId: r.external_task_id || undefined,
      requestHash: r.request_hash,
      prompt: r.prompt,
      durationSeconds: r.duration_seconds,
      resolution: r.resolution,
      aspectRatio: r.aspect_ratio,
      referenceAssetCount: r.reference_asset_count,
      costEstimateUsd: r.cost_estimate_usd,
      actualCostIncurredUsd: r.actual_cost_incurred_usd,
      humanApproved: Boolean(r.human_approved),
      approvedBy: r.approved_by || undefined,
      outputVideoUrl: r.output_video_url || undefined,
      temporaryProviderUrl: r.temporary_provider_url || undefined,
      errorMessage: r.error_message || undefined,
      retryCount: r.retry_count,
      idempotencyKey: r.idempotency_key,
      auditRef: r.audit_ref,
      submittedAt: r.submitted_at,
      completedAt: r.completed_at || undefined,
      updatedAt: r.updated_at || undefined
    };
  }

  public listJobs(tenantId?: string): MiniMaxGenerationJobRecord[] {
    const db = getDatabase();
    const query = tenantId
      ? 'SELECT * FROM minimax_generation_jobs WHERE tenant_id = ? ORDER BY submitted_at DESC'
      : 'SELECT * FROM minimax_generation_jobs ORDER BY submitted_at DESC';
    const rows = tenantId ? (db.prepare(query).all(tenantId) as any[]) : (db.prepare(query).all() as any[]);

    return rows.map(r => ({
      id: r.id,
      tenantId: r.tenant_id,
      projectId: r.project_id || undefined,
      shotId: r.shot_id || undefined,
      model: r.model,
      generationMode: r.generation_mode,
      connectorMode: r.connector_mode,
      status: r.status,
      externalTaskId: r.external_task_id || undefined,
      requestHash: r.request_hash,
      prompt: r.prompt,
      durationSeconds: r.duration_seconds,
      resolution: r.resolution,
      aspectRatio: r.aspect_ratio,
      referenceAssetCount: r.reference_asset_count,
      costEstimateUsd: r.cost_estimate_usd,
      actualCostIncurredUsd: r.actual_cost_incurred_usd,
      humanApproved: Boolean(r.human_approved),
      approvedBy: r.approved_by || undefined,
      outputVideoUrl: r.output_video_url || undefined,
      temporaryProviderUrl: r.temporary_provider_url || undefined,
      errorMessage: r.error_message || undefined,
      retryCount: r.retry_count,
      idempotencyKey: r.idempotency_key,
      auditRef: r.audit_ref,
      submittedAt: r.submitted_at,
      completedAt: r.completed_at || undefined,
      updatedAt: r.updated_at || undefined
    }));
  }

  /**
   * Queries and synchronizes official task status from MiniMax API into Relay SQLite DB
   */
  public async syncJobStatus(jobId: string): Promise<MiniMaxGenerationJobRecord> {
    const job = this.getJob(jobId);
    if (!job) throw new Error(`Job ${jobId} not found.`);
    if (!job.externalTaskId) throw new Error(`Job ${jobId} has no externalTaskId.`);

    const queryResult = await this.client.queryTaskStatus(job.externalTaskId);
    const now = new Date().toISOString();

    const db = getDatabase();
    db.prepare(`
      UPDATE minimax_generation_jobs SET
        status = ?,
        output_video_url = ?,
        temporary_provider_url = ?,
        error_message = ?,
        completed_at = ?,
        updated_at = ?
      WHERE id = ?
    `).run(
      queryResult.status,
      queryResult.outputUrl || job.outputVideoUrl || null,
      queryResult.outputUrl || null,
      queryResult.errorMessage || null,
      (queryResult.status === 'SUCCESS' || queryResult.status === 'FAILED') ? now : (job.completedAt || null),
      now,
      job.id
    );

    // Sync project shot status if applicable
    if (job.projectId && job.shotId) {
      const project = this.getProject(job.projectId);
      if (project) {
        const shot = project.shots.find(s => s.shotId === job.shotId);
        if (shot) {
          if (queryResult.status === 'SUCCESS' && queryResult.outputUrl) {
            shot.status = 'COMPLETED';
            shot.generatedVideoUrl = queryResult.outputUrl;
          } else if (queryResult.status === 'FAILED') {
            shot.status = 'FAILED';
          } else if (queryResult.status === 'RUNNING') {
            shot.status = 'RUNNING';
          }
          this.updateProjectInDb(project);
        }
      }
    }

    return this.getJob(jobId)!;
  }
}
