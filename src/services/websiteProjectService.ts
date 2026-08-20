import crypto from 'node:crypto';
import { getDatabase } from '../db/database';
import {
  BusinessWebsiteContext,
  WebsiteBrandProfile,
  WebsitePage,
  WebsiteProject,
  WebsiteProjectStatus,
  WebsiteVersion
} from '../types/websiteBuilder';
import { businessWebsiteContextService } from './businessWebsiteContextService';
import { websiteBrandProfileService } from './websiteBrandProfileService';
import { websiteClaimValidatorService } from './websiteClaimValidatorService';

export class WebsiteProjectService {
  private static instance: WebsiteProjectService;

  private constructor() {}

  public static getInstance(): WebsiteProjectService {
    if (!WebsiteProjectService.instance) {
      WebsiteProjectService.instance = new WebsiteProjectService();
    }
    return WebsiteProjectService.instance;
  }

  public getOrCreateProject(tenantId: string, siteName?: string): WebsiteProject {
    const db = getDatabase();
    const stmt = db.prepare(`SELECT * FROM website_projects WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 1`);
    const row = stmt.get(tenantId) as any;

    if (row) {
      return this.mapRowToProject(row);
    }

    const tenantStmt = db.prepare(`SELECT * FROM tenants WHERE id = ?`);
    const tenant = tenantStmt.get(tenantId) as any;

    const brand = websiteBrandProfileService.getOrCreateBrandProfile(tenantId);
    const context = businessWebsiteContextService.compileContext(tenantId);

    const projectId = `proj_web_${tenantId}`;
    const newProject: WebsiteProject = {
      id: projectId,
      tenantId,
      businessId: tenant?.id || tenantId,
      siteName: siteName || (tenant?.name ? `${tenant.name} Official Website` : 'Company Website'),
      siteType: 'LOCAL_SERVICE',
      status: 'DRAFT',
      currentVersionId: undefined,
      domain: undefined,
      deploymentProvider: 'STATIC_EXPORT',
      dataEnvironment: 'PILOT',
      brandProfileId: brand.id,
      businessContextId: context.id,
      approvalStatus: 'DRAFT',
      deploymentStatus: 'UNCONFIGURED',
      evidenceRefs: [],
      auditRefs: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const insertStmt = db.prepare(`
      INSERT INTO website_projects (
        id, tenant_id, business_id, site_name, site_type, status, current_version_id,
        domain, deployment_provider, data_environment, brand_profile_id, business_context_id,
        approval_status, deployment_status, evidence_refs, audit_refs, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertStmt.run(
      newProject.id,
      newProject.tenantId,
      newProject.businessId,
      newProject.siteName,
      newProject.siteType,
      newProject.status,
      newProject.currentVersionId || null,
      newProject.domain || null,
      newProject.deploymentProvider,
      newProject.dataEnvironment,
      newProject.brandProfileId,
      newProject.businessContextId,
      newProject.approvalStatus,
      newProject.deploymentStatus,
      JSON.stringify(newProject.evidenceRefs),
      JSON.stringify(newProject.auditRefs),
      newProject.createdAt,
      newProject.updatedAt
    );

    return newProject;
  }

  public getProject(projectId: string, tenantId: string): WebsiteProject {
    const db = getDatabase();
    const stmt = db.prepare(`SELECT * FROM website_projects WHERE id = ? AND tenant_id = ?`);
    const row = stmt.get(projectId, tenantId) as any;
    if (!row) {
      throw new Error(`Website project not found or tenant access unauthorized: ${projectId}`);
    }
    return this.mapRowToProject(row);
  }

  public getPages(projectId: string, tenantId: string): WebsitePage[] {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM website_pages
      WHERE project_id = ? AND tenant_id = ?
      ORDER BY nav_order ASC, created_at ASC
    `);
    const rows = (stmt.all(projectId, tenantId) || []) as any[];
    return rows.map(r => this.mapRowToPage(r));
  }

  public savePage(page: WebsitePage): WebsitePage {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO website_pages (
        id, project_id, tenant_id, slug, title, nav_order, is_published, is_index,
        meta_title, meta_description, canonical_url, page_type, components, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        slug = excluded.slug,
        title = excluded.title,
        nav_order = excluded.nav_order,
        is_published = excluded.is_published,
        is_index = excluded.is_index,
        meta_title = excluded.meta_title,
        meta_description = excluded.meta_description,
        canonical_url = excluded.canonical_url,
        page_type = excluded.page_type,
        components = excluded.components,
        updated_at = excluded.updated_at
    `);

    stmt.run(
      page.id,
      page.projectId,
      page.tenantId,
      page.slug,
      page.title,
      page.navOrder,
      page.isPublished ? 1 : 0,
      page.isIndex ? 1 : 0,
      page.metaTitle,
      page.metaDescription,
      page.canonicalUrl || null,
      page.pageType,
      JSON.stringify(page.components),
      page.createdAt,
      page.updatedAt
    );

    // Any edit to pages after approval transitions project back to REVIEW_REQUIRED
    this.invalidateApprovalIfModified(page.projectId, page.tenantId);

    return page;
  }

  public calculateCanonicalContentHash(
    pages: WebsitePage[],
    brand: WebsiteBrandProfile,
    context: BusinessWebsiteContext
  ): string {
    const canonicalPayload = {
      pages: pages
        .slice()
        .sort((a, b) => a.slug.localeCompare(b.slug))
        .map(p => ({
          slug: p.slug,
          title: p.title,
          metaTitle: p.metaTitle,
          metaDescription: p.metaDescription,
          isPublished: p.isPublished,
          components: p.components
        })),
      brand: {
        brandName: brand.brandName,
        colors: brand.colors,
        typography: brand.typography,
        ctaStyle: brand.ctaStyle
      },
      context: {
        businessName: context.businessName.value,
        phone: context.contactPhone.value,
        services: context.verifiedServices.value,
        credentials: context.credentials.value
      }
    };

    return crypto.createHash('sha256').update(JSON.stringify(canonicalPayload)).digest('hex');
  }

  public createVersionSnapshot(
    projectId: string,
    tenantId: string,
    creatorRole: string = 'OPERATOR',
    customVersionId?: string
  ): WebsiteVersion {
    const db = getDatabase();
    const project = this.getProject(projectId, tenantId);
    const pages = this.getPages(projectId, tenantId);
    const brand = websiteBrandProfileService.getOrCreateBrandProfile(tenantId);
    const context = businessWebsiteContextService.getContext(tenantId);

    if (pages.length === 0) {
      throw new Error(`Cannot create version snapshot for project with 0 pages.`);
    }

    const claimValidation = websiteClaimValidatorService.validateWebsiteContent(
      pages,
      context,
      brand.prohibitedClaims
    );

    const countStmt = db.prepare(`SELECT COUNT(*) as cnt FROM website_versions WHERE project_id = ?`);
    const countRow = countStmt.get(projectId) as any;
    const versionNumber = (countRow?.cnt || 0) + 1;

    const contentHash = this.calculateCanonicalContentHash(pages, brand, context);
    const versionId = customVersionId || `ver_${projectId}_v${versionNumber}`;

    const version: WebsiteVersion = {
      id: versionId,
      projectId,
      tenantId,
      versionNumber,
      contentHash,
      pagesSnapshot: pages,
      brandSnapshot: brand,
      contextSnapshot: context,
      claimsAnalysis: claimValidation.claims,
      approvalStatus: 'REVIEW_REQUIRED',
      deploymentStatus: 'UNCONFIGURED',
      createdAt: new Date().toISOString()
    };

    const insertStmt = db.prepare(`
      INSERT INTO website_versions (
        id, project_id, tenant_id, version_number, content_hash,
        pages_snapshot, brand_snapshot, context_snapshot, claims_analysis,
        approval_status, deployment_status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertStmt.run(
      version.id,
      version.projectId,
      version.tenantId,
      version.versionNumber,
      version.contentHash,
      JSON.stringify(version.pagesSnapshot),
      JSON.stringify(version.brandSnapshot),
      JSON.stringify(version.contextSnapshot),
      JSON.stringify(version.claimsAnalysis || []),
      version.approvalStatus,
      version.deploymentStatus,
      version.createdAt
    );

    // Update project state
    const updateProjStmt = db.prepare(`
      UPDATE website_projects
      SET status = 'REVIEW_REQUIRED',
          approval_status = 'REVIEW_REQUIRED',
          current_version_id = ?,
          updated_at = ?
      WHERE id = ? AND tenant_id = ?
    `);
    updateProjStmt.run(version.id, new Date().toISOString(), projectId, tenantId);

    return version;
  }

  public approveVersion(
    projectId: string,
    versionId: string,
    tenantId: string,
    approverId: string,
    approverRole: string
  ): WebsiteVersion {
    const db = getDatabase();
    const versionStmt = db.prepare(`SELECT * FROM website_versions WHERE id = ? AND project_id = ? AND tenant_id = ?`);
    const versionRow = versionStmt.get(versionId, projectId, tenantId) as any;

    if (!versionRow) {
      throw new Error(`Version ${versionId} not found for project ${projectId}`);
    }

    // Gating Rule 1: Segregation of Duties — Proposer/AI Agent cannot approve
    if (approverRole.toUpperCase().includes('AI_AGENT') || approverRole.toUpperCase().includes('AUTOMATED') || approverId.startsWith('agent_')) {
      throw new Error(`Segregation of Duties Violation: AI Agent (${approverId}) cannot approve website publication. Authorized human operator or business owner required.`);
    }

    // Gating Rule 2: Claim Validation Check
    const claimsAnalysis = JSON.parse(versionRow.claims_analysis || '[]');
    const hasProhibited = claimsAnalysis.some((c: any) => c.status === 'PROHIBITED' || c.status === 'CONTRADICTED');
    if (hasProhibited) {
      throw new Error(`Cannot approve website with CONTRADICTED or PROHIBITED factual claims. Resolve claims before human sign-off.`);
    }

    // Gating Rule 3: Content Hash Tamper Verification
    const currentPages = this.getPages(projectId, tenantId);
    const currentBrand = websiteBrandProfileService.getOrCreateBrandProfile(tenantId);
    const currentContext = businessWebsiteContextService.getContext(tenantId);
    const liveHash = this.calculateCanonicalContentHash(currentPages, currentBrand, currentContext);

    if (liveHash !== versionRow.content_hash) {
      throw new Error(`Approval Tamper Error: Content was modified after version snapshot was created. Stored hash: ${versionRow.content_hash}, Current hash: ${liveHash}. Create a new version snapshot before approving.`);
    }

    const now = new Date().toISOString();
    const updateVerStmt = db.prepare(`
      UPDATE website_versions
      SET approval_status = 'APPROVED',
          approved_by = ?,
          approver_role = ?,
          approved_at = ?
      WHERE id = ?
    `);
    updateVerStmt.run(approverId, approverRole, now, versionId);

    const updateProjStmt = db.prepare(`
      UPDATE website_projects
      SET status = 'APPROVED',
          approval_status = 'APPROVED',
          current_version_id = ?,
          updated_at = ?
      WHERE id = ?
    `);
    updateProjStmt.run(versionId, now, projectId);

    const updatedVersion = this.getVersion(versionId, projectId, tenantId);
    return updatedVersion;
  }

  public getVersion(versionId: string, projectId: string, tenantId: string): WebsiteVersion {
    const db = getDatabase();
    const stmt = db.prepare(`SELECT * FROM website_versions WHERE id = ? AND project_id = ? AND tenant_id = ?`);
    const row = stmt.get(versionId, projectId, tenantId) as any;
    if (!row) {
      throw new Error(`Version ${versionId} not found.`);
    }
    return this.mapRowToVersion(row);
  }

  public getVersions(projectId: string, tenantId: string): WebsiteVersion[] {
    const db = getDatabase();
    const stmt = db.prepare(`SELECT * FROM website_versions WHERE project_id = ? AND tenant_id = ? ORDER BY version_number DESC`);
    const rows = (stmt.all(projectId, tenantId) || []) as any[];
    return rows.map(r => this.mapRowToVersion(r));
  }

  public rollbackToVersion(
    projectId: string,
    targetVersionId: string,
    tenantId: string,
    operatorId: string
  ): WebsiteVersion {
    const targetVersion = this.getVersion(targetVersionId, projectId, tenantId);
    const db = getDatabase();

    // Rollback creates a new version referencing the target snapshot rather than erasing history
    const countStmt = db.prepare(`SELECT COUNT(*) as cnt FROM website_versions WHERE project_id = ?`);
    const countRow = countStmt.get(projectId) as any;
    const nextVersionNum = (countRow?.cnt || 0) + 1;

    const rollbackVersionId = `ver_${projectId}_v${nextVersionNum}_rollback`;

    const newVersion: WebsiteVersion = {
      id: rollbackVersionId,
      projectId,
      tenantId,
      versionNumber: nextVersionNum,
      contentHash: targetVersion.contentHash,
      pagesSnapshot: targetVersion.pagesSnapshot,
      brandSnapshot: targetVersion.brandSnapshot,
      contextSnapshot: targetVersion.contextSnapshot,
      claimsAnalysis: targetVersion.claimsAnalysis,
      approvedBy: operatorId,
      approverRole: 'OPERATOR_ROLLBACK',
      approvedAt: new Date().toISOString(),
      approvalStatus: 'APPROVED',
      deploymentStatus: 'PENDING',
      previousVersionId: targetVersionId,
      createdAt: new Date().toISOString()
    };

    const insertStmt = db.prepare(`
      INSERT INTO website_versions (
        id, project_id, tenant_id, version_number, content_hash,
        pages_snapshot, brand_snapshot, context_snapshot, claims_analysis,
        approved_by, approver_role, approved_at, approval_status,
        deployment_status, previous_version_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertStmt.run(
      newVersion.id,
      newVersion.projectId,
      newVersion.tenantId,
      newVersion.versionNumber,
      newVersion.contentHash,
      JSON.stringify(newVersion.pagesSnapshot),
      JSON.stringify(newVersion.brandSnapshot),
      JSON.stringify(newVersion.contextSnapshot),
      JSON.stringify(newVersion.claimsAnalysis || []),
      newVersion.approvedBy,
      newVersion.approverRole,
      newVersion.approvedAt,
      newVersion.approvalStatus,
      newVersion.deploymentStatus,
      newVersion.previousVersionId,
      newVersion.createdAt
    );

    // Overwrite current working pages to match rollback snapshot
    for (const page of targetVersion.pagesSnapshot) {
      this.savePage({
        ...page,
        updatedAt: new Date().toISOString()
      });
    }

    const updateProjStmt = db.prepare(`
      UPDATE website_projects
      SET status = 'APPROVED',
          approval_status = 'APPROVED',
          current_version_id = ?,
          updated_at = ?
      WHERE id = ?
    `);
    updateProjStmt.run(rollbackVersionId, new Date().toISOString(), projectId);

    return newVersion;
  }

  private invalidateApprovalIfModified(projectId: string, tenantId: string): void {
    const db = getDatabase();
    const projStmt = db.prepare(`SELECT * FROM website_projects WHERE id = ? AND tenant_id = ?`);
    const proj = projStmt.get(projectId, tenantId) as any;
    if (proj && proj.approval_status === 'APPROVED') {
      const updateStmt = db.prepare(`
        UPDATE website_projects
        SET status = 'REVIEW_REQUIRED',
            approval_status = 'REVIEW_REQUIRED',
            updated_at = ?
        WHERE id = ?
      `);
      updateStmt.run(new Date().toISOString(), projectId);
    }
  }

  private mapRowToProject(row: any): WebsiteProject {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      businessId: row.business_id,
      siteName: row.site_name,
      siteType: row.site_type,
      status: row.status,
      currentVersionId: row.current_version_id || undefined,
      domain: row.domain || undefined,
      deploymentProvider: row.deployment_provider,
      dataEnvironment: row.data_environment,
      brandProfileId: row.brand_profile_id,
      businessContextId: row.business_context_id,
      approvalStatus: row.approval_status,
      deploymentStatus: row.deployment_status,
      evidenceRefs: JSON.parse(row.evidence_refs || '[]'),
      auditRefs: JSON.parse(row.audit_refs || '[]'),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapRowToPage(row: any): WebsitePage {
    return {
      id: row.id,
      projectId: row.project_id,
      tenantId: row.tenant_id,
      slug: row.slug,
      title: row.title,
      navOrder: row.nav_order,
      isPublished: row.is_published === 1,
      isIndex: row.is_index === 1,
      metaTitle: row.meta_title,
      metaDescription: row.meta_description,
      canonicalUrl: row.canonical_url || undefined,
      pageType: row.page_type,
      components: JSON.parse(row.components || '[]'),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapRowToVersion(row: any): WebsiteVersion {
    return {
      id: row.id,
      projectId: row.project_id,
      tenantId: row.tenant_id,
      versionNumber: row.version_number,
      contentHash: row.content_hash,
      pagesSnapshot: JSON.parse(row.pages_snapshot || '[]'),
      brandSnapshot: JSON.parse(row.brand_snapshot || '{}'),
      contextSnapshot: JSON.parse(row.context_snapshot || '{}'),
      claimsAnalysis: JSON.parse(row.claims_analysis || '[]'),
      approvedBy: row.approved_by || undefined,
      approverRole: row.approver_role || undefined,
      approvedAt: row.approved_at || undefined,
      approvalStatus: row.approval_status,
      deploymentStatus: row.deployment_status,
      deploymentProvider: row.deployment_provider || undefined,
      deploymentResult: row.deployment_result ? JSON.parse(row.deployment_result) : undefined,
      previousVersionId: row.previous_version_id || undefined,
      createdAt: row.created_at
    };
  }
}

export const websiteProjectService = WebsiteProjectService.getInstance();
