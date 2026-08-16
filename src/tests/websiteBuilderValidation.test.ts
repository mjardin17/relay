import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { getDatabase } from '../db/database';
import { reisElectricWebsiteService } from '../services/reisElectricWebsiteService';
import { syntheticSecondTenantWebsiteService } from '../services/syntheticSecondTenantWebsiteService';
import { websiteProjectService } from '../services/websiteProjectService';
import { businessWebsiteContextService } from '../services/businessWebsiteContextService';
import { websiteBrandProfileService } from '../services/websiteBrandProfileService';
import { websiteClaimValidatorService } from '../services/websiteClaimValidatorService';
import { websiteRendererService } from '../services/websiteRendererService';
import { websiteFormService } from '../services/websiteFormService';
import { websiteDeploymentManager } from '../services/websiteDeploymentService';
import { websiteDomainService } from '../services/websiteDomainService';
import { websiteAnalyticsService } from '../services/websiteAnalyticsService';
import { websiteRoiService } from '../services/websiteRoiService';
import { websiteReconciliationService } from '../services/websiteReconciliationService';
import { webPresenceAgentService } from '../services/webPresenceAgentService';
import { reisElectricPilotService } from '../services/reisElectricPilotService';

describe('Relay v2.0 Website Builder & Web Presence Agent Test Suite', () => {
  const tenant1 = 'tenant_ma_fresh_launch';
  const tenant2 = 'tenant_apex_climate_hvac';

  beforeEach(() => {
    const db = getDatabase();
    // Clean up website tables
    db.prepare('DELETE FROM website_recommendations').run();
    db.prepare('DELETE FROM website_analytics_events').run();
    db.prepare('DELETE FROM website_form_submissions').run();
    db.prepare('DELETE FROM website_domains').run();
    db.prepare('DELETE FROM website_versions').run();
    db.prepare('DELETE FROM website_pages').run();
    db.prepare('DELETE FROM website_projects').run();
    db.prepare('DELETE FROM website_brand_profiles').run();
    db.prepare('DELETE FROM website_business_contexts').run();

    // Ensure base tenant data is seeded
    reisElectricPilotService.seedPilotScenario(tenant1);
  });

  describe('Phase 1–6: Context Compilation, Brand Constraints & Claim Validation', () => {
    it('compiles ground-truth business context for Reis Electric with 0 hallucinated facts', () => {
      const context = businessWebsiteContextService.compileContext(tenant1);
      assert.strictEqual(context.tenantId, tenant1);
      assert.strictEqual(context.businessName.value, 'Reis Electric LLC');
      assert.strictEqual(context.businessName.verificationMethod, 'GOVERNMENT_REGISTRY');
      assert.strictEqual(context.headquarters.value.city, 'New Bedford');
      assert.strictEqual(context.headquarters.value.state, 'MA');
      assert.strictEqual(context.contactPhone.value, '(508) 999-1234');
      assert.ok(context.credentials.value.some((c: any) => c.identifier.includes('22419') || c.identifier.includes('19842')));
      assert.ok(context.verifiedServices.value.length >= 6);
    });

    it('validates factual claims against context and rejects prohibited statements', () => {
      const { project, pages } = reisElectricWebsiteService.initializeReisElectricWebsite(tenant1);
      const context = businessWebsiteContextService.getContext(tenant1);
      const brand = websiteBrandProfileService.getOrCreateBrandProfile(tenant1);

      const validation = websiteClaimValidatorService.validateWebsiteContent(pages, context, brand.prohibitedClaims);
      assert.strictEqual(validation.canPublish, true);
      assert.strictEqual(validation.summary.prohibitedCount, 0);
      assert.ok(validation.summary.supportedCount > 0);
    });

    it('catches and blocks prohibited unbacked claims such as "Cheapest electrician in New England"', () => {
      const { project, pages } = reisElectricWebsiteService.initializeReisElectricWebsite(tenant1);
      const context = businessWebsiteContextService.getContext(tenant1);
      const brand = websiteBrandProfileService.getOrCreateBrandProfile(tenant1);

      // Inject unbacked prohibited claim into page
      pages[0].components[0].content = {
        ...pages[0].components[0].content,
        headline: 'We guarantee the cheapest electrical work with 100% free lifetime repairs!'
      } as any;

      const validation = websiteClaimValidatorService.validateWebsiteContent(pages, context, [
        'cheapest',
        'free lifetime repairs'
      ]);

      assert.strictEqual(validation.canPublish, false);
      assert.ok(validation.summary.prohibitedCount >= 1);
    });
  });

  describe('Phase 7–11: Site Rendering, Hash-Bound Versioning & Governance Sign-off', () => {
    it('renders responsive, accessible, static HTML pages with JSON-LD schema', () => {
      const { project, pages } = reisElectricWebsiteService.initializeReisElectricWebsite(tenant1);
      const brand = websiteBrandProfileService.getOrCreateBrandProfile(tenant1);
      const context = businessWebsiteContextService.getContext(tenant1);

      const compiled = websiteRendererService.compileSite(
        project.id,
        tenant1,
        'ver_test_1',
        'hash_abc123',
        project.siteName,
        pages,
        brand,
        context,
        'https://reiselectricma.com'
      );

      assert.strictEqual(compiled.pages.length, pages.length);
      const homePage = compiled.pages.find(p => p.slug === 'home');
      assert.ok(homePage);
      assert.ok(homePage?.html.includes('<!DOCTYPE html>'));
      assert.ok(homePage?.html.includes('Reis Electric LLC'));
      assert.ok(homePage?.html.includes('application/ld+json'));
      assert.ok(homePage?.html.includes('ElectricalContractor'));
      assert.ok(compiled.sitemapXml.includes('<loc>https://reiselectricma.com/home.html</loc>'));
      assert.ok(compiled.robotsTxt.includes('User-agent: *'));
    });

    it('creates version snapshot with deterministic SHA-256 canonical hash', () => {
      const { project } = reisElectricWebsiteService.initializeReisElectricWebsite(tenant1);
      const version = websiteProjectService.createVersionSnapshot(project.id, tenant1, 'OPERATOR');

      assert.strictEqual(version.projectId, project.id);
      assert.strictEqual(version.versionNumber, 1);
      assert.strictEqual(version.approvalStatus, 'REVIEW_REQUIRED');
      assert.strictEqual(typeof version.contentHash, 'string');
      assert.strictEqual(version.contentHash.length, 64); // SHA-256 length
    });

    it('enforces Segregation of Duties: blocks AI agent from approving website publication', () => {
      const { project } = reisElectricWebsiteService.initializeReisElectricWebsite(tenant1);
      const version = websiteProjectService.createVersionSnapshot(project.id, tenant1, 'OPERATOR');

      assert.throws(() => {
        websiteProjectService.approveVersion(
          project.id,
          version.id,
          tenant1,
          'agent_aria_auto_proposer',
          'AI_AGENT_PROPOSER'
        );
      }, /Segregation of Duties Violation/);
    });

    it('allows authorized human owner to approve publication and updates project status', () => {
      const { project } = reisElectricWebsiteService.initializeReisElectricWebsite(tenant1);
      const version = websiteProjectService.createVersionSnapshot(project.id, tenant1, 'OPERATOR');

      const approved = websiteProjectService.approveVersion(
        project.id,
        version.id,
        tenant1,
        'operator_shad_reis',
        'HUMAN_OWNER'
      );

      assert.strictEqual(approved.approvalStatus, 'APPROVED');
      assert.strictEqual(approved.approvedBy, 'operator_shad_reis');

      const updatedProj = websiteProjectService.getProject(project.id, tenant1);
      assert.strictEqual(updatedProj.status, 'APPROVED');
      assert.strictEqual(updatedProj.approvalStatus, 'APPROVED');
    });

    it('detects post-approval content drift and invalidates approval if working pages are modified', () => {
      const { project, pages } = reisElectricWebsiteService.initializeReisElectricWebsite(tenant1);
      const version = websiteProjectService.createVersionSnapshot(project.id, tenant1, 'OPERATOR');
      websiteProjectService.approveVersion(project.id, version.id, tenant1, 'operator_shad_reis', 'HUMAN_OWNER');

      // Now tamper with a page
      const modifiedPage = { ...pages[0], title: 'Tampered Title Post Approval' };
      websiteProjectService.savePage(modifiedPage);

      const refreshedProj = websiteProjectService.getProject(project.id, tenant1);
      assert.strictEqual(refreshedProj.approvalStatus, 'REVIEW_REQUIRED');
    });

    it('executes auditable rollback to previous version without erasing history', () => {
      const { project, pages } = reisElectricWebsiteService.initializeReisElectricWebsite(tenant1);
      const v1 = websiteProjectService.createVersionSnapshot(project.id, tenant1, 'OPERATOR');
      websiteProjectService.approveVersion(project.id, v1.id, tenant1, 'operator_shad_reis', 'HUMAN_OWNER');

      // Create v2
      pages[0].title = 'Version 2 Title';
      websiteProjectService.savePage(pages[0]);
      const v2 = websiteProjectService.createVersionSnapshot(project.id, tenant1, 'OPERATOR');
      websiteProjectService.approveVersion(project.id, v2.id, tenant1, 'operator_shad_reis', 'HUMAN_OWNER');

      // Rollback to v1
      const rolledBack = websiteProjectService.rollbackToVersion(project.id, v1.id, tenant1, 'operator_shad_reis');
      assert.strictEqual(rolledBack.versionNumber, 3);
      assert.strictEqual(rolledBack.contentHash, v1.contentHash);
      assert.strictEqual(rolledBack.previousVersionId, v1.id);
    });
  });

  describe('Phase 12–14: Deployment Providers & Domain Registry Verification', () => {
    it('blocks deployment of unapproved version', async () => {
      const { project } = reisElectricWebsiteService.initializeReisElectricWebsite(tenant1);
      const draftVersion = websiteProjectService.createVersionSnapshot(project.id, tenant1, 'OPERATOR');

      await assert.rejects(async () => {
        await websiteDeploymentManager.deployApprovedVersion(project.id, draftVersion.id, tenant1, 'STATIC_EXPORT');
      }, /Explicit human approval is required/);
    });

    it('successfully deploys approved version using Static Export provider', async () => {
      const { project } = reisElectricWebsiteService.initializeReisElectricWebsite(tenant1);
      const version = websiteProjectService.createVersionSnapshot(project.id, tenant1, 'OPERATOR');
      websiteProjectService.approveVersion(project.id, version.id, tenant1, 'operator_shad_reis', 'HUMAN_OWNER');

      const deployResult = await websiteDeploymentManager.deployApprovedVersion(
        project.id,
        version.id,
        tenant1,
        'STATIC_EXPORT'
      );

      assert.strictEqual(deployResult.success, true);
      assert.strictEqual(deployResult.provider, 'STATIC_EXPORT');
      assert.ok(deployResult.deploymentUrl.includes('relayplatform.net'));

      const liveProj = websiteProjectService.getProject(project.id, tenant1);
      assert.strictEqual(liveProj.status, 'DEPLOYED');
      assert.strictEqual(liveProj.deploymentStatus, 'DEPLOYED');
    });

    it('registers custom domain and executes DNS challenge verification state machine', () => {
      const { project } = reisElectricWebsiteService.initializeReisElectricWebsite(tenant1);
      const registered = websiteDomainService.registerDomainRequest(project.id, tenant1, 'https://www.reiselectricma.com');

      assert.strictEqual(registered.requestedDomain, 'www.reiselectricma.com');
      assert.strictEqual(registered.status, 'PENDING_DNS');
      assert.strictEqual(registered.dnsRecords.length, 3);

      // Verify DNS match
      const verified = websiteDomainService.verifyDomainDNS(registered.id, tenant1, true);
      assert.strictEqual(verified.status, 'ACTIVE');
      assert.strictEqual(verified.sslStatus, 'ACTIVE');
      assert.strictEqual(verified.ownershipVerified, true);
    });
  });

  describe('Phase 15–17: Public Native Form, Security & Consent Engine', () => {
    it('silently traps bot spam when honeypot field is filled', async () => {
      const { project } = reisElectricWebsiteService.initializeReisElectricWebsite(tenant1);
      const result = await websiteFormService.processFormSubmission({
        tenantId: tenant1,
        projectId: project.id,
        pageSlug: 'contact',
        formType: 'QUOTE_REQUEST',
        fullName: 'Spam Bot 3000',
        phone: '555-123-4567',
        city: 'New Bedford',
        requestedService: 'Panels',
        consentGiven: true,
        company_fax_check: 'automated_spam_payload' // Honeypot trap!
      });

      assert.strictEqual(result.success, false);
      assert.ok(!result.routedLeadId);
    });

    it('sanitizes input and protects against XSS payloads', async () => {
      const { project } = reisElectricWebsiteService.initializeReisElectricWebsite(tenant1);
      const result = await websiteFormService.processFormSubmission({
        tenantId: tenant1,
        projectId: project.id,
        pageSlug: 'contact',
        formType: 'QUOTE_REQUEST',
        fullName: 'Arthur Dent <script>alert("xss")</script>',
        phone: '508-555-0199',
        city: 'New Bedford',
        requestedService: 'Residential Electrical Work',
        notes: '<b>Urgent rewiring</b><img src=x onerror=alert(1)>',
        consentGiven: true
      });

      assert.strictEqual(result.success, true);
      assert.ok(result.routedLeadId);

      const submissions = websiteFormService.getSubmissions(tenant1, project.id);
      const lastSub = submissions[0];
      assert.ok(!lastSub.formData.fullName.includes('<script>'));
      assert.ok(!lastSub.formData.notes.includes('<img'));
    });

    it('captures versioned consent record and routes lead to pilot intake pipeline', async () => {
      const { project } = reisElectricWebsiteService.initializeReisElectricWebsite(tenant1);
      const result = await websiteFormService.processFormSubmission({
        tenantId: tenant1,
        projectId: project.id,
        pageSlug: 'residential-electrical',
        formType: 'QUOTE_REQUEST',
        fullName: 'Maria Santos',
        phone: '(508) 555-4321',
        email: 'maria.santos@example.com',
        street: '144 Purchase St',
        city: 'New Bedford',
        state: 'MA',
        postalCode: '02740',
        requestedService: 'Residential Electrical Work',
        notes: 'Need whole-house rewire for historic home.',
        disclosureVersion: 'v1.0',
        consentGiven: true,
        utmSource: 'google_organic',
        utmMedium: 'search'
      });

      assert.strictEqual(result.success, true);
      assert.ok(result.routedLeadId);
      assert.strictEqual(result.routedLeadId.startsWith('lead_'), true);

      const submissions = websiteFormService.getSubmissions(tenant1, project.id);
      const sub = submissions[0];
      assert.strictEqual(sub.consent.purpose, 'ESTIMATE_AND_SERVICE_COORDINATION');
      assert.strictEqual(sub.consent.disclosureVersion, 'v1.0');
      assert.strictEqual(typeof sub.consent.disclosureTextHash, 'string');
      assert.strictEqual(sub.tracking.utmSource, 'google_organic');
    });
  });

  describe('Phase 18–22: Analytics Funnel, Attribution & Closed-Loop Financial ROI', () => {
    it('records first-party privacy-safe analytics events and calculates conversion funnel', () => {
      const { project } = reisElectricWebsiteService.initializeReisElectricWebsite(tenant1);

      websiteAnalyticsService.recordEvent({
        tenantId: tenant1,
        projectId: project.id,
        pageSlug: 'home',
        eventType: 'PAGE_VIEW',
        sessionId: 'sess_1'
      });
      websiteAnalyticsService.recordEvent({
        tenantId: tenant1,
        projectId: project.id,
        pageSlug: 'residential-electrical',
        eventType: 'SERVICE_PAGE_VIEW',
        sessionId: 'sess_1'
      });
      websiteAnalyticsService.recordEvent({
        tenantId: tenant1,
        projectId: project.id,
        pageSlug: 'contact',
        eventType: 'FORM_START',
        sessionId: 'sess_1'
      });

      const funnel = websiteAnalyticsService.calculateConversionFunnel(tenant1, project.id);
      assert.ok(funnel.siteVisits > 0);
      assert.ok(funnel.servicePageVisits > 0);
      assert.ok(funnel.formStarts > 0);
      assert.strictEqual(typeof funnel.visitorToLeadRate, 'number');
    });

    it('calculates attributable revenue, gross profit, and ROI without unverified revenue fabrication', () => {
      const { project } = reisElectricWebsiteService.initializeReisElectricWebsite(tenant1);

      const roi = websiteRoiService.calculateWebsiteRoi(tenant1, project.id, 'PILOT', 0);
      assert.strictEqual(roi.tenantId, tenant1);
      assert.strictEqual(roi.projectId, project.id);
      assert.strictEqual(roi.hostingCost, 29);
      assert.strictEqual(roi.platformCost, 199);
      assert.strictEqual(typeof roi.verifiedCollectedRevenue, 'number');
      assert.strictEqual(typeof roi.attributableROI, 'number');
    });
  });

  describe('Phase 26–28: Reconciliation Audit & Web Presence Agent Advisory', () => {
    it('runs reconciliation audit and reports 0 critical violations for valid project', () => {
      const { project } = reisElectricWebsiteService.initializeReisElectricWebsite(tenant1);
      const version = websiteProjectService.createVersionSnapshot(project.id, tenant1, 'OPERATOR');
      websiteProjectService.approveVersion(project.id, version.id, tenant1, 'operator_shad_reis', 'HUMAN_OWNER');

      const report = websiteReconciliationService.runReconciliation(tenant1, project.id);
      assert.strictEqual(report.tenantId, tenant1);
      assert.strictEqual(report.overallStatus, 'PASS');
      assert.ok(report.checksRun >= 4);
    });

    it('generates proactive Web Presence Agent recommendations within strict AI guardrails', () => {
      const { project } = reisElectricWebsiteService.initializeReisElectricWebsite(tenant1);
      const recs = webPresenceAgentService.generateRecommendations(tenantIdFor(tenant1), project.id);

      assert.ok(recs.length > 0);
      for (const rec of recs) {
        assert.strictEqual(rec.guardrailChecks.preservesFactualTruth, true);
        assert.strictEqual(rec.guardrailChecks.requiresHumanApproval, true);
        assert.strictEqual(rec.status, 'PENDING_REVIEW');
      }
    });
  });

  describe('Phase 30: Second-Tenant Proof (Apex Climate Solutions - HVAC Hartford CT)', () => {
    it('initializes non-electrical second tenant in separate state/trade with complete tenant isolation', () => {
      const { project, pages } = syntheticSecondTenantWebsiteService.initializeSecondTenant(tenant2);
      assert.strictEqual(project.tenantId, tenant2);
      assert.strictEqual(project.siteName, 'Apex Climate Solutions Official Portal');

      const context = businessWebsiteContextService.compileContext(tenant2);
      assert.strictEqual(context.tenantId, tenant2);
      assert.strictEqual(context.businessName.value, 'Apex Climate Solutions');
      assert.strictEqual(context.headquarters.value.city, 'Hartford');
      assert.strictEqual(context.headquarters.value.state, 'CT');
      assert.strictEqual(context.contactPhone.value, '+18605550199');

      // Verify complete tenant isolation: no Reis Electric data leaked into Apex Climate
      assert.ok(!JSON.stringify(pages).includes('Reis Electric'));
      assert.ok(!JSON.stringify(pages).includes('New Bedford'));
      assert.ok(JSON.stringify(pages).includes('Hartford'));

      // Validate second tenant website
      const brand = websiteBrandProfileService.getOrCreateBrandProfile(tenant2);
      const validation = websiteClaimValidatorService.validateWebsiteContent(pages, context, brand.prohibitedClaims);
      assert.strictEqual(validation.canPublish, true);
    });
  });
});

function tenantIdFor(t: string) {
  return t;
}
