import {
  BusinessWebsiteContext,
  CompiledSite,
  DeploymentResult,
  PresenceAgentRecommendation,
  WebsiteAnalyticsEvent,
  WebsiteBrandProfile,
  WebsiteConversionFunnel,
  WebsiteDomain,
  WebsitePage,
  WebsiteProject,
  WebsiteReconciliationReport,
  WebsiteROIMetrics,
  WebsiteVersion
} from '../types/websiteBuilder';

export const websiteBuilderClient = {
  async getProject(tenantId: string = 'tenant_ma_fresh_launch'): Promise<WebsiteProject> {
    const res = await fetch(`/api/website-builder/projects?tenantId=${encodeURIComponent(tenantId)}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to fetch website project');
    return data.project;
  },

  async getPages(tenantId: string = 'tenant_ma_fresh_launch', projectId?: string): Promise<WebsitePage[]> {
    const pId = projectId || `proj_web_${tenantId}`;
    const res = await fetch(`/api/website-builder/pages?tenantId=${encodeURIComponent(tenantId)}&projectId=${encodeURIComponent(pId)}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to fetch website pages');
    return data.pages;
  },

  async savePage(page: WebsitePage): Promise<WebsitePage> {
    const res = await fetch('/api/website-builder/pages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(page)
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to save page');
    return data.page;
  },

  async getBrandProfile(tenantId: string = 'tenant_ma_fresh_launch'): Promise<WebsiteBrandProfile> {
    const res = await fetch(`/api/website-builder/brand-profile?tenantId=${encodeURIComponent(tenantId)}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to fetch brand profile');
    return data.brand;
  },

  async updateBrandProfile(tenantId: string, updates: Partial<WebsiteBrandProfile>): Promise<WebsiteBrandProfile> {
    const res = await fetch('/api/website-builder/brand-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId, updates })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to update brand profile');
    return data.brand;
  },

  async getBusinessContext(tenantId: string = 'tenant_ma_fresh_launch'): Promise<BusinessWebsiteContext> {
    const res = await fetch(`/api/website-builder/business-context?tenantId=${encodeURIComponent(tenantId)}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to fetch business context');
    return data.context;
  },

  async validateClaims(tenantId: string = 'tenant_ma_fresh_launch', projectId?: string): Promise<any> {
    const res = await fetch('/api/website-builder/validate-claims', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId, projectId })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to validate claims');
    return data.validation;
  },

  async createVersion(tenantId: string, projectId: string, creatorRole: string = 'OPERATOR'): Promise<WebsiteVersion> {
    const res = await fetch('/api/website-builder/versions/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId, projectId, creatorRole })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to create version snapshot');
    return data.version;
  },

  async approveVersion(
    tenantId: string,
    projectId: string,
    versionId: string,
    approverId: string = 'operator_shad_reis',
    approverRole: string = 'HUMAN_OWNER'
  ): Promise<WebsiteVersion> {
    const res = await fetch('/api/website-builder/versions/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId, projectId, versionId, approverId, approverRole })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Approval failed');
    return data.version;
  },

  async rollbackVersion(
    tenantId: string,
    projectId: string,
    targetVersionId: string,
    operatorId: string = 'operator_shad_reis'
  ): Promise<WebsiteVersion> {
    const res = await fetch('/api/website-builder/versions/rollback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId, projectId, targetVersionId, operatorId })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Rollback failed');
    return data.version;
  },

  async deploy(
    tenantId: string,
    projectId: string,
    versionId: string,
    provider: string = 'STATIC_EXPORT'
  ): Promise<DeploymentResult> {
    const res = await fetch('/api/website-builder/deploy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId, projectId, versionId, provider })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Deployment failed');
    return data.result;
  },

  async registerDomain(tenantId: string, projectId: string, domain: string): Promise<WebsiteDomain> {
    const res = await fetch('/api/website-builder/domains/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId, projectId, domain })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to register domain');
    return data.domain;
  },

  async verifyDomain(tenantId: string, domainId: string, simulateSuccess: boolean = true): Promise<WebsiteDomain> {
    const res = await fetch('/api/website-builder/domains/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId, domainId, simulateSuccess })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to verify domain');
    return data.domain;
  },

  async getFunnel(tenantId: string, projectId?: string): Promise<WebsiteConversionFunnel> {
    const pId = projectId ? `&projectId=${encodeURIComponent(projectId)}` : '';
    const res = await fetch(`/api/website-builder/analytics/funnel?tenantId=${encodeURIComponent(tenantId)}${pId}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to fetch conversion funnel');
    return data.funnel;
  },

  async getRoi(tenantId: string, projectId?: string): Promise<WebsiteROIMetrics> {
    const pId = projectId ? `&projectId=${encodeURIComponent(projectId)}` : '';
    const res = await fetch(`/api/website-builder/analytics/roi?tenantId=${encodeURIComponent(tenantId)}${pId}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to fetch ROI metrics');
    return data.roi;
  },

  async getReconciliation(tenantId: string, projectId?: string): Promise<WebsiteReconciliationReport> {
    const pId = projectId ? `&projectId=${encodeURIComponent(projectId)}` : '';
    const res = await fetch(`/api/website-builder/reconciliation?tenantId=${encodeURIComponent(tenantId)}${pId}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to fetch reconciliation report');
    return data.report;
  },

  async getRecommendations(tenantId: string, projectId?: string): Promise<PresenceAgentRecommendation[]> {
    const pId = projectId ? `&projectId=${encodeURIComponent(projectId)}` : '';
    const res = await fetch(`/api/website-builder/presence-agent/recommendations?tenantId=${encodeURIComponent(tenantId)}${pId}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to fetch recommendations');
    return data.recommendations;
  },

  async seedReisElectric(tenantId: string = 'tenant_ma_fresh_launch'): Promise<any> {
    const res = await fetch('/api/website-builder/seed/reis-electric', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to seed Reis Electric site');
    return data.result;
  },

  async seedSecondTenant(tenantId: string = 'tenant_apex_climate_hvac'): Promise<any> {
    const res = await fetch('/api/website-builder/seed/second-tenant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to seed second tenant site');
    return data.result;
  }
};
