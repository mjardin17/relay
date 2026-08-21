import fs from 'fs';
import path from 'path';
import {
  CreativeWebsiteProvider,
  CreativeProviderType,
  CreativeProviderQuotaState,
  CreativeBrief,
  CreativePreviewResult,
  CreativeRoutingDecision,
  ProviderEvaluationNote,
  FallbackEvent,
  HumanCostAuthorizationNotice,
  CreativeArtifact
} from '../types/creativeProvider';
import { RelayNativeCreativeProvider } from './providers/relayNativeCreativeProvider';
import { LovableCreativeProvider } from './providers/lovableCreativeProvider';
import { GoogleAiStudioCreativeProvider } from './providers/googleAiStudioCreativeProvider';
import { MiniMaxH3CreativeProvider } from './providers/miniMaxH3CreativeProvider';

export class CreativeProviderRouter {
  private static instance: CreativeProviderRouter;
  private providers: Map<string, CreativeWebsiteProvider> = new Map();
  private routingAuditHistory: CreativeRoutingDecision[] = [];

  private constructor() {
    this.registerDefaultProviders();
  }

  public static getInstance(): CreativeProviderRouter {
    if (!CreativeProviderRouter.instance) {
      CreativeProviderRouter.instance = new CreativeProviderRouter();
    }
    return CreativeProviderRouter.instance;
  }

  private registerDefaultProviders(): void {
    // 1. Lovable (Free Workspace Allowance - priority 95)
    this.registerProvider(new LovableCreativeProvider());

    // 2. Google AI Studio (Free Gemini Capacity - priority 92)
    this.registerProvider(new GoogleAiStudioCreativeProvider());

    // 3. MiniMax H3 (Video Commercials & Multi-shot Factory - priority 85)
    this.registerProvider(new MiniMaxH3CreativeProvider());

    // 4. Relay Native Engine (Zero-Dependency Guaranteed Local Fallback - priority 90)
    this.registerProvider(new RelayNativeCreativeProvider());
  }

  public registerProvider(provider: CreativeWebsiteProvider): void {
    this.providers.set(provider.id, provider);
  }

  public getProvider(id: string): CreativeWebsiteProvider | undefined {
    return this.providers.get(id);
  }

  public getAllProviders(): CreativeWebsiteProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Evaluates and ranks all registered providers based on current FREE availability.
   * NEVER selects PAID_ONLY providers automatically.
   */
  public async evaluateFreeProviders(): Promise<ProviderEvaluationNote[]> {
    const evaluations: ProviderEvaluationNote[] = [];

    for (const provider of this.providers.values()) {
      const metadata = provider.getMetadata();
      try {
        const availability = await provider.checkAvailability();
        const quota = await provider.checkFreeQuota();

        const isFreeEligible =
          availability.available &&
          availability.state === 'FREE_AVAILABLE' &&
          !quota.isPaidOnly &&
          (quota.freeUnitsRemaining === undefined || quota.freeUnitsRemaining > 0);

        evaluations.push({
          providerId: provider.id,
          type: provider.providerType,
          state: availability.state,
          score: isFreeEligible ? metadata.defaultPriorityScore : 0,
          isFreeEligible,
          note: isFreeEligible
            ? `Free capacity confirmed (${quota.freeUnitsRemaining ?? 'unlimited'} units available)`
            : availability.reason || 'Not currently eligible for automated free generation'
        });
      } catch (err: any) {
        evaluations.push({
          providerId: provider.id,
          type: provider.providerType,
          state: 'UNAVAILABLE',
          score: 0,
          isFreeEligible: false,
          note: `Availability check error: ${err.message}`
        });
      }
    }

    // Sort descending by priority score
    return evaluations.sort((a, b) => b.score - a.score);
  }

  /**
   * Generates a rapid visual draft using the highest-ranked FREE provider.
   * Automatically cascades/fails over to the next free provider if quota/rate limits occur.
   * Guarantees fallback to RelayNativeCreativeProvider so generation is never blocked.
   */
  public async generateCreativeDraft(
    brief: CreativeBrief
  ): Promise<{
    preview: CreativePreviewResult;
    routingDecision: CreativeRoutingDecision;
    artifact: CreativeArtifact;
  }> {
    const startTime = Date.now();
    const requestId = `req_draft_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const evaluations = await this.evaluateFreeProviders();
    const fallbackEvents: FallbackEvent[] = [];

    // Filter down to eligible free providers
    const eligibleProviders = evaluations.filter(e => e.isFreeEligible);

    // If no external free provider is eligible, ensure native fallback is present
    if (eligibleProviders.length === 0) {
      const native = this.getProvider('provider_relay_native');
      if (native) {
        eligibleProviders.push({
          providerId: native.id,
          type: native.providerType,
          state: 'FREE_AVAILABLE',
          score: 90,
          isFreeEligible: true,
          note: 'Guaranteed local native fallback engaged'
        });
      }
    }

    let selectedPreview: CreativePreviewResult | null = null;
    let successfulProviderId = '';
    let successfulProviderType: CreativeProviderType = 'RELAY_NATIVE';
    let selectionReason = '';

    // Iterate through ranked free providers with failover protection
    for (let i = 0; i < eligibleProviders.length; i++) {
      const evalNote = eligibleProviders[i];
      const provider = this.getProvider(evalNote.providerId);
      if (!provider) continue;

      try {
        selectedPreview = await provider.generatePreview(brief);
        successfulProviderId = provider.id;
        successfulProviderType = provider.providerType;
        selectionReason = `Selected ${provider.getMetadata().name} (score: ${evalNote.score}) based on verified free quota.`;
        break; // Successfully generated draft!
      } catch (err: any) {
        console.warn(`[CreativeProviderRouter] Provider ${provider.id} failed:`, err.message);

        const nextProvider = eligibleProviders[i + 1] || { providerId: 'provider_relay_native' };
        fallbackEvents.push({
          failedProviderId: provider.id,
          failedProviderType: provider.providerType,
          reason: err.message || 'Generation or quota error',
          nextProviderId: nextProvider.providerId,
          timestamp: new Date().toISOString()
        });
      }
    }

    // Absolute fail-safe guarantee: if all attempts failed, use Relay Native directly
    if (!selectedPreview) {
      const nativeProvider = this.getProvider('provider_relay_native') as RelayNativeCreativeProvider;
      selectedPreview = await nativeProvider.generatePreview(brief);
      successfulProviderId = nativeProvider.id;
      successfulProviderType = nativeProvider.providerType;
      selectionReason = 'All third-party free providers exhausted or unavailable. Engaged guaranteed zero-dependency native fallback.';
    }

    const providerInstance = this.getProvider(successfulProviderId) || this.getProvider('provider_relay_native')!;
    const artifact = await providerInstance.exportArtifact(selectedPreview);

    const routingDecision: CreativeRoutingDecision = {
      requestId,
      tenantId: brief.tenantId,
      selectedProviderId: successfulProviderId,
      selectedProviderType: successfulProviderType,
      selectionReason,
      freePaidClassification: 'FREE',
      evaluatedProviders: evaluations,
      fallbackEvents,
      generationDurationMs: Date.now() - startTime,
      artifactRef: artifact.previewId,
      timestamp: new Date().toISOString()
    };

    this.routingAuditHistory.push(routingDecision);

    return {
      preview: selectedPreview,
      routingDecision,
      artifact
    };
  }

  /**
   * Request human authorization before switching to any paid provider.
   * Relay strictly refuses to authorize billing autonomously.
   */
  public generateHumanCostNotice(
    providerId: string,
    expectedChargeModel: string,
    reasonFreeUnavailable: string
  ): HumanCostAuthorizationNotice {
    const provider = this.getProvider(providerId);
    return {
      requiresHumanApproval: true,
      providerId,
      providerType: provider ? provider.providerType : 'OTHER_FREE_PROVIDER',
      expectedChargeModel,
      reasonFreeUnavailable,
      status: 'PENDING_HUMAN_CONFIRMATION',
      timestamp: new Date().toISOString()
    };
  }

  public getRoutingAuditHistory(): CreativeRoutingDecision[] {
    return [...this.routingAuditHistory];
  }

  /**
   * Pre-configured Creative Brief for Jardin's Outpost digital workshop.
   */
  public static createJardinsOutpostBrief(): CreativeBrief {
    return {
      tenantId: 'tenant_jardins_outpost',
      brandName: "Jardin's Outpost",
      tagline: 'Built from real problems. Turned into real products.',
      creativeDirection: "Premium digital workshop & inventor's outpost. Warm near-black, bone/off-white, copper/rust accents, deep green accents, editorial typography, large visual product storytelling, strong whitespace, and distinctive animated automation visual.",
      visualPersonality: [
        'Digital Workshop',
        "Inventor's Outpost",
        'Editorial Craft',
        'Deterministic Systems',
        'Tactile Engineering',
        'Spacious Whitespace'
      ],
      heroHeadline: 'Built from real problems. Turned into real products.',
      heroSubhead: "An independent software and AI inventor's workshop. We design, prototype, battle-test, and deploy deterministic systems that run reliably in the field.",
      colorPalette: {
        background: '#0B0D11',
        surface: '#13171F',
        surfaceElevated: '#1A202C',
        boneOffWhite: '#F4F1EB',
        copperRust: '#D97757',
        copperAccent: '#E28D71',
        deepGreen: '#2D5A43',
        deepGreenLight: '#3A6B52',
        textPrimary: '#F4F1EB',
        textMuted: '#9AA0A6',
        border: '#222834'
      },
      typography: {
        headingFont: 'Newsreader',
        bodyFont: 'Plus Jakarta Sans',
        style: 'EDITORIAL_INVENTOR'
      },
      automationFlow: [
        {
          step: 1,
          id: 'PROBLEM',
          label: 'Friction Discovery',
          tagline: 'Real Empirical Bottleneck',
          detail: 'Identify real-world manual friction in contractor scheduling, multi-channel marketplace listing, or authoring.',
          statusBadge: 'Observation'
        },
        {
          step: 2,
          id: 'IDEA',
          label: 'System Blueprint',
          tagline: 'Deterministic Architecture',
          detail: 'Model business logic with strict state machines, schema validation, and segregated boundaries.',
          statusBadge: 'Modeling'
        },
        {
          step: 3,
          id: 'BUILD',
          label: 'Rapid Prototype',
          tagline: 'High-Craft Software',
          detail: 'Construct clean responsive interfaces backed by resilient local storage and isolated tenants.',
          statusBadge: 'Assembly'
        },
        {
          step: 4,
          id: 'TEST',
          label: 'Verification Suite',
          tagline: 'Automated Execution Tests',
          detail: 'Execute 161+ automated contract and integration tests across 47 suites with zero unbacked claims.',
          statusBadge: 'Verification'
        },
        {
          step: 5,
          id: 'AUTOMATE',
          label: 'Workflow Engine',
          tagline: 'Autonomous Operations',
          detail: 'Deploy self-healing connectors, first-party analytics, and automated attribution pipelines.',
          statusBadge: 'Automation'
        },
        {
          step: 6,
          id: 'LAUNCH',
          label: 'Production Deployment',
          tagline: 'Live Resilient Product',
          detail: 'Static export and multi-provider distribution with complete human governance and audit records.',
          statusBadge: 'Live Product'
        }
      ],
      products: [
        {
          name: 'Relay',
          slug: 'relay',
          tagline: 'AI Website Builder & Local Operating System',
          category: 'Enterprise Infrastructure',
          stage: 'PRODUCTION DOGFOOD',
          problemSolved: 'Local businesses struggle with unverified AI marketing claims, complex CMS sprawl, and disconnected revenue tracking.',
          solutionArchitecture: 'Deterministic website compiler, multi-provider creative router, first-party lead capture, and auditable financial ROI attribution.',
          keyMetric: '155 tests passing across 46 suites; multi-tenant pilot infrastructure',
          tags: ['Website Compiler', 'Segregation of Duties', 'ROI Attribution', 'Multi-Provider']
        },
        {
          name: 'BossLister',
          slug: 'bosslister',
          tagline: 'Automated Multi-Channel Marketplace Engine',
          category: 'Commerce Automation',
          stage: 'PRODUCTION',
          problemSolved: 'E-commerce resellers lose hours manually cross-posting inventory, calculating comps, and updating item taxonomy.',
          solutionArchitecture: 'High-speed image OCR, real-time eBay taxonomy mapping, price comp estimation, and automated cross-listing sync.',
          keyMetric: 'Active production deployment handling multi-category inventory ingestion',
          tags: ['Marketplace Sync', 'eBay Taxonomy', 'Price Comps', 'Inventory OCR']
        },
        {
          name: 'StoryForge',
          slug: 'storyforge',
          tagline: 'Algorithmic Narrative Plot Coherence Engine',
          category: 'Authoring Systems',
          stage: 'ALPHA',
          problemSolved: 'Long-form authors experience plot holes, timeline inconsistencies, and character arc drift across 100k+ word manuscripts.',
          solutionArchitecture: 'Directed acyclic narrative graph, character state tracking, chapter outline synthesis, and LLM plot consistency auditing.',
          keyMetric: 'Interactive character state graph with branchable plot trees',
          tags: ['Narrative Graph', 'Plot Coherence', 'Character Arcs', 'Manuscript Export']
        },
        {
          name: 'OnTrack',
          slug: 'ontrack',
          tagline: 'Deterministic Offline-First Habit Engine',
          category: 'Productivity & Analytics',
          stage: 'DEVELOPMENT',
          problemSolved: 'Habit trackers break without internet connectivity, lose historical data, and rely on intrusive subscription popups.',
          solutionArchitecture: 'Local SQLite/CRDT offline database, streak calculation state machine, and clean zero-clutter habit tracking UI.',
          keyMetric: 'Core offline engine under active developer preview',
          tags: ['Offline-First', 'SQLite/CRDT', 'Habit Analytics', 'Zero-Tracking']
        }
      ],
      prohibitedVisualElements: [
        'generic AI orb',
        'cyberpunk neon glow',
        'stock robot humanoid',
        'generic purple-blue SaaS gradient',
        'compliance dashboard',
        'giant SHA hashes on homepage'
      ],
      sanitizedForThirdParty: true
    };
  }
}

export const creativeProviderRouter = CreativeProviderRouter.getInstance();
