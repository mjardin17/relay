import {
  ConnectedDataSource,
  Customer,
  Lead,
  Deal,
  Subscription,
  Invoice,
  VerifiedOpportunity,
  ApprovalRequest,
  ExecutionRecord,
  AttributionRecord,
  RecommendationEvaluation,
  DataQualityIssue,
  SourceRecord
} from '../types/evidence';

// 1. Connected Data Sources
export const DEMO_DATA_SOURCES: ConnectedDataSource[] = [
  {
    id: 'ds-stripe',
    provider: 'stripe',
    name: 'Stripe Payments & Billing',
    category: 'Revenue & Commerce',
    status: 'connected',
    lastSyncAt: '5 mins ago',
    recordsIngested: 4820,
    failedRecords: 0,
    healthScore: 99,
    authType: 'api_key'
  },
  {
    id: 'ds-hubspot',
    provider: 'hubspot',
    name: 'HubSpot Sales CRM',
    category: 'CRM & Sales',
    status: 'connected',
    lastSyncAt: '12 mins ago',
    recordsIngested: 3150,
    failedRecords: 4,
    healthScore: 95,
    authType: 'oauth2'
  },
  {
    id: 'ds-googleads',
    provider: 'google_ads',
    name: 'Google Ads Manager',
    category: 'Advertising',
    status: 'connected',
    lastSyncAt: '1 hour ago',
    recordsIngested: 1240,
    failedRecords: 0,
    healthScore: 98,
    authType: 'oauth2'
  },
  {
    id: 'ds-ga4',
    provider: 'ga4',
    name: 'Google Analytics 4',
    category: 'Analytics',
    status: 'connected',
    lastSyncAt: '30 mins ago',
    recordsIngested: 18900,
    failedRecords: 12,
    healthScore: 94,
    authType: 'oauth2'
  },
  {
    id: 'ds-twilio',
    provider: 'twilio',
    name: 'Twilio SMS & Voice Relay',
    category: 'Communication',
    status: 'connected',
    lastSyncAt: '2 mins ago',
    recordsIngested: 890,
    failedRecords: 1,
    healthScore: 97,
    authType: 'api_key'
  },
  {
    id: 'ds-csv',
    provider: 'csv_import',
    name: 'Historical Q2 Sales Import.csv',
    category: 'Files & Data',
    status: 'connected',
    lastSyncAt: '3 days ago',
    recordsIngested: 500,
    failedRecords: 0,
    healthScore: 100,
    authType: 'file'
  }
];

// 2. Canonical Customers
export const DEMO_CUSTOMERS: Customer[] = [
  {
    id: 'cust-101',
    externalId: 'cus_N38a91mK',
    sourcePlatform: 'stripe',
    name: 'Sarah Jenkins',
    email: 'sarah@vortexai.com',
    companyName: 'Vortex AI Systems',
    status: 'active_customer',
    mrr: 2400,
    totalSpent: 28800,
    npsScore: 92,
    lastActiveAt: '2 hours ago',
    createdAt: '2025-08-12',
    tags: ['Pro Plan', 'Power User', 'Referral Eligible']
  },
  {
    id: 'cust-102',
    externalId: 'cus_L91x82pA',
    sourcePlatform: 'stripe',
    name: 'Marcus Vance',
    email: 'm.vance@apexlogistics.io',
    companyName: 'Apex Logistics Tech',
    status: 'active_customer',
    mrr: 4500,
    totalSpent: 54000,
    npsScore: 88,
    lastActiveAt: 'Yesterday',
    createdAt: '2025-05-19',
    tags: ['Enterprise Tier', 'Custom SLA']
  },
  {
    id: 'cust-103',
    externalId: 'cus_P41k73bC',
    sourcePlatform: 'stripe',
    name: 'Elena Rostova',
    email: 'elena@novacrest.co',
    companyName: 'NovaCrest Digital',
    status: 'churn_risk',
    mrr: 1200,
    totalSpent: 14400,
    npsScore: 64,
    lastActiveAt: '14 days ago',
    createdAt: '2025-09-01',
    tags: ['At Risk', 'No Login 14d']
  },
  {
    id: 'cust-104',
    externalId: 'cus_K82j19qZ',
    sourcePlatform: 'stripe',
    name: 'David Chen',
    email: 'dchen@quantumcapital.com',
    companyName: 'Quantum Capital Group',
    status: 'advocate',
    mrr: 5800,
    totalSpent: 69600,
    npsScore: 98,
    lastActiveAt: '30 mins ago',
    createdAt: '2025-03-10',
    tags: ['Enterprise', 'Case Study Partner', 'VIP']
  }
];

// 3. Canonical Unattended / Dormant Leads
export const DEMO_LEADS: Lead[] = [
  {
    id: 'lead-301',
    externalId: 'hs_lead_8819',
    sourcePlatform: 'hubspot',
    name: 'Jason Miller',
    email: 'jmiller@horizonhealth.org',
    companyName: 'Horizon Health Tech',
    estimatedValue: 12500,
    pipelineStage: 'new_inbound',
    responseDelayHours: 6.8,
    lastContactedAt: 'No response sent',
    createdAt: '2026-07-30T10:15:00Z',
    ownerName: 'Unassigned Queue',
    sourceCampaign: 'Google Ads - AI Automation'
  },
  {
    id: 'lead-302',
    externalId: 'hs_lead_8820',
    sourcePlatform: 'hubspot',
    name: 'Rachel Adams',
    email: 'radams@stratafin.com',
    companyName: 'Strata Financial Services',
    estimatedValue: 19800,
    pipelineStage: 'new_inbound',
    responseDelayHours: 5.2,
    lastContactedAt: 'No response sent',
    createdAt: '2026-07-30T11:40:00Z',
    ownerName: 'Unassigned Queue',
    sourceCampaign: 'LinkedIn Inbound Demo'
  },
  {
    id: 'lead-303',
    externalId: 'hs_lead_8710',
    sourcePlatform: 'hubspot',
    name: 'Alexandre Dubois',
    email: 'alex@luminar.fr',
    companyName: 'Luminar Design Agency',
    estimatedValue: 8400,
    pipelineStage: 'dormant',
    responseDelayHours: 96,
    lastContactedAt: '45 days ago',
    createdAt: '2026-06-10T09:00:00Z',
    ownerName: 'Sales Rep A',
    sourceCampaign: 'Website Contact Form'
  }
];

// 4. Verified Opportunities with Provenance & Calculations
export const DEMO_VERIFIED_OPPORTUNITIES: VerifiedOpportunity[] = [
  {
    id: 'opp-ver-101',
    title: 'Instant Speed-to-Lead Response Automation',
    category: 'Missed Sales',
    detectedCondition: '17 qualified inbound demo requests valued at $32,300 experienced >4h delay with zero response in past 14 days.',
    affectedRecordsCount: 17,
    affectedRecordPreview: ['jmiller@horizonhealth.org ($12.5k)', 'radams@stratafin.com ($19.8k)', '15 additional inbound leads'],
    estimatedMonthlyValue: 8398,
    estimatedAnnualValue: 100776,
    actualRealizedMonthlyValue: 7120,
    effort: 'Low',
    expectedTimeToResultDays: 2,
    confidence: 'Verified',
    status: 'Running',
    owner: 'Relay AI Speed-to-Lead Agent',
    createdAt: '2026-07-28',
    activatedAt: '2026-07-29',
    actionType: 'email_sequence',
    recommendedPlaybook: 'Instant 60-Second AI SMS & Email Follow-Up Drip',
    evidence: {
      id: 'ev-101',
      title: 'HubSpot Inbound Lead Timestamp Delta Analysis',
      category: 'Inbound Sales Speed',
      sourceSystems: ['hubspot', 'twilio', 'ga4'],
      sourceRecordIds: ['hs_lead_8819', 'hs_lead_8820', 'hs_lead_8821'],
      observationPeriod: 'Previous 14 Days (Jul 16 - Jul 30, 2026)',
      calculation: {
        formulaIdentifier: 'SPEED_TO_LEAD_RECOVERY_V2',
        formulaVersion: '2.1.0',
        formulaExpression: 'Sum(Unattended Pipeline) * Historical Re-engagement Conversion (26%)',
        inputVariables: {
          unattendedPipelineTotal: 32300,
          unattendedLeadsCount: 17,
          historicalConversionRate: 0.26,
          avgResponseDelayHours: 5.4
        },
        assumptions: [
          'Leads contacted within 60 seconds have 3.8x higher discovery booking rate',
          'Historical baseline conversion for leads replied after 4h is 7%'
        ],
        calculatedAt: '2026-07-30T22:00:00Z',
        outputValue: 8398,
        currency: 'USD',
        confidence: 'Verified',
        explanation: '17 verified qualified demo leads worth $32,300 experienced response latency >4h. Re-engaging with 60-second AI SMS/email recovers 26% of lost pipeline.'
      },
      confidence: 'Verified',
      confidenceFactors: [
        { factor: 'Direct HubSpot CRM lead timestamp matching', impact: 'positive' },
        { factor: 'Stripe customer LTV historical validation', impact: 'positive' },
        { factor: 'Zero unmapped stages in lead records', impact: 'positive' }
      ],
      dataFreshnessMinutes: 5,
      missingDataWarnings: [],
      sampleRecordsPreview: [
        { label: 'Lead 1', detail: 'Jason Miller (Horizon Health)', value: '$12,500 Deal • Delay: 6.8h' },
        { label: 'Lead 2', detail: 'Rachel Adams (Strata Fin)', value: '$19,800 Deal • Delay: 5.2h' },
        { label: 'Lead 3', detail: 'Siddharth Patel (Apex Tech)', value: '$8,200 Deal • Delay: 4.1h' }
      ]
    }
  },
  {
    id: 'opp-ver-102',
    title: 'Dormant Lead Re-Activation Sequence',
    category: 'Lead Recovery',
    detectedCondition: '480 past qualified leads from Q1-Q2 with no activity in 90 days, possessing $410,000 in unclosed pipeline.',
    affectedRecordsCount: 480,
    affectedRecordPreview: ['alex@luminar.fr ($8.4k)', 't.wright@bluewave.com ($14.0k)', '478 dormant CRM contacts'],
    estimatedMonthlyValue: 8200,
    estimatedAnnualValue: 98400,
    actualRealizedMonthlyValue: 6400,
    effort: 'Low',
    expectedTimeToResultDays: 5,
    confidence: 'High confidence',
    status: 'Running',
    owner: 'Relay Marketing Engine',
    createdAt: '2026-07-25',
    activatedAt: '2026-07-26',
    actionType: 'email_sequence',
    recommendedPlaybook: 'Interactive AI ROI Case Study Drip & Calendar Offer',
    evidence: {
      id: 'ev-102',
      title: 'CRM Closed-Lost & Unresponsive Lead Analysis',
      category: 'Pipeline Reactivation',
      sourceSystems: ['hubspot', 'ga4'],
      sourceRecordIds: ['hs_lead_8710', 'hs_lead_8711'],
      observationPeriod: 'Jan 1, 2026 - Jun 30, 2026 (180 Days)',
      calculation: {
        formulaIdentifier: 'DORMANT_LEAD_REACTIVATION_V1',
        formulaVersion: '1.4.0',
        formulaExpression: 'Dormant Contacts (480) * Expected Reply Rate (8%) * Avg Contract Value ($21,350) * Win Rate (25%)',
        inputVariables: {
          dormantContactsCount: 480,
          expectedReplyRate: 0.08,
          avgDealSize: 21350,
          winRate: 0.25
        },
        assumptions: [
          '8% of dormant leads open and respond to personalized ROI messaging',
          'Sales cycle for reactivated leads averages 18 days'
        ],
        calculatedAt: '2026-07-30T22:00:00Z',
        outputValue: 8200,
        currency: 'USD',
        confidence: 'High confidence',
        explanation: '480 unclosed qualified leads evaluated. A 3-step value-driven case study drip yields an estimated 8% reply rate and $8,200/mo incremental pipeline.'
      },
      confidence: 'High confidence',
      confidenceFactors: [
        { factor: 'Verified email deliverability status', impact: 'positive' },
        { factor: 'Historical reactivation benchmark matches 2.2% net purchase rate', impact: 'positive' }
      ],
      dataFreshnessMinutes: 12,
      missingDataWarnings: ['42 lead records lack phone numbers for SMS channel fallback'],
      sampleRecordsPreview: [
        { label: 'Dormant 1', detail: 'Alexandre Dubois (Luminar)', value: 'Last contact 45d ago' },
        { label: 'Dormant 2', detail: 'Tina Wright (BlueWave)', value: 'Last contact 60d ago' }
      ]
    }
  },
  {
    id: 'opp-ver-103',
    title: 'Pro-to-Enterprise Security & SSO Upsell',
    category: 'Upsell/Cross-sell',
    detectedCondition: '210 Pro Tier teams reached seat cap (>8 users) with zero Enterprise Security add-on enabled.',
    affectedRecordsCount: 210,
    affectedRecordPreview: ['sarah@vortexai.com (12 seats)', 'team@novacrest.co (9 seats)', '208 growing Pro accounts'],
    estimatedMonthlyValue: 6400,
    estimatedAnnualValue: 76800,
    actualRealizedMonthlyValue: 3200,
    effort: 'Medium',
    expectedTimeToResultDays: 7,
    confidence: 'Verified',
    status: 'Approved',
    owner: 'Account Executive AI Agent',
    createdAt: '2026-07-29',
    actionType: 'customer_workflow',
    recommendedPlaybook: 'In-App SSO/Audit Log Upgrade Prompt & Executive Drip',
    evidence: {
      id: 'ev-103',
      title: 'Stripe Usage & Seat Limit Cross-Reference',
      category: 'Product Expansion',
      sourceSystems: ['stripe', 'ga4'],
      sourceRecordIds: ['cus_N38a91mK', 'cus_P41k73bC'],
      observationPeriod: 'Previous 30 Days',
      calculation: {
        formulaIdentifier: 'ENTERPRISE_UPSELL_V1',
        formulaVersion: '1.0.0',
        formulaExpression: 'Eligible Teams (210) * Conversion Rate (15%) * Upgrade Delta ($200/mo)',
        inputVariables: {
          eligibleTeamsCount: 210,
          upgradeConversionRate: 0.15,
          mrrDelta: 20038
        },
        assumptions: [
          'Teams with >8 seats require SSO compliance for security governance',
          'In-app trigger when admin opens Security tab converts at 15%'
        ],
        calculatedAt: '2026-07-30T22:00:00Z',
        outputValue: 6400,
        currency: 'USD',
        confidence: 'Verified',
        explanation: '210 Pro teams exceed 8 seats. Offering dedicated SSO, audit logs, and custom AI agent limits yields $6,400/mo incremental expansion MRR.'
      },
      confidence: 'Verified',
      confidenceFactors: [
        { factor: 'Stripe billing records 100% synchronized', impact: 'positive' }
      ],
      dataFreshnessMinutes: 2,
      missingDataWarnings: [],
      sampleRecordsPreview: [
        { label: 'Team 1', detail: 'Vortex AI Systems', value: '12 Seats Active • Pro Plan' },
        { label: 'Team 2', detail: 'NovaCrest Digital', value: '9 Seats Active • Pro Plan' }
      ]
    }
  }
];

// 5. Execution Ledger Records
export const DEMO_EXECUTION_RECORDS: ExecutionRecord[] = [
  {
    id: 'exec-8001',
    activationId: 'act-101',
    opportunityId: 'opp-ver-101',
    actionType: 'email_sequence',
    actor: 'Relay Speed-to-Lead AI Agent',
    executorType: 'ai_agent',
    targetEntityCount: 17,
    status: 'completed',
    startedAt: '2026-07-29T14:00:00Z',
    completedAt: '2026-07-29T14:02:15Z',
    costIncurred: 1.45,
    apiCallsCount: 34,
    outputSummary: 'Successfully dispatched personalized 60-second SMS and AI email follow-ups to 17 unattended inbound leads. 9 discovery meetings booked.',
    canRollback: false
  },
  {
    id: 'exec-8002',
    activationId: 'act-102',
    opportunityId: 'opp-ver-102',
    actionType: 'email_sequence',
    actor: 'Relay Marketing Workflow',
    executorType: 'automated_workflow',
    targetEntityCount: 480,
    status: 'completed',
    startedAt: '2026-07-26T09:30:00Z',
    completedAt: '2026-07-26T09:45:00Z',
    costIncurred: 4.80,
    apiCallsCount: 960,
    outputSummary: 'Dispatched 3-step AI Case Study re-engagement drip. 38 replies received, 14 deals reopened.',
    canRollback: false
  },
  {
    id: 'exec-8003',
    activationId: 'act-103',
    opportunityId: 'opp-ver-103',
    actionType: 'customer_workflow',
    actor: 'Sales Operations Admin',
    executorType: 'user',
    targetEntityCount: 210,
    status: 'queued',
    startedAt: '2026-07-30T21:00:00Z',
    costIncurred: 0.0,
    apiCallsCount: 0,
    outputSummary: 'Awaiting Executive approval before launching Security Add-on notification modal in-app.',
    canRollback: true
  }
];

// 6. Human Approval Requests
export const DEMO_APPROVAL_REQUESTS: ApprovalRequest[] = [
  {
    id: 'appr-901',
    opportunityId: 'opp-ver-103',
    actionTitle: 'Launch Pro-to-Enterprise Security SSO Upsell Drip',
    requestedBy: 'Relay AI Advisor',
    approverRole: 'Executive',
    status: 'pending',
    riskLevel: 'Medium',
    reasoning: 'Will present an in-app banner and email notification to 210 Pro account owners offering SSO & Audit Log add-on at $200/mo.',
    financialImpactEstimate: 6400,
    targetCount: 210,
    createdAt: '2026-07-30T18:30:00Z'
  },
  {
    id: 'appr-902',
    opportunityId: 'opp-ver-101',
    actionTitle: 'Speed-to-Lead Instant SMS Dispatch Policy',
    requestedBy: 'Relay Speed-to-Lead Agent',
    approverRole: 'Sales',
    status: 'approved',
    riskLevel: 'Low',
    reasoning: 'Auto-approves sending instant SMS confirmation to new inbound demo submissions within 60 seconds.',
    financialImpactEstimate: 8398,
    targetCount: 17,
    createdAt: '2026-07-28T10:00:00Z',
    decidedAt: '2026-07-28T10:15:00Z',
    decidedBy: 'VP of Sales',
    comments: 'Approved with condition to honor quiet hours 9 PM - 8 AM.'
  }
];

// 7. Closed-Loop Attribution Records
export const DEMO_ATTRIBUTION_RECORDS: AttributionRecord[] = [
  {
    id: 'attr-501',
    opportunityId: 'opp-ver-101',
    campaignId: 'camp-2',
    customerEmail: 'jmiller@horizonhealth.org',
    dealValue: 12500,
    attributedRevenue: 12500,
    attributionModel: 'workflow_comparison',
    touchpointsCount: 3,
    controlGroupComparison: {
      enrolledConversionRate: 0.38,
      controlConversionRate: 0.08,
      incrementalLiftRevenue: 9800
    },
    confidence: 'Verified',
    timestamp: '2026-07-30T14:22:00Z'
  },
  {
    id: 'attr-502',
    opportunityId: 'opp-ver-102',
    campaignId: 'camp-1',
    customerEmail: 'alex@luminar.fr',
    dealValue: 8400,
    attributedRevenue: 8400,
    attributionModel: 'linear',
    touchpointsCount: 4,
    confidence: 'High confidence',
    timestamp: '2026-07-29T11:10:00Z'
  }
];

// 8. Recommendation Evaluations & AI Learning
export const DEMO_RECOMMENDATION_EVALUATIONS: RecommendationEvaluation[] = [
  {
    id: 'eval-201',
    opportunityId: 'opp-ver-101',
    opportunityTitle: 'Instant Speed-to-Lead Response Automation',
    predictedValue: 8398,
    realizedValue: 7120,
    variancePercentage: -15.2,
    accuracyScore: 84.8,
    timeToResultDaysPredicted: 2,
    timeToResultDaysActual: 2,
    status: 'Accurate',
    feedbackNotes: 'Actual conversion rate was 22.4% vs predicted 26.0%. Response delay reduction proved highly effective.',
    learningAdjustmentApplied: 'Adjusted future Speed-to-Lead conversion factor from 26.0% down to 22.8% for Enterprise software category.'
  },
  {
    id: 'eval-202',
    opportunityId: 'opp-ver-102',
    opportunityTitle: 'Dormant Lead Re-Activation Sequence',
    predictedValue: 8200,
    realizedValue: 6400,
    variancePercentage: -21.9,
    accuracyScore: 78.1,
    timeToResultDaysPredicted: 5,
    timeToResultDaysActual: 6,
    status: 'Underestimated',
    feedbackNotes: 'Email delivery rate was 92.4% (slight bounce rate on 90-day-old emails). Case study content drove 14 meeting bookings.',
    learningAdjustmentApplied: 'Added auto-email validation check step before dispatching bulk reactivation campaigns.'
  }
];

// 9. Data Quality Issues
export const DEMO_DATA_QUALITY_ISSUES: DataQualityIssue[] = [
  {
    id: 'dq-1',
    provider: 'hubspot',
    issueType: 'missing_field',
    severity: 'medium',
    description: '42 dormant lead records in HubSpot lack phone numbers for SMS channel fallback.',
    affectedCount: 42,
    suggestedFix: 'Run Clearbit / Apollo enrichment workflow or rely exclusively on email channel for these contacts.',
    createdAt: '2026-07-29T08:00:00Z'
  },
  {
    id: 'dq-2',
    provider: 'ga4',
    issueType: 'stale_sync',
    severity: 'low',
    description: 'GA4 UTM parameters delayed by ~30 minutes on web conversion events.',
    affectedCount: 12,
    suggestedFix: 'None required. Sync refreshes automatically every hour.',
    createdAt: '2026-07-30T21:00:00Z'
  }
];
