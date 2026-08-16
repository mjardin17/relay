import { GoogleGenAI } from '@google/genai';
import { EvidenceGraphData, ExplainableAttributionRecord, DefensibleROIMetrics, ReconciliationReport } from '../types/evidenceGraph';

let aiClient: GoogleGenAI | null = null;

function getAIClient(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    try {
      aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    } catch {
      aiClient = null;
    }
  }
  return aiClient;
}

export class GeminiAttributionAdvisor {
  private static instance: GeminiAttributionAdvisor;

  private constructor() {}

  public static getInstance(): GeminiAttributionAdvisor {
    if (!GeminiAttributionAdvisor.instance) {
      GeminiAttributionAdvisor.instance = new GeminiAttributionAdvisor();
    }
    return GeminiAttributionAdvisor.instance;
  }

  /**
   * Summarize an evidence chain for human operators.
   * NOTE: Purely advisory. Deterministic logic controls actual validation.
   */
  public async generateAttributionExecutiveSummary(
    metrics: DefensibleROIMetrics,
    reconciliation: ReconciliationReport,
    attributions: ExplainableAttributionRecord[]
  ): Promise<{
    summaryHeadline: string;
    keyInsights: string[];
    evidenceHealthScore: number;
    recommendedOperatorActions: string[];
  }> {
    const ai = getAIClient();

    // Fallback deterministic summary if offline or no Gemini API key
    if (!ai) {
      return {
        summaryHeadline: `Verified Net ROI of ${metrics.netRoiDisplay} with ${metrics.bookedJobsCount} Booked Electrical Projects`,
        keyInsights: [
          `Attributable Gross Profit: $${metrics.attributableGrossProfit.toLocaleString()} vs Relay Execution Cost: $${metrics.totalRelayExecutionCost.toFixed(2)}`,
          `Average Payback Cycle: ${metrics.paybackDisplay}`,
          `Evidence Integrity: ${reconciliation.integrityScore}/100 (${reconciliation.status})`
        ],
        evidenceHealthScore: reconciliation.integrityScore,
        recommendedOperatorActions: [
          'Verify official state electrical permit receipts against municipal building department portal.',
          'Confirm customer bank deposit clearing in accounting ledger prior to month-end close.'
        ]
      };
    }

    try {
      const prompt = `You are Relay's Executive Attribution Advisor for Reis Electric LLC.
Analyze this financial attribution snapshot:
- Tenant: ${metrics.tenantId}
- Inbound Leads: ${metrics.leadsCount}
- Qualified Leads: ${metrics.qualifiedLeadsCount}
- Booked Jobs: ${metrics.bookedJobsCount}
- Total Collected Revenue: $${metrics.totalCollectedRevenue}
- Attributed Gross Revenue: $${metrics.attributedGrossRevenue}
- Attributable Gross Profit: $${metrics.attributableGrossProfit}
- Relay Execution Cost: $${metrics.totalRelayExecutionCost}
- Net ROI Display: ${metrics.netRoiDisplay}
- Integrity Score: ${reconciliation.integrityScore}/100
- Reconciliation Status: ${reconciliation.status}
- Number of Anomalies: ${reconciliation.anomalies.length}

Provide a structured, rigorous, professional executive summary with:
1. A concise headline
2. 3 key insights comparing marketing spend/execution cost to gross margin
3. 2 operator action recommendations for audit verification

Do not make up fake revenue. Strictly cite the provided numbers.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
      });

      const text = response.text || '';
      return {
        summaryHeadline: text.split('\n')[0] || `Verified Net ROI of ${metrics.netRoiDisplay}`,
        keyInsights: [
          `Attributable Gross Profit: $${metrics.attributableGrossProfit.toLocaleString()} against Relay Execution Cost of $${metrics.totalRelayExecutionCost.toFixed(2)}`,
          `Evidence Integrity Score: ${reconciliation.integrityScore}/100 (${reconciliation.status})`,
          `Booking Conversion Rate: ${metrics.bookingConversionRate}% from qualified inbound leads`
        ],
        evidenceHealthScore: reconciliation.integrityScore,
        recommendedOperatorActions: [
          'Review all pending customer authorization grants before executing outbound sequences.',
          'Audit payment merchant transaction settlement IDs against invoices.'
        ]
      };
    } catch {
      return {
        summaryHeadline: `Verified Net ROI of ${metrics.netRoiDisplay} (${metrics.bookedJobsCount} Booked Jobs)`,
        keyInsights: [
          `Attributable Gross Profit: $${metrics.attributableGrossProfit.toLocaleString()}`,
          `Relay Execution Cost: $${metrics.totalRelayExecutionCost.toFixed(2)}`,
          `Reconciliation Score: ${reconciliation.integrityScore}/100`
        ],
        evidenceHealthScore: reconciliation.integrityScore,
        recommendedOperatorActions: [
          'Confirm merchant processor settlement before closing ledger.',
          'Review Massachusetts A1/Master license verification status.'
        ]
      };
    }
  }
}

export const geminiAttributionAdvisor = GeminiAttributionAdvisor.getInstance();
