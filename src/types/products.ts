export type ProductAvailabilityStatus = 'PRODUCTION' | 'STABLE' | 'ALPHA' | 'BETA' | 'ACTIVE' | 'PLANNED';
export type ProductIntegrationStatus = 'VERIFIED' | 'CONNECTED' | 'DRY_RUN' | 'IMPLEMENTED' | 'PLANNED';
export type TruthClaimStatus = 'IMPLEMENTED' | 'VERIFIED' | 'CONNECTED' | 'DRY_RUN' | 'DEMO_DATA' | 'PLANNED' | 'BLOCKED';

export interface ProductProofItem {
  id: string;
  title: string;
  type: 'TEST' | 'BENCHMARK' | 'SCHEMA' | 'ARCHITECTURE' | 'GOVERNANCE' | 'SECURITY';
  verificationStatus: 'VERIFIED' | 'UNVERIFIED' | 'PENDING';
  evidenceHash: string;
  summary: string;
  assertionCount?: number;
  sourceReference: string;
}

export interface ProductDefinition {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  description: string;
  category: string;
  stage: ProductAvailabilityStatus;
  status: ProductAvailabilityStatus;
  truthStatus: TruthClaimStatus;
  integrationStatus: ProductIntegrationStatus;
  capabilities: string[];
  supportedInputTypes: string[];
  supportedOutputTypes: string[];
  supportedActionTypes: string[];
  defaultWorkerId: string;
  defaultWorkerName: string;
  evidenceProofCount: number;
  proofs: ProductProofItem[];
  stackSummary: string;
  openProductTab?: string;
  openProductUrl?: string;
  implementationTruthSummary: string;
}
