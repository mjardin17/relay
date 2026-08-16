import { getDatabase } from '../db/database';
import { PresenceAgentRecommendation } from '../types/websiteBuilder';
import { websiteAnalyticsService } from './websiteAnalyticsService';
import { websiteProjectService } from './websiteProjectService';
import { businessWebsiteContextService } from './businessWebsiteContextService';

export class WebPresenceAgentService {
  private static instance: WebPresenceAgentService;

  private constructor() {}

  public static getInstance(): WebPresenceAgentService {
    if (!WebPresenceAgentService.instance) {
      WebPresenceAgentService.instance = new WebPresenceAgentService();
    }
    return WebPresenceAgentService.instance;
  }

  public generateRecommendations(tenantId: string, projectId: string): PresenceAgentRecommendation[] {
    const db = getDatabase();
    const funnel = websiteAnalyticsService.calculateConversionFunnel(tenantId, projectId);
    const pages = websiteProjectService.getPages(projectId, tenantId);
    const context = businessWebsiteContextService.getContext(tenantId);

    const recs: PresenceAgentRecommendation[] = [];

    // 1. Identify missing dedicated service pages
    const existingSlugs = new Set(pages.map(p => p.slug));
    const verifiedServices = context.verifiedServices?.value || [];

    for (const service of verifiedServices) {
      const expectedSlug = service.serviceKey.replace(/_/g, '-');
      if (!existingSlugs.has(expectedSlug) && !existingSlugs.has(service.serviceKey)) {
        recs.push({
          id: `rec_gap_${service.serviceKey}_${Date.now()}`,
          tenantId,
          projectId,
          category: 'CONTENT_GAP',
          title: `Create Dedicated Landing Page for "${service.displayName}"`,
          rationale: `You offer verified ${service.displayName} in ${context.headquarters.value.city}, but there is no dedicated high-intent landing page for local search indexing.`,
          proposedAction: `Generate a new structured Service page for /${expectedSlug}.html with verified scope, FAQ, and estimate request form.`,
          priority: service.isEmergencyService ? 'HIGH' : 'MEDIUM',
          status: 'PENDING_REVIEW',
          guardrailChecks: {
            preservesFactualTruth: true,
            requiresHumanApproval: true,
            touchesVerifiedLicense: false
          },
          createdAt: new Date().toISOString()
        });
      }
    }

    // 2. Conversion Optimization: Check visitor to lead conversion rate
    if (funnel.visitorToLeadRate < 10) {
      recs.push({
        id: `rec_cro_cta_${Date.now()}`,
        tenantId,
        projectId,
        category: 'CONVERSION_OPTIMIZATION',
        targetPageSlug: 'home',
        title: 'Optimize Hero Primary Call-To-Action',
        rationale: `Visitor-to-lead conversion is currently at ${funnel.visitorToLeadRate}%. Adding direct phone click options and prominent license trust badges above the fold typically increases lead capture.`,
        proposedAction: 'Update Hero primary button to "Request Rapid Estimate" and add verified Master Electrician badge.',
        priority: 'HIGH',
        status: 'PENDING_REVIEW',
        guardrailChecks: {
          preservesFactualTruth: true,
          requiresHumanApproval: true,
          touchesVerifiedLicense: true
        },
        createdAt: new Date().toISOString()
      });
    }

    // 3. SEO Engine: Check meta descriptions and titles
    for (const page of pages) {
      if (!page.metaDescription || page.metaDescription.length < 50) {
        recs.push({
          id: `rec_seo_meta_${page.slug}_${Date.now()}`,
          tenantId,
          projectId,
          category: 'SEO_IMPROVEMENT',
          targetPageSlug: page.slug,
          title: `Enhance Search Snippet for "${page.title}"`,
          rationale: `Meta description is under 50 characters, reducing search engine click-through rates.`,
          proposedAction: `Draft a 155-character descriptive snippet incorporating verified city "${context.headquarters.value.city}, MA" and core electrical services.`,
          priority: 'LOW',
          status: 'PENDING_REVIEW',
          guardrailChecks: {
            preservesFactualTruth: true,
            requiresHumanApproval: true,
            touchesVerifiedLicense: false
          },
          createdAt: new Date().toISOString()
        });
      }
    }

    // Save recommendations to database
    for (const rec of recs) {
      const insertStmt = db.prepare(`
        INSERT INTO website_recommendations (
          id, tenant_id, project_id, category, target_page_slug,
          title, rationale, proposed_action, proposed_content_delta,
          priority, status, guardrail_checks, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          title = excluded.title,
          rationale = excluded.rationale,
          proposed_action = excluded.proposed_action
      `);

      insertStmt.run(
        rec.id,
        rec.tenantId,
        rec.projectId,
        rec.category,
        rec.targetPageSlug || null,
        rec.title,
        rec.rationale,
        rec.proposedAction,
        rec.proposedContentDelta ? JSON.stringify(rec.proposedContentDelta) : null,
        rec.priority,
        rec.status,
        JSON.stringify(rec.guardrailChecks),
        rec.createdAt
      );
    }

    return this.getRecommendations(tenantId, projectId);
  }

  public getRecommendations(tenantId: string, projectId: string): PresenceAgentRecommendation[] {
    const db = getDatabase();
    const stmt = db.prepare(`SELECT * FROM website_recommendations WHERE tenant_id = ? AND project_id = ? ORDER BY created_at DESC`);
    const rows = (stmt.all(tenantId, projectId) || []) as any[];

    return rows.map(r => ({
      id: r.id,
      tenantId: r.tenant_id,
      projectId: r.project_id,
      category: r.category,
      targetPageSlug: r.target_page_slug || undefined,
      title: r.title,
      rationale: r.rationale,
      proposedAction: r.proposed_action,
      proposedContentDelta: r.proposed_content_delta ? JSON.parse(r.proposed_content_delta) : undefined,
      priority: r.priority,
      status: r.status,
      guardrailChecks: JSON.parse(r.guardrail_checks || '{}'),
      createdAt: r.created_at
    }));
  }

  public updateRecommendationStatus(
    recId: string,
    tenantId: string,
    status: 'APPROVED' | 'DISMISSED' | 'APPLIED'
  ): void {
    const db = getDatabase();
    const stmt = db.prepare(`UPDATE website_recommendations SET status = ? WHERE id = ? AND tenant_id = ?`);
    stmt.run(status, recId, tenantId);
  }
}

export const webPresenceAgentService = WebPresenceAgentService.getInstance();
