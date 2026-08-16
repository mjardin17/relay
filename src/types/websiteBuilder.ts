import { DataEnvironment } from './productionEvidence';

export type WebsiteProjectStatus =
  | 'DRAFT'
  | 'GENERATING'
  | 'REVIEW_REQUIRED'
  | 'APPROVED'
  | 'READY_TO_DEPLOY'
  | 'DEPLOYING'
  | 'DEPLOYED'
  | 'DEGRADED'
  | 'PAUSED'
  | 'ARCHIVED';

export type WebsiteSiteType =
  | 'LOCAL_SERVICE'
  | 'TRADE_CONTRACTOR'
  | 'COMMERCIAL_INDUSTRIAL'
  | 'PROFESSIONAL_SERVICES'
  | 'GENERAL_BUSINESS'
  | 'FOUNDER_STUDIO'
  | 'SOFTWARE_PRODUCT'
  | 'TECH_PORTFOLIO';

export type FactualClaimStatus =
  | 'SUPPORTED'
  | 'UNVERIFIED'
  | 'CONTRADICTED'
  | 'PROHIBITED'
  | 'REQUIRES_REVIEW';

export type DomainVerificationStatus =
  | 'UNCONFIGURED'
  | 'PENDING_DNS'
  | 'DNS_VERIFIED'
  | 'SSL_PENDING'
  | 'ACTIVE'
  | 'FAILED';

export type DeploymentProviderType =
  | 'STATIC_EXPORT'
  | 'VERCEL'
  | 'CLOUDFLARE'
  | 'NETLIFY'
  | 'CUSTOM_SERVER';

export type WebsiteHealthState =
  | 'HEALTHY'
  | 'DEGRADED'
  | 'FAILED'
  | 'UNVERIFIED'
  | 'PAUSED';

export interface FactualClaimAnalysis {
  claimId: string;
  statement: string;
  category: 'LICENSE' | 'PRICING' | 'GUARANTEE' | 'YEARS_IN_BUSINESS' | 'REVIEWS' | 'CREDENTIALS' | 'SERVICE_AREA' | 'METRICS';
  status: FactualClaimStatus;
  evidenceRef?: string;
  reason: string;
  sourceProvenance?: string;
}

export interface WebsiteBrandProfile {
  id: string;
  tenantId: string;
  brandName: string;
  logoUrl?: string;
  alternateLogoUrl?: string;
  faviconUrl?: string;
  typography: {
    headingFont: string;
    bodyFont: string;
    displayScale: 'COMPACT' | 'BALANCED' | 'PROMINENT';
  };
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    muted: string;
  };
  imageryStyle: 'AUTHENTIC_FIELD' | 'CLEAN_TECHNICAL' | 'MODERN_MINIMAL' | 'CORPORATE_PROFESSIONAL';
  writingTone: 'DIRECT_PROFESSIONAL' | 'AUTHORITATIVE_LICENSED' | 'FRIENDLY_LOCAL' | 'ENTERPRISE';
  ctaStyle: {
    primaryLabel: string;
    secondaryLabel: string;
    shape: 'SQUARE' | 'ROUNDED' | 'PILL';
  };
  approvedTerminology: string[];
  prohibitedClaims: string[];
  disclaimers: string[];
  createdAt: string;
  updatedAt: string;
}

export interface FactualProvenanceItem<T> {
  value: T;
  sourceTable: string;
  sourceId?: string;
  verificationMethod: 'GOVERNMENT_REGISTRY' | 'OWNER_CONFIRMED' | 'CONNECTOR_SYNC' | 'INSPECTION' | 'SYSTEM_DEFAULT';
  verifiedAt?: string;
  verifiedBy?: string;
  confidenceScore: number;
}

export interface BusinessWebsiteContext {
  id: string;
  tenantId: string;
  businessName: FactualProvenanceItem<string>;
  legalEntityName?: FactualProvenanceItem<string>;
  industry: FactualProvenanceItem<string>;
  tagline?: FactualProvenanceItem<string>;
  description: FactualProvenanceItem<string>;
  headquarters: FactualProvenanceItem<{
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    lat?: number;
    lng?: number;
  }>;
  branches: FactualProvenanceItem<Array<{
    branchId: string;
    name: string;
    city: string;
    state: string;
  }>>;
  serviceAreas: FactualProvenanceItem<Array<{
    serviceAreaId: string;
    name: string;
    cities: string[];
    counties: string[];
    state: string;
  }>>;
  verifiedServices: FactualProvenanceItem<Array<{
    serviceKey: string;
    displayName: string;
    category: string;
    description: string;
    isEmergencyService: boolean;
  }>>;
  contactPhone: FactualProvenanceItem<string>;
  contactEmail: FactualProvenanceItem<string>;
  emergencyPhone?: FactualProvenanceItem<string>;
  businessHours: FactualProvenanceItem<{
    schedule: Record<string, string>;
    emergency24x7: boolean;
  }>;
  socialLinks?: FactualProvenanceItem<Record<string, string>>;
  credentials: FactualProvenanceItem<Array<{
    type: 'MASTER_LICENSE' | 'JOURNEYMAN_LICENSE' | 'BUSINESS_CERT' | 'INSURANCE';
    identifier: string;
    holderName?: string;
    issuingAuthority: string;
    state: string;
    status: string;
    expirationDate?: string;
  }>>;
  approvedTestimonials: FactualProvenanceItem<Array<{
    id: string;
    author: string;
    location: string;
    reviewText: string;
    rating: number;
    serviceTag?: string;
    verifiedPlatform?: string;
  }>>;
  disclaimers: FactualProvenanceItem<string[]>;
  compiledAt: string;
}

// ----------------------------------------------------
// Structured Component Model
// ----------------------------------------------------

export type ProofType =
  | 'TEST'
  | 'BUILD'
  | 'FEATURE'
  | 'MILESTONE'
  | 'DEPLOYMENT'
  | 'ARCHITECTURE'
  | 'RELEASE'
  | 'SECURITY'
  | 'GOVERNANCE';

export type ProofVerificationStatus =
  | 'VERIFIED'
  | 'REPORTED'
  | 'BUILDING'
  | 'HISTORICAL';

export interface ProofItem {
  id: string;
  tenantId: string;
  projectId: string;
  title: string;
  type: ProofType;
  verificationStatus: ProofVerificationStatus;
  summary: string;
  sourceType: string;
  sourceReference: string;
  observedAt: string;
  publicSafe: boolean;
  approvedForPublication: boolean;
  evidenceHash: string;
  verificationHash?: string;
  productSlug?: string;
  metadata?: Record<string, any>;
}

export type ComponentType =
  | 'Hero'
  | 'TextSection'
  | 'ServiceGrid'
  | 'CallToAction'
  | 'Image'
  | 'Gallery'
  | 'Testimonial'
  | 'FAQ'
  | 'ContactForm'
  | 'ServiceArea'
  | 'CredentialBlock'
  | 'Footer'
  | 'ProofOfWork'
  | 'ProductGrid'
  | 'CaseStudySection'
  | 'StudioPortfolio';

export interface BaseComponent {
  id: string;
  type: ComponentType;
  order: number;
  displayConfig?: {
    theme?: 'LIGHT' | 'DARK' | 'ACCENT' | 'MUTED';
    padding?: 'COMPACT' | 'STANDARD' | 'SPACIOUS';
    containerWidth?: 'NARROW' | 'STANDARD' | 'FULL';
  };
}

export interface HeroComponent extends BaseComponent {
  type: 'Hero';
  content: {
    headline: string;
    subheadline: string;
    primaryCta: { label: string; actionType: 'FORM' | 'PHONE' | 'LINK'; target: string };
    secondaryCta?: { label: string; actionType: 'FORM' | 'PHONE' | 'LINK'; target: string };
    badgeText?: string;
    backgroundImageUrl?: string;
    trustBullets?: string[];
  };
}

export interface TextSectionComponent extends BaseComponent {
  type: 'TextSection';
  content: {
    title?: string;
    subtitle?: string;
    bodyMarkdown: string;
    alignment?: 'LEFT' | 'CENTER';
  };
}

export interface ServiceGridComponent extends BaseComponent {
  type: 'ServiceGrid';
  content: {
    sectionTitle: string;
    sectionDescription?: string;
    services: Array<{
      serviceKey: string;
      title: string;
      description: string;
      iconName?: string;
      ctaLabel?: string;
      pageSlug?: string;
    }>;
  };
}

export interface CallToActionComponent extends BaseComponent {
  type: 'CallToAction';
  content: {
    heading: string;
    bodyText: string;
    primaryButton: { label: string; actionType: 'FORM' | 'PHONE' | 'LINK'; target: string };
    phoneNumber?: string;
  };
}

export interface ImageComponent extends BaseComponent {
  type: 'Image';
  content: {
    url: string;
    altText: string;
    caption?: string;
    aspectRatio?: '16:9' | '4:3' | '1:1';
  };
}

export interface GalleryComponent extends BaseComponent {
  type: 'Gallery';
  content: {
    title?: string;
    images: Array<{
      url: string;
      altText: string;
      title?: string;
      tag?: string;
    }>;
  };
}

export interface TestimonialComponent extends BaseComponent {
  type: 'Testimonial';
  content: {
    title?: string;
    testimonials: Array<{
      author: string;
      location: string;
      text: string;
      rating: number;
      serviceRendered?: string;
    }>;
  };
}

export interface FAQComponent extends BaseComponent {
  type: 'FAQ';
  content: {
    title: string;
    items: Array<{
      question: string;
      answer: string;
    }>;
  };
}

export interface ContactFormComponent extends BaseComponent {
  type: 'ContactForm';
  content: {
    formType: 'QUOTE_REQUEST' | 'CONTACT_US' | 'CALLBACK_REQUEST' | 'SERVICE_REQUEST' | 'CONSULTATION';
    title: string;
    subtitle?: string;
    submitButtonLabel: string;
    availableServices?: string[];
    requireAddress: boolean;
    requirePhone: boolean;
    disclosureVersion: string;
    consentText: string;
  };
}

export interface ServiceAreaComponent extends BaseComponent {
  type: 'ServiceArea';
  content: {
    title: string;
    description: string;
    headquartersCity: string;
    municipalitiesServed: string[];
    countiesServed: string[];
    state: string;
    emergencyRadiusMiles?: number;
  };
}

export interface CredentialBlockComponent extends BaseComponent {
  type: 'CredentialBlock';
  content: {
    title: string;
    licenseStatements: Array<{
      licenseType: string;
      licenseNumber: string;
      issuingState: string;
      holderName?: string;
    }>;
    insuranceVerified: boolean;
    complianceNote?: string;
  };
}

export interface FooterComponent extends BaseComponent {
  type: 'Footer';
  content: {
    companyName: string;
    address: string;
    phone: string;
    email: string;
    licenseNotice: string;
    quickLinks: Array<{ label: string; url: string }>;
    copyrightYear: number;
    disclaimerText?: string;
  };
}

export interface ProofOfWorkComponent extends BaseComponent {
  type: 'ProofOfWork';
  content: {
    sectionTitle: string;
    sectionSubtitle?: string;
    sectionDescription?: string;
    items: ProofItem[];
    filterByType?: boolean;
    showVerificationBadge?: boolean;
  };
}

export interface ProductGridComponent extends BaseComponent {
  type: 'ProductGrid';
  content: {
    sectionTitle: string;
    sectionDescription?: string;
    products: Array<{
      id?: string;
      slug: string;
      title?: string;
      name?: string;
      tagline: string;
      summary?: string;
      category: string;
      stage?: string;
      status?: 'PRODUCTION' | 'BETA' | 'ACTIVE_DEV' | 'INTERNAL' | 'STABLE' | 'ALPHA';
      highlights?: string[];
      capabilities?: string[];
      stackSummary?: string;
      ctaLabel?: string;
      pageSlug?: string;
      proofCount?: number;
      projectPageSlug?: string;
      externalUrl?: string;
    }>;
  };
}

export interface CaseStudySectionComponent extends BaseComponent {
  type: 'CaseStudySection';
  content: {
    projectSlug?: string;
    title: string;
    subtitle?: string;
    clientOrProduct?: string;
    overview?: string;
    problem?: string;
    problemStatement?: string;
    approach?: string;
    solutionArchitecture?: string;
    coreCapabilities?: Array<{ title: string; description: string }>;
    verifiedMetrics?: Array<{ metric: string; description: string }>;
    proofOfWork?: ProofItem[];
    currentState?: string;
    nextMilestone?: string;
  };
}

export interface StudioPortfolioComponent extends BaseComponent {
  type: 'StudioPortfolio';
  content: {
    title: string;
    subtitle?: string;
    description?: string;
    founderNote?: string;
    disciplines?: Array<{
      name: string;
      focus: string;
      capabilities: string[];
    }>;
    projects?: Array<{
      id?: string;
      title: string;
      domain: string;
      status: string;
      summary: string;
      tags: string[];
    }>;
  };
}

export type WebsiteComponent =
  | HeroComponent
  | TextSectionComponent
  | ServiceGridComponent
  | CallToActionComponent
  | ImageComponent
  | GalleryComponent
  | TestimonialComponent
  | FAQComponent
  | ContactFormComponent
  | ServiceAreaComponent
  | CredentialBlockComponent
  | FooterComponent
  | ProofOfWorkComponent
  | ProductGridComponent
  | CaseStudySectionComponent
  | StudioPortfolioComponent;

export interface WebsitePage {
  id: string;
  projectId: string;
  tenantId: string;
  slug: string;
  title: string;
  navOrder: number;
  isPublished: boolean;
  isIndex: boolean;
  metaTitle: string;
  metaDescription: string;
  canonicalUrl?: string;
  pageType: 'HOME' | 'SERVICE' | 'ABOUT' | 'SERVICE_AREA' | 'CONTACT' | 'PROJECTS' | 'FAQ' | 'LANDING';
  components: WebsiteComponent[];
  createdAt: string;
  updatedAt: string;
}

export interface WebsiteProject {
  id: string;
  tenantId: string;
  businessId: string;
  siteName: string;
  siteType: WebsiteSiteType;
  status: WebsiteProjectStatus;
  currentVersionId?: string;
  domain?: string;
  deploymentProvider: DeploymentProviderType;
  dataEnvironment: DataEnvironment;
  brandProfileId: string;
  businessContextId: string;
  approvalStatus: 'DRAFT' | 'REVIEW_REQUIRED' | 'APPROVED' | 'REJECTED';
  deploymentStatus: 'UNCONFIGURED' | 'PENDING' | 'DEPLOYED' | 'FAILED';
  evidenceRefs: string[];
  auditRefs: string[];
  createdAt: string;
  updatedAt: string;
}

export interface WebsiteVersion {
  id: string;
  projectId: string;
  tenantId: string;
  versionNumber: number;
  contentHash: string;
  pagesSnapshot: WebsitePage[];
  brandSnapshot: WebsiteBrandProfile;
  contextSnapshot: BusinessWebsiteContext;
  claimsAnalysis?: FactualClaimAnalysis[];
  approvedBy?: string;
  approverRole?: string;
  approvedAt?: string;
  approvalStatus: 'DRAFT' | 'REVIEW_REQUIRED' | 'APPROVED' | 'REJECTED';
  deploymentStatus: 'UNCONFIGURED' | 'PENDING' | 'DEPLOYED' | 'FAILED';
  deploymentProvider?: DeploymentProviderType;
  deploymentResult?: any;
  previousVersionId?: string;
  createdAt: string;
}

export interface CompiledSite {
  projectId: string;
  tenantId: string;
  versionId: string;
  contentHash: string;
  siteName: string;
  domain?: string;
  pages: Array<{
    slug: string;
    filename: string;
    html: string;
    title: string;
    metaDescription: string;
  }>;
  assets: Array<{
    path: string;
    content: string;
    contentType: string;
  }>;
  sitemapXml: string;
  robotsTxt: string;
  manifestJson: string;
  compiledAt: string;
}

export interface ConnectorVerification {
  provider: DeploymentProviderType;
  status: 'AUTHENTICATED' | 'UNAUTHENTICATED' | 'SIMULATED';
  accountRef?: string;
  verifiedAt?: string;
  capabilities: string[];
}

export interface DeploymentResult {
  success: boolean;
  deploymentId: string;
  deploymentUrl?: string;
  provider: DeploymentProviderType;
  versionId: string;
  deployedAt: string;
  manifestRef: string;
  logs: string[];
  error?: string;
}

export interface DeploymentHealth {
  status: WebsiteHealthState;
  httpStatus?: number;
  responseTimeMs?: number;
  sslValid: boolean;
  dnsResolved: boolean;
  lastCheckedAt: string;
  issues: string[];
}

export interface WebsiteDeploymentProvider {
  providerType: DeploymentProviderType;
  verifyConnection(): Promise<ConnectorVerification>;
  deploy(site: CompiledSite): Promise<DeploymentResult>;
  update(site: CompiledSite): Promise<DeploymentResult>;
  rollback(versionId: string, previousSite: CompiledSite): Promise<DeploymentResult>;
  getHealth(domain?: string): Promise<DeploymentHealth>;
}

export interface WebsiteDomain {
  id: string;
  projectId: string;
  tenantId: string;
  requestedDomain: string;
  registeredDomain?: string;
  status: DomainVerificationStatus;
  dnsRecords: Array<{
    type: 'A' | 'CNAME' | 'TXT';
    name: string;
    value: string;
    ttl: number;
    status: 'VERIFIED' | 'PENDING' | 'MISCONFIGURED';
  }>;
  sslStatus: 'NOT_PROVISIONED' | 'PENDING' | 'ACTIVE' | 'EXPIRED';
  ownershipVerified: boolean;
  verifiedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ----------------------------------------------------
// Public Forms, Consent & Attribution
// ----------------------------------------------------

export interface WebsitePublicFormSubmission {
  submissionId: string;
  tenantId: string;
  projectId: string;
  pageSlug: string;
  formType: string;
  formData: {
    fullName: string;
    phone: string;
    email?: string;
    serviceAddress: {
      street: string;
      city: string;
      state: string;
      postalCode: string;
    };
    requestedService: string;
    urgencyLevel?: 'EMERGENCY' | 'SAME_DAY' | 'NEXT_DAY' | 'FLEXIBLE';
    notes?: string;
  };
  consent: {
    purpose: string;
    communicationChannel: 'SMS' | 'PHONE' | 'EMAIL';
    disclosureVersion: string;
    disclosureTextHash: string;
    captureMethod: 'WEB_FORM_EXPLICIT';
    timestamp: string;
    recipientPhoneOrEmail: string;
    ipAddressSanitized: string;
  };
  tracking: {
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    utmContent?: string;
    utmTerm?: string;
    referringDomain?: string;
    landingPage?: string;
    ctaId?: string;
  };
  security: {
    honeypotTriggered: boolean;
    rateLimitPassed: boolean;
    sanitized: boolean;
    idempotencyKey?: string;
  };
  routedLeadId?: string;
  submittedAt: string;
}

export interface WebsiteAnalyticsEvent {
  id: string;
  tenantId: string;
  projectId: string;
  pageSlug: string;
  eventType:
    | 'PAGE_VIEW'
    | 'SERVICE_PAGE_VIEW'
    | 'CTA_CLICK'
    | 'PHONE_CLICK'
    | 'EMAIL_CLICK'
    | 'FORM_START'
    | 'FORM_SUBMIT'
    | 'QUOTE_REQUEST'
    | 'CALLBACK_REQUEST';
  targetIdentifier?: string; // e.g. cta_hero_quote or phone_main
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  referrerDomain?: string;
  sessionId: string;
  timestamp: string;
}

export interface WebsiteConversionFunnel {
  siteVisits: number;
  servicePageVisits: number;
  formStarts: number;
  formSubmissions: number;
  qualifiedLeads: number;
  estimatesCreated: number;
  jobsBooked: number;
  jobsCompleted: number;
  paymentsReceived: number;
  // Conversion Rates
  visitorToLeadRate: number;
  leadToQualifiedRate: number;
  leadToBookingRate: number;
  pageToLeadRate: number;
  ctaToLeadRate: number;
}

export interface WebsiteROIMetrics {
  tenantId: string;
  projectId: string;
  dataEnvironment: DataEnvironment;
  websiteGeneratedLeads: number;
  websiteAssistedLeads: number;
  attributableJobsCount: number;
  verifiedCollectedRevenue: number;
  attributableRevenue: number;
  attributableGrossProfit: number;
  hostingCost: number;
  campaignSpend: number;
  platformCost: number;
  netAttributableProfit: number;
  attributableROI: number; // Percentage e.g. 450%
  calculatedAt: string;
}

export interface WebsiteReconciliationFinding {
  code: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  title: string;
  description: string;
  entityId?: string;
  recommendation: string;
}

export interface WebsiteReconciliationReport {
  tenantId: string;
  projectId: string;
  evaluatedAt: string;
  overallStatus: 'PASS' | 'WARNING' | 'FAIL';
  findings: WebsiteReconciliationFinding[];
  checksRun: number;
}

export interface PresenceAgentRecommendation {
  id: string;
  tenantId: string;
  projectId: string;
  category: 'SEO_IMPROVEMENT' | 'CONVERSION_OPTIMIZATION' | 'CONTENT_GAP' | 'CTA_TUNING' | 'STALE_CONTENT';
  targetPageSlug?: string;
  title: string;
  rationale: string;
  proposedAction: string;
  proposedContentDelta?: any;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'PENDING_REVIEW' | 'APPROVED' | 'DISMISSED' | 'APPLIED';
  guardrailChecks: {
    preservesFactualTruth: boolean;
    requiresHumanApproval: boolean;
    touchesVerifiedLicense: boolean;
  };
  createdAt: string;
}
