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
    title: 'Empire OS v4.2 Release Announcement',
    body: `🚀 Major Update: Empire OS v4.2 is officially live!

We are rolling out Relay — our native AI Content Distribution & Social Media Automation Module.

Key features:
• Multi-platform auto-repurposing in 1 click
• Real-time trend intelligence & viral hook scoring
• AI Agent consultation suite for content strategy
• Unified cross-platform scheduling & analytics

Experience the future of enterprise brand distribution today.`,
    platforms: ['linkedin', 'x', 'facebook', 'discord', 'telegram'],
    platformSpecificCopy: {
      x: `🚀 Empire OS v4.2 is live!

Meet Relay — our native social media distribution & AI automation module.

✨ 1-click repurposing
📈 Real-time viral trend scoring
🤖 AI Strategy Agent suite
📅 Unified multi-platform calendar

Empower your brand content engine now 👇`,
      linkedin: `We are thrilled to announce the official release of Empire OS v4.2 featuring Relay, our flagship Content Distribution & Social Media Automation Engine.

Modern enterprise brands waste up to 25 hours per week manually reformatting content across fragmented channels. Relay solves this natively inside Empire OS.

With Relay, your teams can:
1. Turn 1 long-form article or video into 12 platform-optimized assets instantly.
2. Maintain strict brand voice guardrails using custom AI Brand Workspaces.
3. Schedule, track, and measure cross-platform ROI in one unified command center.

Discover how Relay streamlines enterprise social workflows. Link in comments below.`
    },
    hashtags: ['#EmpireOS', '#ContentStrategy', '#AIAutomation', '#EnterpriseSaaS', '#SocialMediaMarketing'],
    status: 'scheduled',
    scheduledAt: '2026-07-28T14:30:00.000Z',
    author: 'Alex Vance (Chief Product Officer)',
    campaignId: 'camp-1',
    aiOptimized: true,
    engagementScore: 94,
    notes: ['Approved by Legal & CPO', 'Graphic asset generated via Gemini Image Engine'],
    createdAt: '2026-07-27T18:00:00.000Z',
    updatedAt: '2026-07-27T19:30:00.000Z'
  },
  {
    id: 'post-102',
    title: 'The Death of Manual Social Media Scheduling',
    body: `If you are still copying and pasting posts into 5 different social media tabs in 2026, you are operating at a massive disadvantage.

Here is how top 1% marketing teams scale content output by 10x without increasing headcount:

1. Centralize content creation into a single master prompt or core source.
2. Utilize AI agents to adjust format rules per platform (character limits, tone, hashtag density).
3. Automate drip queues with predictive peak engagement scheduling.

What is your team's biggest content bottleneck right now?`,
    platforms: ['linkedin', 'threads', 'bluesky'],
    hashtags: ['#Productivity', '#ContentCreator', '#MarketingAutomation', '#Leadership'],
    status: 'published',
    publishedAt: '2026-07-27T10:00:00.000Z',
    author: 'Elena Rostova (Head of Growth)',
    campaignId: 'camp-2',
    aiOptimized: true,
    engagementScore: 88,
    createdAt: '2026-07-26T14:00:00.000Z',
    updatedAt: '2026-07-27T10:00:00.000Z'
  },
  {
    id: 'post-103',
    title: 'Behind the Scenes: How We Built Relay Module',
    body: `Drafting an inside look at how Relay integrates with Empire OS shared permissions, Fast API server pipelines, and Gemini 3.6 Flash reasoning models.`,
    platforms: ['x', 'reddit', 'youtube'],
    hashtags: ['#SystemArchitecture', '#BuildingInPublic', '#DevRel'],
    status: 'under_review',
    author: 'Marcus Chen (Lead Systems Architect)',
    campaignId: 'camp-1',
    aiOptimized: false,
    engagementScore: 76,
    notes: ['Waiting for final screenshot from frontend team'],
    createdAt: '2026-07-27T20:15:00.000Z',
    updatedAt: '2026-07-27T21:00:00.000Z'
  },
  {
    id: 'post-104',
    title: '5 AI Repurposing Hacks for Founders',
    body: `Turn your weekly podcast episode into 3 LinkedIn carousels, 5 TikTok shorts scripts, and 1 comprehensive newsletter post in under 10 minutes.`,
    platforms: ['tiktok', 'instagram', 'x'],
    hashtags: ['#FounderTips', '#AICreators', '#SocialGrowth'],
    status: 'draft',
    author: 'Sarah Jenkins (Content Specialist)',
    aiOptimized: true,
    engagementScore: 82,
    createdAt: '2026-07-27T21:10:00.000Z',
    updatedAt: '2026-07-27T21:10:00.000Z'
  }
];

export const INITIAL_CAMPAIGNS: Campaign[] = [
  {
    id: 'camp-1',
    name: 'Empire OS v4.2 Global Launch',
    description: 'Omnichannel product launch campaign targeting enterprise tech leaders, growth executives, and creator teams.',
    status: 'active',
    startDate: '2026-07-25',
    endDate: '2026-08-15',
    targetPlatforms: ['linkedin', 'x', 'youtube', 'facebook', 'instagram', 'discord'],
    goal: 'Generate 50,000 product signups and 1M cross-platform impressions',
    budget: '$15,000',
    postIds: ['post-101', 'post-103'],
    color: '#6366F1'
  },
  {
    id: 'camp-2',
    name: 'Thought Leadership & Founder Stories',
    description: 'Weekly educational series sharing deep insights on marketing engineering, AI content systems, and productivity.',
    status: 'active',
    startDate: '2026-07-01',
    endDate: '2026-12-31',
    targetPlatforms: ['linkedin', 'threads', 'bluesky', 'reddit'],
    goal: 'Establish Empire OS brand domain authority and grow executive audience by 25%',
    budget: '$5,000',
    postIds: ['post-102', 'post-104'],
    color: '#10B981'
  },
  {
    id: 'camp-3',
    name: 'Q3 Viral Shorts & Video Blitz',
    description: 'High-frequency short-form video releases across TikTok, Instagram Reels, and YouTube Shorts.',
    status: 'planning',
    startDate: '2026-08-01',
    endDate: '2026-09-30',
    targetPlatforms: ['tiktok', 'instagram', 'youtube'],
    goal: 'Achieve 3M total video views and viral community growth',
    budget: '$8,000',
    postIds: [],
    color: '#EC4899'
  }
];

export const INITIAL_BRAND_VOICE: BrandVoice = {
  name: 'Empire OS Official Brand Style',
  primaryTone: 'Authoritative & Visionary',
  secondaryTones: ['Technical Precision', 'Forward-Thinking', 'Action-Oriented', 'Empathetic Leader'],
  styleGuardrails: [
    'Use strong, decisive verbs; avoid passive voice.',
    'Format text with line breaks and scannable bullet points.',
    'Back bold assertions with data points or operational frameworks.',
    'Never use hyper-generic SaaS fluff like "synergize" or "disrupt".',
    'Maintain high standards for typographic clarity and formatting.'
  ],
  targetAudiences: [
    {
      personaName: 'Enterprise CPO & Tech Executives',
      description: 'Senior leaders overseeing software engineering, operations, and brand distribution.',
      painPoints: ['Fragmented tools', 'Compliance risks', 'Slow execution', 'High overhead']
    },
    {
      personaName: 'Growth & Content Directors',
      description: 'Marketing leads responsible for multi-channel acquisition and content velocity.',
      painPoints: ['Bottlenecked reformatting', 'Inconsistent brand voice', 'Lack of real-time ROI analytics']
    }
  ],
  approvedHashtags: ['#EmpireOS', '#ContentEngine', '#AIAutomation', '#MarketingTech', '#FutureOfWork', '#EnterpriseSoftware'],
  bannedKeywords: ['synergy', 'game-changer', 'revolutionary magic', 'cheap hack', 'growth hack secrets'],
  defaultCTAs: [
    'Explore Relay inside Empire OS today 👉 empireos.io/relay',
    'Transform your team content workflow. Schedule a demo with our architects.',
    'Drop your thoughts in the comments below 👇'
  ],
  colorPalette: [
    { name: 'Empire Sapphire', hex: '#3B82F6' },
    { name: 'Deep Onyx', hex: '#0F172A' },
    { name: 'Emerald Peak', hex: '#10B981' },
    { name: 'Electric Violet', hex: '#8B5CF6' }
  ],
  logoUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=300&q=80',
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
    id: 'agent-copywriter',
    name: 'Aria',
    role: 'Master Copywriting Specialist',
    description: 'Expert at crafting viral hooks, irresistible CTAs, and highly compelling social storytelling across all formats.',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
    badge: 'COPYWRITING AGENT',
    capabilities: ['Hook Optimization', 'Tone Manipulation', 'CTA Engineering', 'Thread Design'],
    promptSystem: 'You are Aria, Chief Copywriter at Empire OS. You craft razor-sharp, high-converting social copy adhering to strict platform nuances.'
  },
  {
    id: 'agent-strategist',
    name: 'Kaelen',
    role: 'Growth & Campaign Strategist',
    description: 'Specializes in audience segmentation, campaign cadence, multi-touch funnel positioning, and growth strategy.',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
    badge: 'STRATEGY AGENT',
    capabilities: ['Campaign Architecture', 'Frequency Planning', 'Funnel Mapping', 'Audience Profiling'],
    promptSystem: 'You are Kaelen, Lead Growth Strategist. You provide actionable, data-backed campaign frameworks and distribution models.'
  },
  {
    id: 'agent-seo',
    name: 'Nexus',
    role: 'SEO & Hashtag Optimization Agent',
    description: 'Analyzes keyword search volume, algorithmic indexing rules, tag relevance, and semantic search visibility.',
    avatar: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=200&q=80',
    badge: 'SEO AGENT',
    capabilities: ['Hashtag Clustering', 'Keyword Placement', 'Algorithmic Indexing', 'Metadata Audit'],
    promptSystem: 'You are Nexus, AI SEO & Discovery Architect. You optimize content metadata to maximize organic discoverability.'
  },
  {
    id: 'agent-trend',
    name: 'Vortex',
    role: 'Viral Trend Intelligence Specialist',
    description: 'Monitors real-time internet sentiment, rising industry topics, newsjacking opportunities, and competitor content gaps.',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=200&q=80',
    badge: 'TREND AGENT',
    capabilities: ['Real-time Newsjacking', 'Competitor Analysis', 'Viral Format Spotting', 'Content Gap Identification'],
    promptSystem: 'You are Vortex, Trend Analyst. You spot explosive viral topics before they saturate the market.'
  },
  {
    id: 'agent-brand',
    name: 'Sentinella',
    role: 'Brand Compliance & Style Guard',
    description: 'Audits copy for strict adherence to company brand guidelines, banned phrases, tone consistency, and legal alignment.',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
    badge: 'BRAND GUARD',
    capabilities: ['Compliance Audit', 'Banned Keyword Check', 'Tone Consistency', 'Voice Alignment'],
    promptSystem: 'You are Sentinella, Chief Brand Inspector. You enforce brand voice integrity and legal governance across all copy.'
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
