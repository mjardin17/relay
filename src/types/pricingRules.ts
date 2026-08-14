export type PriceClassification =
  | 'INFORMATION_REQUEST'
  | 'PRELIMINARY_RANGE'
  | 'HUMAN_APPROVED_ESTIMATE'
  | 'FORMAL_QUOTE'
  | 'FINAL_INVOICE';

export interface PricingRuleRecord {
  id: string;
  tenantId: string;
  version: string;
  effectiveDate: string;
  expirationDate?: string;
  service: string;
  geographicScope: string[];
  laborAssumptions: string;
  materialsAssumptions: string;
  permitAssumptions: string;
  travelRules: string;
  approvalOwner: string;
  evidenceSource: string;
  classification: PriceClassification;
  minPrice?: number;
  maxPrice?: number;
  unit?: string;
  notes?: string;
}

export interface PriceEvaluationRequest {
  tenantId: string;
  serviceRequested: string;
  city: string;
  zip?: string;
}

export interface PriceEvaluationResult {
  allowed: boolean;
  classification: PriceClassification;
  ruleApplied?: PricingRuleRecord;
  suggestedRangeText?: string;
  blockedReason?: string;
}
