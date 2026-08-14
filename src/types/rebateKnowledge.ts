export interface RebateProgramRecord {
  id: string;
  programName: string;
  officialSourceUrl: string;
  utilityOrAdministrator: string;
  geographicEligibility: string[];
  customerEligibility: string;
  equipmentEligibility: string;
  effectiveDate: string;
  expirationDate: string;
  lastVerifiedTimestamp: string;
  exactLimitations: string[];
  humanReviewStatus: 'PENDING_REVIEW' | 'APPROVED' | 'EXPIRED' | 'REJECTED';
}

export interface RebateQueryResponse {
  matchingPrograms: RebateProgramRecord[];
  informationalDisclaimer: string;
  expiredOrStaleCount: number;
}
