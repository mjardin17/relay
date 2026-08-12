export type PlatformId =
  | 'facebook'
  | 'instagram'
  | 'threads'
  | 'x'
  | 'linkedin'
  | 'tiktok'
  | 'youtube'
  | 'pinterest'
  | 'bluesky'
  | 'reddit'
  | 'discord'
  | 'telegram';

export type RelayTab =
  | 'electrical_workflow'
  | 'launch_program'
  | 'advisor'
  | 'intelligence'
  | 'revenue'
  | 'roi'
  | 'execution'
  | 'data_quality'
  | 'recommendations'
  | 'marketing'
  | 'customer_growth'
  | 'operations'
  | 'studio'
  | 'repurposer'
  | 'schedule'
  | 'analytics'
  | 'trends'
  | 'brand'
  | 'media'
  | 'team'
  | 'automation'
  | 'agents'
  | 'integrations';

export interface BusinessProfile {
  name: string;
  industry: string;
  websiteUrl: string;
  mrr: number;
  arr: number;
  productsCount: number;
  activeCustomers: number;
  churnRate: number;
  averageDealSize: number;
  competitors: string[];
  crmConnected: boolean;
  primaryBottleneck: string;
}

export interface HealthScoreComponent {
  score: number;
  status: 'Optimal' | 'Strong' | 'Needs Acceleration' | 'Critical';
  breakdown: string;
}

export interface BusinessHealthScore {
  overall: number; // 0-100
  revenueEfficiency: HealthScoreComponent;
  leadVelocity: HealthScoreComponent;
  operationalMargin: HealthScoreComponent;
  brandAuthority: HealthScoreComponent;
  customerRetention: HealthScoreComponent;
  keyBottlenecks: { issue: string; impact: string; priority: 'Critical' | 'High' | 'Medium' }[];
  strengths: string[];
  potentialMonthlyUpside: string;
}

export interface RevenueOpportunity {
  id: string;
  title: string;
  category: 'Missed Sales' | 'Lead Recovery' | 'Upsell/Cross-sell' | 'Seasonal/Local' | 'Referral' | 'Subscription';
  description: string;
  estimatedMonthlyImpact: number; // $ value
  effort: 'Low' | 'Medium' | 'High';
  actionableCampaignType: string;
  activated: boolean;
  metrics: { conversionBoost: string; paybackDays: string };
}

export type MarketingChannelType =
  | 'blog'
  | 'email'
  | 'newsletter'
  | 'landing_page'
  | 'ad'
  | 'video'
  | 'social'
  | 'sms'
  | 'review_request';

export interface MarketingCampaign {
  id: string;
  name: string;
  channelTypes: MarketingChannelType[];
  targetAudience: string;
  projectedROI: string;
  status: 'active' | 'draft' | 'completed' | 'scheduled';
  leadsGenerated: number;
  revenueAttributed: string;
  createdAt: string;
}

export interface CustomerWorkflow {
  id: string;
  title: string;
  type: 'lead_nurture' | 'onboarding' | 'reminder' | 'cart_recovery' | 'loyalty' | 'referral' | 'reactivation';
  trigger: string;
  steps: string[];
  activeCount: number;
  conversionRate: string;
  enabled: boolean;
}

export interface OperationalEfficiencyItem {
  id: string;
  taskName: string;
  department: string;
  currentManualHoursPerWeek: number;
  hourlyCost: number;
  monthlyCost: number;
  aiAutomationSolution: string;
  projectedHoursSaved: number;
  projectedMonthlySavings: number;
  status: 'recommended' | 'in_progress' | 'automated';
}

export interface ExecutiveBriefing {
  weekOf: string;
  overallHealthScore: number;
  mrr: string;
  lossPoints: string[];
  weeklyTopActions: { priority: number; title: string; reasoning: string; impact: string }[];
  underperformingProduct: { name: string; issue: string; remedy: string };
  biggestGrowthOpportunity: { area: string; revenueImpact: string; requirement: string };
  strategicAdvisorNotes: string;
}

export interface SocialPlatform {
  id: PlatformId;
  name: string;
  icon: string;
  color: string;
  characterLimit: number;
  supportedMedia: ('image' | 'video' | 'carousel' | 'link' | 'poll' | 'document')[];
  formatRules: string;
  bestPostingTimes: string[];
  connected: boolean;
  handle?: string;
  followers?: number;
}

export type ContentStatus = 'draft' | 'under_review' | 'approved' | 'scheduled' | 'published' | 'failed';

export interface ContentPost {
  id: string;
  title: string;
  body: string;
  platforms: PlatformId[];
  platformSpecificCopy?: Partial<Record<PlatformId, string>>;
  mediaUrls?: string[];
  hashtags: string[];
  status: ContentStatus;
  scheduledAt?: string;
  publishedAt?: string;
  author: string;
  campaignId?: string;
  aiOptimized?: boolean;
  engagementScore?: number; // 0-100
  notes?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Campaign {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'planning' | 'completed' | 'paused';
  startDate: string;
  endDate: string;
  targetPlatforms: PlatformId[];
  goal: string;
  budget?: string;
  postIds: string[];
  color: string;
}

export interface BrandVoice {
  name: string;
  primaryTone: string;
  secondaryTones: string[];
  styleGuardrails: string[];
  targetAudiences: {
    personaName: string;
    description: string;
    painPoints: string[];
  }[];
  approvedHashtags: string[];
  bannedKeywords: string[];
  defaultCTAs: string[];
  colorPalette: { name: string; hex: string }[];
  logoUrl: string;
  fontFamily: string;
}

export interface AnalyticsSummary {
  totalReach: number;
  totalReachChange: number; // percentage
  impressions: number;
  impressionsChange: number;
  totalEngagement: number;
  engagementChange: number;
  totalClicks: number;
  clicksChange: number;
  totalShares: number;
  followersCount: number;
  followersGrowth: number;
  estimatedROI: string;
  topPerformingPlatform: PlatformId;
}

export interface PlatformMetrics {
  platform: PlatformId;
  reach: number;
  engagementRate: number;
  postsCount: number;
  topPostTitle: string;
  change: number;
}

export interface TrendTopic {
  id: string;
  topic: string;
  category: string;
  volume: string;
  momentum: 'rising' | 'peaking' | 'stable';
  relatedHashtags: string[];
  relevanceScore: number;
  suggestedAngle: string;
}

export interface MediaAsset {
  id: string;
  title: string;
  type: 'image' | 'video' | 'document' | 'template' | 'graphic';
  url: string;
  tags: string[];
  fileSize: string;
  dimensions?: string;
  createdAt: string;
  aiGenerated?: boolean;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Content Lead' | 'Creator' | 'Approver' | 'Viewer';
  avatar: string;
  active: boolean;
  pendingApprovalsCount: number;
}

export interface AutomationWorkflow {
  id: string;
  title: string;
  trigger: string;
  actions: string[];
  enabled: boolean;
  lastRun?: string;
  runCount: number;
  category: 'rss' | 'social_repurpose' | 'recurring' | 'webhook';
}

export interface AIAgent {
  id: string;
  name: string;
  role: string;
  description: string;
  avatar: string;
  badge: string;
  capabilities: string[];
  promptSystem: string;
}

export interface AppIntegration {
  id: string;
  name: string;
  category: 'AI Model' | 'Design' | 'Storage' | 'CMS' | 'Marketing' | 'Social Mgmt';
  status: 'connected' | 'mock_mode' | 'credentials_required';
  description: string;
  icon: string;
  authType: 'API Key' | 'OAuth 2.0' | 'Webhook';
  lastSync?: string;
}
