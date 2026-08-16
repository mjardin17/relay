import { getDatabase } from '../db/database';
import { WebsitePage, WebsiteProject } from '../types/websiteBuilder';
import { websiteProjectService } from './websiteProjectService';
import { businessWebsiteContextService } from './businessWebsiteContextService';
import { websiteBrandProfileService } from './websiteBrandProfileService';
import { locationIntelligenceService } from './locationIntelligenceService';

export class SyntheticSecondTenantWebsiteService {
  private static instance: SyntheticSecondTenantWebsiteService;

  private constructor() {}

  public static getInstance(): SyntheticSecondTenantWebsiteService {
    if (!SyntheticSecondTenantWebsiteService.instance) {
      SyntheticSecondTenantWebsiteService.instance = new SyntheticSecondTenantWebsiteService();
    }
    return SyntheticSecondTenantWebsiteService.instance;
  }

  public initializeSecondTenant(tenantId: string = 'tenant_apex_climate_hvac'): {
    project: WebsiteProject;
    pages: WebsitePage[];
  } {
    const db = getDatabase();

    // 1. Create or ensure second tenant exists
    const tenantStmt = db.prepare(`
      INSERT INTO tenants (
        id, name, industry, mrr, primary_bottleneck, environment_classification,
        company_maturity, engagement_model, operating_mode, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET name = excluded.name, industry = excluded.industry
    `);

    tenantStmt.run(
      tenantId,
      'Apex Climate Solutions',
      'HVAC & Heat Pumps',
      0,
      'Lead Generation',
      'PILOT',
      'Growth Stage',
      'Full AI Launch',
      'Guided Manual',
      new Date().toISOString()
    );

    // 2. Add locations & service areas for second tenant (e.g. Hartford / New Haven, CT)
    locationIntelligenceService.saveLocation(tenantId, {
      id: `loc_${tenantId}_hq`,
      type: 'HEADQUARTERS',
      label: 'Apex Climate Solutions HQ',
      streetAddress: '450 Farmington Ave',
      city: 'Hartford',
      municipality: 'Hartford',
      county: 'Hartford County',
      stateProvince: 'CT',
      postalCode: '06105',
      country: 'US',
      timezone: 'America/New_York',
      coordinates: { latitude: 41.7658, longitude: -72.6734 },
      source: 'VERIFIED_BUSINESS_PROFILE',
      verificationState: 'VERIFIED',
      verifiedAt: new Date().toISOString(),
      metadata: { phone: '+18605550199' }
    });

    locationIntelligenceService.saveServiceArea(tenantId, {
      id: `sa_${tenantId}_primary`,
      name: 'Greater Hartford & Central Connecticut Zone',
      areaType: 'COUNTY',
      rule: 'INCLUSION',
      value: 'Hartford County, Middlesex County',
      notes: 'Primary heating and cooling service territory'
    });

    // 3. Compile context & Brand Profile
    const context = businessWebsiteContextService.compileContext(tenantId);
    const brand = websiteBrandProfileService.getOrCreateBrandProfile(tenantId);
    brand.brandName = 'Apex Climate Solutions';
    brand.colors = {
      primary: '#0369A1',    // Sky 700
      secondary: '#F97316',  // Orange 500
      accent: '#0284C7',     // Sky 600
      background: '#F0F9FF', // Sky 50
      surface: '#FFFFFF',
      text: '#0C4A6E',
      muted: '#64748B'
    };
    brand.typography = {
      headingFont: 'Montserrat',
      bodyFont: 'Inter',
      displayScale: 'BALANCED'
    };
    brand.ctaStyle = {
      primaryLabel: 'Schedule HVAC Estimate',
      secondaryLabel: 'Call (860) 555-0199',
      shape: 'ROUNDED'
    };
    websiteBrandProfileService.saveBrandProfile(brand);

    const project = websiteProjectService.getOrCreateProject(tenantId, 'Apex Climate Solutions Official Portal');

    // 4. Create HVAC Pages
    const pages: WebsitePage[] = [
      {
        id: `page_${project.id}_home`,
        projectId: project.id,
        tenantId,
        slug: 'home',
        title: 'Home',
        navOrder: 1,
        isPublished: true,
        isIndex: true,
        metaTitle: 'Apex Climate Solutions | Heat Pump & HVAC Experts Hartford, CT',
        metaDescription: 'High-efficiency heat pump installation, central AC repairs, and furnace maintenance across Greater Hartford, Connecticut.',
        pageType: 'HOME',
        components: [
          {
            id: 'comp_hvac_hero',
            type: 'Hero',
            order: 1,
            content: {
              headline: 'High-Efficiency Heating & Cooling Solutions in Central Connecticut',
              subheadline: 'Specializing in cold-climate heat pump conversions, ductless mini-splits, and rapid 24/7 HVAC repairs.',
              primaryCta: { label: 'Get Free HVAC Quote', actionType: 'FORM', target: '#contact' },
              secondaryCta: { label: 'Call (860) 555-0199', actionType: 'PHONE', target: 'tel:+18605550199' },
              trustBullets: ['EPA & NATE Certified', 'Utility Rebate Specialists', '24/7 Emergency Dispatch']
            }
          },
          {
            id: 'comp_hvac_services',
            type: 'ServiceGrid',
            order: 2,
            content: {
              sectionTitle: 'Complete HVAC Heating & Air Services',
              services: [
                {
                  serviceKey: 'hvac_installation',
                  title: 'Heat Pump & AC Installation',
                  description: 'ENERGY STAR cold-climate heat pump installations engineered for New England winters.',
                  ctaLabel: 'View Systems'
                },
                {
                  serviceKey: 'hvac_repair',
                  title: 'Emergency Heating & AC Repair',
                  description: 'Rapid diagnostic and component repair when heating or cooling fails unexpectedly.',
                  ctaLabel: 'Emergency Service'
                },
                {
                  serviceKey: 'seasonal_maintenance',
                  title: 'Preventative Tune-Ups',
                  description: 'Comprehensive seasonal multi-point inspections to maximize efficiency and system longevity.',
                  ctaLabel: 'Book Maintenance'
                }
              ]
            }
          },
          {
            id: 'comp_hvac_form',
            type: 'ContactForm',
            order: 3,
            content: {
              formType: 'QUOTE_REQUEST',
              title: 'Schedule Your Heating or Cooling Consultation',
              submitButtonLabel: 'Submit Consultation Request',
              availableServices: ['Heat Pump Installation', 'Emergency HVAC Repair', 'Preventative Tune-Up'],
              requireAddress: true,
              requirePhone: true,
              disclosureVersion: 'v1.0',
              consentText: 'I consent to transactional communications regarding my HVAC inquiry.'
            }
          }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    for (const p of pages) {
      websiteProjectService.savePage(p);
    }

    return { project, pages };
  }
}

export const syntheticSecondTenantWebsiteService = SyntheticSecondTenantWebsiteService.getInstance();
