import { getDatabase } from '../db/database';
import { WebsiteReconciliationFinding, WebsiteReconciliationReport } from '../types/websiteBuilder';
import { websiteProjectService } from './websiteProjectService';
import { websiteBrandProfileService } from './websiteBrandProfileService';
import { businessWebsiteContextService } from './businessWebsiteContextService';

export class WebsiteReconciliationService {
  private static instance: WebsiteReconciliationService;

  private constructor() {}

  public static getInstance(): WebsiteReconciliationService {
    if (!WebsiteReconciliationService.instance) {
      WebsiteReconciliationService.instance = new WebsiteReconciliationService();
    }
    return WebsiteReconciliationService.instance;
  }

  public runReconciliation(tenantId: string, projectId: string): WebsiteReconciliationReport {
    const findings: WebsiteReconciliationFinding[] = [];
    const db = getDatabase();
    let checksRun = 0;

    // Check 1: Form submissions without routed leads
    checksRun++;
    const orphanSubsStmt = db.prepare(`
      SELECT submission_id, submitted_at, form_type
      FROM website_form_submissions
      WHERE tenant_id = ? AND project_id = ? AND (routed_lead_id IS NULL OR routed_lead_id = '')
    `);
    const orphanSubs = (orphanSubsStmt.all(tenantId, projectId) || []) as any[];
    for (const sub of orphanSubs) {
      findings.push({
        code: 'ORPHAN_FORM_SUBMISSION',
        severity: 'CRITICAL',
        title: 'Form Submission Without Routed Lead',
        description: `Submission ${sub.submission_id} (${sub.form_type}) at ${sub.submitted_at} failed to route to production lead pipeline.`,
        entityId: sub.submission_id,
        recommendation: 'Re-ingest form submission into pilot lead queue.'
      });
    }

    // Check 2: Unapproved deployments or draft versions marked as deployed
    checksRun++;
    const project = websiteProjectService.getProject(projectId, tenantId);
    if (project.status === 'DEPLOYED' && project.currentVersionId) {
      const ver = websiteProjectService.getVersion(project.currentVersionId, projectId, tenantId);
      if (ver.approvalStatus !== 'APPROVED') {
        findings.push({
          code: 'UNAPPROVED_DEPLOYED_VERSION',
          severity: 'CRITICAL',
          title: 'Deployed Version Lacks Human Approval',
          description: `Version ${ver.id} is active on production deployment but approvalStatus is "${ver.approvalStatus}".`,
          entityId: ver.id,
          recommendation: 'Immediately suspend deployment or complete human approval.'
        });
      }

      // Check 3: Content Hash Mismatch / Post-Approval Tamper
      checksRun++;
      const currentPages = websiteProjectService.getPages(projectId, tenantId);
      const currentBrand = websiteBrandProfileService.getOrCreateBrandProfile(tenantId);
      const currentContext = businessWebsiteContextService.getContext(tenantId);
      const liveHash = websiteProjectService.calculateCanonicalContentHash(currentPages, currentBrand, currentContext);

      if (liveHash !== ver.contentHash) {
        findings.push({
          code: 'APPROVAL_HASH_DRIFT',
          severity: 'CRITICAL',
          title: 'Post-Approval Content Tamper Detected',
          description: `Live working pages have drifted from approved version hash (${ver.contentHash.substring(0, 8)} vs ${liveHash.substring(0, 8)}).`,
          entityId: ver.id,
          recommendation: 'Create a new version snapshot and require human re-approval.'
        });
      }
    }

    // Check 4: Domain DNS Mismatches
    checksRun++;
    const domStmt = db.prepare(`SELECT * FROM website_domains WHERE project_id = ? AND tenant_id = ?`);
    const domainRow = domStmt.get(projectId, tenantId) as any;
    if (domainRow && domainRow.status === 'FAILED') {
      findings.push({
        code: 'DOMAIN_DNS_MISCONFIGURED',
        severity: 'WARNING',
        title: 'Custom Domain DNS Verification Failed',
        description: `Domain ${domainRow.requested_domain} failed DNS verification challenge.`,
        entityId: domainRow.id,
        recommendation: 'Update DNS CNAME/A records with registrar.'
      });
    }

    // Check 5: Cross-Tenant Page Isolation
    checksRun++;
    const crossPageStmt = db.prepare(`SELECT id, slug, tenant_id FROM website_pages WHERE project_id = ? AND tenant_id != ?`);
    const crossPages = (crossPageStmt.all(projectId, tenantId) || []) as any[];
    if (crossPages.length > 0) {
      findings.push({
        code: 'CROSS_TENANT_LEAKAGE',
        severity: 'CRITICAL',
        title: 'Cross-Tenant Page Record Detected',
        description: `Found ${crossPages.length} pages belonging to foreign tenant inside project ${projectId}.`,
        entityId: crossPages[0].id,
        recommendation: 'Immediately quarantine foreign pages and re-index project.'
      });
    }

    const overallStatus: 'PASS' | 'WARNING' | 'FAIL' =
      findings.some(f => f.severity === 'CRITICAL') ? 'FAIL' :
      findings.some(f => f.severity === 'WARNING') ? 'WARNING' : 'PASS';

    return {
      tenantId,
      projectId,
      evaluatedAt: new Date().toISOString(),
      overallStatus,
      findings,
      checksRun
    };
  }
}

export const websiteReconciliationService = WebsiteReconciliationService.getInstance();
