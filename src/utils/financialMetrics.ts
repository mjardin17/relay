/**
 * Relay Financial Metrics Engine
 * 
 * Standardized, deterministic financial calculations for lead intake, 
 * estimate projections, actual job outcomes, software ROI, and revenue attribution.
 * 
 * FORMULA DEFINITIONS:
 * 
 * 1. Projected Job Revenue (projectedJobRevenue): Estimated gross dollar value for the job.
 * 2. Projected Direct Job Cost (projectedDirectJobCost): Direct labor, materials, permits.
 * 3. Projected Gross Profit (projectedGrossProfit):
 *      projectedGrossProfit = projectedJobRevenue - projectedDirectJobCost
 * 4. Software Cost (softwareCost): Allocated Relay software platform cost ($ value).
 * 5. Projected Net Profit (projectedNetProfit):
 *      projectedNetProfit = projectedGrossProfit - softwareCost
 * 6. Projected ROI Percent (projectedRoiPercent):
 *      If softwareCost > 0: (projectedNetProfit / softwareCost) * 100
 *      If softwareCost == 0: 0.00% (safe zero-cost handling)
 * 
 * 7. Actual Job Revenue (actualJobRevenue): Settled / recorded revenue ($ value).
 * 8. Actual Direct Job Cost (actualDirectJobCost): Actual fulfillment cost ($ value).
 * 9. Actual Gross Profit (actualGrossProfit):
 *      actualGrossProfit = actualJobRevenue - actualDirectJobCost
 * 10. Actual Net Profit (actualNetProfit):
 *      actualNetProfit = actualGrossProfit - softwareCost
 * 11. Actual ROI Percent (actualRoiPercent):
 *      If softwareCost > 0: (actualNetProfit / softwareCost) * 100
 *      If softwareCost == 0: 0.00%
 * 
 * 12. Dollar Revenue Variance (dollarRevenueVariance):
 *      dollarRevenueVariance = actualJobRevenue - projectedJobRevenue
 * 13. Dollar Net Profit Variance (dollarNetProfitVariance):
 *      dollarNetProfitVariance = actualNetProfit - projectedNetProfit
 * 14. Percentage Revenue Variance (percentageRevenueVariance):
 *      If projectedJobRevenue > 0: ((actualJobRevenue - projectedJobRevenue) / projectedJobRevenue) * 100
 *      If projectedJobRevenue == 0: actualJobRevenue > 0 ? 100.00 : 0.00
 * 15. Percentage Net Profit Variance (percentageNetProfitVariance):
 *      If projectedNetProfit != 0: ((actualNetProfit - projectedNetProfit) / Math.abs(projectedNetProfit)) * 100
 *      If projectedNetProfit == 0: actualNetProfit > 0 ? 100.00 : 0.00
 * 
 * 16. Attributed Actual Revenue (attributedActualRevenue):
 *      attributedActualRevenue = actualJobRevenue * attributionWeight
 */

export interface FinancialCalculationInput {
  currency?: string; // default "USD"
  calculationPeriod?: string; // e.g., "2026-Q3"
  attributionSource?: string; // e.g., "Google Business Profile Inquiry"
  attributionWeight?: number; // default 1.0 (100% attribution)

  // Projected metrics
  projectedJobRevenue: number;
  projectedDirectJobCost?: number;

  // Actual metrics
  actualJobRevenue?: number;
  actualDirectJobCost?: number;

  // Software / platform overhead cost
  softwareCost?: number;
}

export interface DetailedFinancialMetrics {
  currency: string;
  calculationPeriod: string;
  attributionSource: string;
  attributionWeight: number;

  // Projected Breakdown
  projectedJobRevenue: number;
  projectedDirectJobCost: number;
  projectedGrossProfit: number;
  softwareCost: number;
  projectedNetProfit: number;
  projectedRoiPercent: number;

  // Actual Breakdown
  actualJobRevenue: number;
  attributedActualRevenue: number;
  actualDirectJobCost: number;
  actualGrossProfit: number;
  actualNetProfit: number;
  actualRoiPercent: number;

  // Variances (Actual vs Projected)
  dollarRevenueVariance: number;
  dollarNetProfitVariance: number;
  percentageRevenueVariance: number;
  percentageNetProfitVariance: number;

  // Formatted summary strings with explicit units
  formattedSummary: {
    projectedJobRevenue: string;
    projectedDirectJobCost: string;
    projectedGrossProfit: string;
    softwareCost: string;
    projectedNetProfit: string;
    projectedRoiPercent: string;

    actualJobRevenue: string;
    attributedActualRevenue: string;
    actualDirectJobCost: string;
    actualGrossProfit: string;
    actualNetProfit: string;
    actualRoiPercent: string;

    dollarRevenueVariance: string;
    dollarNetProfitVariance: string;
    percentageRevenueVariance: string;
    percentageNetProfitVariance: string;
  };
}

function round2(val: number): number {
  if (!Number.isFinite(val)) return 0;
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

function formatCurrency(amount: number, currency = 'USD'): string {
  const rounded = round2(amount);
  const absFormatted = Math.abs(rounded).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (rounded < 0) {
    return `-$${absFormatted} ${currency}`;
  }
  return `$${absFormatted} ${currency}`;
}

function formatSignedCurrency(amount: number, currency = 'USD'): string {
  const rounded = round2(amount);
  const absFormatted = Math.abs(rounded).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (rounded > 0) return `+$${absFormatted} ${currency}`;
  if (rounded < 0) return `-$${absFormatted} ${currency}`;
  return `$${absFormatted} ${currency}`;
}

function formatPercentage(val: number): string {
  const rounded = round2(val);
  const sign = rounded > 0 ? '+' : '';
  return `${sign}${rounded.toFixed(2)}%`;
}

export function calculateFinancialMetrics(input: FinancialCalculationInput): DetailedFinancialMetrics {
  const currency = input.currency || 'USD';
  const calculationPeriod = input.calculationPeriod || '2026-Q3';
  const attributionSource = input.attributionSource || 'Google Business Profile Inquiry';
  const attributionWeight = input.attributionWeight !== undefined ? Math.max(0, Math.min(1, input.attributionWeight)) : 1.0;

  const projectedJobRevenue = round2(Math.max(0, input.projectedJobRevenue || 0));
  const projectedDirectJobCost = round2(Math.max(0, input.projectedDirectJobCost || 0));
  const softwareCost = round2(Math.max(0, input.softwareCost !== undefined ? input.softwareCost : 50));

  const actualJobRevenue = round2(Math.max(0, input.actualJobRevenue || 0));
  const actualDirectJobCost = round2(Math.max(0, input.actualDirectJobCost || 0));

  // Projected Calculations
  const projectedGrossProfit = round2(projectedJobRevenue - projectedDirectJobCost);
  const projectedNetProfit = round2(projectedGrossProfit - softwareCost);
  const projectedRoiPercent = softwareCost > 0 ? round2((projectedNetProfit / softwareCost) * 100) : 0;

  // Actual Calculations
  const attributedActualRevenue = round2(actualJobRevenue * attributionWeight);
  const actualGrossProfit = round2(actualJobRevenue - actualDirectJobCost);
  const actualNetProfit = round2(actualGrossProfit - softwareCost);
  const actualRoiPercent = softwareCost > 0 ? round2((actualNetProfit / softwareCost) * 100) : 0;

  // Variances
  const dollarRevenueVariance = round2(actualJobRevenue - projectedJobRevenue);
  const dollarNetProfitVariance = round2(actualNetProfit - projectedNetProfit);

  let percentageRevenueVariance = 0;
  if (projectedJobRevenue > 0) {
    percentageRevenueVariance = round2(((actualJobRevenue - projectedJobRevenue) / projectedJobRevenue) * 100);
  } else if (actualJobRevenue > 0) {
    percentageRevenueVariance = 100;
  }

  let percentageNetProfitVariance = 0;
  if (projectedNetProfit !== 0) {
    percentageNetProfitVariance = round2(((actualNetProfit - projectedNetProfit) / Math.abs(projectedNetProfit)) * 100);
  } else if (actualNetProfit > 0) {
    percentageNetProfitVariance = 100;
  }

  return {
    currency,
    calculationPeriod,
    attributionSource,
    attributionWeight,

    projectedJobRevenue,
    projectedDirectJobCost,
    projectedGrossProfit,
    softwareCost,
    projectedNetProfit,
    projectedRoiPercent,

    actualJobRevenue,
    attributedActualRevenue,
    actualDirectJobCost,
    actualGrossProfit,
    actualNetProfit,
    actualRoiPercent,

    dollarRevenueVariance,
    dollarNetProfitVariance,
    percentageRevenueVariance,
    percentageNetProfitVariance,

    formattedSummary: {
      projectedJobRevenue: formatCurrency(projectedJobRevenue, currency),
      projectedDirectJobCost: formatCurrency(projectedDirectJobCost, currency),
      projectedGrossProfit: formatCurrency(projectedGrossProfit, currency),
      softwareCost: formatCurrency(softwareCost, currency),
      projectedNetProfit: formatCurrency(projectedNetProfit, currency),
      projectedRoiPercent: formatPercentage(projectedRoiPercent),

      actualJobRevenue: formatCurrency(actualJobRevenue, currency),
      attributedActualRevenue: `${formatCurrency(attributedActualRevenue, currency)} (${(attributionWeight * 100).toFixed(0)}% attribution)`,
      actualDirectJobCost: formatCurrency(actualDirectJobCost, currency),
      actualGrossProfit: formatCurrency(actualGrossProfit, currency),
      actualNetProfit: formatCurrency(actualNetProfit, currency),
      actualRoiPercent: formatPercentage(actualRoiPercent),

      dollarRevenueVariance: `${formatSignedCurrency(dollarRevenueVariance, currency)} (dollar revenue variance)`,
      dollarNetProfitVariance: `${formatSignedCurrency(dollarNetProfitVariance, currency)} (dollar net profit variance)`,
      percentageRevenueVariance: `${formatPercentage(percentageRevenueVariance)} (percentage revenue variance vs projected)`,
      percentageNetProfitVariance: `${formatPercentage(percentageNetProfitVariance)} (percentage net profit variance vs projected)`,
    },
  };
}
