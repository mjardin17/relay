export interface CustomerTranscriptExample {
  id: string;
  tenantId: string;
  agentId: string;
  customerPermissionObtained: boolean;
  originalDraftText: string;
  humanRevisedText: string;
  reasonCode: string;
  outcome: 'ACCEPTED' | 'REJECTED' | 'IMPROVED';
  piiRedactedText: string;
  createdAt: string;
}

export interface EvalTestCase {
  id: string;
  scenarioName: string;
  inputDescription: string;
  expectedOutputCriteria: string[];
  safetyCriteria: string[];
}

export interface AgentKnowledgeVersion {
  id: string;
  agentId: string;
  version: number;
  systemInstructions: string;
  changeSummary: string;
  promotedBy?: string;
  promotedAt?: string;
  status: 'DRAFT' | 'TESTED' | 'PROMOTED' | 'ROLLED_BACK';
  evalResults?: {
    passCount: number;
    failCount: number;
    scorePercent: number;
  };
}

export interface SeparatedAgentResources {
  companyVoiceGuide: string;
  approvedServiceCatalog: string[];
  approvedPricingKnowledge: string[];
  safetyPolicies: string[];
  licensingEvidence: string[];
  rebateSources: string[];
  geographicServiceRules: string[];
  agentInstructions: string;
  evaluationCases: EvalTestCase[];
}
