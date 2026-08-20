import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { getDatabase } from '../db/database';
import { jardinOutpostService, JardinOutpostService } from '../services/jardinOutpostService';
import { websiteProofService } from '../services/websiteProofService';
import { businessWebsiteContextService } from '../services/businessWebsiteContextService';
import { websiteBrandProfileService } from '../services/websiteBrandProfileService';
import { websiteClaimValidatorService } from '../services/websiteClaimValidatorService';
import { websiteRendererService } from '../services/websiteRendererService';
import { websiteProjectService } from '../services/websiteProjectService';
import { reisElectricPilotService } from '../services/reisElectricPilotService';

describe('Jardin’s Outpost Real Dogfood Build & Validation Suite', () => {
  const studioTenantId = JardinOutpostService.TENANT_ID;
  const contractorTenantId = 'tenant_ma_fresh_launch';

  beforeEach(() => {
    const db = getDatabase();
    // Clean up website tables
    db.prepare('DELETE FROM website_proof_items').run();
    db.prepare('DELETE FROM website_recommendations').run();
    db.prepare('DELETE FROM website_analytics_events').run();
    db.prepare('DELETE FROM website_form_submissions').run();
    db.prepare('DELETE FROM website_domains').run();
    db.prepare('DELETE FROM website_versions').run();
    db.prepare('DELETE FROM website_pages').run();
    db.prepare('DELETE FROM website_projects').run();
    db.prepare('DELETE FROM website_brand_profiles').run();
    db.prepare('DELETE FROM website_business_contexts').run();

    // Ensure contractor base tenant data is seeded for cross-tenant isolation testing
    reisElectricPilotService.seedPilotScenario(contractorTenantId);
  });

  describe('1. Tenant Isolation & Context Compilation', () => {
    it('seeds Jardin’s Outpost with zero contractor credentials or trade disclaimers', () => {
      const { tenantId, locationId } = jardinOutpostService.seedTenantAndLocations();
      assert.strictEqual(tenantId, studioTenantId);
      assert.ok(locationId.includes(studioTenantId));

      const context = businessWebsiteContextService.compileContext(studioTenantId);
      assert.strictEqual(context.tenantId, studioTenantId);
      assert.strictEqual(context.businessName.value, "Jardin's Outpost");
      assert.strictEqual(context.headquarters.value.city, 'Boston');
      assert.strictEqual(context.headquarters.value.state, 'MA');

      // Verify zero electrical contractor credentials or CMR 12.00 disclaimers
      assert.strictEqual(context.credentials.value.length, 0);
      assert.strictEqual(
        context.disclaimers.value.some((d: string) => d.includes('527 CMR') || d.includes('Master Electrician')),
        false
      );
    });

    it('isolates studio context from contractor context completely', () => {
      jardinOutpostService.seedTenantAndLocations();
      const studioContext = businessWebsiteContextService.compileContext(studioTenantId);
      const contractorContext = businessWebsiteContextService.compileContext(contractorTenantId);

      assert.notStrictEqual(studioContext.businessName.value, contractorContext.businessName.value);
      assert.strictEqual(contractorContext.credentials.value.length >= 2, true);
      assert.strictEqual(studioContext.credentials.value.length, 0);
      assert.strictEqual(contractorContext.industry.value.includes('Electrical'), true);
      assert.strictEqual(studioContext.industry.value.includes('Software'), true);
    });
  });

  describe('2. Dark Technical Brand Profile & Aesthetic Directives', () => {
    it('seeds obsidian & sky brand profile for technical founder studio', () => {
      const brand = jardinOutpostService.seedBrandProfile();

      assert.strictEqual(brand.tenantId, studioTenantId);
      assert.strictEqual(brand.colors.background, '#0B0F17');
      assert.strictEqual(brand.colors.accent, '#38BDF8');
      assert.strictEqual(brand.typography.headingFont, 'Plus Jakarta Sans');
      assert.strictEqual(brand.typography.bodyFont, 'Inter');
      assert.strictEqual(brand.imageryStyle, 'CLEAN_TECHNICAL');
      assert.strictEqual(brand.writingTone, 'DIRECT_PROFESSIONAL');

      assert.ok(brand.approvedTerminology.includes('Deterministic Execution'));
      assert.ok(brand.approvedTerminology.includes('Segregation of Duties'));
      assert.ok(brand.prohibitedClaims.includes('100% bug-free guarantee'));
    });
  });

  describe('3. Proof of Work Infrastructure & Segregation of Duties', () => {
    it('seeds and verifies cryptographic proof items for all 4 products', () => {
      const proofs = jardinOutpostService.seedProofItems('proj_jardins_outpost_main');
      assert.ok(proofs.length >= 7);

      // Verify Relay proof items exist
      const relayProofs = proofs.filter(p => p.productSlug === 'relay');
      assert.ok(relayProofs.length >= 3);
      assert.ok(relayProofs.some(p => p.title.includes('Zero-Mock')));
      assert.ok(relayProofs.some(p => p.title.includes('Segregation of Duties')));

      // Verify all proofs have valid SHA-256 evidence hashes
      proofs.forEach(proof => {
        assert.strictEqual(proof.evidenceHash.length, 64);
        assert.strictEqual(proof.tenantId, studioTenantId);
      });
    });

    it('enforces Segregation of Duties: AI Agent cannot self-approve proof publications', () => {
      jardinOutpostService.seedTenantAndLocations();
      jardinOutpostService.seedBrandProfile();
      const projectId = jardinOutpostService.seedProject();

      const proof = websiteProofService.registerProofItem({
        id: 'proof_test_opt_01',
        tenantId: studioTenantId,
        projectId,
        title: 'Experimental Optimizer',
        type: 'TEST',
        verificationStatus: 'REPORTED',
        summary: 'Optimizer performance verified in local sandbox environment.',
        sourceType: 'AUTOMATED_SUITE',
        sourceReference: 'benchmarks/opt.json',
        observedAt: new Date().toISOString(),
        publicSafe: true,
        approvedForPublication: false,
        evidenceHash: ''
      });

      assert.strictEqual(proof.approvedForPublication, false);

      // AI Agent tries to approve -> must fail
      const aiApprove = websiteProofService.approveProofForPublication(
        proof.id,
        'agent_web_presence_01',
        'AI_AGENT'
      );
      assert.strictEqual(aiApprove.success, false);
      assert.ok(aiApprove.error?.includes('Segregation of duties'));

      // Human Owner approves -> succeeds
      const humanApprove = websiteProofService.approveProofForPublication(
        proof.id,
        'user_founder_jardin',
        'HUMAN_OWNER'
      );
      assert.strictEqual(humanApprove.success, true);
      assert.strictEqual(humanApprove.item?.approvedForPublication, true);
    });
  });

  describe('4. 4-Page Studio Architecture & Component Tree', () => {
    it('builds all 4 distinct pages with proper components and routing', () => {
      const proofs = jardinOutpostService.seedProofItems('proj_jardins_outpost_main');
      const pages = jardinOutpostService.buildPages(proofs);

      assert.strictEqual(pages.length, 4);

      const [home, projects, products, about] = pages;

      // Home Page
      assert.strictEqual(home.slug, 'home');
      assert.strictEqual(home.isIndex, true);
      assert.ok(home.components.some(c => c.type === 'Hero'));
      assert.ok(home.components.some(c => c.type === 'ProductGrid'));
      assert.ok(home.components.some(c => c.type === 'ProofOfWork'));
      assert.ok(home.components.some(c => c.type === 'ContactForm'));
      assert.ok(home.components.some(c => c.type === 'Footer'));

      // Projects Page
      assert.strictEqual(projects.slug, 'projects');
      assert.ok(projects.components.some(c => c.type === 'CaseStudySection'));
      assert.ok(projects.components.some(c => c.type === 'StudioPortfolio'));

      // Products Page
      assert.strictEqual(products.slug, 'products');
      assert.ok(products.components.some(c => c.type === 'ProductGrid'));

      // About Page
      assert.strictEqual(about.slug, 'about');
      assert.ok(about.components.some(c => c.type === 'TextSection'));
      assert.ok(about.components.some(c => c.type === 'ProofOfWork'));
    });
  });

  describe('5. Full End-to-End Build Pipeline Execution', () => {
    it('executes full pipeline, passes claim validation, and compiles static version', () => {
      const result = jardinOutpostService.executeFullBuildPipeline();

      assert.ok(result.project);
      assert.strictEqual(result.project.tenantId, studioTenantId);
      assert.strictEqual(result.pages.length, 4);
      assert.ok(result.proofs.length >= 7);

      // Claims analysis must allow publishing
      assert.strictEqual(result.claimsAnalysis.canPublish, true);
      assert.strictEqual(result.claimsAnalysis.summary.prohibitedCount, 0);

      // Version must be compiled with immutable SHA-256 hash
      assert.ok(result.version);
      assert.strictEqual(result.version.contentHash.length, 64);

      // Check compiled site artifacts
      const compiled = result.compiledSite;
      assert.ok(compiled.pages['home']);
      assert.ok(compiled.pages['projects']);
      assert.ok(compiled.pages['products']);
      assert.ok(compiled.pages['about']);
      assert.ok(compiled.sitemapXml);
      assert.ok(compiled.manifestJson);

      const homeHtml = compiled.pages['home'].html;

      // Check dark theme styling in compiled HTML
      assert.ok(homeHtml.includes('background-color: #0B0F17'));
      assert.ok(homeHtml.includes('Building practical AI systems'));
      assert.ok(homeHtml.includes('Relay'));
      assert.ok(homeHtml.includes('BossLister'));
      assert.ok(homeHtml.includes('StoryForge'));
      assert.ok(homeHtml.includes('OnTrack'));
      assert.ok(homeHtml.includes('Verified Proof of Work'));

      // Check JSON-LD Schema in HTML
      assert.ok(homeHtml.includes('"@type":"Organization"'));
      assert.ok(homeHtml.includes('"@type":"SoftwareApplication"'));

      // Check Dogfood feedback
      assert.ok(result.feedbackLogs.length >= 4);
      assert.ok(result.feedbackLogs.some(f => f.subsystem === 'DESIGN_ENGINE'));
      assert.ok(result.feedbackLogs.some(f => f.subsystem === 'CONTENT_ENGINE'));
      assert.ok(result.feedbackLogs.some(f => f.subsystem === 'STORAGE_ENGINE'));
      assert.ok(result.feedbackLogs.some(f => f.subsystem === 'ROUTING_ENGINE'));
    });
  });
});
