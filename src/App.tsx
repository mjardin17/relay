import React, { useState } from 'react';
import { EmpireHeader } from './components/empire/EmpireHeader';
import { EmpireSidebar } from './components/empire/EmpireSidebar';
import { ContentStudio } from './components/studio/ContentStudio';
import { RepurposingEngine } from './components/repurposer/RepurposingEngine';
import { SmartSchedule } from './components/schedule/SmartSchedule';
import { AnalyticsDashboard } from './components/analytics/AnalyticsDashboard';
import { TrendIntelligence } from './components/trends/TrendIntelligence';
import { BrandWorkspace } from './components/brand/BrandWorkspace';
import { MediaLibrary } from './components/media/MediaLibrary';
import { TeamCollaboration } from './components/team/TeamCollaboration';
import { AutomationEngine } from './components/automation/AutomationEngine';
import { AIAgentsHub } from './components/agents/AIAgentsHub';
import { IntegrationsHub } from './components/integrations/IntegrationsHub';
import { CreatePostModal } from './components/studio/CreatePostModal';

// Growth Engine Components
import { LaunchProgramDashboard } from './components/launch/LaunchProgramDashboard';
import { ExecutiveAIAdvisor } from './components/growth/ExecutiveAIAdvisor';
import { BusinessIntelligence } from './components/growth/BusinessIntelligence';
import { RevenueOpportunityEngine } from './components/growth/RevenueOpportunityEngine';
import { MarketingAutomationEngine } from './components/growth/MarketingAutomationEngine';
import { CustomerGrowthEngine } from './components/growth/CustomerGrowthEngine';
import { OperationsOptimizationEngine } from './components/growth/OperationsOptimizationEngine';
import { ROICommandCenter } from './components/growth/ROICommandCenter';
import { ExecutionCenter } from './components/growth/ExecutionCenter';
import { DataQualityCenter } from './components/growth/DataQualityCenter';
import { RecommendationHistory } from './components/growth/RecommendationHistory';
import { ElectricalWorkflowStudio } from './components/growth/ElectricalWorkflowStudio';
import { EvidenceDrawer } from './components/evidence/EvidenceDrawer';
import { EvidenceItem } from './types/evidence';

import {
  INITIAL_PLATFORMS,
  INITIAL_POSTS,
  INITIAL_CAMPAIGNS,
  INITIAL_BRAND_VOICE,
  INITIAL_ANALYTICS,
  INITIAL_PLATFORM_METRICS,
  INITIAL_TRENDS,
  INITIAL_MEDIA_ASSETS,
  INITIAL_TEAM,
  INITIAL_WORKFLOWS,
  INITIAL_AI_AGENTS,
  INITIAL_INTEGRATIONS
} from './data/initialData';

import {
  INITIAL_BUSINESS_PROFILE,
  INITIAL_HEALTH_SCORE,
  INITIAL_REVENUE_OPPORTUNITIES,
  INITIAL_MARKETING_CAMPAIGNS,
  INITIAL_CUSTOMER_WORKFLOWS,
  INITIAL_OPERATIONAL_ITEMS,
  INITIAL_EXECUTIVE_BRIEFING
} from './data/growthData';

import { ContentPost, MediaAsset, RelayTab } from './types/relay';

export default function App() {
  const [darkMode, setDarkMode] = useState(true);
  const [activeModule, setActiveModule] = useState('relay');
  const [activeTab, setActiveTab] = useState<RelayTab>('launch_program');

  // Application State - Growth OS & Evidence Graph
  const [businessProfile, setBusinessProfile] = useState(INITIAL_BUSINESS_PROFILE);
  const [healthScore, setHealthScore] = useState(INITIAL_HEALTH_SCORE);
  const [revenueOpportunities, setRevenueOpportunities] = useState(INITIAL_REVENUE_OPPORTUNITIES);
  const [marketingCampaigns, setMarketingCampaigns] = useState(INITIAL_MARKETING_CAMPAIGNS);
  const [customerWorkflows, setCustomerWorkflows] = useState(INITIAL_CUSTOMER_WORKFLOWS);
  const [operationalItems, setOperationalItems] = useState(INITIAL_OPERATIONAL_ITEMS);
  const [executiveBriefing, setExecutiveBriefing] = useState(INITIAL_EXECUTIVE_BRIEFING);

  // Evidence Drawer Modal State
  const [activeEvidence, setActiveEvidence] = useState<EvidenceItem | null>(null);
  const [isEvidenceOpen, setIsEvidenceOpen] = useState(false);

  // Application State - Relay Content & Platform
  const [platforms, setPlatforms] = useState(INITIAL_PLATFORMS);
  const [posts, setPosts] = useState<ContentPost[]>(INITIAL_POSTS);
  const [campaigns, setCampaigns] = useState(INITIAL_CAMPAIGNS);
  const [brandVoice, setBrandVoice] = useState(INITIAL_BRAND_VOICE);
  const [analytics, setAnalytics] = useState(INITIAL_ANALYTICS);
  const [platformMetrics, setPlatformMetrics] = useState(INITIAL_PLATFORM_METRICS);
  const [trends, setTrends] = useState(INITIAL_TRENDS);
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>(INITIAL_MEDIA_ASSETS);
  const [team, setTeam] = useState(INITIAL_TEAM);
  const [workflows, setWorkflows] = useState(INITIAL_WORKFLOWS);
  const [agents, setAgents] = useState(INITIAL_AI_AGENTS);
  const [integrations, setIntegrations] = useState(INITIAL_INTEGRATIONS);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalInitialDate, setModalInitialDate] = useState<string | undefined>(undefined);

  const handleOpenEvidence = (ev: EvidenceItem) => {
    setActiveEvidence(ev);
    setIsEvidenceOpen(true);
  };

  const pendingApprovalsPosts = posts.filter((p) => p.status === 'under_review');

  const handleSavePost = (newPostData: Partial<ContentPost>) => {
    const created: ContentPost = {
      id: `post-${Date.now()}`,
      title: newPostData.title || 'Untitled Relay Post',
      body: newPostData.body || '',
      platforms: newPostData.platforms || ['linkedin'],
      platformSpecificCopy: newPostData.platformSpecificCopy,
      hashtags: newPostData.hashtags || ['#EmpireOS'],
      status: newPostData.status || 'scheduled',
      scheduledAt: newPostData.scheduledAt || new Date(Date.now() + 86400000).toISOString(),
      author: newPostData.author || 'Alex Vance (Admin)',
      aiOptimized: true,
      engagementScore: newPostData.engagementScore || 88,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setPosts([created, ...posts]);
  };

  const handleSaveRepurposedCampaign = (repurposedPosts: any[]) => {
    const newItems: ContentPost[] = repurposedPosts.map((rp, idx) => ({
      id: `post-rp-${Date.now()}-${idx}`,
      title: rp.title,
      body: rp.body,
      platforms: rp.platforms,
      hashtags: ['#EmpireOS', '#Repurposed'],
      status: rp.status || 'scheduled',
      scheduledAt: new Date(Date.now() + (idx + 1) * 86400000).toISOString(),
      author: rp.author || 'Alex Vance (Admin)',
      aiOptimized: true,
      engagementScore: 92,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));

    setPosts([...newItems, ...posts]);
    setActiveTab('schedule');
  };

  const handleDeletePost = (id: string) => {
    setPosts(posts.filter((p) => p.id !== id));
  };

  const handleApprovePost = (id: string) => {
    setPosts(posts.map((p) => p.id === id ? { ...p, status: 'scheduled' } : p));
  };

  const handleAddMediaAsset = (asset: MediaAsset) => {
    setMediaAssets([asset, ...mediaAssets]);
  };

  const handleToggleWorkflow = (id: string) => {
    setWorkflows(workflows.map((w) => w.id === id ? { ...w, enabled: !w.enabled } : w));
  };

  const handleUseTopicForPost = (suggestedAngle: string) => {
    setActiveTab('studio');
  };

  const handleOpenCreateModalWithDate = (dateStr: string) => {
    setModalInitialDate(dateStr);
    setIsModalOpen(true);
  };

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${
      darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'
    }`}>
      
      {/* Top Native Empire OS Header */}
      <EmpireHeader
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        activeModule={activeModule}
        setActiveModule={setActiveModule}
        onOpenCreateModal={() => {
          setModalInitialDate(undefined);
          setIsModalOpen(true);
        }}
        pendingApprovalsCount={pendingApprovalsPosts.length}
      />

      {/* Main Container Layout */}
      <div className="flex-1 max-w-[1700px] w-full mx-auto flex overflow-hidden">
        
        {/* Left Native Empire OS Module Sidebar */}
        <EmpireSidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          darkMode={darkMode}
          pendingApprovalsCount={pendingApprovalsPosts.length}
        />

        {/* Main Workspace View */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto max-h-[calc(100vh-64px)]">
          {/* Electrical Company Workflow Vertical Slice */}
          {activeTab === 'electrical_workflow' && (
            <ElectricalWorkflowStudio darkMode={darkMode} />
          )}

          {/* 60-Day AI Client Launch Program */}
          {activeTab === 'launch_program' && (
            <LaunchProgramDashboard darkMode={darkMode} />
          )}

          {/* Growth Engine 6: Executive AI Advisor */}
          {activeTab === 'advisor' && (
            <ExecutiveAIAdvisor
              briefing={executiveBriefing}
              businessProfile={businessProfile}
              darkMode={darkMode}
              onActivateOpportunity={() => setActiveTab('revenue')}
              onInspectEvidence={handleOpenEvidence}
            />
          )}

          {/* Growth Engine 1: Business Intelligence */}
          {activeTab === 'intelligence' && (
            <BusinessIntelligence
              profile={businessProfile}
              setProfile={setBusinessProfile}
              healthScore={healthScore}
              setHealthScore={setHealthScore}
              darkMode={darkMode}
            />
          )}

          {/* Growth Engine 2: Revenue Opportunities */}
          {activeTab === 'revenue' && (
            <RevenueOpportunityEngine
              opportunities={revenueOpportunities}
              setOpportunities={setRevenueOpportunities}
              businessProfile={businessProfile}
              darkMode={darkMode}
              onNavigateToMarketing={() => setActiveTab('marketing')}
              onNavigateToCustomerGrowth={() => setActiveTab('customer_growth')}
              onInspectEvidence={handleOpenEvidence}
            />
          )}

          {/* Closed-Loop Attribution & ROI Command Center */}
          {activeTab === 'roi' && (
            <ROICommandCenter
              darkMode={darkMode}
              onOpenEvidence={handleOpenEvidence}
            />
          )}

          {/* Execution Ledger & Human Approval Center */}
          {activeTab === 'execution' && (
            <ExecutionCenter darkMode={darkMode} />
          )}

          {/* Integration Health & Data Quality Center */}
          {activeTab === 'data_quality' && (
            <DataQualityCenter darkMode={darkMode} />
          )}

          {/* AI Recommendation Learning & Accuracy History */}
          {activeTab === 'recommendations' && (
            <RecommendationHistory darkMode={darkMode} />
          )}

          {/* Growth Engine 3: Marketing Automation */}
          {activeTab === 'marketing' && (
            <MarketingAutomationEngine
              campaigns={marketingCampaigns}
              setCampaigns={setMarketingCampaigns}
              businessProfile={businessProfile}
              darkMode={darkMode}
              onNavigateToContentStudio={() => setActiveTab('studio')}
            />
          )}

          {/* Growth Engine 4: Customer Growth Workflows */}
          {activeTab === 'customer_growth' && (
            <CustomerGrowthEngine
              workflows={customerWorkflows}
              setWorkflows={setCustomerWorkflows}
              darkMode={darkMode}
            />
          )}

          {/* Growth Engine 5: Operations Optimization */}
          {activeTab === 'operations' && (
            <OperationsOptimizationEngine
              items={operationalItems}
              setItems={setOperationalItems}
              darkMode={darkMode}
              onDeployToAutomation={() => setActiveTab('automation')}
            />
          )}

          {/* Supporting Content & Platform Suites */}
          {activeTab === 'studio' && (
            <ContentStudio
              platforms={platforms}
              darkMode={darkMode}
              onSavePost={handleSavePost}
              brandVoiceName={brandVoice.name}
            />
          )}

          {activeTab === 'repurposer' && (
            <RepurposingEngine
              platforms={platforms}
              darkMode={darkMode}
              onSaveRepurposedCampaign={handleSaveRepurposedCampaign}
              brandVoiceName={brandVoice.name}
            />
          )}

          {activeTab === 'schedule' && (
            <SmartSchedule
              posts={posts}
              platforms={platforms}
              darkMode={darkMode}
              onOpenCreateModalWithDate={handleOpenCreateModalWithDate}
              onDeletePost={handleDeletePost}
            />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsDashboard
              analytics={analytics}
              platformMetrics={platformMetrics}
              platforms={platforms}
              darkMode={darkMode}
            />
          )}

          {activeTab === 'trends' && (
            <TrendIntelligence
              trends={trends}
              darkMode={darkMode}
              onUseTopicForPost={handleUseTopicForPost}
            />
          )}

          {activeTab === 'brand' && (
            <BrandWorkspace
              brandVoice={brandVoice}
              setBrandVoice={setBrandVoice}
              darkMode={darkMode}
            />
          )}

          {activeTab === 'media' && (
            <MediaLibrary
              mediaAssets={mediaAssets}
              darkMode={darkMode}
              onAddMediaAsset={handleAddMediaAsset}
            />
          )}

          {activeTab === 'team' && (
            <TeamCollaboration
              team={team}
              pendingPosts={pendingApprovalsPosts}
              darkMode={darkMode}
              onApprovePost={handleApprovePost}
            />
          )}

          {activeTab === 'automation' && (
            <AutomationEngine
              workflows={workflows}
              darkMode={darkMode}
              onToggleWorkflow={handleToggleWorkflow}
            />
          )}

          {activeTab === 'agents' && (
            <AIAgentsHub
              agents={agents}
              darkMode={darkMode}
            />
          )}

          {activeTab === 'integrations' && (
            <IntegrationsHub
              integrations={integrations}
              darkMode={darkMode}
            />
          )}
        </main>

      </div>

      {/* Global Evidence Inspector Drawer */}
      <EvidenceDrawer
        isOpen={isEvidenceOpen}
        onClose={() => setIsEvidenceOpen(false)}
        evidence={activeEvidence}
        darkMode={darkMode}
      />

      {/* Global Quick Create Post Modal */}
      <CreatePostModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        platforms={platforms}
        darkMode={darkMode}
        onSavePost={handleSavePost}
        initialDate={modalInitialDate}
      />

    </div>
  );
}
