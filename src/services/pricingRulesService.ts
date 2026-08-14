import {
  PricingRuleRecord,
  PriceEvaluationRequest,
  PriceEvaluationResult,
  PriceClassification
} from '../types/pricingRules';

export class PricingRulesService {
  private rules: PricingRuleRecord[] = [];

  constructor() {
    // Standard unbinding default - no invented prices allowed without approved rules
  }

  public registerPricingRule(rule: PricingRuleRecord): void {
    this.rules.push(rule);
  }

  public evaluatePricing(request: PriceEvaluationRequest): PriceEvaluationResult {
    const today = new Date().toISOString().split('T')[0];
    const matchingRule = this.rules.find((r) => {
      if (r.tenantId !== request.tenantId) return false;
      if (r.effectiveDate > today) return false;
      if (r.expirationDate && r.expirationDate < today) return false;
      if (
        r.geographicScope.length > 0 &&
        !r.geographicScope.includes(request.city) &&
        !r.geographicScope.includes('ALL_MA')
      ) {
        return false;
      }
      return r.service.toLowerCase() === request.serviceRequested.toLowerCase();
    });

    if (!matchingRule) {
      return {
        allowed: false,
        classification: 'INFORMATION_REQUEST',
        blockedReason:
          'NO_APPROVED_PRICING_RULE: No active, version-controlled pricing rule exists for this service and location. AI agents are prohibited from inventing unbacked prices.'
      };
    }

    let rangeText = 'Pricing varies based on site inspection.';
    if (matchingRule.minPrice !== undefined && matchingRule.maxPrice !== undefined) {
      rangeText = `Preliminary estimate range: $${matchingRule.minPrice.toLocaleString()} - $${matchingRule.maxPrice.toLocaleString()} (${matchingRule.classification.replace('_', ' ')})`;
    }

    return {
      allowed: true,
      classification: matchingRule.classification,
      ruleApplied: matchingRule,
      suggestedRangeText: rangeText
    };
  }
}

export const pricingRulesService = new PricingRulesService();
