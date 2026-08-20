import { describe, it } from 'node:test';
import assert from 'node:assert';
import { creativeProviderRouter, CreativeProviderRouter } from '../services/creativeProviderRouter';
import { LovableCreativeProvider } from '../services/providers/lovableCreativeProvider';
import { GoogleAiStudioCreativeProvider } from '../services/providers/googleAiStudioCreativeProvider';
import { RelayNativeCreativeProvider } from '../services/providers/relayNativeCreativeProvider';
import { CreativeWebsiteProvider, CreativeBrief } from '../types/creativeProvider';

describe('CreativeProviderRouter — Free Creative Engine & Multi-Provider Failover', () => {
  const sampleBrief = CreativeProviderRouter.createJardinsOutpostBrief();

  it('1. Evaluates configured providers and enforces FREE capacity first', async () => {
    const evaluations = await creativeProviderRouter.evaluateFreeProviders();

    assert.ok(evaluations.length >= 3, 'Must evaluate at least 3 default providers');
    const nativeEval = evaluations.find(e => e.type === 'RELAY_NATIVE');
    const lovableEval = evaluations.find(e => e.type === 'LOVABLE');

    assert.ok(nativeEval && nativeEval.isFreeEligible, 'Relay Native must always be free eligible');
    assert.ok(lovableEval && lovableEval.isFreeEligible, 'Lovable with initial credits must be free eligible');
  });

  it('2. Selects highest-priority free provider (Lovable) when free quota is available', async () => {
    const lovable = creativeProviderRouter.getProvider('provider_lovable') as LovableCreativeProvider;
    lovable.setSimulatedQuotaExhausted(false);
    lovable.setFreeCredits(5);

    const result = await creativeProviderRouter.generateCreativeDraft(sampleBrief);

    assert.strictEqual(result.routingDecision.selectedProviderType, 'LOVABLE');
    assert.strictEqual(result.routingDecision.freePaidClassification, 'FREE');
    assert.ok(result.preview.renderedHtml.includes("Jardin"));
    assert.ok(result.routingDecision.fallbackEvents.length === 0, 'No fallback needed when Lovable is free available');
  });

  it('3. Automatically fails over to next free provider when Lovable free quota is exhausted', async () => {
    const lovable = creativeProviderRouter.getProvider('provider_lovable') as LovableCreativeProvider;
    lovable.setSimulatedQuotaExhausted(true); // Simulate free workspace quota exhaustion

    const result = await creativeProviderRouter.generateCreativeDraft(sampleBrief);

    // Must successfully fail over away from Lovable to Google AI Studio or Relay Native without blocking the user
    assert.ok(
      result.routingDecision.selectedProviderType === 'GOOGLE_AI_STUDIO' ||
      result.routingDecision.selectedProviderType === 'RELAY_NATIVE',
      'Must select next available free provider'
    );
    assert.strictEqual(result.routingDecision.freePaidClassification, 'FREE');

    // Reset lovable for other tests
    lovable.setSimulatedQuotaExhausted(false);
    lovable.setFreeCredits(10);
  });

  it('3b. Records fallback events when a provider fails at runtime during generation', async () => {
    const lovable = creativeProviderRouter.getProvider('provider_lovable') as LovableCreativeProvider;
    lovable.setSimulatedQuotaExhausted(false);
    // Temporarily stub generatePreview to throw mid-flight rate-limit
    const originalGenerate = lovable.generatePreview.bind(lovable);
    lovable.generatePreview = async () => {
      throw new Error('LOVABLE_RATE_LIMIT_429: Workspace concurrency exceeded');
    };

    const result = await creativeProviderRouter.generateCreativeDraft(sampleBrief);

    assert.ok(result.routingDecision.fallbackEvents.length > 0, 'Must record fallback event');
    assert.strictEqual(result.routingDecision.fallbackEvents[0].failedProviderType, 'LOVABLE');
    assert.ok(result.routingDecision.fallbackEvents[0].reason.includes('RATE_LIMIT'));

    // Restore original
    lovable.generatePreview = originalGenerate;
  });

  it('4. Always guarantees Relay Native generation when all third-party free providers fail', async () => {
    const lovable = creativeProviderRouter.getProvider('provider_lovable') as LovableCreativeProvider;
    const google = creativeProviderRouter.getProvider('provider_google_ai_studio') as GoogleAiStudioCreativeProvider;

    lovable.setSimulatedQuotaExhausted(true);
    google.setSimulatedQuotaExhausted(true);

    const result = await creativeProviderRouter.generateCreativeDraft(sampleBrief);

    assert.strictEqual(result.routingDecision.selectedProviderType, 'RELAY_NATIVE');
    assert.strictEqual(result.routingDecision.freePaidClassification, 'FREE');
    assert.ok(result.preview.renderedHtml.includes('Autonomous Product Pipeline'));
    assert.ok(result.preview.renderedHtml.includes('PROBLEM'));
    assert.ok(result.preview.renderedHtml.includes('LAUNCH'));

    // Reset providers
    lovable.setSimulatedQuotaExhausted(false);
    google.setSimulatedQuotaExhausted(false);
  });

  it('5. Protects privacy by strictly sanitizing briefs before dispatching to third-party providers', () => {
    const lovable = new LovableCreativeProvider();
    const sanitized = lovable.sanitizeBriefForThirdParty(sampleBrief);

    assert.strictEqual(sanitized.sanitizedForThirdParty, true);
    assert.strictEqual(sanitized.brandName, "Jardin's Outpost");
    assert.strictEqual((sanitized as any).tenantId, undefined, 'Must not expose internal tenantId');
  });

  it('6. Enforces Human Cost Control: blocks automatic billing and generates approval notice', () => {
    const notice = creativeProviderRouter.generateHumanCostNotice(
      'provider_lovable',
      '$20/month Workspace Pro',
      'Free community quota exhausted'
    );

    assert.strictEqual(notice.requiresHumanApproval, true);
    assert.strictEqual(notice.status, 'PENDING_HUMAN_CONFIRMATION');
    assert.strictEqual(notice.expectedChargeModel, '$20/month Workspace Pro');
  });

  it("7. Generates Jardin's Outpost visual homepage honoring all creative direction requirements", async () => {
    const native = new RelayNativeCreativeProvider();
    const preview = await native.generatePreview(sampleBrief);

    const html = preview.renderedHtml;

    // Creative Direction Checks
    assert.ok(html.includes("Jardin’s Outpost") || html.includes("Jardin's Outpost"), 'Must contain brand name');
    assert.ok(html.includes('Built from real problems.'), 'Must contain primary headline');
    assert.ok(html.includes('Turned into real products.'), 'Must contain sub-headline');

    // Pipeline Visual: PROBLEM -> IDEA -> BUILD -> TEST -> AUTOMATE -> LAUNCH
    assert.ok(html.includes('01') && html.includes('Friction Discovery'), 'Must contain Step 1: PROBLEM');
    assert.ok(html.includes('02') && html.includes('System Blueprint'), 'Must contain Step 2: IDEA');
    assert.ok(html.includes('03') && html.includes('Rapid Prototype'), 'Must contain Step 3: BUILD');
    assert.ok(html.includes('04') && html.includes('Verification Suite'), 'Must contain Step 4: TEST');
    assert.ok(html.includes('05') && html.includes('Workflow Engine'), 'Must contain Step 5: AUTOMATE');
    assert.ok(html.includes('06') && html.includes('Production Deployment'), 'Must contain Step 6: LAUNCH');

    // Product Storytelling Cards
    assert.ok(html.includes('Relay'), 'Must showcase Relay');
    assert.ok(html.includes('BossLister'), 'Must showcase BossLister');
    assert.ok(html.includes('StoryForge'), 'Must showcase StoryForge');
    assert.ok(html.includes('OnTrack'), 'Must showcase OnTrack');

    // Negative constraints: No generic orbs, cyberpunk, or giant SHA hashes on homepage
    assert.strictEqual(html.includes('generic-ai-orb'), false);
    assert.strictEqual(html.includes('501769f8fb5ba7ca46099abf7c1f609acd5c71f6fd6d740ea83661fdd7d4d9ba'), false, 'Giant SHA hash must not be displayed on homepage');
  });
});
