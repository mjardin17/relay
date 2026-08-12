import { ConfidenceLevel } from './evidence';

export type LaunchProgramStageId =
  | 'stage_1_foundation'
  | 'stage_2_pain_offer'
  | 'stage_3_demo_assets'
  | 'stage_4_prospecting'
  | 'stage_5_strategy_closing'
  | 'stage_6_onboarding'
  | 'stage_7_deployment'
  | 'stage_8_results_growth';

export interface LaunchProgramStage {
  id: LaunchProgramStageId;
  dayRange: string; // e.g. "Days 1–7"
  title: string;
  objective: string;
  requiredInputs: string[];
  generatedOutputs: string[];
  recommendedNextAction: string;
  completionCriteria: string[];
  evidenceRequirements: string[];
  approvalRequirements: string[];
  blockers: string[];
  progressState: 'not_started' | 'in_progress' | 'completed' | 'blocked';
  progressPercentage: number;
  automationOpportunities: string[];
  actualResultsSummary?: string;
}

export interface ProviderBusinessProfile {
  providerName: string;
  agencyBrand: string;
  serviceGoals: string;
  availableSkills: string[];
  preferredIndustries: string[];
  geographicScope: string;
  clientCapacityMax: number;
  currentClientsCount: number;
  targetMonthlyIncome: number;
  currentMonthlyIncome: number;
  hourlyRateBaseline: number;
  selectedNicheId?: string;
  constraints: string[];
  baselineMetrics: {
    leadResponseTimeMinutes: number;
    avgDealSize: number;
    salesCycleDays: number;
  };
}

export interface NicheCandidate {
  id: string;
  name: string;
  industryCategory: string;
  painSeverityScore: number; // 1-10
  abilityToPayScore: number; // 1-10
  easeOfAccessScore: number; // 1-10
  urgencyScore: number; // 1-10
  salesCycleDaysEstimate: number;
  automationPotentialScore: number; // 1-10
  complianceRiskLevel: 'Low' | 'Medium' | 'High';
  estimatedMonthlyRoiPerClient: number;
  overallScore: number; // 0-100
  keyPainPoints: string[];
  primaryDecisionMakerRole: string;
  evidenceSummary: string;
  recommended: boolean;
  selectedByOwner: boolean;
}

export interface NichePainPoint {
  id: string;
  nicheId: string;
  problemTitle: string;
  category: 'missed_communications' | 'slow_lead_response' | 'failed_followup' | 'scheduling_leakage' | 'admin_bottleneck' | 'cash_flow_leak';
  observedSymptom: string;
  financialCostEstimateMonthly: number;
  operationalHoursWastedMonthly: number;
  supportingEvidence: string;
  confidenceScore: ConfidenceLevel;
  recommendedSolution: string;
  requiredValidation: string;
}

export interface ProductizedOffer {
  id: string;
  offerTitle: string;
  targetNiche: string;
  primaryProblemSolved: string;
  transformationOutcome: string;
  deliverables: string[];
  exclusions: string[];
  pricing: {
    setupFee: number;
    monthlyRetainer: number;
    performanceBonus?: string;
  };
  guaranteeTerms: string;
  measurableSuccessCriteria: string[];
  approvalState: 'draft' | 'pending_review' | 'approved';
  approvedAt?: string;
}

export interface DemoAsset {
  id: string;
  title: string;
  solutionType: string;
  targetScenario: string;
  sampleWorkflowSteps: string[];
  interactiveScript: string;
  roiCalculatorPreset: {
    leadsPerMonth: number;
    avgClientValue: number;
    estimatedConversionLiftPct: number;
    projectedMonthlyGain: number;
  };
  sampleLeadInteractionPreview: {
    leadMessage: string;
    aiResponse: string;
    actionTaken: string;
  };
  evidenceUsed: string[];
  approvalState: 'draft' | 'approved';
}

export interface ProspectRecord {
  id: string;
  companyName: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  websiteUrl: string;
  industry: string;
  estimatedRevenue: string;
  qualificationScore: number; // 0-100
  fitScore: number;
  painScore: number;
  reachabilityScore: number;
  evidenceStrength: ConfidenceLevel;
  painHypothesis: string;
  outreachStatus: 'not_contacted' | 'draft_queued' | 'outreach_sent' | 'replied' | 'meeting_booked' | 'opted_out';
  consentState: 'verified_optin' | 'business_inquiry_allowed' | 'opted_out';
  appointmentScheduledAt?: string;
  estimatedDealValue: number;
  notes: string;
  nextAction: string;
}

export interface OutreachDraft {
  id: string;
  prospectId: string;
  prospectName: string;
  companyName: string;
  channel: 'email' | 'linkedin' | 'sms';
  subjectLine: string;
  messageBody: string;
  personalizedEvidencePoints: string[];
  safetyChecks: {
    optOutChecked: boolean;
    factualEvidenceVerified: boolean;
    complianceRulesPassed: boolean;
  };
  approvalStatus: 'pending_owner_approval' | 'approved' | 'rejected' | 'dispatched';
  dispatchedAt?: string;
  responseOutcome?: string;
}

export interface StrategyCallBrief {
  id: string;
  prospectId: string;
  companyName: string;
  contactName: string;
  discoveredEvidenceSummary: string[];
  unansweredQuestions: string[];
  discoveryCallFlow: {
    step: number;
    phase: string;
    scriptQuestions: string[];
  }[];
  postCallSummary?: {
    capturedPain: string;
    currentProcessCost: number;
    urgencyLevel: 'Critical' | 'High' | 'Medium';
    budgetConfirmed: boolean;
    decisionMakerConfirmed: boolean;
    targetCloseDate: string;
  };
}

export interface ProposalRecord {
  id: string;
  prospectId: string;
  clientName: string;
  companyName: string;
  proposalTitle: string;
  selectedOfferTitle: string;
  setupFee: number;
  monthlyRetainer: number;
  deliverablesScope: string[];
  projectedMonthlyRoi: number;
  status: 'draft' | 'pending_approval' | 'sent' | 'accepted' | 'rejected';
  sentAt?: string;
  decisionAt?: string;
  rejectionReason?: string;
}

export interface ClientOnboardingPortal {
  id: string;
  clientId: string;
  clientCompanyName: string;
  status: 'pending_intake' | 'in_progress' | 'completed';
  completenessScore: number; // 0-100
  collectedDetails: {
    businessHours: string;
    locationsCount: number;
    primaryServicesList: string[];
    faqItemsCount: number;
    escalationContact: string;
    brandVoiceNotes: string;
    activeIntegrations: string[];
  };
  credentialsVaultStatus: {
    crmAccessGranted: boolean;
    calendarAccessGranted: boolean;
    phoneSystemAccessGranted: boolean;
    encryptedInVault: boolean;
  };
  missingRequirements: string[];
  implementationPlan: {
    milestone: string;
    targetDays: number;
    status: 'pending' | 'in_progress' | 'completed';
  }[];
}

export interface SolutionDeploymentBlueprint {
  id: string;
  clientId: string;
  clientCompanyName: string;
  serviceType:
    | 'ai_receptionist'
    | 'missed_call_recovery'
    | 'lead_response_assistant'
    | 'appointment_scheduler'
    | 'estimate_followup'
    | 'customer_support'
    | 'review_request'
    | 'reactivation_campaign';
  blueprintName: string;
  triggerEvent: string;
  requiredInputs: string[];
  businessRules: string[];
  aiPromptInstructions: string;
  toolsAndIntegrations: string[];
  approvalGatesRequired: boolean;
  escalationPath: string;
  failureHandlingStrategy: string;
  retryMaxAttempts: number;
  idempotencyKeyPrefix: string;
  testCases: {
    testName: string;
    inputPayload: string;
    expectedOutcome: string;
    passed: boolean;
  }[];
  rollbackControlEnabled: boolean;
  status: 'configured' | 'tested' | 'deployed_live' | 'paused';
  verifiedEvidenceOfFunction: boolean;
  deployedAt?: string;
}

export interface ClientResultMetrics {
  id: string;
  clientId: string;
  clientCompanyName: string;
  baselineMetrics: {
    monthlyLeads: number;
    avgResponseTimeMinutes: number;
    appointmentsBookedMonthly: number;
    monthlyRevenue: number;
  };
  actualResultsCurrent: {
    leadsRecoveredTotal: number;
    avgResponseTimeSeconds: number;
    appointmentsBookedMonthly: number;
    attributedMonthlyRevenue: number;
    hoursSavedMonthly: number;
    customerSatisfactionScore: number;
  };
  projectedVsActualValue: {
    projectedMonthlyGain: number;
    actualMonthlyGain: number;
    variancePercentage: number;
  };
  caseStudyDraft: {
    headline: string;
    challenge: string;
    solutionDeployed: string;
    verifiedResults: string;
    testimonialQuote: string;
    approvedByClient: boolean;
  };
  retentionExpansionOpportunity: {
    upsellRecommendation: string;
    referralRequestReady: boolean;
    next30DayOptimizationPlan: string[];
  };
}
