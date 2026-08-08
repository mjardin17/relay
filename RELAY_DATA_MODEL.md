# Relay Data Model Reference (`relay.db`)

The SQLite database (`relay.db`) implements 15 normalized tables with foreign keys and tenant isolation:

1. `tenants`: Primary workspace organizations (`id`, `name`, `industry`, `mrr`, `primary_bottleneck`).
2. `actors`: System or human users (`id`, `tenant_id`, `name`, `role`, `email`).
3. `source_records`: Connected integrations (`id`, `tenant_id`, `source_type`, `name`, `health_score`, `status`).
4. `leads`: Inbound pipeline (`id`, `tenant_id`, `name`, `email`, `pipeline_stage`, `estimated_value`, `opted_out`, `is_converted`, `is_duplicate`).
5. `evidence_items`: Grounding data for AI recommendations (`id`, `tenant_id`, `opportunity_id`, `claim`, `source_type`, `confidence`).
6. `calculation_formulas`: Quantifiable formulas (`id`, `tenant_id`, `formula_name`, `calculated_output`).
7. `opportunities`: Revenue growth opportunities (`id`, `tenant_id`, `title`, `status`, `estimated_monthly_value`, `detected_condition`, `recommended_playbook`).
8. `opportunity_projections`: Conservative, expected, and upside scenarios (`id`, `tenant_id`, `opportunity_id`, `conservative_value`, `expected_value`, `upside_value`).
9. `approval_requests`: Human-in-the-loop governance (`id`, `tenant_id`, `opportunity_id`, `action_title`, `status`, `risk_level`, `reasoning`).
10. `execution_events`: Append-only event store (`id`, `tenant_id`, `aggregate_id`, `event_type`, `idempotency_key`, `status`, `cost_incurred`).
11. `outcome_events`: Conversion events (`id`, `tenant_id`, `opportunity_id`, `lead_id`, `event_type`, `value`).
12. `attribution_records`: Closed-loop attribution (`id`, `tenant_id`, `opportunity_id`, `customer_email`, `deal_value`, `attribution_method`).
13. `suppression_decisions`: Dry-run and live compliance decisions (`id`, `tenant_id`, `lead_id`, `lead_email`, `decision`, `reasoning`, `rule_triggered`).
14. `audit_events`: System security & action log (`id`, `tenant_id`, `actor_id`, `action`, `entity_type`, `entity_id`).
15. `recommendation_evaluations`: Self-learning AI feedback loop (`id`, `tenant_id`, `opportunity_id`, `predicted_value`, `realized_value`, `accuracy_score`).
