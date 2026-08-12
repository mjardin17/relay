import { describe, it } from 'node:test';
import assert from 'node:assert';
import { calculateFinancialMetrics } from '../utils/financialMetrics';

describe('Relay Financial Metrics Engine Unit Tests', () => {
  it('1. Positive Revenue and Net Profit Variance', () => {
    const metrics = calculateFinancialMetrics({
      projectedJobRevenue: 2500,
      projectedDirectJobCost: 1250,
      actualJobRevenue: 2750,
      actualDirectJobCost: 1030,
      softwareCost: 50,
      currency: 'USD',
      attributionSource: 'Google Business Profile Inquiry',
    });

    assert.strictEqual(metrics.projectedJobRevenue, 2500);
    assert.strictEqual(metrics.projectedGrossProfit, 1250);
    assert.strictEqual(metrics.projectedNetProfit, 1200);
    assert.strictEqual(metrics.projectedRoiPercent, 2400); // 1200 / 50 * 100 = 2400%

    assert.strictEqual(metrics.actualJobRevenue, 2750);
    assert.strictEqual(metrics.actualDirectJobCost, 1030);
    assert.strictEqual(metrics.actualGrossProfit, 1720);
    assert.strictEqual(metrics.actualNetProfit, 1670);
    assert.strictEqual(metrics.actualRoiPercent, 3340); // 1670 / 50 * 100 = 3340%

    assert.strictEqual(metrics.dollarRevenueVariance, 250); // +$250 USD
    assert.strictEqual(metrics.dollarNetProfitVariance, 470); // +$470 USD
    assert.strictEqual(metrics.percentageRevenueVariance, 10); // +10.00%

    assert.strictEqual(metrics.formattedSummary.dollarRevenueVariance, '+$250.00 USD (dollar revenue variance)');
    assert.strictEqual(metrics.formattedSummary.percentageRevenueVariance, '+10.00% (percentage revenue variance vs projected)');
  });

  it('2. Negative Revenue and Net Profit Variance', () => {
    const metrics = calculateFinancialMetrics({
      projectedJobRevenue: 2500,
      projectedDirectJobCost: 1000,
      actualJobRevenue: 2000,
      actualDirectJobCost: 1100,
      softwareCost: 50,
    });

    assert.strictEqual(metrics.dollarRevenueVariance, -500); // -$500 USD
    assert.strictEqual(metrics.percentageRevenueVariance, -20); // -20.00%
    assert.strictEqual(metrics.actualGrossProfit, 900);
    assert.strictEqual(metrics.actualNetProfit, 850);
    assert.strictEqual(metrics.dollarNetProfitVariance, -600); // 850 - 1450 = -600

    assert.strictEqual(metrics.formattedSummary.dollarRevenueVariance, '-$500.00 USD (dollar revenue variance)');
    assert.strictEqual(metrics.formattedSummary.percentageRevenueVariance, '-20.00% (percentage revenue variance vs projected)');
  });

  it('3. Zero Software Cost Basis Handles Division Safely', () => {
    const metrics = calculateFinancialMetrics({
      projectedJobRevenue: 1000,
      actualJobRevenue: 1200,
      softwareCost: 0,
    });

    assert.strictEqual(metrics.softwareCost, 0);
    assert.strictEqual(metrics.projectedRoiPercent, 0); // Safe zero-cost basis handling
    assert.strictEqual(metrics.actualRoiPercent, 0);
    assert.strictEqual(metrics.dollarRevenueVariance, 200);
    assert.strictEqual(metrics.formattedSummary.projectedRoiPercent, '0.00%');
  });

  it('4. Missing Optional Fields Fall Back to Safe Defaults', () => {
    const metrics = calculateFinancialMetrics({
      projectedJobRevenue: 1500,
    });

    assert.strictEqual(metrics.projectedDirectJobCost, 0);
    assert.strictEqual(metrics.softwareCost, 50); // Default software cost
    assert.strictEqual(metrics.actualJobRevenue, 0);
    assert.strictEqual(metrics.dollarRevenueVariance, -1500);
    assert.strictEqual(metrics.currency, 'USD');
    assert.strictEqual(metrics.calculationPeriod, '2026-Q3');
  });

  it('5. Partial Attribution Weight Calculation', () => {
    const metrics = calculateFinancialMetrics({
      projectedJobRevenue: 3000,
      actualJobRevenue: 3000,
      attributionWeight: 0.5, // 50% attribution
      softwareCost: 50,
    });

    assert.strictEqual(metrics.actualJobRevenue, 3000);
    assert.strictEqual(metrics.attributedActualRevenue, 1500);
    assert.strictEqual(metrics.formattedSummary.attributedActualRevenue, '$1,500.00 USD (50% attribution)');
  });

  it('6. Zero Projected Revenue Handling', () => {
    const metrics = calculateFinancialMetrics({
      projectedJobRevenue: 0,
      actualJobRevenue: 500,
      softwareCost: 50,
    });

    assert.strictEqual(metrics.dollarRevenueVariance, 500);
    assert.strictEqual(metrics.percentageRevenueVariance, 100);
    assert.strictEqual(metrics.formattedSummary.percentageRevenueVariance, '+100.00% (percentage revenue variance vs projected)');
  });
});
