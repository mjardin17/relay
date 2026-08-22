import crypto from 'node:crypto';
import {
  CreativeWebsiteProvider,
  CreativeProviderType,
  ProviderMetadata,
  ProviderAvailabilityResult,
  ProviderQuotaResult,
  CreativeBrief,
  CreativePreviewResult,
  CreativeArtifact
} from '../../types/creativeProvider';
import {
  MiniMaxModelId,
  MiniMaxGenerationMode,
  MiniMaxConnectorMode,
  MiniMaxConnectionState,
  MiniMaxJobStatus,
  MiniMaxCostEstimate,
  MiniMaxManualTrialPackage,
  VideoResolution,
  VideoAspectRatio,
  MiniMaxReferenceAsset
} from '../../types/miniMaxH3';
import { MiniMaxPromptBuilder } from '../minimaxPromptBuilder';
import { MiniMaxCostCalculator, OFFICIAL_MINIMAX_PRICING } from '../minimaxCostCalculator';
import { LaunchAuditService } from '../launchAuditService';
import { MiniMaxH3Client, HttpTransport } from '../minimaxH3Client';

export class MiniMaxH3CreativeProvider implements CreativeWebsiteProvider {
  public readonly id = 'provider_minimax_h3';
  public readonly providerType: CreativeProviderType = 'MINIMAX_H3';
  public readonly modelId: MiniMaxModelId = 'MiniMax-H3';
  public readonly officialTrialUrl = 'https://hailuoai.video/';
  public readonly officialGithubDocsUrl = 'https://github.com/MiniMax-AI/MiniMax-H3';

  private auditService: LaunchAuditService;
  private client: MiniMaxH3Client;
  private isVerified: boolean = false;
  private lastVerificationState: MiniMaxConnectionState = 'DISCONNECTED';
  private lastVerificationAt: string | null = null;

  constructor(options?: { client?: MiniMaxH3Client; transport?: HttpTransport; apiKey?: string }) {
    this.auditService = LaunchAuditService.getInstance();
    if (options?.client) {
      this.client = options.client;
    } else {
      this.client = new MiniMaxH3Client({
        apiKey: options?.apiKey,
        transport: options?.transport
      });
    }
  }

  public getClient(): MiniMaxH3Client {
    return this.client;
  }

  public setTransport(transport: HttpTransport): void {
    const key = this.client.getApiKey();
    this.client = new MiniMaxH3Client({
      apiKey: key || undefined,
      transport
    });
  }

  public getMetadata(): ProviderMetadata {
    return {
      id: this.id,
      name: 'MiniMax H3 (Video & Commercial Factory)',
      providerType: this.providerType,
      description: 'Official MiniMax-H3 video model. Supports text-to-video, image-to-video, first/last frame continuity, native synchronized stereo audio, up to 2K resolution (4-15s shots), and zero-cost Manual Trial mode.',
      supportsFastPreview: true,
      supportsRevisions: true,
      supportsArtifactExport: true,
      defaultPriorityScore: 85
    };
  }

  /**
   * Checks availability state.
   * Clearly distinguishes MANUAL_TRIAL vs DISCONNECTED vs CONFIGURED_UNVERIFIED vs CONNECTED_VERIFIED.
   * Never claims "CONNECTED" without authenticated API verification.
   */
  public async checkAvailability(): Promise<ProviderAvailabilityResult> {
    const key = this.client.getApiKey() || process.env.MINIMAX_API_KEY;

    if (!key) {
      return {
        available: true,
        state: 'FREE_AVAILABLE', // Available via manual browser trial without API key
        reason: 'MiniMax H3 Manual Trial mode is active. Manual browser handoff causes no Relay API charge. Hailuo availability, trial credits, subscriptions, and external charges are controlled by MiniMax and may vary.'
      };
    }

    if (this.isVerified && this.lastVerificationState === 'CONNECTED_VERIFIED') {
      return {
        available: true,
        state: 'FREE_AVAILABLE',
        reason: 'MiniMax H3 Official API is authenticated and operational.'
      };
    }

    if (this.lastVerificationState === 'AUTH_FAILED') {
      return {
        available: false,
        state: 'AUTH_REQUIRED',
        reason: 'MINIMAX_API_KEY authentication probe failed (HTTP 401). Valid key required.'
      };
    }

    if (this.lastVerificationState === 'INSUFFICIENT_BALANCE') {
      return {
        available: false,
        state: 'AUTH_REQUIRED',
        reason: 'MiniMax account has insufficient balance or billing hold (HTTP 402).'
      };
    }

    return {
      available: true,
      state: 'AUTH_REQUIRED',
      reason: 'MINIMAX_API_KEY is configured in environment but pending official verification probe.'
    };
  }

  /**
   * Quota check for provider router.
   * Manual package workflow does not claim automated free units in router; API is pay-as-you-go.
   */
  public async checkFreeQuota(): Promise<ProviderQuotaResult> {
    const key = this.client.getApiKey() || process.env.MINIMAX_API_KEY;

    if (!key) {
      return {
        quotaState: 'AUTH_REQUIRED',
        isPaidOnly: true,
        freeUnitsRemaining: 0,
        costWarning: 'Manual browser handoff causes no Relay API charge. Hailuo availability, trial credits, subscriptions, and external charges are controlled by MiniMax and may vary. Automated API video generation requires MINIMAX_API_KEY.'
      };
    }

    return {
      quotaState: this.isVerified ? 'PAID_ONLY' : 'AUTH_REQUIRED',
      isPaidOnly: true,
      freeUnitsRemaining: 0,
      costWarning: `Official API billing: $${OFFICIAL_MINIMAX_PRICING.baseRate768pPerSec}/s (768p) or $${OFFICIAL_MINIMAX_PRICING.baseRate2KPerSec}/s (2K). Explicit human approval required before submission.`
    };
  }

  /**
   * Gets current connector status
   */
  public getConnectionState(): MiniMaxConnectionState {
    const key = this.client.getApiKey() || process.env.MINIMAX_API_KEY;
    if (!key) {
      return 'DISCONNECTED';
    }
    if (this.isVerified && this.lastVerificationState === 'CONNECTED_VERIFIED') {
      return 'CONNECTED_VERIFIED';
    }
    if (this.lastVerificationState === 'AUTH_FAILED') {
      return 'AUTH_FAILED';
    }
    if (this.lastVerificationState === 'INSUFFICIENT_BALANCE') {
      return 'INSUFFICIENT_BALANCE';
    }
    return 'CONFIGURED_UNVERIFIED';
  }

  /**
   * Truthful Authentication Probe.
   * Tests API key against official non-generation query endpoint (GET /v2/query/video_generation?page_num=1&page_size=1).
   * Key is read server-side only. Never checks string length alone.
   */
  public async verifyApiKey(apiKeyToTest?: string): Promise<{
    success: boolean;
    state: MiniMaxConnectionState;
    message: string;
    latencyMs: number;
  }> {
    const probeOutcome = await this.client.verifyCredentials(apiKeyToTest);

    this.isVerified = probeOutcome.success;
    this.lastVerificationState = probeOutcome.state;
    this.lastVerificationAt = new Date().toISOString();

    if (probeOutcome.success && apiKeyToTest) {
      this.client.setApiKey(apiKeyToTest);
    }

    this.auditService.logAuditEvent({
      tenantId: 'system',
      actorId: 'operator',
      action: 'VERIFY_MINIMAX_API_KEY',
      endpoint: '/api/creative/minimax/verify',
      status: probeOutcome.success ? 'SUCCESS' : 'FAILED',
      details: {
        model: this.modelId,
        state: probeOutcome.state,
        statusCode: probeOutcome.statusCode,
        keyFingerprint: probeOutcome.fingerprint
      }
    });

    return {
      success: probeOutcome.success,
      state: probeOutcome.state,
      message: probeOutcome.message,
      latencyMs: probeOutcome.latencyMs
    };
  }

  /**
   * Generates a Manual Trial Package for zero-cost execution
   */
  public createManualTrialPackage(params: {
    tenantId: string;
    sceneTitle: string;
    generationMode?: MiniMaxGenerationMode;
    durationSeconds?: number;
    resolution?: VideoResolution;
    aspectRatio?: VideoAspectRatio;
    references?: MiniMaxReferenceAsset[];
    customPromptText?: string;
  }): MiniMaxManualTrialPackage {
    const tenantId = params.tenantId || 'tenant_jardins_outpost';
    const mode = params.generationMode || 'TEXT_TO_VIDEO';
    const duration = Math.max(4, Math.min(15, params.durationSeconds || 6));
    const resolution = params.resolution || '768p';
    const aspectRatio = params.aspectRatio || '16:9';

    const promptStructure = MiniMaxPromptBuilder.buildTenantPreset(tenantId, params.sceneTitle);
    const optimizedPrompt = params.customPromptText || MiniMaxPromptBuilder.composePrompt(promptStructure);

    const refChecklist = (params.references || []).map((ref, idx) => ({
      order: idx + 1,
      category: ref.category,
      assetName: ref.name,
      assetType: ref.mediaType,
      assetUrl: ref.url,
      instructions: `Upload as Reference #${idx + 1} (${ref.category.replace(/_/g, ' ')}): ${ref.bindingRole || ref.name}`
    }));

    const pkg: MiniMaxManualTrialPackage = {
      packageId: `pkg_trial_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      tenantId,
      sceneTitle: params.sceneTitle || 'Commercial Scene',
      generationMode: mode,
      targetDurationSeconds: duration,
      targetResolution: resolution,
      targetAspectRatio: aspectRatio,
      optimizedPrompt,
      structuredPrompt: promptStructure,
      referenceUploadChecklist: refChecklist,
      officialTrialUrl: this.officialTrialUrl,
      officialGithubDocsUrl: this.officialGithubDocsUrl,
      disclaimers: [
        'Manual browser handoff causes no Relay API charge. Hailuo availability, trial credits, subscriptions, and external charges are controlled by MiniMax and may vary.',
        'Relay never submits payments or auto-upgrades subscriptions on external platforms.',
        'After video generation finishes on Hailuo, use the "Import Video" button to store the result in Relay.'
      ],
      createdAt: new Date().toISOString()
    };

    this.auditService.logAuditEvent({
      tenantId,
      actorId: 'user',
      action: 'CREATE_MINIMAX_TRIAL_PACKAGE',
      endpoint: '/api/creative/minimax/trial-package',
      status: 'PACKAGE_CREATED',
      details: {
        packageId: pkg.packageId,
        sceneTitle: pkg.sceneTitle,
        duration,
        resolution
      }
    });

    return pkg;
  }

  /**
   * Generates a web preview / video storyboard draft for CreativeProviderRouter compatibility
   */
  public async generatePreview(brief: CreativeBrief): Promise<CreativePreviewResult> {
    const startTime = Date.now();
    const previewId = `preview_minimax_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const promptStructure = MiniMaxPromptBuilder.buildTenantPreset(brief.tenantId, brief.heroHeadline);
    const promptText = MiniMaxPromptBuilder.composePrompt(promptStructure);
    const costEstimate = MiniMaxCostCalculator.calculateEstimate({
      durationSeconds: 6,
      resolution: '768p',
      imageReferencesCount: 2
    });

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${brief.brandName} — MiniMax H3 Video Commercial Blueprint</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0b0f19; color: #f8fafc; margin: 0; padding: 2rem; }
    .container { max-width: 800px; margin: 0 auto; background: #131b2e; border: 1px solid #1e293b; border-radius: 12px; padding: 2rem; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; background: #3b82f620; color: #60a5fa; border: 1px solid #3b82f640; }
    h1 { margin-top: 0.5rem; font-size: 1.5rem; color: #fff; }
    .box { background: #0b1120; border: 1px solid #1e293b; border-radius: 8px; padding: 1rem; margin: 1rem 0; }
    .prompt { font-family: monospace; font-size: 12px; color: #cbd5e1; white-space: pre-wrap; background: #050811; padding: 1rem; border-radius: 6px; }
    .pricing { color: #34d399; font-weight: 600; }
  </style>
</head>
<body>
  <div class="container">
    <div class="badge">MiniMax-H3 Commercial Storyboard</div>
    <h1>${brief.brandName} — ${brief.heroHeadline}</h1>
    <p style="color: #94a3b8; font-size: 14px;">${brief.creativeDirection}</p>
    
    <div class="box">
      <h3>Official MiniMax H3 Prompt Blueprint (6s Shot @ 768p)</h3>
      <div class="prompt">${promptText}</div>
    </div>

    <div class="box">
      <h4>Cost & Dispatch Governance</h4>
      <p class="pricing">${costEstimate.costBreakdownSummary}</p>
      <p style="font-size: 12px; color: #94a3b8;">Manual browser handoff causes no Relay API charge. Direct API generation requires authenticated credentials & explicit human approval.</p>
    </div>
  </div>
</body>
</html>`;

    return {
      previewId,
      providerId: this.id,
      providerType: this.providerType,
      renderedHtml: html,
      assets: [],
      generationDurationMs: Date.now() - startTime,
      quotaStatusAtGeneration: this.isVerified ? 'PAID_ONLY' : 'AUTH_REQUIRED',
      isFreeTier: false,
      revisionCount: 0,
      summary: `MiniMax H3 commercial storyboard and prompt package prepared for ${brief.brandName}.`,
      timestamp: new Date().toISOString()
    };
  }

  public async revisePreview(
    previewId: string,
    currentHtml: string,
    instruction: string,
    brief: CreativeBrief
  ): Promise<CreativePreviewResult> {
    const preview = await this.generatePreview(brief);
    preview.revisionCount = 1;
    preview.summary = `Revised MiniMax H3 storyboard for ${brief.brandName}: "${instruction}"`;
    return preview;
  }

  public async exportArtifact(preview: CreativePreviewResult): Promise<CreativeArtifact> {
    return {
      previewId: preview.previewId,
      providerId: this.id,
      providerType: this.providerType,
      files: {
        'storyboard.html': preview.renderedHtml,
        'manifest.json': JSON.stringify({
          provider: 'MiniMax-H3',
          model: this.modelId,
          generatedAt: preview.timestamp,
          summary: preview.summary
        }, null, 2)
      },
      metadata: {
        providerName: 'MiniMax-H3 Commercial Generator',
        generatedAt: preview.timestamp,
        license: 'Enterprise Proprietary (Relay Tenant Asset)',
        revision: preview.revisionCount
      }
    };
  }
}
