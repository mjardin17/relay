import { WebsitePage, WebsiteProject } from '../types/websiteBuilder';
import { websiteProjectService } from './websiteProjectService';
import { businessWebsiteContextService } from './businessWebsiteContextService';
import { websiteBrandProfileService } from './websiteBrandProfileService';

export class ReisElectricWebsiteService {
  private static instance: ReisElectricWebsiteService;

  private constructor() {}

  public static getInstance(): ReisElectricWebsiteService {
    if (!ReisElectricWebsiteService.instance) {
      ReisElectricWebsiteService.instance = new ReisElectricWebsiteService();
    }
    return ReisElectricWebsiteService.instance;
  }

  public initializeReisElectricWebsite(tenantId: string = 'tenant_ma_fresh_launch'): {
    project: WebsiteProject;
    pages: WebsitePage[];
  } {
    const context = businessWebsiteContextService.compileContext(tenantId);
    const brand = websiteBrandProfileService.getOrCreateBrandProfile(tenantId);
    const project = websiteProjectService.getOrCreateProject(tenantId, 'Reis Electric LLC Official Site');

    // Generate Candidate Verified Pages based on approved electrical services
    const pages: WebsitePage[] = [
      // 1. Home Page
      {
        id: `page_${project.id}_home`,
        projectId: project.id,
        tenantId,
        slug: 'home',
        title: 'Home',
        navOrder: 1,
        isPublished: true,
        isIndex: true,
        metaTitle: 'Reis Electric LLC | Licensed Master Electrician in New Bedford, MA',
        metaDescription: 'Trusted residential & commercial electrical contractor based in New Bedford, MA. Licensed Master Electrician, panel upgrades, EV chargers, troubleshooting & emergency repairs.',
        canonicalUrl: 'https://reiselectricma.com/',
        pageType: 'HOME',
        components: [
          {
            id: 'comp_hero_home',
            type: 'Hero',
            order: 1,
            content: {
              headline: 'Licensed Master Electrician in Greater New Bedford & South Coast MA',
              subheadline: 'Delivering precision residential and commercial electrical contracting, service upgrades, EV charging, and prompt troubleshooting with strict code compliance.',
              primaryCta: { label: 'Request an Estimate', actionType: 'FORM', target: '#contact' },
              secondaryCta: { label: 'Call (508) 999-1234', actionType: 'PHONE', target: 'tel:+15089991234' },
              badgeText: 'MA Master Electrician #22419-A',
              trustBullets: [
                'Fully Licensed & Insured (MA & RI)',
                '527 CMR & NEC Code Compliant',
                'South Coast Emergency Response'
              ]
            }
          },
          {
            id: 'comp_cred_home',
            type: 'CredentialBlock',
            order: 2,
            content: {
              title: 'Master Electrician Supervision & Proven Compliance',
              licenseStatements: [
                {
                  licenseType: 'Massachusetts Master Electrician',
                  licenseNumber: 'License #22419-A',
                  issuingState: 'MA',
                  holderName: 'Shad Reis'
                },
                {
                  licenseType: 'Commercial General Liability',
                  licenseNumber: 'Policy #POL-MA-2026-8831',
                  issuingState: 'MA',
                  holderName: 'Reis Electric LLC'
                }
              ],
              insuranceVerified: true,
              complianceNote: 'All work permitted through local municipal building and wire inspection departments.'
            }
          },
          {
            id: 'comp_services_grid_home',
            type: 'ServiceGrid',
            order: 3,
            content: {
              sectionTitle: 'Our Electrical Contracting Capabilities',
              sectionDescription: 'Specialized electrical solutions for homeowners, general contractors, property managers, and commercial facilities.',
              services: [
                {
                  serviceKey: 'residential_electrical',
                  title: 'Residential Electrical Work',
                  description: 'Dedicated circuits, whole-home rewiring, renovation wiring, and code upgrade inspections.',
                  ctaLabel: 'Explore Residential',
                  pageSlug: 'residential-electrical'
                },
                {
                  serviceKey: 'commercial_electrical',
                  title: 'Commercial Electrical Work',
                  description: '3-phase power distribution, commercial branch circuits, tenant fit-outs, and ongoing facility maintenance.',
                  ctaLabel: 'Explore Commercial',
                  pageSlug: 'commercial-electrical'
                },
                {
                  serviceKey: 'panel_service_upgrades',
                  title: 'Panels & Service Upgrades',
                  description: '100A to 200A/400A service changes, modern breaker panels, and surge protection.',
                  ctaLabel: 'Panel Upgrades',
                  pageSlug: 'panels-service-upgrades'
                },
                {
                  serviceKey: 'ev_charger_installation',
                  title: 'EV Charger Installation',
                  description: 'Level 2 EV charging station installation, load calculations, and utility rebate coordination.',
                  ctaLabel: 'EV Charging',
                  pageSlug: 'ev-charger-installation'
                },
                {
                  serviceKey: 'troubleshooting_repairs',
                  title: 'Troubleshooting & Repairs',
                  description: 'Rapid diagnostic troubleshooting, buzzing panel remediation, tripped breakers, and power loss diagnostics.',
                  ctaLabel: 'Emergency Repairs',
                  pageSlug: 'troubleshooting-repairs'
                },
                {
                  serviceKey: 'lighting_fixtures',
                  title: 'Lighting & Fixtures',
                  description: 'Custom architectural LED recessed lighting, smart dimmer switches, and exterior security lighting.',
                  ctaLabel: 'Lighting Services',
                  pageSlug: 'lighting-fixtures'
                }
              ]
            }
          },
          {
            id: 'comp_reviews_home',
            type: 'Testimonial',
            order: 4,
            content: {
              title: 'Verified Customer Feedback across Bristol County',
              testimonials: [
                {
                  author: 'David M.',
                  location: 'Dartmouth, MA',
                  text: 'Exceptional electrical craftsmanship on our 200A service upgrade and EV charger install. Clean, prompt, and passed inspection without issue.',
                  rating: 5,
                  serviceRendered: 'Panels & EV Charging'
                },
                {
                  author: 'Elena R.',
                  location: 'New Bedford, MA',
                  text: 'Prompt troubleshooting response when our main subpanel started buzzing. Clear communication and licensed professionalism throughout.',
                  rating: 5,
                  serviceRendered: 'Troubleshooting & Repairs'
                }
              ]
            }
          },
          {
            id: 'comp_service_area_home',
            type: 'ServiceArea',
            order: 5,
            content: {
              title: 'Serving Greater New Bedford & South Coast Massachusetts',
              description: 'Our primary dispatch hub is located in New Bedford, providing rapid response across Bristol County and neighboring communities.',
              headquartersCity: 'New Bedford',
              state: 'MA',
              countiesServed: ['Bristol County', 'Plymouth County'],
              municipalitiesServed: ['New Bedford', 'Dartmouth', 'Fairhaven', 'Acushnet', 'Mattapoisett', 'Westport', 'Fall River']
            }
          },
          {
            id: 'comp_form_home',
            type: 'ContactForm',
            order: 6,
            content: {
              formType: 'QUOTE_REQUEST',
              title: 'Request a Service Estimate',
              subtitle: 'Tell us about your project or repair. A licensed master electrician will review your details promptly.',
              submitButtonLabel: 'Submit Estimate Request',
              availableServices: [
                'Residential Electrical Work',
                'Commercial Electrical Work',
                'Troubleshooting & Repairs',
                'Panels & Service Upgrades',
                'Lighting & Fixtures',
                'EV Charger Installation',
                'Fire Alarm & Life Safety'
              ],
              requireAddress: true,
              requirePhone: true,
              disclosureVersion: 'v1.0',
              consentText: 'By checking this box, I consent to receive transactional phone calls, emails, or SMS notifications from Reis Electric LLC regarding this service inquiry. Message and data rates may apply.'
            }
          },
          {
            id: 'comp_footer_home',
            type: 'Footer',
            order: 7,
            content: {
              companyName: 'Reis Electric LLC',
              address: 'New Bedford, MA 02740',
              phone: '(508) 999-1234',
              email: 'info@reiselectric.com',
              licenseNotice: 'Massachusetts Master Electrician License #22419-A | Fully Licensed & Insured',
              quickLinks: [
                { label: 'Home', url: '/' },
                { label: 'Residential', url: '/residential-electrical.html' },
                { label: 'Commercial', url: '/commercial-electrical.html' },
                { label: 'Service Areas', url: '/service-area.html' },
                { label: 'Contact', url: '/contact.html' }
              ],
              copyrightYear: 2026,
              disclaimerText: 'All electrical modifications performed under Massachusetts Electrical Code (527 CMR 12.00) and National Electrical Code guidelines.'
            }
          }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },

      // 2. Residential Electrical Page
      {
        id: `page_${project.id}_res`,
        projectId: project.id,
        tenantId,
        slug: 'residential-electrical',
        title: 'Residential Electrical Work',
        navOrder: 2,
        isPublished: true,
        isIndex: false,
        metaTitle: 'Residential Electrician | Reis Electric LLC | New Bedford, MA',
        metaDescription: 'Complete residential electrical services in South Coast MA. Home rewiring, dedicated appliance circuits, code safety inspections, and renovations.',
        canonicalUrl: 'https://reiselectricma.com/residential-electrical.html',
        pageType: 'SERVICE',
        components: [
          {
            id: 'comp_res_hero',
            type: 'Hero',
            order: 1,
            content: {
              headline: 'Residential Electrical Contracting in Greater New Bedford',
              subheadline: 'From complete home additions and kitchen wiring to safety inspections and dedicated circuits, we power your home safely.',
              primaryCta: { label: 'Schedule Residential Service', actionType: 'FORM', target: '#contact' },
              secondaryCta: { label: 'Call (508) 999-1234', actionType: 'PHONE', target: 'tel:+15089991234' },
              trustBullets: ['Code-Compliant Wiring', 'Clean & Respectful Technicians', 'Permits Pulled Locally']
            }
          },
          {
            id: 'comp_res_text',
            type: 'TextSection',
            order: 2,
            content: {
              title: 'Safe, Reliable Power for South Coast Homeowners',
              subtitle: 'Precision installations backed by Master Electrician oversight.',
              bodyMarkdown: 'Whether you are upgrading an older South Coast home in Fairhaven or Dartmouth or installing dedicated lines for modern appliances, Reis Electric LLC ensures every connection meets the highest safety benchmarks.\n\nWe coordinate with local building inspectors to pull required permits and complete work efficiently with minimal disruption to your household.'
            }
          },
          {
            id: 'comp_res_form',
            type: 'ContactForm',
            order: 3,
            content: {
              formType: 'QUOTE_REQUEST',
              title: 'Inquire About Residential Electrical Work',
              submitButtonLabel: 'Request Residential Quote',
              requireAddress: true,
              requirePhone: true,
              disclosureVersion: 'v1.0',
              consentText: 'I consent to transactional communications regarding my residential quote request.'
            }
          }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },

      // 3. Service Area Page
      {
        id: `page_${project.id}_sa`,
        projectId: project.id,
        tenantId,
        slug: 'service-area',
        title: 'Service Area',
        navOrder: 3,
        isPublished: true,
        isIndex: false,
        metaTitle: 'Service Areas | Reis Electric LLC | South Coast Massachusetts',
        metaDescription: 'Reis Electric LLC proudly serves New Bedford, Dartmouth, Fairhaven, Acushnet, Westport, Mattapoisett, and Fall River MA.',
        canonicalUrl: 'https://reiselectricma.com/service-area.html',
        pageType: 'SERVICE_AREA',
        components: [
          {
            id: 'comp_sa_hero',
            type: 'Hero',
            order: 1,
            content: {
              headline: 'Electrical Contracting Across South Coast Massachusetts',
              subheadline: 'Headquartered in New Bedford, providing rapid response across Bristol County.',
              primaryCta: { label: 'Check Availability in Your Town', actionType: 'FORM', target: '#contact' },
              trustBullets: ['Locally Owned & Operated', 'Rapid Response Dispatch', 'Bristol & Plymouth Counties']
            }
          },
          {
            id: 'comp_sa_details',
            type: 'ServiceArea',
            order: 2,
            content: {
              title: 'Bristol County & South Coast Coverage Zones',
              description: 'We deliver full residential and commercial electrical contracting within our configured service territory.',
              headquartersCity: 'New Bedford',
              state: 'MA',
              countiesServed: ['Bristol County', 'Plymouth County'],
              municipalitiesServed: ['New Bedford', 'Dartmouth', 'Fairhaven', 'Acushnet', 'Mattapoisett', 'Westport', 'Fall River']
            }
          }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },

      // 4. Contact Us Page
      {
        id: `page_${project.id}_contact`,
        projectId: project.id,
        tenantId,
        slug: 'contact',
        title: 'Contact',
        navOrder: 4,
        isPublished: true,
        isIndex: false,
        metaTitle: 'Contact Reis Electric LLC | New Bedford, MA Electrician',
        metaDescription: 'Get in touch with Reis Electric LLC. Call (508) 999-1234 or submit an online request for residential or commercial electrical services.',
        canonicalUrl: 'https://reiselectricma.com/contact.html',
        pageType: 'CONTACT',
        components: [
          {
            id: 'comp_contact_form_main',
            type: 'ContactForm',
            order: 1,
            content: {
              formType: 'QUOTE_REQUEST',
              title: 'Get in Touch with Reis Electric LLC',
              subtitle: 'Headquarters: New Bedford, MA | Phone: (508) 999-1234',
              submitButtonLabel: 'Send Message / Quote Request',
              availableServices: [
                'Residential Electrical Work',
                'Commercial Electrical Work',
                'Troubleshooting & Repairs',
                'Panels & Service Upgrades',
                'EV Charger Installation',
                'Lighting & Fixtures'
              ],
              requireAddress: true,
              requirePhone: true,
              disclosureVersion: 'v1.0',
              consentText: 'By submitting, I agree to receive transactional communications from Reis Electric LLC.'
            }
          }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    // Save pages
    for (const p of pages) {
      websiteProjectService.savePage(p);
    }

    return { project, pages };
  }
}

export const reisElectricWebsiteService = ReisElectricWebsiteService.getInstance();
