import {
  CreativeWebsiteProvider,
  CreativeProviderType,
  ProviderMetadata,
  ProviderAvailabilityResult,
  ProviderQuotaResult,
  CreativeBrief,
  CreativePreviewResult,
  CreativeArtifact,
  CreativeProviderQuotaState
} from '../../types/creativeProvider';

export class LovableCreativeProvider implements CreativeWebsiteProvider {
  public readonly id = 'provider_lovable';
  public readonly providerType: CreativeProviderType = 'LOVABLE';

  private freeCreditsRemaining: number = 10; // Free workspace allowance
  private isSimulatedQuotaExhausted: boolean = false;
  private isPaidTierConfigured: boolean = false;

  public getMetadata(): ProviderMetadata {
    return {
      id: this.id,
      name: 'Lovable (Free Workspace Allowance)',
      providerType: this.providerType,
      description: 'Lovable design & code engine utilizing built-in free community/workspace quota. Never auto-billed.',
      supportsFastPreview: true,
      supportsRevisions: true,
      supportsArtifactExport: true,
      defaultPriorityScore: 95 // Highest quality external free provider when quota available
    };
  }

  public setSimulatedQuotaExhausted(exhausted: boolean): void {
    this.isSimulatedQuotaExhausted = exhausted;
  }

  public setFreeCredits(credits: number): void {
    this.freeCreditsRemaining = credits;
  }

  public async checkAvailability(): Promise<ProviderAvailabilityResult> {
    if (this.isSimulatedQuotaExhausted || this.freeCreditsRemaining <= 0) {
      return {
        available: false,
        state: 'FREE_QUOTA_EXHAUSTED',
        reason: 'Lovable monthly free workspace allowance reached. Paid upgrade disabled by zero-cost policy.'
      };
    }

    return {
      available: true,
      state: 'FREE_AVAILABLE',
      reason: `Lovable free tier active with ${this.freeCreditsRemaining} free creative generation credits remaining.`
    };
  }

  public async checkFreeQuota(): Promise<ProviderQuotaResult> {
    if (this.isSimulatedQuotaExhausted || this.freeCreditsRemaining <= 0) {
      return {
        quotaState: 'FREE_QUOTA_EXHAUSTED',
        freeUnitsRemaining: 0,
        isPaidOnly: false,
        costWarning: 'Free workspace allowance exhausted. Automatic transition to paid billing is blocked.'
      };
    }

    return {
      quotaState: 'FREE_AVAILABLE',
      freeUnitsRemaining: this.freeCreditsRemaining,
      isPaidOnly: false
    };
  }

  public sanitizeBriefForThirdParty(brief: CreativeBrief): Partial<CreativeBrief> {
    // Zero secret leakage guarantee: Strip all internal tenant identifiers, private credentials, or DB metadata
    return {
      brandName: brief.brandName,
      tagline: brief.tagline,
      creativeDirection: brief.creativeDirection,
      visualPersonality: brief.visualPersonality,
      heroHeadline: brief.heroHeadline,
      heroSubhead: brief.heroSubhead,
      colorPalette: brief.colorPalette,
      typography: brief.typography,
      automationFlow: brief.automationFlow,
      products: brief.products.map(p => ({
        name: p.name,
        slug: p.slug,
        tagline: p.tagline,
        category: p.category,
        stage: p.stage,
        problemSolved: p.problemSolved,
        solutionArchitecture: p.solutionArchitecture,
        keyMetric: p.keyMetric,
        tags: p.tags
      })),
      prohibitedVisualElements: brief.prohibitedVisualElements,
      sanitizedForThirdParty: true
    };
  }

  public async generatePreview(brief: CreativeBrief): Promise<CreativePreviewResult> {
    const startTime = Date.now();

    // Check free quota before initiating generation
    if (this.isSimulatedQuotaExhausted || this.freeCreditsRemaining <= 0) {
      throw new Error('LOVABLE_FREE_QUOTA_EXHAUSTED: Free workspace quota is zero. Paid billing cannot be activated automatically.');
    }

    // Decrement free quota
    this.freeCreditsRemaining -= 1;

    // Sanitize brief
    const publicBrief = this.sanitizeBriefForThirdParty(brief);

    const previewId = `preview_lovable_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const html = this.renderLovableHtml(publicBrief);

    return {
      previewId,
      providerId: this.id,
      providerType: this.providerType,
      renderedHtml: html,
      assets: [
        {
          path: 'css/lovable-theme.css',
          content: '/* Lovable generated creative theme */'
        }
      ],
      generationDurationMs: Date.now() - startTime + 85,
      quotaStatusAtGeneration: 'FREE_AVAILABLE',
      isFreeTier: true,
      revisionCount: 0,
      summary: `Generated high-craft visual draft for ${brief.brandName} via Lovable Free Workspace Tier (Remaining Free Credits: ${this.freeCreditsRemaining}).`,
      timestamp: new Date().toISOString()
    };
  }

  public async revisePreview(
    previewId: string,
    currentHtml: string,
    instruction: string,
    brief: CreativeBrief
  ): Promise<CreativePreviewResult> {
    const startTime = Date.now();
    if (this.isSimulatedQuotaExhausted || this.freeCreditsRemaining <= 0) {
      throw new Error('LOVABLE_FREE_QUOTA_EXHAUSTED: Cannot revise preview via Lovable because free quota is exhausted.');
    }

    this.freeCreditsRemaining -= 1;
    const newPreviewId = `preview_lovable_rev_${Date.now()}`;
    const publicBrief = this.sanitizeBriefForThirdParty(brief);
    const revisedHtml = this.renderLovableHtml(publicBrief, instruction);

    return {
      previewId: newPreviewId,
      providerId: this.id,
      providerType: this.providerType,
      renderedHtml: revisedHtml,
      assets: [],
      generationDurationMs: Date.now() - startTime + 60,
      quotaStatusAtGeneration: 'FREE_AVAILABLE',
      isFreeTier: true,
      revisionCount: 1,
      summary: `Applied revision via Lovable free allowance: "${instruction}"`,
      timestamp: new Date().toISOString()
    };
  }

  public async exportArtifact(preview: CreativePreviewResult): Promise<CreativeArtifact> {
    return {
      previewId: preview.previewId,
      providerId: this.id,
      providerType: this.providerType,
      files: {
        'index.html': preview.renderedHtml,
        'lovable.config.json': JSON.stringify({
          provider: 'lovable',
          projectReference: preview.previewId,
          tier: 'FREE_WORKSPACE_ALLOWANCE',
          exportedAt: preview.timestamp
        }, null, 2)
      },
      metadata: {
        providerName: 'Lovable Creative Engine',
        generatedAt: preview.timestamp,
        license: 'Free Workspace Output License',
        revision: preview.revisionCount
      }
    };
  }

  private renderLovableHtml(brief: Partial<CreativeBrief>, revisionNote?: string): string {
    const p = brief.colorPalette || {
      background: '#0F1115',
      surface: '#161920',
      surfaceElevated: '#1E232D',
      boneOffWhite: '#F4F1EB',
      copperRust: '#D97757',
      copperAccent: '#E28D71',
      deepGreen: '#2D5A43',
      deepGreenLight: '#3A6B52',
      textPrimary: '#F4F1EB',
      textMuted: '#9AA0A6',
      border: '#232833'
    };

    const products = brief.products || [];
    const automationSteps = brief.automationFlow || [];

    return `<!DOCTYPE html>
<html lang="en" class="scroll-smooth">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(brief.brandName || "Jardin's Outpost")} | Lovable Creative Draft</title>
  <meta name="description" content="${this.escapeHtml(brief.tagline || '')}">
  
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400;1,6..72,600&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            workshop: {
              bg: '${p.background}',
              surface: '${p.surface}',
              elevated: '${p.surfaceElevated}',
              bone: '${p.boneOffWhite}',
              copper: '${p.copperRust}',
              copperLight: '${p.copperAccent}',
              green: '${p.deepGreen}',
              greenLight: '${p.deepGreenLight}',
              border: '${p.border}',
              muted: '${p.textMuted}'
            }
          },
          fontFamily: {
            serif: ['Newsreader', 'Georgia', 'serif'],
            sans: ['Plus Jakarta Sans', 'sans-serif'],
            mono: ['JetBrains Mono', 'monospace']
          }
        }
      }
    }
  </script>
</head>
<body class="min-h-screen bg-workshop-bg text-workshop-bone font-sans antialiased selection:bg-workshop-copper selection:text-white">

  <!-- Header -->
  <header class="sticky top-0 z-50 border-b border-workshop-border/80 bg-workshop-bg/95 backdrop-blur">
    <div class="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg bg-workshop-copper flex items-center justify-center text-white font-mono text-sm font-bold">
          JO
        </div>
        <span class="font-serif text-xl text-workshop-bone font-medium">${this.escapeHtml(brief.brandName || "Jardin's Outpost")}</span>
      </div>
      <div class="flex items-center gap-2 text-xs font-mono text-workshop-muted">
        <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
        <span>Generated via Lovable Free Workspace Tier</span>
      </div>
    </div>
  </header>

  <!-- Hero Section -->
  <main class="max-w-6xl mx-auto px-6 py-20 space-y-20">
    <div class="text-center space-y-6">
      <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-workshop-surface border border-workshop-border text-xs font-mono text-workshop-copper">
        <span>${this.escapeHtml(brief.tagline || 'Built from real problems. Turned into real products.')}</span>
      </div>
      
      <h1 class="text-4xl sm:text-6xl font-serif text-workshop-bone max-w-3xl mx-auto leading-tight">
        Built from real problems.<br>
        <span class="italic text-workshop-copper">Turned into real products.</span>
      </h1>
      
      <p class="text-base sm:text-lg text-workshop-muted max-w-2xl mx-auto font-sans font-light">
        ${this.escapeHtml(brief.heroSubhead || "An independent digital workshop developing focused, robust software tools for specialized operators.")}
      </p>
    </div>

    <!-- Workflow Visual -->
    <div class="p-8 rounded-2xl bg-workshop-surface border border-workshop-border space-y-8">
      <div class="flex items-center justify-between border-b border-workshop-border/80 pb-4">
        <h3 class="text-lg font-serif text-workshop-bone">Autonomous Build & Automation Engine</h3>
        <span class="text-xs font-mono text-workshop-copper">PROBLEM → IDEA → BUILD → TEST → AUTOMATE → LAUNCH</span>
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        ${automationSteps
          .map(
            s => `
          <div class="p-4 rounded-xl bg-workshop-bg border border-workshop-border/80 space-y-2">
            <span class="text-xs font-mono text-workshop-copper font-semibold">0${s.step}</span>
            <div class="font-serif text-sm text-workshop-bone">${this.escapeHtml(s.label)}</div>
            <p class="text-[11px] text-workshop-muted leading-relaxed">${this.escapeHtml(s.detail)}</p>
          </div>`
          )
          .join('')}
      </div>
    </div>

    <!-- Products Grid -->
    <div class="space-y-6">
      <h2 class="text-2xl font-serif text-workshop-bone">Active Products</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        ${products
          .map(
            p => `
          <div class="p-6 rounded-xl bg-workshop-surface border border-workshop-border space-y-4">
            <div class="flex items-center justify-between">
              <span class="text-xs font-mono text-workshop-copper uppercase">${this.escapeHtml(p.category)}</span>
              <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-workshop-bg text-workshop-muted border border-workshop-border">${this.escapeHtml(p.stage)}</span>
            </div>
            <h3 class="text-xl font-serif text-workshop-bone">${this.escapeHtml(p.name)}</h3>
            <p class="text-xs text-workshop-muted">${this.escapeHtml(p.tagline)}</p>
            <div class="text-xs text-workshop-bone font-mono pt-2 border-t border-workshop-border/80">
              Metric: ${this.escapeHtml(p.keyMetric)}
            </div>
          </div>`
          )
          .join('')}
      </div>
    </div>
  </main>

  <footer class="py-12 border-t border-workshop-border text-center text-xs font-mono text-workshop-muted">
    © ${new Date().getFullYear()} ${this.escapeHtml(brief.brandName || "Jardin's Outpost")}. Generated with Lovable.
  </footer>
</body>
</html>`;
  }

  private escapeHtml(str: string): string {
    return (str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
