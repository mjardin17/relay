// Canonical Business Data Model & Growth Evidence Types for Relay v2.0

export type WorkspaceDataMode = 'demo' | 'live' | 'mixed' | 'manual';

export type ConfidenceLevel = 'Verified' | 'High' | 'High confidence' | 'Moderate' | 'Low' | 'Estimated' | 'Insufficient Data';

export type IndustryTemplate = 'saas' | 'ecommerce' | 'agency' | 'local_service' | 'professional_services' | 'creator' | 'retail' | 'marketplace' | 'subscription';

export type IntegrationProviderId =
  | 'stripe'
  | 'shopify'
  | 'hubspot'
  | 'salesforce'
  | 'google_ads'
  | 'meta_ads'
  | 'ga4'
  | 'gmail'
  | 'twilio'
  | 'klaviyo'
  | 'csv_import'
  | 'webhook';

export interface ConnectedDataSource {
  id: string;
  provider: IntegrationProviderId;
  name: string;
  category: 'Revenue & Commerce' | 'CRM & Sales' | 'Advertising' | 'Analytics' | 'Communication' | 'Files & Data';
  status: 'connected' | 'syncing' | 'error' | 'disconnected';
  lastSyncAt: string;
  recordsIngested: number;
  failedRecords: number;
  healthScore: number; // 0-100
  authType: 'oauth2' | 'api_key' | 'webhook' | 'file';
  errorMessage?: string;
}

export interface SourceRecord {
  id: string;
  sourcePlatform: IntegrationProviderId;
  externalSourceId: string;
  entityType: 'customer' | 'lead' | 'deal' | 'order' | 'invoice' | 'subscription' | 'campaign' | 'activity';
  sourceTimestamp: string;
  ingestionTimestamp: string;
  lastSyncTimestamp: string;
  organizationId: string;
  dataQualityStatus: 'valid' | 'warning' | 'conflict' | 'stale';
  rawPayload: Record<string, any>;
}

// Canonical Entities
export interface Customer {
  id: string;
  externalId: string;
  sourcePlatform: IntegrationProviderId;
  name: string;
  email: string;
  phone?: string;
  companyName?: string;
  status: 'lead' | 'active_customer' | 'churn_risk' | 'churned' | 'advocate';
  mrr: number;
  totalSpent: number;
  npsScore?: number;
  lastActiveAt: string;
  createdAt: string;
  tags: string[];
}

export interface Lead {
  id: string;
  externalId: string;
  sourcePlatform: IntegrationProviderId;
  name: string;
  email: string;
  phone?: string;
  companyName?: string;
  estimatedValue: number;
  pipelineStage: 'new_inbound' | 'discovery' | 'demo_scheduled' | 'proposal' | 'negotiation' | 'closed_lost' | 'dormant';
  responseDelayHours: number;
  lastContactedAt: string;
  createdAt: string;
  ownerName: string;
  sourceCampaign?: string;
}

export interface Deal {
  id: string;
  externalId: string;
  sourcePlatform: IntegrationProviderId;
  title: string;
  customerName: string;
  value: number;
  stage: string;
  probability: number;
  closedAt?: string;
  createdAt: string;
}

export interface Subscription {
  id: string;
  externalId: string;
  sourcePlatform: IntegrationProviderId;
  customerEmail: string;
  planName: string;
  mrr: number;
  billingInterval: 'monthly' | 'yearly';
  status: 'active' | 'past_due' | 'canceled' | 'trialing';
  startDate: string;
  renewalDate: string;
}

export interface Invoice {
  id: string;
  externalId: string;
  sourcePlatform: IntegrationProviderId;
  customerEmail: string;
  amount: number;
  status: 'paid' | 'unpaid' | 'overdue' | 'refunded';
  dueDate: string;
  paidAt?: string;
}

// Provenance & Evidence Graph Entities
export interface CalculationFormula {
  formulaIdentifier: string;
  formulaVersion: string;
  formulaExpression: string; // e.g. "Unattended Pipeline * Historical Recovery Rate (26%)"
  inputVariables: Record<string, number | string>;
  assumptions: string[];
  calculatedAt: string;
  outputValue: number;
  currency: string;
  confidence: ConfidenceLevel;
  explanation: string;
}

export interface EvidenceItem {
  id: string;
  title: string;
  category: string;
  sourceSystems: IntegrationProviderId[];
  sourceRecordIds: string[];
  observationPeriod: string;
  calculation: CalculationFormula;
  confidence: ConfidenceLevel;
  confidenceFactors: { factor: string; impact: 'positive' | 'negative' | 'neutral' }[];
  dataFreshnessMinutes: number;
  missingDataWarnings: string[];
  sampleRecordsPreview: { label: string; detail: string; value: string }[];
}

export type OpportunityStatus =
  | 'Detected'
  | 'Under Review'
  | 'Approved'
  | 'Activated'
  | 'Running'
  | 'Awaiting Results'
  | 'Successful'
  | 'Partially Successful'
  | 'Unsuccessful'
  | 'Dismissed'
  | 'Archived';

export interface VerifiedOpportunity {
  id: string;
  title: string;
  category:
    | 'Missed Sales'
    | 'Lead Recovery'
    | 'Upsell/Cross-sell'
    | 'Seasonal/Local'
    | 'Referral'
    | 'Subscription'
    | 'Operational Cost Reduction'
    | 'Margin Leakage'
    | 'Churn Risk';
  detectedCondition: string;
  affectedRecordsCount: number;
  affectedRecordPreview: string[];
  estimatedMonthlyValue: number;
  estimatedAnnualValue: number;
  actualRealizedMonthlyValue: number;
  effort: 'Low' | 'Medium' | 'High';
  expectedTimeToResultDays: number;
  confidence: ConfidenceLevel;
  evidence: EvidenceItem;
  recommendedPlaybook: string;
  actionType: 'email_sequence' | 'sms_campaign' | 'sales_task' | 'customer_workflow' | 'ai_agent_deployment' | 'pricing_update';
  status: OpportunityStatus;
  owner: string;
  createdAt: string;
  activatedAt?: string;
}

// Human Approval & Execution Ledger
export type ActionType =
  | 'email_sequence'
  | 'sms_campaign'
  | 'crm_task'
  | 'sales_task'
  | 'customer_workflow'
  | 'ai_agent_job'
  | 'ai_agent_deployment'
  | 'pricing_update'
  | 'ad_campaign'
  | 'content_distribution';

export interface ApprovalRequest {
  id: string;
  opportunityId: string;
  actionTitle: string;
  requestedBy: string;
  approverRole: 'Executive' | 'Finance' | 'Marketing' | 'Sales' | 'Legal';
  status: 'pending' | 'approved' | 'rejected';
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  reasoning: string;
  financialImpactEstimate: number;
  targetCount: number;
  createdAt: string;
  decidedAt?: string;
  decidedBy?: string;
  comments?: string;
}

export interface ExecutionRecord {
  id: string;
  activationId: string;
  opportunityId: string;
  actionType: ActionType;
  actor: string;
  executorType: 'ai_agent' | 'user' | 'automated_workflow';
  targetEntityCount: number;
  status: 'queued' | 'executing' | 'completed' | 'failed' | 'rolled_back';
  startedAt: string;
  completedAt?: string;
  costIncurred: number;
  apiCallsCount: number;
  outputSummary: string;
  errorMessage?: string;
  canRollback: boolean;
}

// Closed-Loop Revenue Attribution
export type AttributionModelType =
  | 'direct'
  | 'first_touch'
  | 'last_touch'
  | 'linear'
  | 'position_based'
  | 'time_decay'
  | 'workflow_comparison';

export interface AttributionRecord {
  id: string;
  opportunityId: string;
  campaignId?: string;
  workflowId?: string;
  customerEmail: string;
  dealValue: number;
  attributedRevenue: number;
  attributionModel: AttributionModelType;
  touchpointsCount: number;
  controlGroupComparison?: {
    enrolledConversionRate: number;
    controlConversionRate: number;
    incrementalLiftRevenue: number;
  };
  confidence: ConfidenceLevel;
  timestamp: string;
}

export interface RecommendationEvaluation {
  id: string;
  opportunityId: string;
  opportunityTitle: string;
  predictedValue: number;
  realizedValue: number;
  variancePercentage: number; // e.g. -12% or +15%
  accuracyScore: number; // 0-100%
  timeToResultDaysPredicted: number;
  timeToResultDaysActual: number;
  status: 'Overestimated' | 'Accurate' | 'Underestimated' | 'Failed Execution';
  feedbackNotes: string;
  learningAdjustmentApplied: string;
}

export interface DataQualityIssue {
  id: string;
  provider: IntegrationProviderId;
  issueType: 'missing_field' | 'duplicate_contact' | 'stale_sync' | 'unmapped_stage' | 'rate_limit';
  severity: 'low' | 'medium' | 'high';
  description: string;
  affectedCount: number;
  suggestedFix: string;
  createdAt: string;
}
