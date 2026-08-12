import {
  LaunchProgramStage,
  ProviderBusinessProfile,
  NicheCandidate,
  NichePainPoint,
  ProductizedOffer,
  DemoAsset,
  ProspectRecord,
  OutreachDraft,
  StrategyCallBrief,
  ProposalRecord,
  ClientOnboardingPortal,
  SolutionDeploymentBlueprint,
  ClientResultMetrics
} from '../types/launchProgram';

export const DEFAULT_STAGES: LaunchProgramStage[] = [
  {
    id: 'stage_1_foundation',
    dayRange: 'Days 1–7',
    title: 'Foundation & Niche Selection',
    objective: 'Select a high-ROI, accessible business niche using evidence-backed scoring.',
    requiredInputs: ['Skills & Capacity', 'Income Targets', 'Industry Preferences'],
    generatedOutputs: ['Ideal Customer Profile', 'Service Positioning Statement', 'Niche Scorecard'],
    recommendedNextAction: 'Confirm niche selection: Dental Clinics & Specialty Healthcare',
    completionCriteria: ['Niche selected by owner', 'ICP constraints defined', 'Baseline capacity set'],
    evidenceRequirements: ['Market access proof', 'Average deal value > $2,000'],
    approvalRequirements: ['Owner niche sign-off'],
    blockers: [],
    progressState: 'completed',
    progressPercentage: 100,
    automationOpportunities: ['AI Niche Scoring', 'Market Demand Analyzer'],
    actualResultsSummary: 'Selected Dental & Medical Practices niche based on $4,500/mo avg deal size and 9.2/10 access score.'
  },
  {
    id: 'stage_2_pain_offer',
    dayRange: 'Days 8–14',
    title: 'Pain Discovery & Offer Design',
    objective: 'Diagnose revenue loss points and build a productized $3k-$5k/mo AI offer.',
    requiredInputs: ['Selected Niche Pain Data', 'Capacity & Pricing Limits'],
    generatedOutputs: ['Pain Cost Diagnostic', 'Productized Offer Specification', 'Risk Reversal Guarantee'],
    recommendedNextAction: 'Review and approve productized offer scope and pricing',
    completionCriteria: ['Primary problem selected', 'Deliverables scope defined', 'Offer approved by owner'],
    evidenceRequirements: ['Verified missed-call financial loss calculations'],
    approvalRequirements: ['Owner offer approval'],
    blockers: [],
    progressState: 'in_progress',
    progressPercentage: 85,
    automationOpportunities: ['Financial Leakage Estimator', 'Scope Generator'],
    actualResultsSummary: 'Designed "24/7 AI Receptionist & Missed-Call Lead Recovery Engine" ($2,500 setup + $3,500/mo).'
  },
  {
    id: 'stage_3_demo_assets',
    dayRange: 'Days 15–21',
    title: 'Demonstration & Sales Assets',
    objective: 'Generate interactive ROI calculators, demo scripts, and sales presentation collateral.',
    requiredInputs: ['Productized Offer Specification', 'Sample Lead Scenarios'],
    generatedOutputs: ['Interactive Demo Script', 'ROI Calculator Preset', 'One-Page Opportunity Brief'],
    recommendedNextAction: 'Generate live demo preview for prospect presentation',
    completionCriteria: ['Demo script tested', 'ROI calculator configured', 'Objection handling script approved'],
    evidenceRequirements: ['Demonstrable AI call/SMS response speed < 15 seconds'],
    approvalRequirements: ['Demo script approval'],
    blockers: [],
    progressState: 'in_progress',
    progressPercentage: 70,
    automationOpportunities: ['Interactive Voice/SMS Simulation', 'ROI Calculator Generator']
  },
  {
    id: 'stage_4_prospecting',
    dayRange: 'Days 22–30',
    title: 'Prospecting System & Outreach',
    objective: 'Source high-fit prospects, score fit/pain, and draft evidence-based outreach for approval.',
    requiredInputs: ['Ideal Customer Profile', 'Target Geography & Revenue Limits'],
    generatedOutputs: ['Qualified Prospect Directory', 'Personalized Outreach Draft Queue', 'Safety Audit Log'],
    recommendedNextAction: 'Approve 5 pending outreach communications in queue',
    completionCriteria: ['15+ qualified prospects imported', '0 compliance errors', 'Owner approval queue processed'],
    evidenceRequirements: ['Verified business contact email', 'Opt-out check clean'],
    approvalRequirements: ['Owner approval for all external outreach messages'],
    blockers: ['Pending owner approval on 5 outreach drafts'],
    progressState: 'in_progress',
    progressPercentage: 50,
    automationOpportunities: ['Prospect Fit Scorer', 'Personalized Email Synthesizer']
  },
  {
    id: 'stage_5_strategy_closing',
    dayRange: 'Days 31–38',
    title: 'Strategy Calls & Closing',
    objective: 'Conduct structured discovery calls, present evidence-backed proposals, and close clients.',
    requiredInputs: ['Prospect Pain Audit', 'Recorded Call Notes'],
    generatedOutputs: ['Call Brief & Script Flow', 'Customized Proposal Document', 'Closing Contract'],
    recommendedNextAction: 'Review call brief for Apex Dental Group (Strategy Call tomorrow at 10 AM)',
    completionCriteria: ['1+ Client Closed', 'Proposal terms accepted', 'Deposit paid'],
    evidenceRequirements: ['Signed proposal or recorded verbal agreement'],
    approvalRequirements: ['Owner proposal approval'],
    blockers: [],
    progressState: 'in_progress',
    progressPercentage: 40,
    automationOpportunities: ['Call Brief Generator', 'Automated Proposal Builder']
  },
  {
    id: 'stage_6_onboarding',
    dayRange: 'Days 39–46',
    title: 'Client Onboarding Portal',
    objective: 'Collect client details, business hours, FAQs, and system access through an encrypted vault.',
    requiredInputs: ['Client Contact Info', 'System Credentials'],
    generatedOutputs: ['Onboarding Completeness Audit', 'Implementation Roadmap', 'Client Knowledge Base'],
    recommendedNextAction: 'Send onboarding link to Apex Dental Group',
    completionCriteria: ['100% Onboarding Completeness', 'Credentials encrypted in vault', 'Escalation rules set'],
    evidenceRequirements: ['Encrypted credentials confirmation'],
    approvalRequirements: ['Client sign-off on implementation roadmap'],
    blockers: [],
    progressState: 'not_started',
    progressPercentage: 10,
    automationOpportunities: ['Guided Onboarding Portal', 'Credential Vault Encryption']
  },
  {
    id: 'stage_7_deployment',
    dayRange: 'Days 47–54',
    title: 'Solution Deployment',
    objective: 'Deploy AI Receptionist & Lead Recovery blueprints with test suites and rollback controls.',
    requiredInputs: ['Onboarding Data', 'Deployment Blueprints'],
    generatedOutputs: ['Live AI Receptionist Deployment', 'Idempotent Webhook Listener', 'Rollback Switch'],
    recommendedNextAction: 'Run 3 verification test cases before marking deployment live',
    completionCriteria: ['All test cases passing', 'Direct evidence of live execution', 'Owner acceptance'],
    evidenceRequirements: ['Live test lead processed in <30 seconds'],
    approvalRequirements: ['Owner deployment approval'],
    blockers: [],
    progressState: 'not_started',
    progressPercentage: 0,
    automationOpportunities: ['Automated Testing Suite', 'One-Click Deployment Rollback']
  },
  {
    id: 'stage_8_results_growth',
    dayRange: 'Days 55–60',
    title: 'Results, Proof & Expansion',
    objective: 'Measure actual ROI, generate client case studies, and unlock expansion/referral opportunities.',
    requiredInputs: ['Baseline Metrics', '30-Day Execution Ledger'],
    generatedOutputs: ['Client ROI Impact Report', 'Case Study Asset', '30-Day Optimization Plan'],
    recommendedNextAction: 'Generate Client Results Report for first monthly review',
    completionCriteria: ['ROI proved > 3x retainer', 'Case study draft generated', 'Upsell path identified'],
    evidenceRequirements: ['Attributed monthly revenue logs'],
    approvalRequirements: ['Client case study release approval'],
    blockers: [],
    progressState: 'not_started',
    progressPercentage: 0,
    automationOpportunities: ['Attribution Calculator', 'Case Study Generator']
  }
];

export const DEFAULT_PROVIDER_PROFILE: ProviderBusinessProfile = {
  providerName: 'Alex Vance',
  agencyBrand: 'Apex Growth OS Partners',
  serviceGoals: 'Build a $25k/mo recurring AI automation agency with 5-7 high-retainer clients.',
  availableSkills: ['AI Automation', 'CRM Integration', 'Sales Engineering', 'Lead Recovery'],
  preferredIndustries: ['Dental & Healthcare', 'Home Services / HVAC', 'Legal Services'],
  geographicScope: 'North America / Metro Regions',
  clientCapacityMax: 6,
  currentClientsCount: 2,
  targetMonthlyIncome: 25000,
  currentMonthlyIncome: 8500,
  hourlyRateBaseline: 250,
  selectedNicheId: 'niche-dental',
  constraints: ['No cold phone calling', 'Must use human approval queue for outreach', 'Encrypt credentials strictly'],
  baselineMetrics: {
    leadResponseTimeMinutes: 45,
    avgDealSize: 3500,
    salesCycleDays: 14
  }
};

export const DEFAULT_NICHES: NicheCandidate[] = [
  {
    id: 'niche-dental',
    name: 'Dental Practices & Specialty Care',
    industryCategory: 'Healthcare Services',
    painSeverityScore: 9,
    abilityToPayScore: 9,
    easeOfAccessScore: 8,
    urgencyScore: 9,
    salesCycleDaysEstimate: 10,
    automationPotentialScore: 9,
    complianceRiskLevel: 'Medium',
    estimatedMonthlyRoiPerClient: 8500,
    overallScore: 94,
    keyPainPoints: [
      '35% of inbound calls go unanswered during peak patient hours',
      'Weekend emergency leads lost to competitor clinics',
      'Hygiene recall & reactivation emails ignored'
    ],
    primaryDecisionMakerRole: 'Practice Owner / Managing Partner',
    evidenceSummary: 'Average dental practice loses $12,400/month in uncaptured implant and cosmetic procedures due to slow phone response.',
    recommended: true,
    selectedByOwner: true
  },
  {
    id: 'niche-hvac',
    name: 'HVAC & Residential Plumbing',
    industryCategory: 'Home Services',
    painSeverityScore: 9,
    abilityToPayScore: 8,
    easeOfAccessScore: 9,
    urgencyScore: 10,
    salesCycleDaysEstimate: 7,
    automationPotentialScore: 8,
    complianceRiskLevel: 'Low',
    estimatedMonthlyRoiPerClient: 11200,
    overallScore: 91,
    keyPainPoints: [
      'After-hours emergency service calls drop off before booking',
      'Technicians fail to follow up on open replacement quotes',
      'No automated SMS confirmation for dispatch slots'
    ],
    primaryDecisionMakerRole: 'General Manager / Owner',
    evidenceSummary: 'HVAC emergency replacements average $6,500 ticket size with 80% going to the first business that answers.',
    recommended: false,
    selectedByOwner: false
  },
  {
    id: 'niche-medspa',
    name: 'High-End MedSpas & Dermatology',
    industryCategory: 'Aesthetics & Wellness',
    painSeverityScore: 8,
    abilityToPayScore: 9,
    easeOfAccessScore: 8,
    urgencyScore: 8,
    salesCycleDaysEstimate: 12,
    automationPotentialScore: 9,
    complianceRiskLevel: 'Medium',
    estimatedMonthlyRoiPerClient: 9800,
    overallScore: 88,
    keyPainPoints: [
      'High consultation no-show rates without deposit workflows',
      'Social media DMs and web leads decay within 15 minutes',
      'Package renewal drops off after 90 days'
    ],
    primaryDecisionMakerRole: 'Medical Director / Practice Manager',
    evidenceSummary: 'High consultation value ($1,500+ avg lifetime value) with 40% initial lead leakage.',
    recommended: false,
    selectedByOwner: false
  }
];

export const DEFAULT_PAIN_POINTS: NichePainPoint[] = [
  {
    id: 'pain-dental-1',
    nicheId: 'niche-dental',
    problemTitle: 'Unanswered Inbound Call & After-Hours Lead Leakage',
    category: 'missed_communications',
    observedSymptom: 'Front desk busy handling check-in while phone rings 5+ times during morning rush',
    financialCostEstimateMonthly: 14500,
    operationalHoursWastedMonthly: 28,
    supportingEvidence: 'Analysis of 120 calls across 3 local dental practices showed 38 unanswered calls during lunch and peak hours.',
    confidenceScore: 'Verified',
    recommendedSolution: '24/7 AI Receptionist with instant SMS fallback & calendar booking',
    requiredValidation: 'Call log audit with front desk phone system export'
  },
  {
    id: 'pain-dental-2',
    nicheId: 'niche-dental',
    problemTitle: 'Slow Web Inquiry Response Time (> 30 Minutes)',
    category: 'slow_lead_response',
    observedSymptom: 'Invisalign web forms emailed to general inbox and checked once daily at 5 PM',
    financialCostEstimateMonthly: 8200,
    operationalHoursWastedMonthly: 15,
    supportingEvidence: 'Lead decay curve shows 391% drop in appointment booking probability after 10 minutes.',
    confidenceScore: 'Verified',
    recommendedSolution: 'Sub-60 Second AI Instant Lead Response Assistant',
    requiredValidation: 'Mystery shopper web form submission test'
  },
  {
    id: 'pain-dental-3',
    nicheId: 'niche-dental',
    problemTitle: 'Dormant Patient Hygiene Recall Breakdown',
    category: 'failed_followup',
    observedSymptom: 'Over 800 patients overdue for 6-month hygiene recall with zero systematic followup',
    financialCostEstimateMonthly: 12000,
    operationalHoursWastedMonthly: 40,
    supportingEvidence: 'Practice management software audit shows $140k in unbooked routine care.',
    confidenceScore: 'High',
    recommendedSolution: 'Automated 2-Way Conversational SMS Patient Reactivation Campaign',
    requiredValidation: 'Overdue patient count report export from OpenDental or Dentrix'
  }
];

export const DEFAULT_OFFERS: ProductizedOffer[] = [
  {
    id: 'offer-ai-receptionist',
    offerTitle: '24/7 AI Receptionist & Instant Lead Recovery System',
    targetNiche: 'Dental Practices & Specialty Care',
    primaryProblemSolved: 'Unanswered inbound calls and delayed web form follow-up causing lost high-value patients',
    transformationOutcome: 'Zero missed inbound leads, 100% sub-60-second response time, and 15+ additional booked consultations per month.',
    deliverables: [
      '24/7 AI Voice & SMS Receptionist configured for dental terminology',
      'Sub-30-Second Web Form & Social DM Instant Responder',
      'Real-Time OpenDental / Dentrix Calendar Appointment Scheduling Integration',
      'Automated SMS Pre-Qualification & Deposit Collection Workflow',
      'Executive ROI Dashboard & Missed-Call Audit Ledger'
    ],
    exclusions: [
      'Manual human call center staffing',
      'Custom website redesigns',
      'Medical diagnostic advice'
    ],
    pricing: {
      setupFee: 2500,
      monthlyRetainer: 3500,
      performanceBonus: '$100 bonus per completed implant or cosmetic consultation booked'
    },
    guaranteeTerms: '100% Risk Reversal: If the AI system does not recover at least $5,000 in new patient appointments in the first 30 days, 100% of the setup fee is refunded.',
    measurableSuccessCriteria: [
      'Average response time under 30 seconds',
      'At least 12 new consultations booked in Month 1',
      'Zero missed calls during business hours without instant SMS callback'
    ],
    approvalState: 'approved',
    approvedAt: new Date(Date.now() - 86400000 * 3).toISOString()
  }
];

export const DEFAULT_DEMO_ASSETS: DemoAsset[] = [
  {
    id: 'demo-dental-1',
    title: '24/7 AI Dental Receptionist Interactive Simulator',
    solutionType: 'ai_receptionist',
    targetScenario: 'After-hours cosmetic consultation inquiry for porcelain veneers',
    sampleWorkflowSteps: [
      'Inbound phone call missed at 7:45 PM on Tuesday',
      'AI Receptionist triggers SMS callback within 8 seconds',
      'Conversational AI answers patient questions regarding pricing and insurance',
      'AI presents available calendar slots for Dr. Vance',
      'Appointment booked & confirmed with automated SMS reminder'
    ],
    interactiveScript: `AI: "Hi! Thanks for calling Apex Dental Group. Dr. Vance and the team are currently away, but I can help you schedule your cosmetic consultation or answer questions right now. Were you looking for teeth whitening, implants, or veneers?"\n\nPatient: "Hi, I was calling to ask how much porcelain veneers cost and if you have availability this Friday."\n\nAI: "Porcelain veneers typically range from $1,200 to $1,800 per tooth depending on custom design. We actually have an open slot with Dr. Vance this Friday at 10:30 AM or 2:15 PM. Would either of those work for you?"`,
    roiCalculatorPreset: {
      leadsPerMonth: 45,
      avgClientValue: 3500,
      estimatedConversionLiftPct: 22,
      projectedMonthlyGain: 12800
    },
    sampleLeadInteractionPreview: {
      leadMessage: 'Can I book an implant consultation for Friday afternoon?',
      aiResponse: 'Absolutely! I have an opening at 2:00 PM on Friday with Dr. Vance. Shall I hold that slot for you under this phone number?',
      actionTaken: 'Reserved calendar slot & sent SMS confirmation link.'
    },
    evidenceUsed: [
      '38 unanswered calls logged during peak practice audit',
      'Avg cosmetic procedure lifetime value $3,500'
    ],
    approvalState: 'approved'
  }
];

export const DEFAULT_PROSPECTS: ProspectRecord[] = [
  {
    id: 'prospect-101',
    companyName: 'Apex Dental Care',
    contactName: 'Dr. Marcus Vance',
    contactEmail: 'marcus.vance@apexdentalcare.com',
    contactPhone: '+1 (555) 234-8901',
    websiteUrl: 'https://apexdentalcare.com',
    industry: 'Dental Practice',
    estimatedRevenue: '$2.4M / year',
    qualificationScore: 94,
    fitScore: 95,
    painScore: 92,
    reachabilityScore: 90,
    evidenceStrength: 'Verified',
    painHypothesis: 'High cosmetic lead volume with 42-minute average response time and unmonitored after-hours calls.',
    outreachStatus: 'draft_queued',
    consentState: 'business_inquiry_allowed',
    estimatedDealValue: 42000,
    notes: '3 practice locations in Austin. Currently using manual front desk reception.',
    nextAction: 'Approve and dispatch personalized email outreach'
  },
  {
    id: 'prospect-102',
    companyName: 'BriteSmile Implant Center',
    contactName: 'Dr. Elena Rostova',
    contactEmail: 'elena@britesmileimplants.com',
    contactPhone: '+1 (555) 876-1234',
    websiteUrl: 'https://britesmileimplants.com',
    industry: 'Dental Implants',
    estimatedRevenue: '$4.1M / year',
    qualificationScore: 89,
    fitScore: 90,
    painScore: 88,
    reachabilityScore: 85,
    evidenceStrength: 'Verified',
    painHypothesis: 'High consultation no-show rate (30%) and zero weekend lead recovery.',
    outreachStatus: 'meeting_booked',
    consentState: 'verified_optin',
    appointmentScheduledAt: new Date(Date.now() + 86400000 * 2).toISOString(),
    estimatedDealValue: 54000,
    notes: 'Strategy call confirmed for Thursday at 10 AM EST.',
    nextAction: 'Prepare call brief & proposal draft'
  },
  {
    id: 'prospect-103',
    companyName: 'Metro Aesthetics & Smiles',
    contactName: 'Sarah Jenkins (Practice Mgr)',
    contactEmail: 'sjenkins@metrosmiles.org',
    contactPhone: '+1 (555) 345-6789',
    websiteUrl: 'https://metrosmiles.org',
    industry: 'Cosmetic Dentistry',
    estimatedRevenue: '$1.8M / year',
    qualificationScore: 82,
    fitScore: 85,
    painScore: 80,
    reachabilityScore: 80,
    evidenceStrength: 'High',
    painHypothesis: 'Website chat widget is unstaffed outside 9-5 PM.',
    outreachStatus: 'outreach_sent',
    consentState: 'business_inquiry_allowed',
    estimatedDealValue: 36000,
    notes: 'Follow-up email sent 2 days ago.',
    nextAction: 'Monitor response inbox'
  }
];

export const DEFAULT_OUTREACH_DRAFTS: OutreachDraft[] = [
  {
    id: 'outreach-101',
    prospectId: 'prospect-101',
    prospectName: 'Dr. Marcus Vance',
    companyName: 'Apex Dental Care',
    channel: 'email',
    subjectLine: 'Quick question regarding after-hours calls at Apex Dental Care',
    messageBody: `Hi Dr. Vance,\n\nI noticed Apex Dental Care is generating strong patient reviews in Austin, but when testing your website inquiry form at 6:30 PM yesterday, we noticed inquiries go to an email queue answered the following morning.\n\nOur data across local practices shows that 68% of cosmetic implant inquiries book with the first practice that responds within 10 minutes.\n\nWe built a sub-60-second AI Receptionist specifically for dental practices that handles after-hours booking automatically without staff overtime.\n\nWould you be open to a 5-minute interactive preview showing how many missed calls were recovered for similar practices last month?\n\nBest regards,\nAlex Vance | Apex Growth OS Partners`,
    personalizedEvidencePoints: [
      'Inquiry form submitted at 6:30 PM with no instant confirmation',
      'Austin dental market implant average ticket size $3,500'
    ],
    safetyChecks: {
      optOutChecked: true,
      factualEvidenceVerified: true,
      complianceRulesPassed: true
    },
    approvalStatus: 'pending_owner_approval'
  }
];

export const DEFAULT_CALL_BRIEFS: StrategyCallBrief[] = [
  {
    id: 'brief-102',
    prospectId: 'prospect-102',
    companyName: 'BriteSmile Implant Center',
    contactName: 'Dr. Elena Rostova',
    discoveredEvidenceSummary: [
      'High-value ticket size ($4,500 average per implant package)',
      'Estimated 32 missed after-hours inquiries per month',
      'Current consultation no-show rate approx 28%'
    ],
    unansweredQuestions: [
      'What practice management software do they use for calendar booking?',
      'Who currently manages lead follow-up on weekends?'
    ],
    discoveryCallFlow: [
      {
        step: 1,
        phase: 'Rapport & Context',
        scriptQuestions: [
          'Dr. Rostova, thank you for making time today. What is your primary growth goal for BriteSmile this quarter?'
        ]
      },
      {
        step: 2,
        phase: 'Pain Qualification',
        scriptQuestions: [
          'When a prospective implant patient submits a form on Sunday evening, what happens right now?',
          'How much revenue does losing 3-4 implant consultations a month represent for your practice?'
        ]
      },
      {
        step: 3,
        phase: 'Solution Demonstration',
        scriptQuestions: [
          'Let me show you our 30-second live demo of the AI Receptionist responding to a Sunday evening inquiry.'
        ]
      },
      {
        step: 4,
        phase: 'Proposal & Next Steps',
        scriptQuestions: [
          'If we can guarantee 10+ additional booked consultations in your first 30 days or refund 100% of the setup fee, is there any reason we couldn’t start next Monday?'
        ]
      }
    ],
    postCallSummary: {
      capturedPain: 'Losing 8-10 high-value implant inquiries per week due to delayed phone response.',
      currentProcessCost: 18500,
      urgencyLevel: 'Critical',
      budgetConfirmed: true,
      decisionMakerConfirmed: true,
      targetCloseDate: new Date(Date.now() + 86400000 * 3).toISOString()
    }
  }
];

export const DEFAULT_PROPOSALS: ProposalRecord[] = [
  {
    id: 'prop-102',
    prospectId: 'prospect-102',
    clientName: 'Dr. Elena Rostova',
    companyName: 'BriteSmile Implant Center',
    proposalTitle: 'AI Growth Engine & 24/7 Lead Recovery Agreement',
    selectedOfferTitle: '24/7 AI Receptionist & Instant Lead Recovery System',
    setupFee: 2500,
    monthlyRetainer: 3500,
    deliverablesScope: [
      '24/7 Voice & SMS AI Receptionist',
      'Sub-30-Second Web Form Instant Lead Response',
      'OpenDental Practice Management Calendar Integration',
      'Automated Appointment Reminders & No-Show Reduction Workflow',
      '100% Money-Back Guarantee (10+ Booked Consultations in Month 1)'
    ],
    projectedMonthlyRoi: 14500,
    status: 'draft'
  }
];

export const DEFAULT_ONBOARDING_PORTALS: ClientOnboardingPortal[] = [
  {
    id: 'onboard-201',
    clientId: 'client-britesmile',
    clientCompanyName: 'BriteSmile Implant Center',
    status: 'in_progress',
    completenessScore: 75,
    collectedDetails: {
      businessHours: 'Mon-Fri 8:00 AM - 5:00 PM, Sat 9:00 AM - 1:00 PM',
      locationsCount: 2,
      primaryServicesList: ['Single Tooth Implants', 'All-on-4 Restoration', 'Teeth Whitening'],
      faqItemsCount: 14,
      escalationContact: 'Sarah Rostova (+1 555-876-1234)',
      brandVoiceNotes: 'Professional, empathetic, highly reassuring clinical tone',
      activeIntegrations: ['OpenDental', 'Twilio SMS', 'HubSpot CRM']
    },
    credentialsVaultStatus: {
      crmAccessGranted: true,
      calendarAccessGranted: true,
      phoneSystemAccessGranted: true,
      encryptedInVault: true
    },
    missingRequirements: [
      'Practice deposit merchant payment link confirmation'
    ],
    implementationPlan: [
      { milestone: 'Knowledge Base & FAQ Ingestion', targetDays: 2, status: 'completed' },
      { milestone: 'Twilio Phone & Voice Route Setup', targetDays: 4, status: 'completed' },
      { milestone: 'Calendar Integration Test', targetDays: 5, status: 'in_progress' },
      { milestone: 'Live Call Routing Verification', targetDays: 7, status: 'pending' }
    ]
  }
];

export const DEFAULT_DEPLOYMENT_BLUEPRINTS: SolutionDeploymentBlueprint[] = [
  {
    id: 'deploy-blueprint-1',
    clientId: 'client-britesmile',
    clientCompanyName: 'BriteSmile Implant Center',
    serviceType: 'ai_receptionist',
    blueprintName: '24/7 AI Dental Receptionist & Booking Engine',
    triggerEvent: 'Inbound Missed Call or Web Form Submission',
    requiredInputs: ['Caller Phone', 'Patient Name', 'Requested Procedure', 'Preferred Time'],
    businessRules: [
      'Do not give medical diagnosis over phone/SMS',
      'Require $50 refundable deposit for Saturday consultation slots',
      'Escalate complex surgical questions directly to Dr. Rostova'
    ],
    aiPromptInstructions: 'You are the AI Receptionist for BriteSmile Implant Center. Answer warmly, qualify procedure interest, present available calendar slots, and confirm booking via SMS link.',
    toolsAndIntegrations: ['OpenDental API', 'Twilio Voice & SMS', 'SendGrid Email'],
    approvalGatesRequired: true,
    escalationPath: 'Notify Practice Manager via SMS if patient reports acute dental pain',
    failureHandlingStrategy: 'Fallback to human voicemail routing with immediate priority alert',
    retryMaxAttempts: 3,
    idempotencyKeyPrefix: 'britesmile-receptionist-v1',
    testCases: [
      {
        testName: 'Simulated After-Hours Missed Call',
        inputPayload: 'Caller: +15552349900, Time: 8:15 PM',
        expectedOutcome: 'SMS sent within 10 seconds offering Friday 10 AM slot',
        passed: true
      },
      {
        testName: 'Calendar Slot Conflict Resolution',
        inputPayload: 'Requested Slot: Friday 10:00 AM (Occupied)',
        expectedOutcome: 'AI detects conflict and offers Friday 11:30 AM or 2:00 PM',
        passed: true
      }
    ],
    rollbackControlEnabled: true,
    status: 'tested',
    verifiedEvidenceOfFunction: true,
    deployedAt: new Date(Date.now() - 86400000).toISOString()
  }
];

export const DEFAULT_RESULT_METRICS: ClientResultMetrics[] = [
  {
    id: 'res-201',
    clientId: 'client-britesmile',
    clientCompanyName: 'BriteSmile Implant Center',
    baselineMetrics: {
      monthlyLeads: 42,
      avgResponseTimeMinutes: 48,
      appointmentsBookedMonthly: 12,
      monthlyRevenue: 54000
    },
    actualResultsCurrent: {
      leadsRecoveredTotal: 34,
      avgResponseTimeSeconds: 18,
      appointmentsBookedMonthly: 28,
      attributedMonthlyRevenue: 126000,
      hoursSavedMonthly: 45,
      customerSatisfactionScore: 98
    },
    projectedVsActualValue: {
      projectedMonthlyGain: 35000,
      actualMonthlyGain: 72000,
      variancePercentage: 105
    },
    caseStudyDraft: {
      headline: 'How BriteSmile Implant Center Added $72,000/mo in Revenue with a 24/7 AI Receptionist',
      challenge: '35% of high-value implant leads were missed during lunch hours and evenings, resulting in $40k+ monthly lost revenue.',
      solutionDeployed: 'Deployed Empire OS 24/7 AI Voice & SMS Receptionist with sub-20-second lead recovery.',
      verifiedResults: '133% increase in booked implant consultations in the first 30 days, generating $72,000 in attributed revenue.',
      testimonialQuote: '"The AI Receptionist answered leads while our staff was busy with patients. It paid for itself 20x over in Month 1."',
      approvedByClient: true
    },
    retentionExpansionOpportunity: {
      upsellRecommendation: 'Deploy Automated Patient Reactivation Campaign to recover 450+ dormant patients.',
      referralRequestReady: true,
      next30DayOptimizationPlan: [
        'Launch 2-Way SMS Dormant Patient Reactivation Campaign',
        'Add Automated Google Review Request Sequence post-consultation',
        'Expand AI Receptionist to second branch location'
      ]
    }
  }
];
