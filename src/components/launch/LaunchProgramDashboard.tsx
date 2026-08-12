import React, { useState } from 'react';
import {
  Rocket,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  Award,
  Users,
  Send,
  PhoneCall,
  ShieldCheck,
  Cpu,
  BarChart3,
  Building2,
  Target,
  ShieldAlert,
  Play,
  ArrowRight,
  ChevronRight,
  Zap,
  Sparkles
} from 'lucide-react';

import { launchProgramEngine } from '../../services/launchProgramEngine';
import { LaunchProgramStage } from '../../types/launchProgram';

import { BusinessProfileScreen } from './BusinessProfileScreen';
import { NicheExplorerScreen } from './NicheExplorerScreen';
import { PainDiagnosticScreen } from './PainDiagnosticScreen';
import { OfferBuilderScreen } from './OfferBuilderScreen';
import { DemoStudioScreen } from './DemoStudioScreen';
import { ProspectCrmScreen } from './ProspectCrmScreen';
import { OutreachCommandScreen } from './OutreachCommandScreen';
import { StrategyCallHubScreen } from './StrategyCallHubScreen';
import { ClientOnboardingScreen } from './ClientOnboardingScreen';
import { SolutionDeploymentScreen } from './SolutionDeploymentScreen';
import { ResultsProofScreen } from './ResultsProofScreen';
import { GBPLaunchStudio } from './GBPLaunchStudio';

interface LaunchProgramDashboardProps {
  darkMode: boolean;
}

export const LaunchProgramDashboard: React.FC<LaunchProgramDashboardProps> = ({ darkMode }) => {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'profile' | 'niche' | 'pain' | 'offer' | 'demo' | 'prospects' | 'outreach' | 'calls' | 'onboarding' | 'deployment' | 'results' | 'gbp'
  >('overview');

  // Engine state hooks
  const [stages, setStages] = useState(launchProgramEngine.getStages());
  const [profile, setProfile] = useState(launchProgramEngine.getProfile());
  const [niches, setNiches] = useState(launchProgramEngine.getNiches());
  const [painPoints, setPainPoints] = useState(launchProgramEngine.getPainPoints());
  const [offers, setOffers] = useState(launchProgramEngine.getOffers());
  const [demoAssets, setDemoAssets] = useState(launchProgramEngine.getDemoAssets());
  const [prospects, setProspects] = useState(launchProgramEngine.getProspects());
  const [outreachDrafts, setOutreachDrafts] = useState(launchProgramEngine.getOutreachDrafts());
  const [callBriefs, setCallBriefs] = useState(launchProgramEngine.getCallBriefs());
  const [proposals, setProposals] = useState(launchProgramEngine.getProposals());
  const [portals, setPortals] = useState(launchProgramEngine.getOnboardingPortals());
  const [blueprints, setBlueprints] = useState(launchProgramEngine.getDeploymentBlueprints());
  const [resultMetrics, setResultMetrics] = useState(launchProgramEngine.getResultMetrics());

  // Metrics Calculations
  const pendingApprovalsCount = outreachDrafts.filter(d => d.approvalStatus === 'pending_owner_approval').length +
    offers.filter(o => o.approvalState === 'draft').length;

  const totalProgressPct = Math.round(
    stages.reduce((sum, s) => sum + s.progressPercentage, 0) / stages.length
  );

  const activeStage = stages.find(s => s.progressState === 'in_progress') || stages[0];

  // Handler wrappers
  const handleUpdateProfile = (updates: any) => {
    const updated = launchProgramEngine.updateProfile(updates);
    setProfile(updated);
  };

  const handleSelectNiche = (nicheId: string) => {
    const updated = launchProgramEngine.selectNiche(nicheId);
    setNiches(updated);
    // Mark Stage 1 Progress
    const newStages = launchProgramEngine.updateStageProgress('stage-1', 100, 'completed');
    launchProgramEngine.updateStageProgress('stage-2', 50, 'in_progress');
    setStages(launchProgramEngine.getStages());
  };

  const handleRecommendAI = async () => {
    await launchProgramEngine.recommendNicheAI(profile.serviceGoals, profile.targetMonthlyIncome);
    setNiches([...launchProgramEngine.getNiches()]);
  };

  const handleAddPainPoint = (pain: any) => {
    const updated = launchProgramEngine.addPainPoint(pain);
    setPainPoints(updated);
  };

  const handleApproveOffer = (offerId: string) => {
    const updated = launchProgramEngine.approveOffer(offerId);
    setOffers(updated);
  };

  const handleCreateOffer = (offer: any) => {
    const updated = launchProgramEngine.createOffer(offer);
    setOffers(updated);
  };

  const handleApproveDemo = (demoId: string) => {
    const updated = launchProgramEngine.approveDemoAsset(demoId);
    setDemoAssets(updated);
  };

  const handleAddProspect = (p: any) => {
    const updated = launchProgramEngine.addProspect(p);
    setProspects(updated);
  };

  const handleUpdateProspectStatus = (id: string, status: any, nextAction?: string) => {
    const updated = launchProgramEngine.updateProspectStatus(id, status, nextAction);
    setProspects(updated);
  };

  const handleApproveDraft = (draftId: string) => {
    const updated = launchProgramEngine.approveOutreachDraft(draftId);
    setOutreachDrafts(updated);
    setProspects([...launchProgramEngine.getProspects()]);
  };

  const handleRejectDraft = (draftId: string) => {
    const updated = launchProgramEngine.rejectOutreachDraft(draftId);
    setOutreachDrafts(updated);
  };

  const handleCreateProposal = (prop: any) => {
    const updated = launchProgramEngine.createProposal(prop);
    setProposals(updated);
  };

  const handleUpdateProposalStatus = (id: string, status: any) => {
    const updated = launchProgramEngine.updateProposalStatus(id, status);
    setProposals(updated);
    if (status === 'accepted') {
      setProfile(prev => ({
        ...prev,
        currentMonthlyIncome: prev.currentMonthlyIncome + 3500,
        currentClientsCount: prev.currentClientsCount + 1
      }));
    }
  };

  const handleUpdatePortal = (portalId: string, score: number, missing: string[]) => {
    const updated = launchProgramEngine.updateOnboardingDetails(portalId, score, missing);
    setPortals(updated);
  };

  const handleDeployLive = (id: string) => {
    const updated = launchProgramEngine.deployBlueprintLive(id);
    setBlueprints(updated);
  };

  const handleRollback = (id: string) => {
    const updated = launchProgramEngine.rollbackBlueprint(id);
    setBlueprints(updated);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Program Header & Metrics Ribbon */}
      <div className={`p-6 rounded-2xl border ${darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-indigo-300 border border-indigo-500/30">
                Empire OS Vertical Slice
              </span>
              <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Stale Lead Recovery Engine
              </span>
            </div>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
              <Rocket className="w-6 h-6 text-indigo-400" />
              60-Day AI Client Launch Program
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Step-by-step operating system: Identify niches, diagnose revenue loss, construct offers, generate demonstrations, conduct approved outreach, close clients, onboard them, deploy solution blueprints, and prove ROI.
            </p>
          </div>

          {/* Core Metrics Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono shrink-0">
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 block font-bold uppercase">Monthly Revenue</span>
              <span className="text-lg font-extrabold text-emerald-400">${profile.currentMonthlyIncome.toLocaleString()}</span>
              <span className="text-[9px] text-slate-500 block">Target: ${profile.targetMonthlyIncome.toLocaleString()}</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 block font-bold uppercase">Program Completion</span>
              <span className="text-lg font-extrabold text-indigo-400">{totalProgressPct}%</span>
              <span className="text-[9px] text-slate-500 block">Stage {activeStage.stageNumber} / 8</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 block font-bold uppercase">Active Clients</span>
              <span className="text-lg font-extrabold text-sky-400">{profile.currentClientsCount}</span>
              <span className="text-[9px] text-slate-500 block">Capacity: {profile.clientCapacityMax}</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 block font-bold uppercase">Pending Gate</span>
              <span className="text-lg font-extrabold text-amber-400">{pendingApprovalsCount}</span>
              <span className="text-[9px] text-slate-500 block">Owner Sign-off</span>
            </div>
          </div>
        </div>

        {/* Stage Timeline Navigation Bar */}
        <div className="mt-6 pt-5 border-t border-slate-800/80">
          <span className="text-[10px] font-mono font-bold uppercase text-slate-400 block mb-3">
            60-Day Lifecycle Stages Timeline:
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
            {stages.map((stg) => {
              const isCurrent = stg.progressState === 'in_progress';
              const isDone = stg.progressState === 'completed';
              return (
                <button
                  key={stg.id}
                  onClick={() => {
                    if (stg.stageNumber === 1) setActiveTab('niche');
                    else if (stg.stageNumber === 2) setActiveTab('pain');
                    else if (stg.stageNumber === 3) setActiveTab('demo');
                    else if (stg.stageNumber === 4) setActiveTab('outreach');
                    else if (stg.stageNumber === 5) setActiveTab('calls');
                    else if (stg.stageNumber === 6) setActiveTab('onboarding');
                    else if (stg.stageNumber === 7) setActiveTab('deployment');
                    else if (stg.stageNumber === 8) setActiveTab('results');
                  }}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer relative ${
                    isCurrent
                      ? 'border-indigo-500 bg-indigo-950/40 text-indigo-200 ring-1 ring-indigo-500/50'
                      : isDone
                      ? 'border-emerald-500/40 bg-emerald-950/20 text-emerald-300'
                      : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-mono font-bold mb-1">
                    <span>Days {stg.dayRangeStart}-{stg.dayRangeEnd}</span>
                    {isDone ? (
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    ) : isCurrent ? (
                      <Clock className="w-3 h-3 text-indigo-400 animate-pulse" />
                    ) : null}
                  </div>
                  <div className="text-[11px] font-bold truncate leading-tight">{stg.title}</div>
                  <div className="w-full bg-slate-900 h-1 rounded-full mt-2 overflow-hidden">
                    <div
                      className={`h-full ${isDone ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                      style={{ width: `${stg.progressPercentage}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Sub-Workspace Navigation Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-2 border-b border-slate-800 text-xs font-semibold scrollbar-none">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
            activeTab === 'overview' ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-950' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Rocket className="w-3.5 h-3.5" /> Roadmap Overview
        </button>
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
            activeTab === 'profile' ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-950' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" /> Agency Profile
        </button>
        <button
          onClick={() => setActiveTab('niche')}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
            activeTab === 'niche' ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-950' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Target className="w-3.5 h-3.5" /> Niche Explorer
        </button>
        <button
          onClick={() => setActiveTab('pain')}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
            activeTab === 'pain' ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-950' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" /> Pain Diagnostic
        </button>
        <button
          onClick={() => setActiveTab('offer')}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
            activeTab === 'offer' ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-950' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Award className="w-3.5 h-3.5" /> Offer Builder
        </button>
        <button
          onClick={() => setActiveTab('demo')}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
            activeTab === 'demo' ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-950' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Play className="w-3.5 h-3.5" /> Demo Studio
        </button>
        <button
          onClick={() => setActiveTab('prospects')}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
            activeTab === 'prospects' ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-950' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-3.5 h-3.5" /> Prospects CRM
        </button>
        <button
          onClick={() => setActiveTab('outreach')}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
            activeTab === 'outreach' ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-950' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Send className="w-3.5 h-3.5" /> Outreach Command
        </button>
        <button
          onClick={() => setActiveTab('calls')}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
            activeTab === 'calls' ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-950' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <PhoneCall className="w-3.5 h-3.5" /> Strategy Calls
        </button>
        <button
          onClick={() => setActiveTab('onboarding')}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
            activeTab === 'onboarding' ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-950' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" /> Onboarding Vault
        </button>
        <button
          onClick={() => setActiveTab('gbp')}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
            activeTab === 'gbp' ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-950' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Building2 className="w-3.5 h-3.5 text-indigo-400" /> Google Business Launch
        </button>
        <button
          onClick={() => setActiveTab('deployment')}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
            activeTab === 'deployment' ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-950' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" /> Deploy Engine
        </button>
        <button
          onClick={() => setActiveTab('results')}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
            activeTab === 'results' ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-950' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" /> Results & Proof
        </button>
      </div>

      {/* Main Workspace Display */}
      <div>
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Rocket className="w-5 h-5 text-indigo-400" /> 60-Day Program Roadmap & Workflows
                </h2>
                <p className="text-xs text-slate-400">
                  Select any stage below to launch its dedicated interactive workspace.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {stages.map((stg) => (
                <div
                  key={stg.id}
                  className={`p-5 rounded-2xl border flex flex-col justify-between transition-all ${
                    stg.progressState === 'in_progress'
                      ? 'border-indigo-500 bg-indigo-950/20 shadow-lg shadow-indigo-950/30 ring-1 ring-indigo-500/40'
                      : stg.progressState === 'completed'
                      ? 'border-emerald-500/30 bg-slate-900/40'
                      : darkMode
                      ? 'bg-slate-900/60 border-slate-800'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between font-mono text-[10px] mb-2">
                      <span className="font-bold text-indigo-400 uppercase">Stage {stg.stageNumber} • Days {stg.dayRangeStart}-{stg.dayRangeEnd}</span>
                      <span className={`px-2 py-0.5 rounded font-bold uppercase ${
                        stg.progressState === 'completed'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : stg.progressState === 'in_progress'
                          ? 'bg-indigo-500/20 text-indigo-300'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {stg.progressState.replace('_', ' ')}
                      </span>
                    </div>

                    <h3 className="text-base font-bold mb-1">{stg.title}</h3>
                    <p className="text-xs text-slate-400 mb-4 leading-relaxed">{stg.description}</p>

                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 mb-4 space-y-1 text-xs font-mono">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Stage Deliverable:</span>
                      <span className="text-slate-200 font-semibold">{stg.keyDeliverable}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (stg.stageNumber === 1) setActiveTab('niche');
                      else if (stg.stageNumber === 2) setActiveTab('pain');
                      else if (stg.stageNumber === 3) setActiveTab('demo');
                      else if (stg.stageNumber === 4) setActiveTab('outreach');
                      else if (stg.stageNumber === 5) setActiveTab('calls');
                      else if (stg.stageNumber === 6) setActiveTab('onboarding');
                      else if (stg.stageNumber === 7) setActiveTab('deployment');
                      else if (stg.stageNumber === 8) setActiveTab('results');
                    }}
                    className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    Launch Stage Workspace
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <BusinessProfileScreen
            profile={profile}
            onUpdateProfile={handleUpdateProfile}
            darkMode={darkMode}
          />
        )}

        {activeTab === 'niche' && (
          <NicheExplorerScreen
            niches={niches}
            onSelectNiche={handleSelectNiche}
            onRecommendAI={handleRecommendAI}
            darkMode={darkMode}
          />
        )}

        {activeTab === 'pain' && (
          <PainDiagnosticScreen
            painPoints={painPoints}
            onAddPainPoint={handleAddPainPoint}
            darkMode={darkMode}
          />
        )}

        {activeTab === 'offer' && (
          <OfferBuilderScreen
            offers={offers}
            onApproveOffer={handleApproveOffer}
            onCreateOffer={handleCreateOffer}
            darkMode={darkMode}
          />
        )}

        {activeTab === 'demo' && (
          <DemoStudioScreen
            demoAssets={demoAssets}
            onApproveDemo={handleApproveDemo}
            darkMode={darkMode}
          />
        )}

        {activeTab === 'prospects' && (
          <ProspectCrmScreen
            prospects={prospects}
            onAddProspect={handleAddProspect}
            onUpdateStatus={handleUpdateProspectStatus}
            darkMode={darkMode}
          />
        )}

        {activeTab === 'outreach' && (
          <OutreachCommandScreen
            drafts={outreachDrafts}
            onApproveDraft={handleApproveDraft}
            onRejectDraft={handleRejectDraft}
            darkMode={darkMode}
          />
        )}

        {activeTab === 'calls' && (
          <StrategyCallHubScreen
            briefs={callBriefs}
            proposals={proposals}
            onCreateProposal={handleCreateProposal}
            onUpdateProposalStatus={handleUpdateProposalStatus}
            darkMode={darkMode}
          />
        )}

        {activeTab === 'onboarding' && (
          <ClientOnboardingScreen
            portals={portals}
            onUpdatePortal={handleUpdatePortal}
            darkMode={darkMode}
          />
        )}

        {activeTab === 'gbp' && (
          <GBPLaunchStudio darkMode={darkMode} />
        )}

        {activeTab === 'deployment' && (
          <SolutionDeploymentScreen
            blueprints={blueprints}
            onDeployLive={handleDeployLive}
            onRollback={handleRollback}
            darkMode={darkMode}
          />
        )}

        {activeTab === 'results' && (
          <ResultsProofScreen
            metrics={resultMetrics}
            darkMode={darkMode}
          />
        )}
      </div>
    </div>
  );
};
