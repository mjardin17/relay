/**
 * Relay Project Intelligence Types
 * Analyzes workspace and tenant software projects, capabilities, dependencies,
 * duplicates, and cross-project reuse candidates with zero auto-merge.
 */

export type ProjectCapabilityStatus =
  | 'WORKING'
  | 'PARTIAL'
  | 'SCAFFOLD'
  | 'MISSING';

export type IntegrationRecommendation =
  | 'KEEP_INDEPENDENT'
  | 'REUSE_COMPONENT'
  | 'MERGE_CAPABILITY'
  | 'ARCHIVE'
  | 'NEEDS_REVIEW';

export interface ProjectDefinition {
  id: string;
  name: string;
  purpose: string;
  stack: {
    frontend: string;
    backend: string;
    database: string;
    language: string;
    frameworks: string[];
  };
  rootDirectory: string;
  repoUrl?: string;
  lastScannedAt?: string;
  status: 'ACTIVE' | 'ARCHIVED' | 'DISCOVERED';
}

export interface FunctionalCapabilityItem {
  id: string;
  name: string;
  description: string;
  status: ProjectCapabilityStatus;
  evidenceFiles: string[];
  testFiles: string[];
  dependencies: string[];
  reusableAcrossTenants: boolean;
  notes?: string;
}

export interface ReusableModuleCandidate {
  id: string;
  moduleName: string;
  category: string;
  sourceFile: string;
  exportedSymbols: string[];
  extractionReadinessScore: number; // 0-100
  portabilityAssessment: string;
  dependenciesToExtract: string[];
  targetSuitability: {
    storyForge?: boolean;
    crosspost?: boolean;
    bossLister?: boolean;
    relayCentral?: boolean;
  };
}

export interface ProjectDuplicationMatch {
  componentOrFeature: string;
  targetProjectLocation: string;
  sourceProjectLocation: string;
  similarityScore: number; // 0-100
  duplicationType: 'EXACT_CODE' | 'REDUNDANT_FEATURE' | 'PARALLEL_SERVICE';
  recommendation: string;
}

export interface ProjectComparisonReport {
  targetProject: string;
  sourceProject: string;
  comparedAt: string;
  purposeComparison: {
    targetPurpose: string;
    sourcePurpose: string;
    complementary: boolean;
  };
  stackComparison: {
    compatible: boolean;
    discrepancies: string[];
  };
  functionalCapabilities: FunctionalCapabilityItem[];
  workingFeatures: string[];
  partialFeatures: string[];
  missingFeatures: string[];
  dependencies: {
    shared: string[];
    uniqueToTarget: string[];
    uniqueToSource: string[];
    conflicts: string[];
  };
  externalServices: {
    target: string[];
    source: string[];
  };
  testCoverage: {
    testSuitesCount: number;
    testsCount: number;
    coverageAssessment: string;
  };
  reusableModules: ReusableModuleCandidate[];
  duplicationWithTarget: ProjectDuplicationMatch[];
  uniqueValue: string[];
  integrationRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  integrationRiskReasoning: string[];
  recommendation: IntegrationRecommendation;
  recommendationSummary: string;
  actionItems: string[];
}

export interface WorkspaceCapabilityInventoryItem {
  capability: string;
  existingImplementation: string;
  status: 'production' | 'partial' | 'scaffold' | 'missing';
  testsCoveringIt: string[];
  dependencies: string[];
  reusableAcrossTenants: boolean;
  highestValueNextImprovement: string;
}
