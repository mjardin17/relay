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
  name: 'Reis Electric LLC',
  industry: 'Licensed Electrical Contracting (MA Journeyman Lic. # B-38914)',
  websiteUrl: 'https://ReisElectric.com',
  mrr: 38500,
  arr: 462000,
  productsCount: 6,
  activeCustomers: 340,
  churnRate: 0.5,
  averageDealSize: 2850,
  competitors: ['Local Unlicensed Handymen', 'National Franchise Electricians', 'Regional Electrical Firms'],
  crmConnected: true,
  primaryBottleneck: 'After-hours missed calls and uncaptured web leads while Shadrick M. Reis is on active job sites.'
};

export const INITIAL_HEALTH_SCORE: BusinessHealthScore = {
  overall: 92,
  revenueEfficiency: {
    score: 94,
    status: 'Optimal',
    breakdown: '50/50 LLC Partner structure keeps overhead low. Target gross margin sits at 68% on residential service & 58% on commercial panel overhauls.'
  },
  leadVelocity: {
    score: 88,
    status: 'Optimal',
    breakdown: 'Guided-manual intake and AI Dispatch Qualifier converts web inquiries into reviewed draft estimates within 60 seconds.'
  },
  operationalMargin: {
    score: 95,
    status: 'Strong',
    breakdown: 'Clean division of responsibilities: Joshua Jardin (reported growth partner) manages strategy/capital backing; Shadrick M. Reis manages public field execution & town permits.'
  },
  brandAuthority: {
    score: 91,
    status: 'Strong',
    breakdown: 'High customer trust driven by slogan: "No job too big, no job too small — you can call Reis Electric!" and full MA disclosure.'
  },
  customerRetention: {
    score: 92,
    status: 'Optimal',
    breakdown: 'Repeat commercial maintenance and annual residential safety inspection memberships provide recurring revenue.'
  },
  keyBottlenecks: [
    {
      issue: 'Unanswered Calls During Active Panel Wiring',
      impact: '-$4,800/mo in lost emergency service calls',
      priority: 'Critical'
    },
    {
      issue: 'Uncollected Past Estimates (>7 Days Without Follow-up)',
      impact: '-$6,200/mo in delayed project approvals',
      priority: 'High'
    },
    {
      issue: 'Manual Town Permit Filing & Wire Inspector Sign-off Tracking',
      impact: '12 hours/week spent on municipal admin',
      priority: 'Medium'
    }
  ],
  strengths: [
    '50/50 Partner Operating Model (Ops/Growth + Journeyman Licensed Master Electrician)',
    'Immaculate field craftsmanship & 100% MA Board 237 CMR Compliance',
    'Memorable multi-channel slogan: "No job too big, no job too small — you can call Reis Electric!"'
  ],
  potentialMonthlyUpside: '+$18,500/mo'
};

export const INITIAL_REVENUE_OPPORTUNITIES: RevenueOpportunity[] = [
  {
    id: 'opp-1',
    title: 'Instant 60-Second Speed-to-Lead Call & SMS Dispatch',
    category: 'Missed Sales',
    description: 'Instantly text and confirm job site address within 60 seconds when a homeowner submits an inquiry while Shadrick M. Reis is working in the field.',
    estimatedMonthlyImpact: 6800,
    effort: 'Low',
    actionableCampaignType: 'Instant Dispatch Sequence',
    activated: true,
    metrics: { conversionBoost: '+42%', paybackDays: '1 Day' }
  },
  {
    id: 'opp-2',
    title: 'Massachusetts 200A Panel & EV Charger Upgrade Drip',
    category: 'Upsell/Cross-sell',
    description: 'Target past homeowners with older 100A panels to upgrade to 200A service with Level 2 EV charging station installations.',
    estimatedMonthlyImpact: 5200,
    effort: 'Medium',
    actionableCampaignType: 'Panel & EV Upgrade Campaign',
    activated: true,
    metrics: { conversionBoost: '+28%', paybackDays: '3 Days' }
  },
  {
    id: 'opp-3',
    title: 'Commercial Facilities Electrical Maintenance Retainers',
    category: 'Subscription',
    description: 'Sign local commercial office buildings, plazas, and restaurants for quarterly emergency lighting & panel safety inspections.',
    estimatedMonthlyImpact: 4500,
    effort: 'Medium',
    actionableCampaignType: 'Commercial Retainer Pitch',
    activated: false,
    metrics: { conversionBoost: '+22%', paybackDays: '5 Days' }
  },
  {
    id: 'opp-4',
    title: 'Neighbor Radius Door Hanger & Local Mailer Blitz',
    category: 'Seasonal/Local',
    description: 'When Shadrick M. Reis completes a job, automatically send 10 neighbor postcards: "We are working on your street! Mention Reis Electric for $50 off."',
    estimatedMonthlyImpact: 2000,
    effort: 'Low',
    actionableCampaignType: 'Neighborhood Radius Mailer',
    activated: true,
    metrics: { conversionBoost: '+18%', paybackDays: '2 Days' }
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
  weekOf: 'August 10 - August 16, 2026',
  overallHealthScore: 92,
  mrr: '$38,500 (+14.2% MoM)',
  lossPoints: [
    'Missed emergency calls when Shadrick M. Reis is inside active breaker panels',
    'Unfollowed electrical estimates older than 7 days',
    'Pending municipal wire permit sign-offs awaiting customer inspection scheduling'
  ],
  weeklyTopActions: [
    {
      priority: 1,
      title: 'Deploy 60-Second Instant Speed-to-Lead Call & SMS Qualifier',
      reasoning: 'Inbound homeowner service requests cold-off rapidly after 15 mins. Automated instant SMS captures job details instantly.',
      impact: '+$6,800/mo recovered service revenue'
    },
    {
      priority: 2,
      title: 'Launch 200A Service Upgrade & EV Charger Drip Campaign',
      reasoning: 'Homes with older 100A panels are ideal candidates for modern 200A upgrades and Level 2 home EV charger installations.',
      impact: '+$5,200/mo high-ticket job expansion'
    },
    {
      priority: 3,
      title: 'Roll Out 10-Neighbor Radius Postcard Mailer After Job Completion',
      reasoning: 'Neighbors see the Reis Electric truck parked outside and naturally inquire about nearby electrical work.',
      impact: '+$2,000/mo local neighborhood density'
    }
  ],
  underperformingProduct: {
    name: 'Small Single-Outlet Repairs Without Diagnostic Fee',
    issue: 'Driving 30+ minutes for a $120 minor fixture fix without a minimum service call fee erodes truck profit margins.',
    remedy: 'Enforce a $189 minimum dispatch fee that applies toward any approved work, ensuring every truck trip is profitable.'
  },
  biggestGrowthOpportunity: {
    area: 'Commercial Facilities Electrical Maintenance Retainers & Panel Overhauls',
    revenueImpact: '+$18,500/mo combined MRR & project boost',
    requirement: 'Utilize 50/50 Partner marketing engine to pitch local retail centers, offices, and restaurants.'
  },
  strategicAdvisorNotes: 'Reis Electric LLC is positioned for high profitability. The 50/50 partnership allows Shadrick M. Reis to focus 100% on immaculate field execution, code compliance, and wire inspector sign-offs while the Silent Partner provides strategic capital and growth backing.'
};
