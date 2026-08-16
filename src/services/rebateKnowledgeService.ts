import { RebateProgramRecord, RebateQueryResponse } from '../types/rebateKnowledge';

export class RebateKnowledgeService {
  private rebateRecords: RebateProgramRecord[] = [];

  public registerRebateProgram(record: RebateProgramRecord): void {
    this.rebateRecords.push(record);
  }

  public queryRebates(equipmentType: string, zipOrTown: string): RebateQueryResponse {
    const today = new Date().toISOString().split('T')[0];
    let expiredOrStaleCount = 0;

    const matchingPrograms = this.rebateRecords.filter((record) => {
      // Check expiration date
      if (record.expirationDate < today || record.humanReviewStatus === 'EXPIRED') {
        expiredOrStaleCount++;
        return false;
      }
      if (record.humanReviewStatus !== 'APPROVED') {
        return false; // Only approved, verified rebate records are returned
      }
      // Check equipment match
      const equipMatch = record.equipmentEligibility.toLowerCase().includes(equipmentType.toLowerCase());
      // Check geographic match
      const geoMatch =
        record.geographicEligibility.length === 0 ||
        record.geographicEligibility.includes('MA') ||
        record.geographicEligibility.includes(zipOrTown);

      return equipMatch && geoMatch;
    });

    const disclaimer =
      'INFORMATIONAL DISCLAIMER: Rebate information is provided for educational and estimation purposes only. Shadrick M. Reis Electric does not guarantee customer eligibility, utility application approval, rebate payment amounts, or specific cost savings. Customers must apply directly with the utility or program administrator. (Applies configured Massachusetts claim and workflow gates. Requires official-source evidence and qualified human review. Not a legal determination.)';

    return {
      matchingPrograms,
      informationalDisclaimer: disclaimer,
      expiredOrStaleCount
    };
  }
}

export const rebateKnowledgeService = new RebateKnowledgeService();
