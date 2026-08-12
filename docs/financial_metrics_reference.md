# Relay Financial Metrics & ROI Reference Specification

## Overview

This document provides the canonical, deterministic mathematical specification for all financial calculations, revenue attributions, costs, margins, and variances across Relay’s Growth Engine and Electrical Company Lead Workflow.

---

## 1. Core Financial Terms & Definitions

* **Projected Job Revenue ($)**: The estimated gross contract/job value calculated during lead intake or initial scoping (e.g., $2,500.00 USD).
* **Projected Direct Job Cost ($)**: Direct fulfillment expenses including materials, subcontractor fees, labor, and municipal permit fees (e.g., $1,030.00 USD).
* **Projected Gross Profit ($)**:
  $$\text{Projected Gross Profit} = \text{Projected Job Revenue} - \text{Projected Direct Job Cost}$$
* **Relay Platform Software Cost ($)**: Fixed or allocated Relay software service cost per converted lead (e.g., $50.00 USD).
* **Projected Net Profit ($)**:
  $$\text{Projected Net Profit} = \text{Projected Gross Profit} - \text{Software Cost}$$
* **Projected ROI (%)**:
  $$\text{Projected ROI \%} = \begin{cases} \left( \frac{\text{Projected Net Profit}}{\text{Software Cost}} \right) \times 100, & \text{if Software Cost} > 0 \\ 0.00\%, & \text{if Software Cost} = 0 \end{cases}$$
* **Actual Job Revenue ($)**: Final settled cash or invoice revenue recorded upon job completion (e.g., $2,750.00 USD).
* **Actual Direct Job Cost ($)**: Actual fulfillment cost recorded (e.g., $1,030.00 USD).
* **Actual Gross Profit ($)**:
  $$\text{Actual Gross Profit} = \text{Actual Job Revenue} - \text{Actual Direct Job Cost}$$
* **Actual Net Profit ($)**:
  $$\text{Actual Net Profit} = \text{Actual Gross Profit} - \text{Software Cost}$$
* **Actual ROI (%)**:
  $$\text{Actual ROI \%} = \begin{cases} \left( \frac{\text{Actual Net Profit}}{\text{Software Cost}} \right) \times 100, & \text{if Software Cost} > 0 \\ 0.00\%, & \text{if Software Cost} = 0 \end{cases}$$

---

## 2. Variances & Reconciliation Logic

### A. Dollar Revenue Variance ($)
$$\text{Dollar Revenue Variance} = \text{Actual Job Revenue} - \text{Projected Job Revenue}$$
* *Example*: $\$2,750.00 - \$2,500.00 = +\$250.00 \text{ USD}$ revenue variance.

### B. Percentage Revenue Variance (%)
$$\text{Percentage Revenue Variance} = \begin{cases} \left( \frac{\text{Actual Job Revenue} - \text{Projected Job Revenue}}{\text{Projected Job Revenue}} \right) \times 100, & \text{if Projected Revenue} > 0 \\ 100.00\%, & \text{if Projected Revenue} = 0 \text{ and Actual Revenue} > 0 \\ 0.00\%, & \text{if Projected Revenue} = 0 \text{ and Actual Revenue} = 0 \end{cases}$$
* *Example*: $\left( \frac{2750 - 2500}{2500} \right) \times 100 = +10.00\%$ revenue variance vs. projected.

### C. Dollar Net Profit Variance ($)
$$\text{Dollar Net Profit Variance} = \text{Actual Net Profit} - \text{Projected Net Profit}$$

### D. Percentage Net Profit Variance (%)
$$\text{Percentage Net Profit Variance} = \begin{cases} \left( \frac{\text{Actual Net Profit} - \text{Projected Net Profit}}{|\text{Projected Net Profit}|} \right) \times 100, & \text{if Projected Net Profit} \neq 0 \\ 100.00\%, & \text{if Projected Net Profit} = 0 \text{ and Actual Net Profit} > 0 \end{cases}$$

---

## 3. Revenue Attribution & Channel Weighting

* **Deterministic Lead Matching**: When an inquiry originates from a verified Google Business Profile link or designated tracking line, attribution weight defaults to $1.0$ ($100\%$).
* **Attributed Revenue ($)**:
  $$\text{Attributed Revenue} = \text{Actual Job Revenue} \times \text{Attribution Weight}$$

---

## 4. Edge Case & Zero-Cost Guardrails

1. **Zero Software Cost ($0.00 USD)**:
   - When `softwareCost == 0`, ROI percent evaluates to `0.00%` rather than throwing `Infinity` or `NaN`.
2. **Negative Gross Margin**:
   - If direct fulfillment cost exceeds revenue, `Net Profit` becomes negative, resulting in a negative ROI percentage (e.g., `-150.00%`).
3. **Missing Optional Fields**:
   - Missing direct cost defaults to `$0.00`. Missing software cost defaults to standard `$50.00 USD` platform allocation.
4. **Rounding Consistency**:
   - All monetary figures are rounded using standard 2-decimal floating-point epsilon rounding:
     `Math.round((value + Number.EPSILON) * 100) / 100`

---

## 5. Verified Example Scenario

| Metric Field | Projected Value | Actual Value | Dollar Variance | Percentage Variance |
| :--- | :--- | :--- | :--- | :--- |
| **Gross Revenue** | $2,500.00 USD | $2,750.00 USD | +$250.00 USD | +10.00% |
| **Direct Costs** | $1,030.00 USD | $1,030.00 USD | $0.00 USD | 0.00% |
| **Gross Profit** | $1,470.00 USD | $1,720.00 USD | +$250.00 USD | +17.01% |
| **Relay Software Fee**| $50.00 USD | $50.00 USD | $0.00 USD | 0.00% |
| **Net Profit** | $1,420.00 USD | $1,670.00 USD | +$250.00 USD | +17.61% |
| **Software ROI** | **2,840.00%** | **3,340.00%** | N/A | **+500.00% ROI pts** |
