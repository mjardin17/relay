import { describe, it } from 'node:test';
import assert from 'node:assert';
import { websiteClaimValidatorService } from '../services/websiteClaimValidatorService';
import { BusinessWebsiteContext, WebsitePage } from '../types/websiteBuilder';

describe('Website Claim Precision & Fact-Checking Engine', () => {
  const dummyContext: BusinessWebsiteContext = {
    id: 'ctx_dummy',
    tenantId: 'tenant_test',
    businessName: { value: 'Test Studio', sourceTable: 'core_tenants', verificationMethod: 'OWNER_CONFIRMED', confidenceScore: 1.0 },
    description: { value: 'Software Engineering Studio', sourceTable: 'core_tenants', verificationMethod: 'OWNER_CONFIRMED', confidenceScore: 1.0 },
    contactPhone: { value: '+1-617-555-0100', sourceTable: 'core_tenants', verificationMethod: 'OWNER_CONFIRMED', confidenceScore: 1.0 },
    contactEmail: { value: 'test@example.com', sourceTable: 'core_tenants', verificationMethod: 'OWNER_CONFIRMED', confidenceScore: 1.0 },
    headquarters: {
      value: { street: '100 Main St', city: 'Boston', state: 'MA', postalCode: '02110', country: 'USA' },
      sourceTable: 'core_tenants',
      verificationMethod: 'OWNER_CONFIRMED',
      confidenceScore: 1.0
    },
    branches: { value: [], sourceTable: 'core_tenants', verificationMethod: 'OWNER_CONFIRMED', confidenceScore: 1.0 },
    industry: { value: 'Software Engineering', sourceTable: 'core_tenants', verificationMethod: 'OWNER_CONFIRMED', confidenceScore: 1.0 },
    credentials: { value: [], sourceTable: 'core_tenants', verificationMethod: 'OWNER_CONFIRMED', confidenceScore: 1.0 },
    serviceAreas: { value: [], sourceTable: 'core_tenants', verificationMethod: 'OWNER_CONFIRMED', confidenceScore: 1.0 },
    verifiedServices: { value: [], sourceTable: 'core_tenants', verificationMethod: 'OWNER_CONFIRMED', confidenceScore: 1.0 },
    businessHours: { value: { schedule: {}, emergency24x7: false }, sourceTable: 'core_tenants', verificationMethod: 'OWNER_CONFIRMED', confidenceScore: 1.0 },
    approvedTestimonials: { value: [], sourceTable: 'core_tenants', verificationMethod: 'OWNER_CONFIRMED', confidenceScore: 1.0 },
    disclaimers: { value: [], sourceTable: 'core_tenants', verificationMethod: 'OWNER_CONFIRMED', confidenceScore: 1.0 },
    compiledAt: new Date().toISOString()
  };

  function makePage(text: string): WebsitePage {
    return {
      id: 'page_test',
      projectId: 'proj_test',
      tenantId: 'tenant_test',
      slug: 'test',
      title: 'Test Page',
      metaTitle: 'Test Page',
      metaDescription: 'Test Description',
      isPublished: true,
      isIndex: false,
      navOrder: 1,
      pageType: 'ABOUT',
      components: [
        {
          id: 'comp_test',
          type: 'TextSection',
          order: 1,
          content: {
            title: 'Test',
            subtitle: 'Sub',
            bodyMarkdown: text,
            alignment: 'LEFT'
          }
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  it('1. Flags test count asserted as suite count (e.g. 155 test suites) as CONTRADICTED', () => {
    const page = makePage('Our platform has 155 passing deterministic test suites running continuously.');
    const result = websiteClaimValidatorService.validateWebsiteContent([page], dummyContext);

    const contradicted = result.claims.find(c => c.category === 'METRICS' && c.status === 'CONTRADICTED');
    assert.ok(contradicted, 'Must flag test count as suite count error');
    assert.ok(contradicted.reason.includes('155 is the individual test count, not the test suite count'));
    assert.strictEqual(result.canPublish, false);
  });

  it('2. Supports exact evidence-backed test count phrasing: 155 tests passing across 46 suites', () => {
    const page = makePage('The system is verified with 155 tests passing across 46 suites.');
    const result = websiteClaimValidatorService.validateWebsiteContent([page], dummyContext);

    const supported = result.claims.find(c => c.category === 'METRICS' && c.status === 'SUPPORTED');
    assert.ok(supported, 'Must support exact verified test phrase');
    assert.strictEqual(result.summary.contradictedCount, 0);
    assert.strictEqual(result.canPublish, true);
  });

  it('3. Flags absolute zero-mock assertions for review / downgrade', () => {
    const page = makePage('Our testing architecture is 100% zero-mock across all modules.');
    const result = websiteClaimValidatorService.validateWebsiteContent([page], dummyContext);

    const reviewClaim = result.claims.find(c => c.category === 'METRICS' && c.status === 'REQUIRES_REVIEW');
    assert.ok(reviewClaim, 'Must flag absolute zero-mock claim for review');
    assert.ok(reviewClaim.reason.includes('controlled integration fixtures'));
  });

  it('4. Flags absolute perfection / bug-free claims as CONTRADICTED', () => {
    const page = makePage('We guarantee 100% bug-free and infallible execution.');
    const result = websiteClaimValidatorService.validateWebsiteContent([page], dummyContext);

    const bugFreeClaim = result.claims.find(c => c.category === 'GUARANTEE' && c.status === 'CONTRADICTED');
    assert.ok(bugFreeClaim, 'Must flag 100% bug-free claim as CONTRADICTED');
    assert.strictEqual(result.canPublish, false);
  });

  it('5. Flags unverified PRODUCTION maturity label on developmental products (e.g. OnTrack)', () => {
    const page = makePage('Product: OnTrack, Status: PRODUCTION');
    const result = websiteClaimValidatorService.validateWebsiteContent([page], dummyContext);

    const matClaim = result.claims.find(c => c.category === 'CAPABILITY' && c.status === 'CONTRADICTED');
    assert.ok(matClaim, 'Must flag OnTrack as PRODUCTION without live deployment evidence');
    assert.strictEqual(result.canPublish, false);
  });

  it('6. Allows honest, evidence-aligned product maturity stages', () => {
    const page = makePage(`
      - Relay (stage: PRODUCTION DOGFOOD): Active internal pilot
      - BossLister (stage: STABLE): Resale catalog ingestion tool
      - StoryForge (stage: ALPHA): Algorithmic narrative graph
      - OnTrack (stage: DEVELOPMENT): Offline habit tracker engine
    `);
    const result = websiteClaimValidatorService.validateWebsiteContent([page], dummyContext);

    assert.strictEqual(result.summary.contradictedCount, 0);
    assert.strictEqual(result.canPublish, true);
  });
});
