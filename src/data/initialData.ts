import {
  SocialPlatform,
  ContentPost,
  Campaign,
  BrandVoice,
  AnalyticsSummary,
  PlatformMetrics,
  TrendTopic,
  MediaAsset,
  TeamMember,
  AutomationWorkflow,
  AIAgent,
  AppIntegration
} from '../types/relay';

export const INITIAL_PLATFORMS: SocialPlatform[] = [
  {
    id: 'linkedin',
    name: 'LinkedIn',
    icon: 'Linkedin',
    color: '#0A66C2',
    characterLimit: 3000,
    supportedMedia: ['image', 'video', 'carousel', 'document'],
    formatRules: 'Professional tone, line breaks for readability, 3-5 targeted hashtags, strong hook in first 2 lines.',
    bestPostingTimes: ['Tue 09:00 AM', 'Wed 10:00 AM', 'Thu 02:00 PM'],
    connected: true,
    handle: 'empire-os-official',
    followers: 48500
  },
  {
    id: 'x',
    name: 'X (Twitter)',
    icon: 'Twitter',
    color: '#000000',
    characterLimit: 280,
    supportedMedia: ['image', 'video', 'poll'],
    formatRules: 'Punchy single thoughts or 5-8 tweet threads, bold claims, engaging question at the end.',
    bestPostingTimes: ['Mon 08:30 AM', 'Wed 01:15 PM', 'Fri 05:00 PM'],
    connected: true,
    handle: '@EmpireOS_HQ',
    followers: 124200
  },
  {
    id: 'instagram',
    name: 'Instagram',
    icon: 'Instagram',
    color: '#E4405F',
    characterLimit: 2200,
    supportedMedia: ['image', 'video', 'carousel'],
    formatRules: 'High aesthetic visual, story-driven caption, line-separated hashtags at bottom (8-15 tags).',
    bestPostingTimes: ['Wed 11:00 AM', 'Fri 07:00 PM', 'Sun 08:00 PM'],
    connected: true,
    handle: '@empire_os',
    followers: 89300
  },
  {
    id: 'facebook',
    name: 'Facebook',
    icon: 'Facebook',
    color: '#1877F2',
    characterLimit: 63206,
    supportedMedia: ['image', 'video', 'link', 'carousel'],
    formatRules: 'Community-centric story, link previews, engaging video thumbnails, conversation-starter prompt.',
    bestPostingTimes: ['Mon 01:00 PM', 'Thu 03:00 PM'],
    connected: true,
    handle: 'EmpireOSGlobal',
    followers: 62100
  },
  {
    id: 'threads',
    name: 'Threads',
    icon: 'MessageSquare',
    color: '#000000',
    characterLimit: 500,
    supportedMedia: ['image', 'video', 'carousel', 'link'],
    formatRules: 'Conversational, unfiltered thoughts, replies-focused, lighthearted tech/product commentary.',
    bestPostingTimes: ['Tue 08:00 AM', 'Thu 06:00 PM'],
    connected: true,
    handle: '@empire_os',
    followers: 31200
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    icon: 'Video',
    color: '#00F2FE',
    characterLimit: 4000,
    supportedMedia: ['video'],
    formatRules: '9:16 portrait video, energetic hook in first 2 seconds, trending audio reference, clear CTA.',
    bestPostingTimes: ['Tue 07:00 PM', 'Thu 09:00 PM', 'Sat 04:00 PM'],
    connected: true,
    handle: '@empireos_official',
    followers: 156000
  },
  {
    id: 'youtube',
    name: 'YouTube',
    icon: 'Youtube',
    color: '#FF0000',
    characterLimit: 5000,
    supportedMedia: ['video'],
    formatRules: 'SEO title with keywords, timestamp breakdown in description, subscriber CTA, community post update.',
    bestPostingTimes: ['Thu 02:00 PM', 'Fri 04:00 PM', 'Sat 10:00 AM'],
    connected: true,
    handle: 'EmpireOS',
    followers: 73400
  },
  {
    id: 'pinterest',
    name: 'Pinterest',
    icon: 'Pin',
    color: '#BD081C',
    characterLimit: 500,
    supportedMedia: ['image', 'video'],
    formatRules: 'Vertical 2:3 pins, keyword-rich title, actionable step-by-step infographic description.',
    bestPostingTimes: ['Fri 08:00 PM', 'Sat 09:00 PM'],
    connected: false
  },
  {
    id: 'bluesky',
    name: 'Bluesky',
    icon: 'Cloud',
    color: '#1185FE',
    characterLimit: 300,
    supportedMedia: ['image', 'video', 'link'],
    formatRules: 'Open web & tech enthusiast tone, markdown links, concise discussion starters.',
    bestPostingTimes: ['Mon 10:00 AM', 'Wed 03:00 PM'],
    connected: true,
    handle: 'empireos.bsky.social',
    followers: 18900
  },
  {
    id: 'reddit',
    name: 'Reddit',
    icon: 'Share2',
    color: '#FF4500',
    characterLimit: 40000,
    supportedMedia: ['image', 'video', 'link'],
    formatRules: 'Subreddit-specific value without shameless self-promotion, detailed text explanation, authentic dev notes.',
    bestPostingTimes: ['Mon 06:00 AM', 'Sun 09:00 AM'],
    connected: true,
    handle: 'u/EmpireOS_Dev',
    followers: 9400
  },
  {
    id: 'discord',
    name: 'Discord',
    icon: 'Bot',
    color: '#5865F2',
    characterLimit: 2000,
    supportedMedia: ['image', 'video', 'link'],
    formatRules: 'Rich embed formatting, @everyone/@here role notifications, patch release bullet points.',
    bestPostingTimes: ['Mon-Fri 12:00 PM'],
    connected: true,
    handle: 'Empire Community #announcements',
    followers: 34200
  },
  {
    id: 'telegram',
    name: 'Telegram',
    icon: 'Send',
    color: '#26A5E4',
    characterLimit: 4096,
    supportedMedia: ['image', 'video', 'document', 'link'],
    formatRules: 'Markdown formatting, instant broadcast style, bold headers, direct action buttons.',
    bestPostingTimes: ['Mon-Sun 10:00 AM'],
    connected: true,
    handle: 't.me/empireos_announcements',
    followers: 21800
  }
];

export const INITIAL_POSTS: ContentPost[] = [
  {
    id: 'post-101',
    title: 'Radio & Video Spot: No Job Too Big or Small',
    body: `⚡ Commercial Script: "No job too big, no job too small — you can call Reis Electric!"

Audio Script:
[SFX: Crisp electrical hum fading into energetic background beat]
Voiceover: "Flickering hallway lights? Or planning a full commercial panel overhaul? Don't stress — Reis Electric has you covered with licensed, immaculate craftsmanship.

[SFX: Light switch click]
"No job too big, no job too small — you can call Reis Electric!"

Call Reis Electric today at (508) 555-7347 or visit ReisElectric.com for your free quote.
Owned & operated by Shadrick M. Reis, Licensed Journeyman Electrician (MA Lic. # B-38914).`,
    platforms: ['facebook', 'instagram', 'youtube', 'x', 'tiktok'],
    platformSpecificCopy: {
      x: `⚡ Flickering lights or full commercial panel upgrade? 

"No job too big, no job too small — you can call Reis Electric!" 

Call (508) 555-7347 or visit ReisElectric.com
MA Lic. # B-38914 (Journeyman) 👇`,
      facebook: `Need an electrician who shows up on time, leaves the job site cleaner than he found it, and delivers 100% code-compliant work?

Whether it's replacing a single light switch or installing a 200A commercial service panel:

"No job too big, no job too small — you can call Reis Electric!"

Owned & operated by Shadrick M. Reis, Licensed Journeyman Electrician (MA Lic. # B-38914). Call (508) 555-7347 today for a free estimate!`
    },
    hashtags: ['#ReisElectric', '#NoJobTooBigNoJobTooSmall', '#MAElectrician', '#LicensedJourneyman', '#PanelsAndPoles'],
    status: 'scheduled',
    scheduledAt: '2026-08-15T14:30:00.000Z',
    author: 'Reis Electric Growth Engine',
    campaignId: 'camp-1',
    aiOptimized: true,
    engagementScore: 98,
    notes: ['Includes Shadrick M. Reis, MA Lic. # B-38914 self-reported Journeyman disclosure', 'Reviewed by LLC Partners (Shadrick M. Reis + Joshua Jardin)'],
    createdAt: '2026-08-12T18:00:00.000Z',
    updatedAt: '2026-08-12T19:30:00.000Z'
  },
  {
    id: 'post-102',
    title: 'Work Truck Showcase: Die-Cut Vinyl & MA Compliance',
    body: `🚚 Clean trucks reflect clean work! Presenting the official Reis Electric LLC service vehicle layout.

High-contrast, die-cut vinyl lettering with strict Massachusetts disclosure:
• REIS ELECTRIC LLC
• Shadrick M. Reis, Licensed Journeyman Electrician
• MA Lic. # B-38914
• "No job too big, no job too small — you can call Reis Electric!"

When you see our truck on your street, you know high-precision craftsmanship is inside.`,
    platforms: ['instagram', 'facebook', 'linkedin'],
    hashtags: ['#WorkTruck', '#ReisElectric', '#CraftsmanshipFirst', '#MassElectrician'],
    status: 'published',
    publishedAt: '2026-08-12T10:00:00.000Z',
    author: 'Shadrick M. Reis (Journeyman Electrician)',
    campaignId: 'camp-2',
    aiOptimized: true,
    engagementScore: 92,
    createdAt: '2026-08-11T14:00:00.000Z',
    updatedAt: '2026-08-12T10:00:00.000Z'
  },
  {
    id: 'post-103',
    title: 'Commercial Panel Upgrade Case Study',
    body: `Before & After Transformation: Replacing a dangerous, outdated 100A fuse box with a crisp 200A main service panel featuring perfectly combed, color-coded wiring and laser-straight conduit bends.

Every connection torqued to code, full drop-cloth protection, and signed off by the municipal wire inspector.`,
    platforms: ['instagram', 'linkedin', 'facebook'],
    hashtags: ['#PanelUpgrade', '#ElectricalCraftsmanship', '#CodeCompliant', '#ReisElectric'],
    status: 'under_review',
    author: 'Shadrick M. Reis (Journeyman Electrician)',
    campaignId: 'camp-3',
    aiOptimized: false,
    engagementScore: 89,
    notes: ['Waiting for municipal wire inspector final sign-off photo'],
    createdAt: '2026-08-12T20:15:00.000Z',
    updatedAt: '2026-08-12T21:00:00.000Z'
  }
];

export const INITIAL_CAMPAIGNS: Campaign[] = [
  {
    id: 'camp-1',
    name: 'Reis Electric Commercials & Radio Launch',
    description: 'Omnichannel advertising campaign across local radio, video ads, and social spots built around the slogan: "No job too big, no job too small — you can call Reis Electric!"',
    status: 'active',
    startDate: '2026-08-15',
    endDate: '2026-09-30',
    targetPlatforms: ['facebook', 'instagram', 'youtube', 'x', 'tiktok'],
    goal: 'Generate 120 qualified service inquiries and 50,000 local video/audio impressions',
    budget: '$3,500',
    postIds: ['post-101'],
    color: '#F59E0B'
  },
  {
    id: 'camp-2',
    name: 'Massachusetts 200A Service & EV Charger Drive',
    description: 'Targeted campaign educating homeowners on electrical panel upgrades, EV charger installs, and utility rebate programs in Massachusetts.',
    status: 'active',
    startDate: '2026-08-01',
    endDate: '2026-11-30',
    targetPlatforms: ['facebook', 'instagram', 'linkedin'],
    goal: 'Secure 15 panel upgrade contracts ($3,200 avg ticket)',
    budget: '$2,000',
    postIds: ['post-102'],
    color: '#10B981'
  },
  {
    id: 'camp-3',
    name: 'Immaculate Craftsmanship & Truck Branding',
    description: 'Visual showcase of real panel wiring art, clean job site drop cloths, and official Reis Electric vehicle decals.',
    status: 'planning',
    startDate: '2026-08-20',
    endDate: '2026-10-31',
    targetPlatforms: ['instagram', 'facebook', 'youtube'],
    goal: 'Establish top-tier quality reputation in Norfolk & Worcester counties',
    budget: '$1,200',
    postIds: ['post-103'],
    color: '#6366F1'
  }
];

export const INITIAL_BRAND_VOICE: BrandVoice = {
  name: 'Reis Electric LLC - Brand & MA Compliance',
  primaryTone: 'Immaculate Craftsmanship & Code Safety',
  secondaryTones: ['MA Code Compliant', 'Conversational & Approachable', 'Prompt & Professional', '50/50 Partner Managed'],
  styleGuardrails: [
    'ALWAYS emphasize slogan: "No job too big, no job too small — you can call Reis Electric!"',
    'ALWAYS include MA License Disclosure: Owned & operated by Shadrick M. Reis, Licensed Journeyman Electrician (MA Lic. # B-38914).',
    'Highlight pride in craftsmanship: clean 90-degree conduit bends, combed breaker panels, drop cloths, and leaving job sites spotless.',
    'Reassure homeowners with minor fixes (single outlet/ceiling fan) and commercial managers needing 200A/400A service upgrades.',
    'Maintain strict 50/50 LLC Partnership clarity: Joshua Jardin serves as reported 50/50 business or growth partner; Shadrick M. Reis serves as reported public operator and electrician (MA Lic. # B-38914 self-reported).'
  ],
  targetAudiences: [
    {
      personaName: 'Massachusetts Homeowners & Residential Clients',
      description: 'Homeowners needing reliable electrical repairs, EV charger installs, recessed lighting, or service upgrades.',
      painPoints: ['Unresponsive contractors', 'Messy drywall dust', 'Hidden safety hazards', 'Overcharging for small jobs']
    },
    {
      personaName: 'Commercial Property & Facility Managers',
      description: 'Business owners requiring 200A/400A panel overhauls, dedicated circuit lines, and strict town wire inspector sign-offs.',
      painPoints: ['Unpermitted work risks', 'Costly downtime', 'Code non-compliance', 'Failed municipal inspections']
    }
  ],
  approvedHashtags: ['#ReisElectric', '#NoJobTooBigNoJobTooSmall', '#MAElectrician', '#LicensedJourneyman', '#ElectricalCraftsmanship', '#MassCodeCompliant'],
  bannedKeywords: ['sloppy wiring', 'unlicensed handyman', 'unpermitted shortcut', 'cheap quick hack', 'messy site'],
  defaultCTAs: [
    'No job too big, no job too small — call Reis Electric today at (508) 555-7347 or visit ReisElectric.com!',
    'Get your free estimate from Shadrick M. Reis, Licensed Journeyman Electrician (MA Lic. # B-38914).',
    'Schedule your code-compliant electrical service call today 👉 ReisElectric.com'
  ],
  colorPalette: [
    { name: 'Electrical Amber', hex: '#F59E0B' },
    { name: 'Navy Steel', hex: '#0F172A' },
    { name: 'High-Voltage Gold', hex: '#EAB308' },
    { name: 'Pure Signal White', hex: '#F8FAFC' }
  ],
  logoUrl: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=300&q=80',
  fontFamily: 'Plus Jakarta Sans'
};

export const INITIAL_ANALYTICS: AnalyticsSummary = {
  totalReach: 1482900,
  totalReachChange: 24.5,
  impressions: 3940200,
  impressionsChange: 18.2,
  totalEngagement: 284500,
  engagementChange: 31.8,
  totalClicks: 64200,
  clicksChange: 15.4,
  totalShares: 19800,
  followersCount: 521700,
  followersGrowth: 12.8,
  estimatedROI: '340% (Estimated $142,000 saved in agency fees)',
  topPerformingPlatform: 'linkedin'
};

export const INITIAL_PLATFORM_METRICS: PlatformMetrics[] = [
  { platform: 'linkedin', reach: 485000, engagementRate: 6.8, postsCount: 24, topPostTitle: 'Empire OS v4.2 Release Announcement', change: 32.1 },
  { platform: 'x', reach: 412000, engagementRate: 4.9, postsCount: 42, topPostTitle: 'The Death of Manual Social Media Scheduling', change: 21.4 },
  { platform: 'instagram', reach: 290000, engagementRate: 5.4, postsCount: 18, topPostTitle: 'Inside our Empire AI Design System', change: 18.7 },
  { platform: 'youtube', reach: 180000, engagementRate: 8.2, postsCount: 8, topPostTitle: 'Building Enterprise AI Modules in 2026', change: 44.0 },
  { platform: 'tiktok', reach: 115000, engagementRate: 7.1, postsCount: 15, topPostTitle: 'How CPOs save 20h a week', change: 29.5 }
];

export const INITIAL_TRENDS: TrendTopic[] = [
  {
    id: 'trend-1',
    topic: 'Agentic AI Workflows in Enterprise',
    category: 'Artificial Intelligence',
    volume: '280K searches / day',
    momentum: 'rising',
    relatedHashtags: ['#AgenticAI', '#EnterpriseAI', '#WorkflowAutomation'],
    relevanceScore: 98,
    suggestedAngle: 'Explain how Empire OS Relay orchestrates multi-agent content pipelines for corporate governance.'
  },
  {
    id: 'trend-2',
    topic: 'Multi-Format Social Distribution',
    category: 'Content Marketing',
    volume: '140K searches / day',
    momentum: 'peaking',
    relatedHashtags: ['#ContentRepurposing', '#SocialMediaStrategy', '#GrowthEng'],
    relevanceScore: 95,
    suggestedAngle: 'Break down the math: how turning 1 master post into 10 network formats drops production costs by 80%.'
  },
  {
    id: 'trend-3',
    topic: 'Zero-Click Content Strategy on LinkedIn & X',
    category: 'Social Media Dynamics',
    volume: '95K searches / day',
    momentum: 'rising',
    relatedHashtags: ['#ZeroClick', '#AlgorithmUpdate', '#LinkedInTips'],
    relevanceScore: 91,
    suggestedAngle: 'Provide raw in-feed value without hiding information behind external links to maximize platform distribution.'
  },
  {
    id: 'trend-4',
    topic: 'Short-Form Video AI Synthesizers',
    category: 'Media Production',
    volume: '310K searches / day',
    momentum: 'rising',
    relatedHashtags: ['#AIShorts', '#VideoAutomation', '#TikTokTech'],
    relevanceScore: 87,
    suggestedAngle: 'Demonstrate instant script generation to short video preview pipeline using Gemini video tools.'
  }
];

export const INITIAL_MEDIA_ASSETS: MediaAsset[] = [
  {
    id: 'media-1',
    title: 'Empire OS Relay Banner - Neon Glass',
    type: 'graphic',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
    tags: ['Hero', 'Product Banner', 'Relay', 'Dark Mode'],
    fileSize: '2.4 MB',
    dimensions: '1920x1080',
    createdAt: '2026-07-25',
    aiGenerated: true
  },
  {
    id: 'media-2',
    title: 'Enterprise Architecture Flowchart',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80',
    tags: ['Diagram', 'Architecture', 'Infographic'],
    fileSize: '1.8 MB',
    dimensions: '1600x1200',
    createdAt: '2026-07-24'
  },
  {
    id: 'media-3',
    title: 'Relay v4.2 Feature Highlights Video',
    type: 'video',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-digital-animation-of-screens-and-data-41550-large.mp4',
    tags: ['Promo', 'Product Demo', 'YouTube'],
    fileSize: '24.5 MB',
    dimensions: '1080p (60fps)',
    createdAt: '2026-07-26'
  },
  {
    id: 'media-4',
    title: 'Brand Assets & Logo Vector Suite',
    type: 'template',
    url: 'https://images.unsplash.com/photo-1600132806370-bf17e65e942f?auto=format&fit=crop&w=800&q=80',
    tags: ['Logos', 'Vectors', 'Typography'],
    fileSize: '8.2 MB',
    createdAt: '2026-07-20'
  }
];

export const INITIAL_TEAM: TeamMember[] = [
  {
    id: 'usr-1',
    name: 'Alex Vance',
    email: 'alex.vance@empireos.internal',
    role: 'Admin',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    active: true,
    pendingApprovalsCount: 0
  },
  {
    id: 'usr-2',
    name: 'Elena Rostova',
    email: 'elena.rostova@empireos.internal',
    role: 'Content Lead',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&q=80',
    active: true,
    pendingApprovalsCount: 2
  },
  {
    id: 'usr-3',
    name: 'Marcus Chen',
    email: 'marcus.chen@empireos.internal',
    role: 'Approver',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    active: true,
    pendingApprovalsCount: 1
  },
  {
    id: 'usr-4',
    name: 'Sarah Jenkins',
    email: 'sarah.j@empireos.internal',
    role: 'Creator',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80',
    active: true,
    pendingApprovalsCount: 0
  }
];

export const INITIAL_WORKFLOWS: AutomationWorkflow[] = [
  {
    id: 'wf-1',
    title: 'YouTube Video Publish -> Omnichannel Social Distribution',
    trigger: 'New video uploaded to Empire OS YouTube Channel',
    actions: [
      'Extract video transcript & generate 1 LinkedIn long-form breakdown',
      'Generate 5-tweet thread highlighting key video timestamps',
      'Generate 1 Discord & Telegram release announcement with embed preview',
      'Send draft bundle to Elena Rostova for approval'
    ],
    enabled: true,
    lastRun: '2026-07-26 14:22 EST',
    runCount: 14,
    category: 'social_repurpose'
  },
  {
    id: 'wf-2',
    title: 'Empire Blog RSS -> X & LinkedIn Campaign Drip',
    trigger: 'RSS Feed item published on empireos.io/blog/rss.xml',
    actions: [
      'Parse blog title, summary, and main headings',
      'Generate platform-specific post tailored to LinkedIn & Bluesky',
      'Schedule post to optimal engagement window (+3 hours from publish)'
    ],
    enabled: true,
    lastRun: '2026-07-27 09:15 EST',
    runCount: 28,
    category: 'rss'
  },
  {
    id: 'wf-3',
    title: 'Weekly Recurring Product Feature Highlight',
    trigger: 'Cron schedule: Every Wednesday at 09:00 AM EST',
    actions: [
      'Select random unposted feature tip from Media Library templates',
      'Apply Empire Brand Voice & generate X + Instagram post',
      'Add directly to Queue Manager'
    ],
    enabled: true,
    lastRun: '2026-07-22 09:00 EST',
    runCount: 52,
    category: 'recurring'
  }
];

export const INITIAL_AI_AGENTS: AIAgent[] = [
  {
    id: 'agent-dispatch',
    name: 'Aria',
    role: 'Speed-to-Lead & Electrical Dispatch Specialist Profile',
    description: 'Controlled guided-manual dispatch workflow. Receives lead intake, triages hazard signals, and prepares hash-bound draft responses for authorized human approval.',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
    badge: 'GUIDED DISPATCH PILOT',
    capabilities: ['Lead Intake & Consent Check', 'Emergency Hazard Triage', 'Hash-Bound Response Approval', 'DRY_RUN Dispatch'],
    promptSystem: 'You are Aria, Dispatch & Lead Intake Specialist for Reis Electric LLC. You prepare draft responses, check communication consent, triage safety hazards, and request authorized human approval before any simulated dispatch.'
  },
  {
    id: 'agent-strategist',
    name: 'Kaelen',
    role: 'Trade Revenue & Growth Partner Specialist Profile',
    description: 'Configured UI profile for analyzing job margins, growth strategies, and partnership equity models.',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
    badge: 'CONFIGURED PROFILE',
    capabilities: ['Margin Modeling (UI)', 'Growth Strategy (UI)', 'Partnership Structure (UI)'],
    promptSystem: 'You are Kaelen, Growth Specialist Profile for Reis Electric LLC. You provide strategy recommendations for business growth and margin optimization.'
  },
  {
    id: 'agent-seo',
    name: 'Nexus',
    role: 'Google Business Profile & Local SEO Specialist Profile',
    description: 'Configured UI profile for local SEO and Google Maps optimization recommendations.',
    avatar: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=200&q=80',
    badge: 'CONFIGURED PROFILE',
    capabilities: ['Local SEO Recommendations', 'Map Audit Framework', 'Review Workflow Strategy'],
    promptSystem: 'You are Nexus, Local SEO Specialist Profile for Reis Electric LLC. You analyze local search visibility frameworks.'
  },
  {
    id: 'agent-rebate',
    name: 'Vortex',
    role: 'Mass Save Rebate & Utility Incentive Specialist Profile',
    description: 'Configured UI profile for querying verified utility rebate policies and incentive eligibility disclaimers.',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=200&q=80',
    badge: 'CONFIGURED PROFILE',
    capabilities: ['Rebate Knowledge Query', 'Utility Source Verification', 'Eligibility Disclaimers'],
    promptSystem: 'You are Vortex, Rebate Specialist Profile for Reis Electric LLC. You provide informational summaries of utility rebate programs.'
  },
  {
    id: 'agent-brand',
    name: 'Sentinella',
    role: 'MA Compliance & Licensing Specialist Profile',
    description: 'Configured UI profile for checking required license disclosures and MA Board 237 CMR compliance rules.',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
    badge: 'CONFIGURED PROFILE',
    capabilities: ['License Disclosure Audit', 'A1 Business License Gate', 'Slogan Integrity'],
    promptSystem: 'You are Sentinella, Compliance Guard Profile for Reis Electric LLC. You enforce Massachusetts license disclosure rules and slogan integrity.'
  }
];

export const INITIAL_INTEGRATIONS: AppIntegration[] = [
  {
    id: 'int-gemini',
    name: 'Google Gemini 3.6 Flash & Image API',
    category: 'AI Model',
    status: 'connected',
    description: 'Powers the core text generation, multi-agent reasoning, repurposing engine, and AI graphic synthesis.',
    icon: 'Sparkles',
    authType: 'API Key',
    lastSync: 'Live (Managed via Empire OS Secrets)'
  },
  {
    id: 'int-openai',
    name: 'OpenAI GPT-4o Integration',
    category: 'AI Model',
    status: 'mock_mode',
    description: 'Secondary LLM model fallback for alternative copywriting styles and language translations.',
    icon: 'Cpu',
    authType: 'API Key',
    lastSync: 'Ready for Key'
  },
  {
    id: 'int-claude',
    name: 'Anthropic Claude 3.5 Sonnet',
    category: 'AI Model',
    status: 'mock_mode',
    description: 'Long-context reasoning engine for mega-article summarization and deep research documents.',
    icon: 'Brain',
    authType: 'API Key',
    lastSync: 'Ready for Key'
  },
  {
    id: 'int-wordpress',
    name: 'WordPress CMS Connector',
    category: 'CMS',
    status: 'connected',
    description: 'Bi-directional blog post synchronization for automated social repurposing triggers.',
    icon: 'Globe',
    authType: 'OAuth 2.0',
    lastSync: '2026-07-27 18:40 EST'
  },
  {
    id: 'int-canva',
    name: 'Canva Design Studio Bridge',
    category: 'Design',
    status: 'connected',
    description: 'Direct export of Canva graphic templates into Empire Relay Media Library.',
    icon: 'Palette',
    authType: 'OAuth 2.0',
    lastSync: '2026-07-26 12:10 EST'
  },
  {
    id: 'int-shopify',
    name: 'Shopify Store Catalog Sync',
    category: 'Marketing',
    status: 'mock_mode',
    description: 'Automatically pull e-commerce products and turn them into promotional social posts.',
    icon: 'ShoppingBag',
    authType: 'OAuth 2.0',
    lastSync: 'Credentials Required'
  },
  {
    id: 'int-convertkit',
    name: 'ConvertKit / Kit Email Marketing',
    category: 'Marketing',
    status: 'connected',
    description: 'Turn top-performing email newsletters into multi-platform social campaigns.',
    icon: 'Mail',
    authType: 'API Key',
    lastSync: '2026-07-27 10:15 EST'
  },
  {
    id: 'int-buffer',
    name: 'Buffer Direct API Bridge',
    category: 'Social Mgmt',
    status: 'mock_mode',
    description: 'Optional sync for legacy social scheduling queue fallback.',
    icon: 'Layers',
    authType: 'OAuth 2.0',
    lastSync: 'Optional'
  }
];
