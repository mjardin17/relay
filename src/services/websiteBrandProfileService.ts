import { getDatabase } from '../db/database';
import { WebsiteBrandProfile } from '../types/websiteBuilder';

export class WebsiteBrandProfileService {
  private static instance: WebsiteBrandProfileService;

  private constructor() {}

  public static getInstance(): WebsiteBrandProfileService {
    if (!WebsiteBrandProfileService.instance) {
      WebsiteBrandProfileService.instance = new WebsiteBrandProfileService();
    }
    return WebsiteBrandProfileService.instance;
  }

  public getOrCreateBrandProfile(tenantId: string): WebsiteBrandProfile {
    const db = getDatabase();
    const stmt = db.prepare(`SELECT * FROM website_brand_profiles WHERE tenant_id = ?`);
    const row = stmt.get(tenantId) as any;

    if (row) {
      return this.mapRowToBrandProfile(row);
    }

    // Initialize default tenant brand profile based on tenant attributes
    const tenantStmt = db.prepare(`SELECT * FROM tenants WHERE id = ?`);
    const tenant = tenantStmt.get(tenantId) as any;
    const brandName = tenant?.name || 'Local Service Professional';

    const isElectricalTenant = tenant?.industry?.toLowerCase().includes('electric') || tenant?.name.toLowerCase().includes('electric');
    const isSoftwareStudio = tenant?.industry?.toLowerCase().includes('software') ||
      tenant?.industry?.toLowerCase().includes('ai') ||
      tenant?.industry?.toLowerCase().includes('studio') ||
      tenantId.includes('outpost') ||
      (tenant?.name && tenant.name.toLowerCase().includes('outpost'));

    let typography = {
      headingFont: 'Plus Jakarta Sans',
      bodyFont: 'Inter',
      displayScale: 'BALANCED' as 'COMPACT' | 'BALANCED' | 'PROMINENT'
    };

    let colors = {
      primary: '#0F172A',     // Slate 900
      secondary: '#D97706',   // Amber 600
      accent: '#2563EB',      // Blue 600
      background: '#F8FAFC',  // Slate 50
      surface: '#FFFFFF',     // Pure White
      text: '#0F172A',        // High Contrast Slate
      muted: '#64748B'        // Slate 500
    };

    let imageryStyle: 'AUTHENTIC_FIELD' | 'CLEAN_TECHNICAL' | 'MODERN_MINIMAL' | 'CORPORATE_PROFESSIONAL' = 'AUTHENTIC_FIELD';
    let writingTone: 'DIRECT_PROFESSIONAL' | 'AUTHORITATIVE_LICENSED' | 'FRIENDLY_LOCAL' | 'ENTERPRISE' = 'AUTHORITATIVE_LICENSED';
    let ctaStyle = {
      primaryLabel: 'Request a Quote',
      secondaryLabel: 'Call (508) 999-1234',
      shape: 'ROUNDED' as 'SQUARE' | 'ROUNDED' | 'PILL'
    };

    let approvedTerminology = [
      'Master Electrician',
      'Massachusetts Electrical Code',
      '527 CMR 12.00',
      'Licensed & Insured',
      'Code-Compliant',
      'Service Upgrades',
      'Dedicated Circuit'
    ];

    let prohibitedClaims = [
      'cheapest in Massachusetts',
      'free electrical work forever',
      '100% lifetime warranty without inspection',
      'unlicensed repairs allowed'
    ];

    let disclaimers = [
      'All work performed in compliance with Massachusetts electrical licensing laws and national fire codes.'
    ];

    if (isSoftwareStudio) {
      typography = {
        headingFont: 'Plus Jakarta Sans',
        bodyFont: 'Inter',
        displayScale: 'PROMINENT'
      };
      colors = {
        primary: '#F8FAFC',     // Slate 50
        secondary: '#94A3B8',   // Slate 400
        accent: '#38BDF8',      // Sky 400
        background: '#0B0F17',  // Deep Slate / Obsidian
        surface: '#111827',     // Slate 900 / Card Surface
        text: '#F1F5F9',        // High Contrast Off-White
        muted: '#64748B'        // Slate 500
      };
      imageryStyle = 'CLEAN_TECHNICAL';
      writingTone = 'DIRECT_PROFESSIONAL';
      ctaStyle = {
        primaryLabel: 'Explore Projects',
        secondaryLabel: 'View Products',
        shape: 'ROUNDED'
      };
      approvedTerminology = [
        'Practical AI Systems',
        'Software Products',
        'Business Infrastructure',
        'Deterministic Execution',
        'Proof of Work',
        'Segregation of Duties',
        'Closed-Loop Governance',
        'Evidence Graph',
        'Ground-Truth Verification'
      ];
      prohibitedClaims = [
        'unverified customer counts',
        'guaranteed 100x return without proof',
        'cheapest software studio in the world',
        'unverified enterprise partnerships',
        '100% bug-free guarantee'
      ];
      disclaimers = [
        'Product capabilities, test benchmarks, and architectural claims are verified against Relay ground-truth test suites.'
      ];
    } else if (tenant?.industry?.toLowerCase().includes('hvac')) {
      colors = {
        primary: '#0F172A',
        secondary: '#0284C7',
        accent: '#0369A1',
        background: '#F8FAFC',
        surface: '#FFFFFF',
        text: '#0F172A',
        muted: '#64748B'
      };
      ctaStyle = {
        primaryLabel: 'Schedule HVAC Service',
        secondaryLabel: 'Call (860) 555-0199',
        shape: 'ROUNDED'
      };
      approvedTerminology = ['Licensed HVAC Contractor', 'Heat Pump Specialist', 'EPA Certified'];
      prohibitedClaims = ['free HVAC forever', 'cheapest cooling guaranteed'];
      disclaimers = ['All heating and cooling work performed by licensed technicians.'];
    }

    const defaultProfile: WebsiteBrandProfile = {
      id: `brand_${tenantId}`,
      tenantId,
      brandName,
      logoUrl: undefined,
      alternateLogoUrl: undefined,
      faviconUrl: undefined,
      typography,
      colors,
      imageryStyle,
      writingTone,
      ctaStyle,
      approvedTerminology,
      prohibitedClaims,
      disclaimers,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.saveBrandProfile(defaultProfile);
    return defaultProfile;
  }

  public saveBrandProfile(profile: WebsiteBrandProfile): WebsiteBrandProfile {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO website_brand_profiles (
        id, tenant_id, brand_name, logo_url, alternate_logo_url, favicon_url,
        typography, colors, imagery_style, writing_tone, cta_style,
        approved_terminology, prohibited_claims, disclaimers, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        brand_name = excluded.brand_name,
        logo_url = excluded.logo_url,
        alternate_logo_url = excluded.alternate_logo_url,
        favicon_url = excluded.favicon_url,
        typography = excluded.typography,
        colors = excluded.colors,
        imagery_style = excluded.imagery_style,
        writing_tone = excluded.writing_tone,
        cta_style = excluded.cta_style,
        approved_terminology = excluded.approved_terminology,
        prohibited_claims = excluded.prohibited_claims,
        disclaimers = excluded.disclaimers,
        updated_at = excluded.updated_at
    `);

    stmt.run(
      profile.id,
      profile.tenantId,
      profile.brandName,
      profile.logoUrl || null,
      profile.alternateLogoUrl || null,
      profile.faviconUrl || null,
      JSON.stringify(profile.typography),
      JSON.stringify(profile.colors),
      profile.imageryStyle,
      profile.writingTone,
      JSON.stringify(profile.ctaStyle),
      JSON.stringify(profile.approvedTerminology),
      JSON.stringify(profile.prohibitedClaims),
      JSON.stringify(profile.disclaimers),
      profile.createdAt,
      profile.updatedAt
    );

    return profile;
  }

  public updateBrandProfile(tenantId: string, updates: Partial<WebsiteBrandProfile>): WebsiteBrandProfile {
    const existing = this.getOrCreateBrandProfile(tenantId);
    // Strict multi-tenant verification
    if (existing.tenantId !== tenantId) {
      throw new Error(`Unauthorized cross-tenant brand profile update attempt.`);
    }

    const updated: WebsiteBrandProfile = {
      ...existing,
      ...updates,
      tenantId, // Immutable
      id: existing.id,
      updatedAt: new Date().toISOString()
    };

    return this.saveBrandProfile(updated);
  }

  private mapRowToBrandProfile(row: any): WebsiteBrandProfile {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      brandName: row.brand_name,
      logoUrl: row.logo_url || undefined,
      alternateLogoUrl: row.alternate_logo_url || undefined,
      faviconUrl: row.favicon_url || undefined,
      typography: JSON.parse(row.typography || '{}'),
      colors: JSON.parse(row.colors || '{}'),
      imageryStyle: row.imagery_style,
      writingTone: row.writing_tone,
      ctaStyle: JSON.parse(row.cta_style || '{}'),
      approvedTerminology: JSON.parse(row.approved_terminology || '[]'),
      prohibitedClaims: JSON.parse(row.prohibited_claims || '[]'),
      disclaimers: JSON.parse(row.disclaimers || '[]'),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}

export const websiteBrandProfileService = WebsiteBrandProfileService.getInstance();
