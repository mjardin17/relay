import { TruthClaimStatus } from './products';

export type OpportunityLifecycleState =
  | 'DISCOVERED'
  | 'QUALIFIED'
  | 'ACTION_PROPOSED'
  | 'DRAFT_CREATED'
  | 'AWAITING_APPROVAL'
  | 'APPROVED'
  | 'QUEUED'
  | 'EXECUTED'
  | 'MEASURED'
  | 'BLOCKED'
  | 'FAILED'
  | 'CANCELLED';

export type UniversalRevenueActionType =
  | 'CREATE_LISTING'
  | 'CREATE_BOOK_PACKAGE'
  | 'CREATE_MARKETING_CAMPAIGN'
  | 'CREATE_WEBSITE_CONTENT'
  | 'CREATE_SOCIAL_CONTENT'
  | 'GENERATE_COMMERCIAL_PLAN'
  | 'PREPARE_PUBLISHING_PACKAGE'
  | 'FOLLOW_UP_WITH_LEAD';

export type RevenueExecutionMode = 'DRAFT_ONLY' | 'DRY_RUN' | 'SANDBOX' | 'LIVE';

export interface OpportunityEvidenceRef {
  id: string;
  claim: string;
  sourceType: string;
  confidence: 'High' | 'Medium' | 'Low';
  evidenceHash?: string;
  metric?: string;
}

export interface CampaignPackageDraft {
  productValueProposition: string;
  targetCustomer: {
    persona: string;
    industry: string;
    painPoint: string;
    buyerRole: string;
  };
  landingPageCopy: {
    headline: string;
    subheadline: string;
    keyBenefits: string[];
    callToAction: string;
  };
  socialPostVariants: Array<{
    platform: 'LINKEDIN' | 'TWITTER' | 'NEWSLETTER' | 'COMMUNITY';
    postText: string;
    hashtags: string[];
    characterCount: number;
  }>;
  callToAction: {
    label: string;
    targetUrl: string;
    actionType: 'DEMO' | 'PURCHASE' | 'CONSULTATION' | 'REGISTER';
  };
  suggestedChannelPlan: {
    channels: string[];
    cadence: string;
    estimatedReach: number;
    recommendedBudget: number;
  };
  trackingIdentifiers: {
    campaignId: string;
    utmSource: string;
    utmMedium: string;
    utmCampaign: string;
    conversionTag: string;
  };
  dryRunNotice: string;
  executionMode: RevenueExecutionMode;
  generatedAt: string;
  generatedByWorker: string;
}

export interface ApprovalRecord {
  approverId: string;
  approverName: string;
  approverRole: string;
  approvedAt: string;
  decision: 'APPROVED' | 'REJECTED' | 'REVISED';
  approvedVersionHash: string;
  notes?: string;
  signature?: string;
  policyVersion: string;
}

export interface ExecutionRecord {
  executionId: string;
  actionRecordId?: string;
  executionMode: RevenueExecutionMode;
  executedAt: string;
  status: 'SUCCEEDED' | 'FAILED_CLOSED' | 'DRY_RUN_COMPLETED' | 'PACKAGE_STAGED';
  resultPayload: Record<string, any>;
  evidenceHash: string;
  auditReference: string;
  confirmedByProvider: boolean;
}

export interface MeasurementRecord {
  measuredAt: string;
  realizedRevenue: number;
  actualCost: number;
  netGain: number;
  variance: number;
  roiPercent: number;
  attributableConversions: number;
  attributionMethod: string;
  evidence: string;
}

export interface RevenueOpportunity {
  id: string;
  tenantId: string;
  businessProfileId?: string;
  productId: string;
  productName?: string;
  assignedWorkerId: string;
  assignedWorkerName: string;
  title: string;
  category: string;
  description: string;
  actionType: UniversalRevenueActionType | string;
  lifecycleState: OpportunityLifecycleState;
  effort: 'Low' | 'Medium' | 'High';
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  revenueEstimate: number;
  costEstimate: number;
  confidenceScore: 'High' | 'Medium' | 'Low';
  supportingEvidence: OpportunityEvidenceRef[];
  deliverableDraft: Record<string, any> | CampaignPackageDraft | null;
  deliverableVersionHash: string | null;
  approvalRecord: ApprovalRecord | null;
  executionRecord: ExecutionRecord | null;
  measurementRecord: MeasurementRecord | null;
  actionRecordId?: string;
  affectedRecordsCount: number;
  detectedCondition?: string;
  recommendedPlaybook?: string;
  truthStatus: TruthClaimStatus;
  activatedAt?: string;
  createdAt: string;
  updatedAt: string;
}
