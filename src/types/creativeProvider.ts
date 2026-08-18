export type CreativeProviderType =
  | 'RELAY_NATIVE'
  | 'LOVABLE'
  | 'GOOGLE_AI_STUDIO'
  | 'FIREBASE_STUDIO'
  | 'OTHER_FREE_PROVIDER';

export type CreativeProviderQuotaState =
  | 'FREE_AVAILABLE'
  | 'FREE_RATE_LIMITED'
  | 'FREE_QUOTA_EXHAUSTED'
  | 'AUTH_REQUIRED'
  | 'AUTH_FAILED'
  | 'PAID_ONLY'
  | 'UNAVAILABLE';

export interface CreativeBriefProduct {
  name: string;
  slug: string;
  tagline: string;
  category: string;
  stage: 'PRODUCTION DOGFOOD' | 'PRODUCTION' | 'ALPHA' | 'DEVELOPMENT';
  problemSolved: string;
  solutionArchitecture: string;
  keyMetric: string;
  tags: string[];
}

export interface CreativeBriefAutomationStep {
  step: number;
  id: 'PROBLEM' | 'IDEA' | 'BUILD' | 'TEST' | 'AUTOMATE' | 'LAUNCH';
  label: string;
  tagline: string;
  detail: string;
  statusBadge: string;
}

export interface CreativeBrief {
  tenantId: string;
  brandName: string;
  tagline: string;
  creativeDirection: string;
  visualPersonality: string[];
  heroHeadline: string;
  heroSubhead: string;
  colorPalette: {
    background: string;
    surface: string;
    surfaceElevated: string;
    boneOffWhite: string;
    copperRust: string;
    copperAccent: string;
    deepGreen: string;
    deepGreenLight: string;
    textPrimary: string;
    textMuted: string;
    border: string;
  };
  typography: {
    headingFont: string;
    bodyFont: string;
    style: 'EDITORIAL_INVENTOR' | 'TECHNICAL_MODERN' | 'CLEAN_MINIMAL';
  };
  automationFlow: CreativeBriefAutomationStep[];
  products: CreativeBriefProduct[];
  prohibitedVisualElements: string[];
  sanitizedForThirdParty: boolean;
}

export interface CreativePreviewResult {
  previewId: string;
  providerId: string;
  providerType: CreativeProviderType;
  renderedHtml: string;
  assets: Array<{ path: string; content: string }>;
  generationDurationMs: number;
  quotaStatusAtGeneration: CreativeProviderQuotaState;
  isFreeTier: boolean;
  revisionCount: number;
  summary: string;
  timestamp: string;
}

export interface CreativeArtifact {
  previewId: string;
  providerId: string;
  providerType: CreativeProviderType;
  files: Record<string, string>;
  metadata: {
    providerName: string;
    generatedAt: string;
    license: string;
    revision: number;
  };
}

export interface ProviderAvailabilityResult {
  available: boolean;
  state: CreativeProviderQuotaState;
  reason: string;
}

export interface ProviderQuotaResult {
  quotaState: CreativeProviderQuotaState;
  freeUnitsRemaining?: number;
  resetsAt?: string;
  isPaidOnly: boolean;
  costWarning?: string;
}

export interface ProviderMetadata {
  id: string;
  name: string;
  providerType: CreativeProviderType;
  description: string;
  supportsFastPreview: boolean;
  supportsRevisions: boolean;
  supportsArtifactExport: boolean;
  defaultPriorityScore: number;
}

export interface CreativeWebsiteProvider {
  id: string;
  providerType: CreativeProviderType;
  getMetadata(): ProviderMetadata;
  checkAvailability(): Promise<ProviderAvailabilityResult>;
  checkFreeQuota(): Promise<ProviderQuotaResult>;
  generatePreview(brief: CreativeBrief): Promise<CreativePreviewResult>;
  revisePreview(previewId: string, currentHtml: string, instruction: string, brief: CreativeBrief): Promise<CreativePreviewResult>;
  exportArtifact(preview: CreativePreviewResult): Promise<CreativeArtifact>;
}

export interface ProviderEvaluationNote {
  providerId: string;
  type: CreativeProviderType;
  state: CreativeProviderQuotaState;
  score: number;
  isFreeEligible: boolean;
  note: string;
}

export interface FallbackEvent {
  failedProviderId: string;
  failedProviderType: CreativeProviderType;
  reason: string;
  nextProviderId: string;
  timestamp: string;
}

export interface CreativeRoutingDecision {
  requestId: string;
  tenantId: string;
  selectedProviderId: string;
  selectedProviderType: CreativeProviderType;
  selectionReason: string;
  freePaidClassification: 'FREE' | 'PAID_REJECTED';
  evaluatedProviders: ProviderEvaluationNote[];
  fallbackEvents: FallbackEvent[];
  generationDurationMs: number;
  artifactRef?: string;
  timestamp: string;
}

export interface HumanCostAuthorizationNotice {
  requiresHumanApproval: true;
  providerId: string;
  providerType: CreativeProviderType;
  expectedChargeModel: string;
  reasonFreeUnavailable: string;
  status: 'PENDING_HUMAN_CONFIRMATION' | 'DECLINED' | 'APPROVED';
  timestamp: string;
}
