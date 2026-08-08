# Relay Revenue Attribution & ROI Methodology

## Verified Calculations

### 1. Net Realized ROI Percentage
$$\text{Net ROI \%} = \frac{\text{Total Realized Monthly Revenue} - \text{Total Execution Cost}}{\text{Total Execution Cost}} \times 100$$

- If `Total Execution Cost == 0` and `Total Realized Revenue == 0`: Displays `N/A (Zero Execution Cost)`.
- If `Total Execution Cost == 0` and `Total Realized Revenue > 0`: Displays `Infinite (Zero Incurred Cost)`.
- If outcome data is pending: Displays `Awaiting Outcome Data`.

### 2. Payback Period (Days)
$$\text{Payback Days} = \frac{\text{Total Execution Cost}}{\text{Daily Realized Revenue}}$$
where $\text{Daily Realized Revenue} = \frac{\text{Total Realized Monthly Revenue}}{30}$.

- If `Total Execution Cost == 0`: Displays `Immediate (0 Days)`.
- If outcome data is pending: Displays `Awaiting Outcome Data`.

### 3. Attribution Models
- **Workflow Comparison (Control Group)**: Incremental lift calculated against baseline uncontacted leads ($Lift = Conversion_{enrolled} - Conversion_{control}$).
- **Linear**: Equal weight across touchpoints.
- **Direct / First Touch / Last Touch**: Single touchpoint assignment.
