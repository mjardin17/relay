import { getDatabase } from '../db/database';
import { DomainVerificationStatus, WebsiteDomain } from '../types/websiteBuilder';

export class WebsiteDomainService {
  private static instance: WebsiteDomainService;

  private constructor() {}

  public static getInstance(): WebsiteDomainService {
    if (!WebsiteDomainService.instance) {
      WebsiteDomainService.instance = new WebsiteDomainService();
    }
    return WebsiteDomainService.instance;
  }

  public registerDomainRequest(
    projectId: string,
    tenantId: string,
    requestedDomain: string
  ): WebsiteDomain {
    const cleanDomain = requestedDomain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    const db = getDatabase();

    const domainId = `dom_${projectId}_${cleanDomain.replace(/[^a-z0-9]/g, '_')}`;

    const dnsRecords = [
      {
        type: 'A' as const,
        name: '@',
        value: '76.76.21.21',
        ttl: 3600,
        status: 'PENDING' as const
      },
      {
        type: 'CNAME' as const,
        name: 'www',
        value: `${tenantId}.relayplatform.net`,
        ttl: 3600,
        status: 'PENDING' as const
      },
      {
        type: 'TXT' as const,
        name: '_relay-challenge',
        value: `relay-site-verification=${projectId}-${tenantId}`,
        ttl: 300,
        status: 'PENDING' as const
      }
    ];

    const domain: WebsiteDomain = {
      id: domainId,
      projectId,
      tenantId,
      requestedDomain: cleanDomain,
      registeredDomain: cleanDomain,
      status: 'PENDING_DNS',
      dnsRecords,
      sslStatus: 'PENDING',
      ownershipVerified: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const stmt = db.prepare(`
      INSERT INTO website_domains (
        id, project_id, tenant_id, requested_domain, registered_domain,
        status, dns_records, ssl_status, ownership_verified, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        status = excluded.status,
        dns_records = excluded.dns_records,
        ssl_status = excluded.ssl_status,
        updated_at = excluded.updated_at
    `);

    stmt.run(
      domain.id,
      domain.projectId,
      domain.tenantId,
      domain.requestedDomain,
      domain.registeredDomain || null,
      domain.status,
      JSON.stringify(domain.dnsRecords),
      domain.sslStatus,
      domain.ownershipVerified ? 1 : 0,
      domain.createdAt,
      domain.updatedAt
    );

    return domain;
  }

  public verifyDomainDNS(domainId: string, tenantId: string, simulateDnsMatch: boolean = true): WebsiteDomain {
    const db = getDatabase();
    const stmt = db.prepare(`SELECT * FROM website_domains WHERE id = ? AND tenant_id = ?`);
    const row = stmt.get(domainId, tenantId) as any;

    if (!row) {
      throw new Error(`Domain record not found or access denied: ${domainId}`);
    }

    const domain = this.mapRowToDomain(row);

    if (simulateDnsMatch) {
      domain.dnsRecords = domain.dnsRecords.map(r => ({ ...r, status: 'VERIFIED' }));
      domain.status = 'ACTIVE';
      domain.sslStatus = 'ACTIVE';
      domain.ownershipVerified = true;
      domain.verifiedAt = new Date().toISOString();
      domain.updatedAt = new Date().toISOString();
    } else {
      domain.dnsRecords = domain.dnsRecords.map(r => ({ ...r, status: 'MISCONFIGURED' }));
      domain.status = 'FAILED';
      domain.sslStatus = 'NOT_PROVISIONED';
      domain.ownershipVerified = false;
      domain.updatedAt = new Date().toISOString();
    }

    const updateStmt = db.prepare(`
      UPDATE website_domains
      SET status = ?,
          dns_records = ?,
          ssl_status = ?,
          ownership_verified = ?,
          verified_at = ?,
          updated_at = ?
      WHERE id = ?
    `);

    updateStmt.run(
      domain.status,
      JSON.stringify(domain.dnsRecords),
      domain.sslStatus,
      domain.ownershipVerified ? 1 : 0,
      domain.verifiedAt || null,
      domain.updatedAt,
      domainId
    );

    // If active, associate domain with website_projects
    if (domain.status === 'ACTIVE') {
      const updateProj = db.prepare(`UPDATE website_projects SET domain = ?, updated_at = ? WHERE id = ?`);
      updateProj.run(`https://${domain.requestedDomain}`, new Date().toISOString(), domain.projectId);
    }

    return domain;
  }

  public getDomain(projectId: string, tenantId: string): WebsiteDomain | null {
    const db = getDatabase();
    const stmt = db.prepare(`SELECT * FROM website_domains WHERE project_id = ? AND tenant_id = ? ORDER BY created_at DESC LIMIT 1`);
    const row = stmt.get(projectId, tenantId) as any;
    return row ? this.mapRowToDomain(row) : null;
  }

  private mapRowToDomain(row: any): WebsiteDomain {
    return {
      id: row.id,
      projectId: row.project_id,
      tenantId: row.tenant_id,
      requestedDomain: row.requested_domain,
      registeredDomain: row.registered_domain || undefined,
      status: row.status as DomainVerificationStatus,
      dnsRecords: JSON.parse(row.dns_records || '[]'),
      sslStatus: row.ssl_status,
      ownershipVerified: row.ownership_verified === 1,
      verifiedAt: row.verified_at || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}

export const websiteDomainService = WebsiteDomainService.getInstance();
