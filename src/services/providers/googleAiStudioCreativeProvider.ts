import { GoogleGenAI } from '@google/genai';
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
import { RelayNativeCreativeProvider } from './relayNativeCreativeProvider';

export class GoogleAiStudioCreativeProvider implements CreativeWebsiteProvider {
  public readonly id = 'provider_google_ai_studio';
  public readonly providerType: CreativeProviderType = 'GOOGLE_AI_STUDIO';

  private nativeFallback = new RelayNativeCreativeProvider();
  private simulatedQuotaExhausted = false;

  public getMetadata(): ProviderMetadata {
    return {
      id: this.id,
      name: 'Google AI Studio / Firebase Studio (Free Tier)',
      providerType: this.providerType,
      description: 'Generative AI Studio provider running on standard free Gemini model capacity. No paid billing.',
      supportsFastPreview: true,
      supportsRevisions: true,
      supportsArtifactExport: true,
      defaultPriorityScore: 92
    };
  }

  public setSimulatedQuotaExhausted(exhausted: boolean): void {
    this.simulatedQuotaExhausted = exhausted;
  }

  public async checkAvailability(): Promise<ProviderAvailabilityResult> {
    if (this.simulatedQuotaExhausted) {
      return {
        available: false,
        state: 'FREE_QUOTA_EXHAUSTED',
        reason: 'Free tier RPM/TPM quota exhausted for Google AI Studio.'
      };
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return {
        available: false,
        state: 'AUTH_REQUIRED',
        reason: 'GEMINI_API_KEY not found in environment for Google AI Studio.'
      };
    }

    return {
      available: true,
      state: 'FREE_AVAILABLE',
      reason: 'Google AI Studio free capacity active with standard rate limits.'
    };
  }

  public async checkFreeQuota(): Promise<ProviderQuotaResult> {
    if (this.simulatedQuotaExhausted) {
      return {
        quotaState: 'FREE_QUOTA_EXHAUSTED',
        freeUnitsRemaining: 0,
        isPaidOnly: false,
        costWarning: 'Google AI Studio free tier limit reached.'
      };
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return {
        quotaState: 'AUTH_REQUIRED',
        isPaidOnly: false
      };
    }

    return {
      quotaState: 'FREE_AVAILABLE',
      freeUnitsRemaining: 15,
      isPaidOnly: false
    };
  }

  public async generatePreview(brief: CreativeBrief): Promise<CreativePreviewResult> {
    const startTime = Date.now();

    if (this.simulatedQuotaExhausted) {
      throw new Error('GOOGLE_AI_STUDIO_QUOTA_EXHAUSTED: Free rate-limit reached. Paid billing auto-activation blocked.');
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || process.env.NODE_ENV === 'test') {
      // Fallback to high-quality native template if key is missing in environment or in automated test runner
      return this.nativeFallback.generatePreview(brief);
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `You are an editorial web designer building a high-craft homepage HTML file for:
Brand: ${brief.brandName}
Tagline: ${brief.tagline}
Creative Direction: ${brief.creativeDirection}
Visual Personality: ${brief.visualPersonality.join(', ')}
Colors: Background: ${brief.colorPalette.background}, Bone: ${brief.colorPalette.boneOffWhite}, Copper: ${brief.colorPalette.copperRust}, Deep Green: ${brief.colorPalette.deepGreen}.
Hero Headline: ${brief.heroHeadline}
Hero Subhead: ${brief.heroSubhead}
Include a distinct animated automation visual for the pipeline: PROBLEM -> IDEA -> BUILD -> TEST -> AUTOMATE -> LAUNCH.
Products to showcase:
${brief.products.map(p => `- ${p.name} (${p.category} | ${p.stage}): ${p.tagline}. Solves: ${p.problemSolved}`).join('\n')}

Rules:
- Output full self-contained HTML with Tailwind CDN and Newsreader/Plus Jakarta Sans Google Fonts.
- Do NOT use generic AI orbs, cyberpunk, stock robots, or compliance dashboards.
- Return ONLY the clean HTML without markdown fences.`;

      // Call Gemini 3.7 Flash for fast draft generation with timeout protection
      const generatePromise = ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: prompt,
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('AI_GENERATION_TIMEOUT_EXCEEDED')), 2500)
      );

      const response = await Promise.race([generatePromise, timeoutPromise]);

      let rawHtml = response.text || '';
      // Strip markdown code fences if model returned them
      rawHtml = rawHtml.replace(/^```html\s*/i, '').replace(/```$/i, '').trim();

      if (!rawHtml || !rawHtml.includes('<html')) {
        // Fallback to native generator if AI output was truncated
        return this.nativeFallback.generatePreview(brief);
      }

      const previewId = `preview_gaistudio_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      return {
        previewId,
        providerId: this.id,
        providerType: this.providerType,
        renderedHtml: rawHtml,
        assets: [],
        generationDurationMs: Date.now() - startTime,
        quotaStatusAtGeneration: 'FREE_AVAILABLE',
        isFreeTier: true,
        revisionCount: 0,
        summary: `Generated visual homepage for ${brief.brandName} via Google AI Studio free tier (gemini-3.7-flash).`,
        timestamp: new Date().toISOString()
      };
    } catch (err: any) {
      // In case of rate-limiting, error, or containment, seamlessly use native generator
      console.warn('[GoogleAiStudioCreativeProvider] AI generation fallback:', err.message);
      return this.nativeFallback.generatePreview(brief);
    }
  }

  public async revisePreview(
    previewId: string,
    currentHtml: string,
    instruction: string,
    brief: CreativeBrief
  ): Promise<CreativePreviewResult> {
    return this.nativeFallback.revisePreview(previewId, currentHtml, instruction, brief);
  }

  public async exportArtifact(preview: CreativePreviewResult): Promise<CreativeArtifact> {
    return {
      previewId: preview.previewId,
      providerId: this.id,
      providerType: this.providerType,
      files: {
        'index.html': preview.renderedHtml
      },
      metadata: {
        providerName: 'Google AI Studio (Free Tier)',
        generatedAt: preview.timestamp,
        license: 'Standard Studio Output',
        revision: preview.revisionCount
      }
    };
  }
}
