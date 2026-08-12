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

import {
  DEFAULT_STAGES,
  DEFAULT_PROVIDER_PROFILE,
  DEFAULT_NICHES,
  DEFAULT_PAIN_POINTS,
  DEFAULT_OFFERS,
  DEFAULT_DEMO_ASSETS,
  DEFAULT_PROSPECTS,
  DEFAULT_OUTREACH_DRAFTS,
  DEFAULT_CALL_BRIEFS,
  DEFAULT_PROPOSALS,
  DEFAULT_ONBOARDING_PORTALS,
  DEFAULT_DEPLOYMENT_BLUEPRINTS,
  DEFAULT_RESULT_METRICS
} from '../data/launchProgramData';

class LaunchProgramEngineService {
  private stages: LaunchProgramStage[] = [...DEFAULT_STAGES];
  private profile: ProviderBusinessProfile = { ...DEFAULT_PROVIDER_PROFILE };
  private niches: NicheCandidate[] = [...DEFAULT_NICHES];
  private painPoints: NichePainPoint[] = [...DEFAULT_PAIN_POINTS];
  private offers: ProductizedOffer[] = [...DEFAULT_OFFERS];
  private demoAssets: DemoAsset[] = [...DEFAULT_DEMO_ASSETS];
  private prospects: ProspectRecord[] = [...DEFAULT_PROSPECTS];
  private outreachDrafts: OutreachDraft[] = [...DEFAULT_OUTREACH_DRAFTS];
  private callBriefs: StrategyCallBrief[] = [...DEFAULT_CALL_BRIEFS];
  private proposals: ProposalRecord[] = [...DEFAULT_PROPOSALS];
  private onboardingPortals: ClientOnboardingPortal[] = [...DEFAULT_ONBOARDING_PORTALS];
  private deploymentBlueprints: SolutionDeploymentBlueprint[] = [...DEFAULT_DEPLOYMENT_BLUEPRINTS];
  private resultMetrics: ClientResultMetrics[] = [...DEFAULT_RESULT_METRICS];

  // Stage Progress
  getStages(): LaunchProgramStage[] {
    return this.stages;
  }

  updateStageProgress(stageId: string, progressPercentage: number, state: 'not_started' | 'in_progress' | 'completed' | 'blocked'): LaunchProgramStage[] {
    this.stages = this.stages.map(s => {
      if (s.id === stageId) {
        return { ...s, progressPercentage, progressState: state };
      }
      return s;
    });
    return this.getStages();
  }

  // Profile
  getProfile(): ProviderBusinessProfile {
    return this.profile;
  }

  updateProfile(updates: Partial<ProviderBusinessProfile>): ProviderBusinessProfile {
    this.profile = { ...this.profile, ...updates };
    return this.getProfile();
  }

  // Niches
  getNiches(): NicheCandidate[] {
    return this.niches;
  }

  selectNiche(nicheId: string): NicheCandidate[] {
    this.niches = this.niches.map(n => ({
      ...n,
      selectedByOwner: n.id === nicheId
    }));
    this.profile.selectedNicheId = nicheId;
    return this.getNiches();
  }

  async recommendNicheAI(industryPreference: string, targetIncome: number): Promise<NicheCandidate> {
    try {
      const res = await fetch('/api/launch-program/recommend-niche', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ industryPreference, targetIncome })
      });
      const data = await res.json();
      if (data.success && data.niche) {
        this.niches = [data.niche, ...this.niches.filter(n => n.id !== data.niche.id)];
        return data.niche;
      }
    } catch {
      // Fallback
    }
    return this.niches[0];
  }

  // Pain Points
  getPainPoints(): NichePainPoint[] {
    return this.painPoints;
  }

  addPainPoint(pain: NichePainPoint): NichePainPoint[] {
    this.painPoints = [pain, ...this.painPoints];
    return this.getPainPoints();
  }

  // Offers
  getOffers(): ProductizedOffer[] {
    return this.offers;
  }

  approveOffer(offerId: string): ProductizedOffer[] {
    this.offers = this.offers.map(o => {
      if (o.id === offerId) {
        return { ...o, approvalState: 'approved', approvedAt: new Date().toISOString() };
      }
      return o;
    });
    return this.getOffers();
  }

  createOffer(offer: ProductizedOffer): ProductizedOffer[] {
    this.offers = [offer, ...this.offers];
    return this.getOffers();
  }

  // Demos
  getDemoAssets(): DemoAsset[] {
    return this.demoAssets;
  }

  approveDemoAsset(demoId: string): DemoAsset[] {
    this.demoAssets = this.demoAssets.map(d => {
      if (d.id === demoId) {
        return { ...d, approvalState: 'approved' };
      }
      return d;
    });
    return this.getDemoAssets();
  }

  // Prospects
  getProspects(): ProspectRecord[] {
    return this.prospects;
  }

  addProspect(prospect: ProspectRecord): ProspectRecord[] {
    this.prospects = [prospect, ...this.prospects];
    return this.getProspects();
  }

  updateProspectStatus(prospectId: string, status: ProspectRecord['outreachStatus'], nextAction?: string): ProspectRecord[] {
    this.prospects = this.prospects.map(p => {
      if (p.id === prospectId) {
        return {
          ...p,
          outreachStatus: status,
          nextAction: nextAction || p.nextAction
        };
      }
      return p;
    });
    return this.getProspects();
  }

  // Outreach Drafts
  getOutreachDrafts(): OutreachDraft[] {
    return this.outreachDrafts;
  }

  approveOutreachDraft(draftId: string): OutreachDraft[] {
    this.outreachDrafts = this.outreachDrafts.map(d => {
      if (d.id === draftId) {
        // Also update corresponding prospect outreachStatus
        this.updateProspectStatus(d.prospectId, 'outreach_sent', 'Awaiting prospect response');
        return {
          ...d,
          approvalStatus: 'dispatched',
          dispatchedAt: new Date().toISOString()
        };
      }
      return d;
    });
    return this.getOutreachDrafts();
  }

  rejectOutreachDraft(draftId: string): OutreachDraft[] {
    this.outreachDrafts = this.outreachDrafts.map(d => {
      if (d.id === draftId) {
        return { ...d, approvalStatus: 'rejected' };
      }
      return d;
    });
    return this.getOutreachDrafts();
  }

  // Strategy Calls & Proposals
  getCallBriefs(): StrategyCallBrief[] {
    return this.callBriefs;
  }

  getProposals(): ProposalRecord[] {
    return this.proposals;
  }

  createProposal(proposal: ProposalRecord): ProposalRecord[] {
    this.proposals = [proposal, ...this.proposals];
    return this.getProposals();
  }

  updateProposalStatus(proposalId: string, status: ProposalRecord['status']): ProposalRecord[] {
    this.proposals = this.proposals.map(p => {
      if (p.id === proposalId) {
        return {
          ...p,
          status,
          decisionAt: status === 'accepted' || status === 'rejected' ? new Date().toISOString() : p.decisionAt
        };
      }
      return p;
    });
    return this.getProposals();
  }

  // Onboarding
  getOnboardingPortals(): ClientOnboardingPortal[] {
    return this.onboardingPortals;
  }

  updateOnboardingDetails(portalId: string, completenessScore: number, missingReqs: string[]): ClientOnboardingPortal[] {
    this.onboardingPortals = this.onboardingPortals.map(p => {
      if (p.id === portalId) {
        return {
          ...p,
          completenessScore,
          missingRequirements: missingReqs,
          status: completenessScore >= 100 ? 'completed' : 'in_progress'
        };
      }
      return p;
    });
    return this.getOnboardingPortals();
  }

  // Deployment
  getDeploymentBlueprints(): SolutionDeploymentBlueprint[] {
    return this.deploymentBlueprints;
  }

  deployBlueprintLive(blueprintId: string): SolutionDeploymentBlueprint[] {
    this.deploymentBlueprints = this.deploymentBlueprints.map(b => {
      if (b.id === blueprintId) {
        return {
          ...b,
          status: 'deployed_live',
          verifiedEvidenceOfFunction: true,
          deployedAt: new Date().toISOString()
        };
      }
      return b;
    });
    return this.getDeploymentBlueprints();
  }

  rollbackBlueprint(blueprintId: string): SolutionDeploymentBlueprint[] {
    this.deploymentBlueprints = this.deploymentBlueprints.map(b => {
      if (b.id === blueprintId) {
        return {
          ...b,
          status: 'paused'
        };
      }
      return b;
    });
    return this.getDeploymentBlueprints();
  }

  // Results & Proof
  getResultMetrics(): ClientResultMetrics[] {
    return this.resultMetrics;
  }
}

export const launchProgramEngine = new LaunchProgramEngineService();
