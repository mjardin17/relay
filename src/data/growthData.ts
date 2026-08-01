import {
  BusinessProfile,
  BusinessHealthScore,
  RevenueOpportunity,
  MarketingCampaign,
  CustomerWorkflow,
  OperationalEfficiencyItem,
  ExecutiveBriefing
} from '../types/relay';

export const INITIAL_BUSINESS_PROFILE: BusinessProfile = {
  name: 'Empire Tech Solutions',
  industry: 'Enterprise B2B Software & AI Automation',
  websiteUrl: 'https://empireos.io',
  mrr: 142000,
  arr: 1704000,
  productsCount: 4,
  activeCustomers: 1240,
  churnRate: 1.8,
  averageDealSize: 18500,
  competitors: ['HubSpot', 'Sprout Social', 'Salesforce Marketing Cloud', 'Hootsuite'],
  crmConnected: true,
  primaryBottleneck: 'Lead response latency (>4h delay) and unoptimized trial onboarding dropoff'
};

export const INITIAL_HEALTH_SCORE: BusinessHealthScore = {
  overall: 86,
  revenueEfficiency: {
    score: 84,
    status: 'Optimal',
    breakdown: 'LTV:CAC ratio is 4.2x with strong Gross Margin (82%). Organic acquisition accounts for 64% of sales pipeline.'
  },
  leadVelocity: {
    score: 79,
    status: 'Needs Acceleration',
    breakdown: 'Lead response time averages 4.2 hours. 22% of inbound demo requests drop off before first discovery call.'
  },
  operationalMargin: {
    score: 91,
    status: 'Strong',
    breakdown: 'AI automation handles 72% of routine content repurposing, social posting, and initial lead routing.'
  },
  brandAuthority: {
    score: 88,
    status: 'Strong',
    breakdown: 'High engagement across LinkedIn & YouTube. Recognized as top 5 AI workflow platform in B2B tech.'
  },
  customerRetention: {
    score: 86,
    status: 'Optimal',
    breakdown: 'Monthly churn remains low at 1.8% with Net Dollar Retention (NDR) sitting at a healthy 112%.'
  },
  keyBottlenecks: [
    {
      issue: 'Inbound Lead Delay (>4 hours to response)',
      impact: '-$14,500/mo in leaked pipeline revenue',
      priority: 'Critical'
    },
    {
      issue: 'Dormant Trial Accounts (No onboarding activity in 7 days)',
      impact: '-$8,200/mo in missed MRR conversion',
      priority: 'High'
    },
    {
      issue: 'Manual Invoice & Contract Renewal Reminders',
      impact: '28 hours/week spent on manual admin tasks',
      priority: 'Medium'
    }
  ],
  strengths: [
    'Net Dollar Retention of 112% (Strong Expansion Revenue)',
    'High organic search authority in AI & Automation space',
    'Automated multi-channel social distribution pipeline via Relay'
  ],
  potentialMonthlyUpside: '+$34,200/mo'
};

export const INITIAL_REVENUE_OPPORTUNITIES: RevenueOpportunity[] = [
  {
    id: 'opp-1',
    title: 'Instant Speed-to-Lead Follow-up Automation',
    category: 'Missed Sales',
    description: 'Trigger SMS and personalized AI email within 60 seconds of inbound form submission. Reduces lead leakage by 65%.',
    estimatedMonthlyImpact: 14500,
    effort: 'Low',
    actionableCampaignType: 'Speed-to-Lead AI Sequence',
    activated: true,
    metrics: { conversionBoost: '+38%', paybackDays: '2 Days' }
  },
  {
    id: 'opp-2',
    title: 'Dormant Lead Re-Engagement Campaign',
    category: 'Lead Recovery',
    description: 'Target 480 past leads who inquired in the last 90 days but did not buy with a personalized AI ROI case study.',
    estimatedMonthlyImpact: 8200,
    effort: 'Low',
    actionableCampaignType: 'Re-engagement Email & SMS',
    activated: false,
    metrics: { conversionBoost: '+14%', paybackDays: '5 Days' }
  },
  {
    id: 'opp-3',
    title: 'Pro-to-Enterprise Security Add-on Upsell',
    category: 'Upsell/Cross-sell',
    description: 'Offer dedicated SSO, audit logs, and custom AI agent limits to 210 growing Pro teams.',
    estimatedMonthlyImpact: 6400,
    effort: 'Medium',
    actionableCampaignType: 'In-App Upsell & Email Drip',
    activated: false,
    metrics: { conversionBoost: '+18%', paybackDays: '7 Days' }
  },
  {
    id: 'opp-4',
    title: 'Automated Customer Advocate Referral Flywheel',
    category: 'Referral',
    description: 'Trigger a referral request when a customer reaches 60 days active or achieves a 90+ NPS score with a $200 credit incentive.',
    estimatedMonthlyImpact: 3800,
    effort: 'Low',
    actionableCampaignType: 'Referral Engine Workflow',
    activated: true,
    metrics: { conversionBoost: '+22%', paybackDays: '4 Days' }
  },
  {
    id: 'opp-5',
    title: 'Q3 Enterprise AI Automation Bundle',
    category: 'Seasonal/Local',
    description: 'Launch a limited-time upgrade bundle combining Relay Social Automation + Custom Gemini Agent tuning.',
    estimatedMonthlyImpact: 5100,
    effort: 'Medium',
    actionableCampaignType: 'Multi-Channel Campaign',
    activated: false,
    metrics: { conversionBoost: '+25%', paybackDays: '10 Days' }
  },
  {
    id: 'opp-6',
    title: 'Tiered Usage & Storage Expansion Billing',
    category: 'Subscription',
    description: 'Introduce automatic usage tiers for high-volume media storage and multi-agent execution.',
    estimatedMonthlyImpact: 4200,
    effort: 'High',
    actionableCampaignType: 'Usage Limit Nudge',
    activated: false,
    metrics: { conversionBoost: '+12%', paybackDays: '14 Days' }
  }
];

export const INITIAL_MARKETING_CAMPAIGNS: MarketingCampaign[] = [
  {
    id: 'camp-1',
    name: 'AI Business Growth v2.0 Launch Campaign',
    channelTypes: ['blog', 'email', 'social', 'ad', 'newsletter'],
    targetAudience: 'SaaS Founders, CMOs, & Operations Leaders',
    projectedROI: '480%',
    status: 'active',
    leadsGenerated: 342,
    revenueAttributed: '$28,400',
    createdAt: '2026-07-20'
  },
  {
    id: 'camp-2',
    name: 'Instant Speed-to-Lead Inbound Sequence',
    channelTypes: ['email', 'sms', 'review_request'],
    targetAudience: 'Inbound Web Demo Requesters',
    projectedROI: '850%',
    status: 'active',
    leadsGenerated: 188,
    revenueAttributed: '$19,200',
    createdAt: '2026-07-22'
  },
  {
    id: 'camp-3',
    name: 'Enterprise AI Agent Case Study Series',
    channelTypes: ['blog', 'video', 'social'],
    targetAudience: 'CTOs & VPs of Engineering',
    projectedROI: '320%',
    status: 'scheduled',
    leadsGenerated: 94,
    revenueAttributed: '$12,500',
    createdAt: '2026-07-25'
  }
];

export const INITIAL_CUSTOMER_WORKFLOWS: CustomerWorkflow[] = [
  {
    id: 'cw-1',
    title: 'Speed-to-Lead Inbound Nurturing',
    type: 'lead_nurture',
    trigger: 'Inbound Web Form Submission',
    steps: ['Instant SMS Confirmation', 'AI Personalized Intro Email', 'Calendar Discovery Link', 'Follow-up Nudge in 24h'],
    activeCount: 142,
    conversionRate: '34.8%',
    enabled: true
  },
  {
    id: 'cw-2',
    title: 'VIP Enterprise Customer Onboarding',
    type: 'onboarding',
    trigger: 'New Contract Signed in CRM',
    steps: ['Welcome Kit Email', 'Slack Channel Invitation', 'Kickoff Call Scheduler', 'AI Agent Configuration Check'],
    activeCount: 28,
    conversionRate: '92.0%',
    enabled: true
  },
  {
    id: 'cw-3',
    title: 'Abandoned Quote & Demo Recovery',
    type: 'cart_recovery',
    trigger: 'Demo Attended but No Proposal Signed (3 Days)',
    steps: ['Custom ROI Calculation Email', 'Objection Handling AI Nudge', 'Founder Check-in SMS'],
    activeCount: 39,
    conversionRate: '18.4%',
    enabled: true
  },
  {
    id: 'cw-4',
    title: 'Automated Renewal & Health Check',
    type: 'reminder',
    trigger: '60 Days Prior to Annual Renewal',
    steps: ['Usage Analytics Digest', 'Quarterly Strategic Review Invite', 'Renewal Quote Auto-Generation'],
    activeCount: 64,
    conversionRate: '88.5%',
    enabled: true
  },
  {
    id: 'cw-5',
    title: 'Customer Advocate Referral Engine',
    type: 'referral',
    trigger: 'NPS Score >= 9 or 60 Days Active',
    steps: ['Thank You Note', 'Personalized Referral Link Generation', '$200 Account Credit Reward Notification'],
    activeCount: 88,
    conversionRate: '24.1%',
    enabled: true
  },
  {
    id: 'cw-6',
    title: 'Dormant Account Reactivation',
    type: 'reactivation',
    trigger: 'No User Login for 30 Consecutive Days',
    steps: ['Feature Update Digest', '1-on-1 Strategy Session Invite', 'Re-activation Discount Offer'],
    activeCount: 52,
    conversionRate: '12.6%',
    enabled: true
  }
];

export const INITIAL_OPERATIONAL_ITEMS: OperationalEfficiencyItem[] = [
  {
    id: 'op-1',
    taskName: 'Manual Multi-Platform Content Re-formatting',
    department: 'Marketing',
    currentManualHoursPerWeek: 18.5,
    hourlyCost: 65,
    monthlyCost: 4810,
    aiAutomationSolution: 'Relay AI Repurposing Engine (1-click auto-formatting across 12 networks)',
    projectedHoursSaved: 16.5,
    projectedMonthlySavings: 4290,
    status: 'automated'
  },
  {
    id: 'op-2',
    taskName: 'Inbound Lead Qualification & Initial Email Response',
    department: 'Sales',
    currentManualHoursPerWeek: 14.0,
    hourlyCost: 75,
    monthlyCost: 4200,
    aiAutomationSolution: 'Gemini AI Inbound Speed-to-Lead Qualifier & Auto-Responder',
    projectedHoursSaved: 12.0,
    projectedMonthlySavings: 3600,
    status: 'in_progress'
  },
  {
    id: 'op-3',
    taskName: 'Manual Social Media Posting & Asset Resizing',
    department: 'Social Media / Design',
    currentManualHoursPerWeek: 12.0,
    hourlyCost: 55,
    monthlyCost: 2640,
    aiAutomationSolution: 'Relay Smart Queue & Gemini Flash Image Generator',
    projectedHoursSaved: 11.0,
    projectedMonthlySavings: 2420,
    status: 'automated'
  },
  {
    id: 'op-4',
    taskName: 'Contract Renewal & Invoice Reminder Follow-ups',
    department: 'Finance / Customer Success',
    currentManualHoursPerWeek: 8.5,
    hourlyCost: 60,
    monthlyCost: 2040,
    aiAutomationSolution: 'Automated Renewal & Account Health Alert Workflow',
    projectedHoursSaved: 7.5,
    projectedMonthlySavings: 1800,
    status: 'recommended'
  },
  {
    id: 'op-5',
    taskName: 'Weekly Performance & ROI Report Compilation',
    department: 'Executive Management',
    currentManualHoursPerWeek: 6.0,
    hourlyCost: 110,
    monthlyCost: 2640,
    aiAutomationSolution: 'Relay Executive AI Advisor Weekly Briefing Engine',
    projectedHoursSaved: 5.5,
    projectedMonthlySavings: 2420,
    status: 'automated'
  }
];

export const INITIAL_EXECUTIVE_BRIEFING: ExecutiveBriefing = {
  weekOf: 'July 28 - August 3, 2026',
  overallHealthScore: 86,
  mrr: '$142,000 (+8.4% MoM)',
  lossPoints: [
    'Lead leakage from delayed response times (>4h average turnaround on web forms)',
    '18.4% demo-to-trial dropoff rate due to manual onboarding friction',
    '32 uncontacted leads sitting in CRM without follow-up task assigned'
  ],
  weeklyTopActions: [
    {
      priority: 1,
      title: 'Activate Instant Speed-to-Lead Follow-up Sequence',
      reasoning: 'Inbound response time drops conversion by 39% after 15 minutes. Instant SMS/Email recovers ~$14.5K/mo.',
      impact: '+$14,500/mo potential revenue'
    },
    {
      priority: 2,
      title: 'Launch Pro-to-Enterprise SSO & Security Upsell',
      reasoning: '210 active Pro teams have exceeded 15 team seats without enterprise governance.',
      impact: '+$6,400/mo recurring expansion'
    },
    {
      priority: 3,
      title: 'Automate Past Demo Re-engagement (30-90 days)',
      reasoning: '480 past leads had strong intent but stalled due to timing; new AI features provide compelling reason to return.',
      impact: '+$8,200/mo pipeline recovery'
    }
  ],
  underperformingProduct: {
    name: 'Starter Tier Solo License',
    issue: 'High CAC relative to $49/mo price point and lower retention compared to Team/Enterprise plans.',
    remedy: 'Reposition Starter tier toward a 14-day Pro trial with automated onboarding nudges to shift users directly to the $199 Pro plan.'
  },
  biggestGrowthOpportunity: {
    area: 'Inbound Speed-to-Lead & Customer Advocate Referral Flywheel',
    revenueImpact: '+$18,300/mo combined MRR boost',
    requirement: 'Enable the automated referral workflow and instant lead qualifier in Relay Customer Growth Engine.'
  },
  strategicAdvisorNotes: 'Empire OS Relay v2.0 is operating with strong underlying economics. By shifting focus from pure content creation to revenue discovery and speed-to-lead automation, the business can realistically unlock over $34,200/mo in net new revenue within the next 30 days.'
};
