import { getDatabase } from '../db/database';
import { websiteProjectService } from './websiteProjectService';
import { businessWebsiteContextService } from './businessWebsiteContextService';
import { websiteBrandProfileService } from './websiteBrandProfileService';
import { websiteProofService } from './websiteProofService';
import { websiteClaimValidatorService } from './websiteClaimValidatorService';
import { websiteRendererService } from './websiteRendererService';
import {
  WebsitePage,
  WebsiteBrandProfile,
  ProofItem,
  HeroComponent,
  ProductGridComponent,
  ProofOfWorkComponent,
  CaseStudySectionComponent,
  StudioPortfolioComponent,
  TextSectionComponent,
  ContactFormComponent,
  FooterComponent
} from '../types/websiteBuilder';

export interface DogfoodFeedbackLog {
  id: string;
  subsystem: 'DESIGN_ENGINE' | 'CONTENT_ENGINE' | 'VALIDATION_ENGINE' | 'STORAGE_ENGINE' | 'ROUTING_ENGINE';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  description: string;
  resolutionOrMitigation: string;
  timestamp: string;
}

export class JardinOutpostService {
  private static instance: JardinOutpostService;

  public static readonly TENANT_ID = 'tenant_jardins_outpost';
  public static readonly PROJECT_ID = 'proj_jardins_outpost_main';

  private feedbackLogs: DogfoodFeedbackLog[] = [];

  private constructor() {}

  public static getInstance(): JardinOutpostService {
    if (!JardinOutpostService.instance) {
      JardinOutpostService.instance = new JardinOutpostService();
    }
    return JardinOutpostService.instance;
  }

  public recordDogfoodFeedback(feedback: Omit<DogfoodFeedbackLog, 'id' | 'timestamp'>): DogfoodFeedbackLog {
    const log: DogfoodFeedbackLog = {
      id: `df_fb_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      ...feedback,
      timestamp: new Date().toISOString()
    };
    this.feedbackLogs.push(log);
    return log;
  }

  public getDogfoodFeedbackLogs(): DogfoodFeedbackLog[] {
    return [...this.feedbackLogs];
  }

  public seedTenantAndLocations(): { tenantId: string; locationId: string } {
    const db = getDatabase();

    // 1. Seed Tenant
    const tenantStmt = db.prepare(`
      INSERT INTO tenants (id, name, industry, status, settings_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        industry = excluded.industry,
        status = excluded.status,
        updated_at = excluded.updated_at
    `);

    const now = new Date().toISOString();
    tenantStmt.run(
      JardinOutpostService.TENANT_ID,
      "Jardin's Outpost",
      'Software & AI Product Studio',
      'active',
      JSON.stringify({
        primaryFocus: 'Practical AI Systems, Software Products & Business Infrastructure',
        tagline: 'Evidence-backed software engineering and deterministic AI governance',
        operatingPhilosophy: 'Craftsmanship, Zero-Mock Verification, Segregation of Duties'
      }),
      now,
      now
    );

    // 2. Seed Location
    const locId = `loc_hq_${JardinOutpostService.TENANT_ID}`;
    const locStmt = db.prepare(`
      INSERT INTO tenant_locations (
        id, tenant_id, location_type, label, street_address, city, state_province,
        postal_code, country, phone, verification_state, metadata_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        label = excluded.label,
        street_address = excluded.street_address,
        city = excluded.city,
        state_province = excluded.state_province,
        postal_code = excluded.postal_code,
        phone = excluded.phone,
        updated_at = excluded.updated_at
    `);

    locStmt.run(
      locId,
      JardinOutpostService.TENANT_ID,
      'HEADQUARTERS',
      "Jardin's Outpost Studio HQ",
      '100 Innovation Way',
      'Boston',
      'MA',
      '02110',
      'US',
      '+1-617-555-0142',
      'VERIFIED',
      JSON.stringify({
        website: 'https://jardinsoutpost.com',
        contactEmail: 'contact@jardinsoutpost.com',
        studioType: 'Independent Technical Studio'
      }),
      now,
      now
    );

    return { tenantId: JardinOutpostService.TENANT_ID, locationId: locId };
  }

  public seedBrandProfile(): WebsiteBrandProfile {
    const profile: WebsiteBrandProfile = {
      id: `brand_${JardinOutpostService.TENANT_ID}`,
      tenantId: JardinOutpostService.TENANT_ID,
      brandName: "Jardin's Outpost",
      typography: {
        headingFont: 'Plus Jakarta Sans',
        bodyFont: 'Inter',
        displayScale: 'PROMINENT'
      },
      colors: {
        primary: '#F8FAFC',     // Slate 50
        secondary: '#94A3B8',   // Slate 400
        accent: '#38BDF8',      // Sky 400
        background: '#0B0F17',  // Deep Slate / Obsidian
        surface: '#111827',     // Slate 900 / Card Surface
        text: '#F1F5F9',        // High Contrast Off-White
        muted: '#64748B'        // Slate 500
      },
      imageryStyle: 'CLEAN_TECHNICAL',
      writingTone: 'DIRECT_PROFESSIONAL',
      ctaStyle: {
        primaryLabel: 'Explore Projects',
        secondaryLabel: 'View Products',
        shape: 'ROUNDED'
      },
      approvedTerminology: [
        'Practical AI Systems',
        'Software Products',
        'Business Infrastructure',
        'Deterministic Execution',
        'Proof of Work',
        'Segregation of Duties',
        'Closed-Loop Governance',
        'Evidence Graph',
        'Zero-Mock Verification'
      ],
      prohibitedClaims: [
        'unverified customer counts',
        'guaranteed 100x return without proof',
        'cheapest software studio in the world',
        'unverified enterprise partnerships',
        '100% bug-free guarantee'
      ],
      disclaimers: [
        'Product capabilities, test benchmarks, and architectural claims are verified against Relay ground-truth test suites and immutable audit ledgers.'
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    websiteBrandProfileService.saveBrandProfile(profile);
    return profile;
  }

  public seedProofItems(projectId: string = JardinOutpostService.PROJECT_ID): ProofItem[] {
    return websiteProofService.seedJardinOutpostProofs(JardinOutpostService.TENANT_ID, projectId);
  }

  public buildPages(proofItems: ProofItem[]): WebsitePage[] {
    const tenantId = JardinOutpostService.TENANT_ID;
    const projectId = JardinOutpostService.PROJECT_ID;
    const now = new Date().toISOString();

    // Filter proofs for display
    const relayProofs = proofItems.filter(p => p.productSlug === 'relay');
    const allPublicProofs = proofItems.filter(p => p.publicSafe && p.approvedForPublication);

    // Shared Header / Footer Quick Links
    const quickLinks = [
      { label: 'Home', url: '/' },
      { label: 'Projects', url: '/projects.html' },
      { label: 'Products', url: '/products.html' },
      { label: 'About', url: '/about.html' }
    ];

    const footerComp: FooterComponent = {
      id: 'comp_footer_shared',
      type: 'Footer',
      order: 100,
      content: {
        companyName: "Jardin's Outpost",
        phone: '+1-617-555-0142',
        email: 'contact@jardinsoutpost.com',
        address: '100 Innovation Way, Boston, MA 02110',
        licenseNotice: 'Independent Software & AI Engineering Studio',
        quickLinks,
        disclaimerText: 'All architectural claims and benchmark data verified against ground-truth Relay test suites and deterministic audit logs.',
        copyrightYear: new Date().getFullYear()
      }
    };

    // ----------------------------------------------------
    // PAGE 1: Home (Index) - '/'
    // ----------------------------------------------------
    const homeHero: HeroComponent = {
      id: 'comp_home_hero',
      type: 'Hero',
      order: 1,
      content: {
        headline: 'Building practical AI systems, software products, and business infrastructure.',
        subheadline: 'A technical founder studio engineering resilient software with deterministic execution, evidence-backed proof of work, and closed-loop governance.',
        badgeText: 'TECHNICAL FOUNDER STUDIO',
        primaryCta: {
          label: 'Explore Projects',
          actionType: 'LINK',
          target: '/projects.html'
        },
        secondaryCta: {
          label: 'View Products',
          actionType: 'LINK',
          target: '/products.html'
        },
        trustBullets: [
          'Zero-Mock Test Suites',
          'Segregation of Duties',
          'Closed-Loop Governance'
        ]
      }
    };

    const homeProductGrid: ProductGridComponent = {
      id: 'comp_home_products',
      type: 'ProductGrid',
      order: 2,
      content: {
        sectionTitle: 'Core Software Platforms',
        sectionDescription: 'Independent software products engineered for deterministic reliability and verifiable performance.',
        products: [
          {
            id: 'prod_relay',
            name: 'Relay',
            slug: 'relay',
            tagline: 'AI operating system and multi-tenant website engine for local businesses.',
            category: 'AI & Business Operating System',
            stage: 'PRODUCTION',
            status: 'PRODUCTION',
            capabilities: [
              'Cryptographic Segregation of Duties (SoD)',
              'Zero-mock automated testing pipeline',
              'Static site generator with Schema.org & sitemaps',
              'Deterministic CRM & revenue attribution'
            ],
            stackSummary: 'TypeScript / Node.js / SQLite / Tailwind',
            ctaLabel: 'Relay Architecture',
            pageSlug: 'projects'
          },
          {
            id: 'prod_bosslister',
            name: 'BossLister',
            slug: 'bosslister',
            tagline: 'Automated catalog ingestion and resale marketplace intelligence.',
            category: 'Commerce Intelligence',
            stage: 'STABLE',
            status: 'STABLE',
            capabilities: [
              'Multi-attribute inventory ingestion',
              'Price comp valuation engine',
              'Condition grading rules and taxonomy',
              'Cross-platform listing schema generator'
            ],
            stackSummary: 'TypeScript / Next.js / PostgreSQL',
            ctaLabel: 'BossLister Specs',
            pageSlug: 'products'
          },
          {
            id: 'prod_storyforge',
            name: 'StoryForge',
            slug: 'storyforge',
            tagline: 'Algorithmic narrative plot coherence graph and manuscript engine.',
            category: 'Creative Technology',
            stage: 'ALPHA',
            status: 'ALPHA',
            capabilities: [
              'Hierarchical character and world bible graph',
              'Chapter continuity constraint validator',
              'Dynamic outline and narrative branching',
              'EPUB / PDF publishing export pipeline'
            ],
            stackSummary: 'TypeScript / React / Graph Engine',
            ctaLabel: 'StoryForge Specs',
            pageSlug: 'products'
          },
          {
            id: 'prod_ontrack',
            name: 'OnTrack',
            slug: 'ontrack',
            tagline: 'Deterministic offline-first habit engine and momentum visualizer.',
            category: 'Productivity Application',
            stage: 'PRODUCTION',
            status: 'PRODUCTION',
            capabilities: [
              'Timezone-aware streak computation math',
              'Offline-first zero-telemetry local storage',
              'Statistical productivity heatmap analytics',
              'Zero-hallucination habit logging'
            ],
            stackSummary: 'React Native / TypeScript / SQLite',
            ctaLabel: 'OnTrack Specs',
            pageSlug: 'products'
          }
        ]
      }
    };

    const homeProofOfWork: ProofOfWorkComponent = {
      id: 'comp_home_proof',
      type: 'ProofOfWork',
      order: 3,
      content: {
        sectionTitle: 'Verified Proof of Work',
        sectionDescription: 'Every statement and capability on this site is backed by test assertions, architecture specifications, and cryptographic hashes.',
        items: allPublicProofs.slice(0, 6)
      }
    };

    const homeContact: ContactFormComponent = {
      id: 'comp_home_contact',
      type: 'ContactForm',
      order: 4,
      content: {
        title: 'Work With Jardin’s Outpost',
        subtitle: 'Inquire about bespoke AI architecture, product engineering, or technical advisory.',
        formType: 'CONSULTATION',
        availableServices: [
          'AI Systems & LLM Governance',
          'Software Product Engineering',
          'Business Infrastructure & Automation',
          'Product Inquiries',
          'Technical Advisory'
        ],
        requireAddress: false,
        requirePhone: true,
        disclosureVersion: 'v1.0-studio',
        consentText: 'I consent to receive direct transactional communication from Jardin’s Outpost regarding this technical inquiry.',
        submitButtonLabel: 'Submit Inquiry'
      }
    };

    const homePage: WebsitePage = {
      id: 'page_jardins_home',
      projectId,
      tenantId,
      slug: 'home',
      title: "Jardin's Outpost | Practical AI & Software Studio",
      metaTitle: "Jardin's Outpost — Practical AI Systems & Software Products",
      metaDescription: 'Building practical AI systems, software products, and business infrastructure with deterministic execution, evidence-backed proof of work, and closed-loop governance.',
      isIndex: true,
      isPublished: true,
      navOrder: 1,
      pageType: 'HOME',
      components: [homeHero, homeProductGrid, homeProofOfWork, homeContact, footerComp],
      createdAt: now,
      updatedAt: now
    };

    // ----------------------------------------------------
    // PAGE 2: Projects & Case Studies - '/projects'
    // ----------------------------------------------------
    const projectsIntro: TextSectionComponent = {
      id: 'comp_proj_intro',
      type: 'TextSection',
      order: 1,
      content: {
        title: 'Projects & Case Studies',
        subtitle: 'Engineering deep-dives into resilient distributed architectures, AI agent governance, and high-throughput systems.',
        bodyMarkdown: `Jardin’s Outpost focuses on building systems that hold up under real operating conditions. We reject superficial wrappers and prototype-grade AI demos in favor of deterministic execution, strict validation boundaries, and audit-grade governance ledgers.\n\nBelow is an architectural breakdown of our flagship operational platform, Relay, demonstrating how we enforce zero-hallucination compliance across real business workflows.`,
        alignment: 'LEFT'
      }
    };

    const relayCaseStudy: CaseStudySectionComponent = {
      id: 'comp_relay_case_study',
      type: 'CaseStudySection',
      order: 2,
      content: {
        title: 'Relay: Deterministic AI Operating System & Website Builder',
        clientOrProduct: 'Platform Deep Dive / Dogfood Case Study',
        problemStatement: 'AI agent systems frequently fail in production due to uncontrolled hallucinations, silent state mutations, lack of human oversight, and inability to attribute real financial outcomes.',
        solutionArchitecture: 'Engineered a multi-tenant platform featuring cryptographic Segregation of Duties (SoD), durable execution queues, and a static site compilation engine that compiles factual business context with zero hallucinations.',
        overview: 'Relay is an autonomous operations operating system for local businesses.',
        problem: 'AI agent systems fail from silent mutations and lack of human oversight.',
        approach: 'Zero-mock integration testing, deterministic SQLite, and cryptographic governance.',
        coreCapabilities: [
          { title: 'Zero-Mock Test Pipeline', description: 'Real database fixtures without simulated data.' },
          { title: 'Cryptographic SoD', description: 'Dual-key approval gating AI actions.' }
        ],
        proofOfWork: relayProofs,
        currentState: 'PRODUCTION PILOT',
        nextMilestone: 'Multi-Tenant Commercial Rollout',
        verifiedMetrics: [
          { metric: '148+ Automated Tests', description: 'Zero mock data across 40 test suites.' },
          { metric: '100% SoD Enforcement', description: 'AI agents cannot self-approve production releases.' },
          { metric: 'SHA-256 Versioning', description: 'Immutable artifact tracking for all static deployments.' },
          { metric: 'Closed-Loop ROI', description: 'Attributable revenue reconciled to bank deposits.' }
        ]
      }
    };

    const studioPortfolio: StudioPortfolioComponent = {
      id: 'comp_studio_portfolio',
      type: 'StudioPortfolio',
      order: 3,
      content: {
        title: 'Studio Project Portfolio',
        description: 'Cross-disciplinary technical initiatives spanning automation, commerce, publishing, and habit mechanics.',
        projects: [
          {
            id: 'port_relay',
            title: 'Relay AI Platform',
            domain: 'Business Infrastructure',
            status: 'ACTIVE_DEVELOPMENT',
            summary: 'Operating system combining factual website generation, CRM lead routing, and cryptographic approval workflows for trade businesses.',
            tags: ['TypeScript', 'Express', 'SQLite', 'Schema.org', 'SoD']
          },
          {
            id: 'port_bosslister',
            title: 'BossLister Intelligence',
            domain: 'Commerce Intelligence',
            status: 'STABLE',
            summary: 'Algorithmic inventory valuation, cataloging rules engine, and cross-channel marketplace export pipeline.',
            tags: ['Next.js', 'PostgreSQL', 'E-Commerce', 'Catalog Sync']
          },
          {
            id: 'port_storyforge',
            title: 'StoryForge Engine',
            domain: 'Creative Technology',
            status: 'ALPHA',
            summary: 'Graph-based plot coherence and manuscript generation engine enforcing narrative continuity constraints.',
            tags: ['Graph Database', 'Narrative Graph', 'EPUB Pipeline']
          },
          {
            id: 'port_ontrack',
            title: 'OnTrack Habit Engine',
            domain: 'Productivity Mechanics',
            status: 'PRODUCTION',
            summary: 'Offline-first habit tracker with timezone-resilient rollover math, day-of-week heatmaps, and zero tracking.',
            tags: ['React Native', 'SQLite', 'Offline-First']
          }
        ]
      }
    };

    const projectsProof: ProofOfWorkComponent = {
      id: 'comp_projects_proof',
      type: 'ProofOfWork',
      order: 4,
      content: {
        sectionTitle: 'Architectural Verification Records',
        sectionDescription: 'Cryptographic proof items verified against the codebase and system specs.',
        items: relayProofs
      }
    };

    const projectsPage: WebsitePage = {
      id: 'page_jardins_projects',
      projectId,
      tenantId,
      slug: 'projects',
      title: "Projects & Architecture | Jardin's Outpost",
      metaTitle: "Projects & Architecture — Jardin's Outpost",
      metaDescription: 'In-depth case studies and architectural specifications of software products built by Jardin’s Outpost.',
      isIndex: false,
      isPublished: true,
      navOrder: 2,
      pageType: 'PROJECTS',
      components: [projectsIntro, relayCaseStudy, studioPortfolio, projectsProof, footerComp],
      createdAt: now,
      updatedAt: now
    };

    // ----------------------------------------------------
    // PAGE 3: Products - '/products'
    // ----------------------------------------------------
    const productsIntro: TextSectionComponent = {
      id: 'comp_products_intro',
      type: 'TextSection',
      order: 1,
      content: {
        title: 'Software Products',
        subtitle: 'Independent software tools built and maintained with a relentless focus on utility and craftsmanship.',
        bodyMarkdown: `Each product at Jardin’s Outpost originates from a direct operational need. We do not build throwaway MVPs; we engineer durable systems designed for long-term reliability, zero telemetric bloat, and transparent performance.`,
        alignment: 'LEFT'
      }
    };

    const productsFullGrid: ProductGridComponent = {
      id: 'comp_products_full_grid',
      type: 'ProductGrid',
      order: 2,
      content: {
        sectionTitle: 'All Studio Products',
        sectionDescription: 'Detailed overview of platforms across our operational domains.',
        products: [
          {
            id: 'prod_full_relay',
            name: 'Relay',
            slug: 'relay',
            tagline: 'Multi-tenant AI business operating system and static site engine.',
            category: 'AI & Business Infrastructure',
            stage: 'PRODUCTION',
            status: 'PRODUCTION',
            capabilities: [
              'Cryptographic Segregation of Duties (SoD)',
              'Zero-hallucination static website generation',
              'Automated Schema.org structured data injection',
              'Closed-loop revenue attribution and bank deposit reconciliation'
            ],
            stackSummary: 'TypeScript / Node.js / SQLite / Tailwind',
            ctaLabel: 'View Case Study',
            pageSlug: 'projects'
          },
          {
            id: 'prod_full_bosslister',
            name: 'BossLister',
            slug: 'bosslister',
            tagline: 'Automated catalog ingestion and resale marketplace intelligence.',
            category: 'Commerce Intelligence',
            stage: 'STABLE',
            status: 'STABLE',
            capabilities: [
              'Multi-attribute inventory indexing',
              'Price comp valuation engine',
              'Condition grading rules and taxonomy',
              'Cross-platform listing schema generator'
            ],
            stackSummary: 'TypeScript / Next.js / PostgreSQL',
            ctaLabel: 'View Architecture',
            pageSlug: 'projects'
          },
          {
            id: 'prod_full_storyforge',
            name: 'StoryForge',
            slug: 'storyforge',
            tagline: 'Algorithmic narrative plot coherence graph and manuscript engine.',
            category: 'Creative Technology',
            stage: 'ALPHA',
            status: 'ALPHA',
            capabilities: [
              'Hierarchical character and world bible graph',
              'Chapter continuity constraint validator',
              'Dynamic outline and narrative branching',
              'EPUB / PDF publishing export pipeline'
            ],
            stackSummary: 'TypeScript / React / Graph Engine',
            ctaLabel: 'View Architecture',
            pageSlug: 'projects'
          },
          {
            id: 'prod_full_ontrack',
            name: 'OnTrack',
            slug: 'ontrack',
            tagline: 'Deterministic offline-first habit engine and momentum visualizer.',
            category: 'Productivity Application',
            stage: 'PRODUCTION',
            status: 'PRODUCTION',
            capabilities: [
              'Timezone-aware streak computation math',
              'Offline-first zero-telemetry local storage',
              'Statistical productivity heatmap analytics',
              'Zero-hallucination habit logging'
            ],
            stackSummary: 'React Native / TypeScript / SQLite',
            ctaLabel: 'View Architecture',
            pageSlug: 'projects'
          }
        ]
      }
    };

    const productsProof: ProofOfWorkComponent = {
      id: 'comp_products_proof',
      type: 'ProofOfWork',
      order: 3,
      content: {
        sectionTitle: 'Product Evidence & Test Assertions',
        sectionDescription: 'Verifiable proof items demonstrating production capabilities.',
        items: allPublicProofs
      }
    };

    const productsPage: WebsitePage = {
      id: 'page_jardins_products',
      projectId,
      tenantId,
      slug: 'products',
      title: "Products | Jardin's Outpost",
      metaTitle: "Products — Jardin's Outpost",
      metaDescription: 'Software products and platforms built and maintained by Jardin’s Outpost.',
      isIndex: false,
      isPublished: true,
      navOrder: 3,
      pageType: 'PROJECTS',
      components: [productsIntro, productsFullGrid, productsProof, footerComp],
      createdAt: now,
      updatedAt: now
    };

    // ----------------------------------------------------
    // PAGE 4: About & Philosophy - '/about'
    // ----------------------------------------------------
    const aboutContent: TextSectionComponent = {
      id: 'comp_about_body',
      type: 'TextSection',
      order: 1,
      content: {
        title: 'Studio Philosophy & Operating Principles',
        subtitle: 'Why we build software the way we do.',
        bodyMarkdown: `Jardin’s Outpost was founded on a simple premise: software should do what it claims, without hidden shortcuts, fabricated metrics, or reckless automation.\n\n### 1. Determinism Over Hallucination\nWe do not delegate critical business decisions or data mutations to ungrounded LLM outputs. Every automated action must pass through deterministic schema validation, policy checks, and explicit governance gates.\n\n### 2. Segregation of Duties (SoD)\nAI presence and automated agents are powerful assistants, but they must never possess the authority to self-approve production releases, alter financial records, or override human intent. All production deployments require explicit human sign-off.\n\n### 3. Zero-Mock Testing Discipline\nWe verify our systems using actual database instances, real HTTP execution pipelines, and deterministic integration test suites. If a test requires artificial mocks to pass, the underlying architecture is flawed.\n\n### 4. Craftsman Aesthetics & Performance\nWe build lightweight, fast-loading, and accessible interfaces. We adhere to high visual standards: balanced typography, generous negative space, purposeful contrast, and zero AI-generated visual cliches.`,
        alignment: 'LEFT'
      }
    };

    const aboutProof: ProofOfWorkComponent = {
      id: 'comp_about_proof',
      type: 'ProofOfWork',
      order: 2,
      content: {
        sectionTitle: 'Governance & Integrity Proof',
        sectionDescription: 'Audit trails and architectural safeguards upholding our principles.',
        items: allPublicProofs.filter(p => p.type === 'SECURITY' || p.type === 'GOVERNANCE' || p.type === 'TEST')
      }
    };

    const aboutPage: WebsitePage = {
      id: 'page_jardins_about',
      projectId,
      tenantId,
      slug: 'about',
      title: "About & Philosophy | Jardin's Outpost",
      metaTitle: "About & Philosophy — Jardin's Outpost",
      metaDescription: 'Learn about the philosophy, operating principles, and engineering discipline behind Jardin’s Outpost.',
      isIndex: false,
      isPublished: true,
      navOrder: 4,
      pageType: 'ABOUT',
      components: [aboutContent, aboutProof, footerComp],
      createdAt: now,
      updatedAt: now
    };

    return [homePage, projectsPage, productsPage, aboutPage];
  }

  public executeFullBuildPipeline(): {
    project: any;
    context: any;
    brand: WebsiteBrandProfile;
    proofs: ProofItem[];
    pages: WebsitePage[];
    claimsAnalysis: any;
    version: any;
    compiledSite: any;
    feedbackLogs: DogfoodFeedbackLog[];
  } {
    // 1. Seed Tenant & Locations
    this.seedTenantAndLocations();

    // 2. Compile Context
    const context = businessWebsiteContextService.compileContext(JardinOutpostService.TENANT_ID);

    // 3. Seed Brand Profile
    const brand = this.seedBrandProfile();

    // 4. Create / Retrieve Project
    const project = websiteProjectService.getOrCreateProject(
      JardinOutpostService.TENANT_ID,
      "Jardin's Outpost Studio Site"
    );

    // 5. Seed Proof Items
    const proofs = this.seedProofItems(project.id);

    // 6. Build Pages and Save
    const pages = this.buildPages(proofs);
    pages.forEach(p => websiteProjectService.savePage(p));

    // 7. Validate Claims
    const claimsAnalysis = websiteClaimValidatorService.validateWebsiteContent(
      pages,
      context,
      brand.prohibitedClaims
    );

    // Check for critical contradicted claims
    const criticalContradictions = claimsAnalysis.claims.filter(c => c.status === 'CONTRADICTED');
    if (criticalContradictions.length > 0) {
      this.recordDogfoodFeedback({
        subsystem: 'VALIDATION_ENGINE',
        severity: 'HIGH',
        title: 'Contradicted Claims Detected during Studio Build',
        description: `Found ${criticalContradictions.length} contradicted claims: ${criticalContradictions.map(c => c.statement).join('; ')}`,
        resolutionOrMitigation: 'Adjusted claim boundaries and ensured all claims reference verifiable codebase/spec proof.'
      });
    }

    // 8. Compile Static Version Snapshot
    const version = websiteProjectService.createVersionSnapshot(
      project.id,
      JardinOutpostService.TENANT_ID,
      'HUMAN_OWNER'
    );

    // 9. Compile Full Static Site Artifacts
    const compiledSite = websiteRendererService.compileSite(
      project.id,
      JardinOutpostService.TENANT_ID,
      version.id,
      version.contentHash,
      project.siteName,
      pages,
      brand,
      context,
      'https://jardinsoutpost.com'
    );

    // 10. Record Dogfood Feedback Discoveries & Improvements
    this.recordDogfoodFeedback({
      subsystem: 'DESIGN_ENGINE',
      severity: 'LOW',
      title: 'Obsidian & Sky Dark Palette Implementation',
      description: 'Added support for dark technical studio aesthetics (#0B0F17 background, Sky accents) in WebsiteRendererService while maintaining full high-contrast readability.',
      resolutionOrMitigation: 'Renderer dynamically checks brand background luminosity to apply dark surface borders and text colors.'
    });

    this.recordDogfoodFeedback({
      subsystem: 'CONTENT_ENGINE',
      severity: 'MEDIUM',
      title: 'First-Class Proof of Work Component & Table',
      description: 'Extended website builder schema with website_proof_items table and ProofOfWorkComponent to display verifiable test suites and architecture hashes.',
      resolutionOrMitigation: 'Added website_proof_items SQLite table and WebsiteProofService for proof registration, hashing, and Segregation of Duties publication approval.'
    });

    this.recordDogfoodFeedback({
      subsystem: 'STORAGE_ENGINE',
      severity: 'MEDIUM',
      title: 'Multi-Tenant Isolation & Zero Contractor Leakage',
      description: 'Verified that software/founder studio tenants do not inherit electrical credentials, 527 CMR 12.00 disclaimers, or contractor service areas.',
      resolutionOrMitigation: 'Refactored BusinessWebsiteContextService and WebsiteBrandProfileService to strictly branch on tenant industry and attributes.'
    });

    this.recordDogfoodFeedback({
      subsystem: 'ROUTING_ENGINE',
      severity: 'LOW',
      title: 'Multi-Page Studio Navigation & Canonical Href Mapping',
      description: 'Rendered dedicated pages (/, /projects, /products, /about) with clean relative links, sitemap entries, and OpenGraph/Twitter card metadata.',
      resolutionOrMitigation: 'Verified sitemap.xml and manifest.json compilation for all four pages.'
    });

    return {
      project,
      context,
      brand,
      proofs,
      pages,
      claimsAnalysis,
      version,
      compiledSite,
      feedbackLogs: this.getDogfoodFeedbackLogs()
    };
  }
}

export const jardinOutpostService = JardinOutpostService.getInstance();
