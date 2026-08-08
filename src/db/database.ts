import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';

const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), 'relay.db');

let dbInstance: DatabaseSync | null = null;
let currentDbPath: string | null = null;

export function getDatabase(): DatabaseSync {
  const targetPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'relay.db');
  if (!dbInstance || currentDbPath !== targetPath) {
    dbInstance = new DatabaseSync(targetPath);
    currentDbPath = targetPath;
    // Enable WAL mode & foreign keys for performance and durability
    dbInstance.exec('PRAGMA journal_mode = WAL;');
    dbInstance.exec('PRAGMA foreign_keys = ON;');
    initializeDatabaseSchema(dbInstance);
  }
  return dbInstance;
}

export function initializeDatabaseSchema(db: DatabaseSync): void {
  const schemaDDL = `
    -- 1. Businesses / Tenants
    CREATE TABLE IF NOT EXISTS tenants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      industry TEXT NOT NULL,
      mrr REAL NOT NULL DEFAULT 0,
      primary_bottleneck TEXT,
      created_at TEXT NOT NULL
    );

    -- 2. Users / Actors
    CREATE TABLE IF NOT EXISTS actors (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      email TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    );

    -- 3. Source Records / Connected Data Sources
    CREATE TABLE IF NOT EXISTS source_records (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      source_type TEXT NOT NULL,
      external_id TEXT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      data_payload_json TEXT NOT NULL DEFAULT '{}',
      records_ingested INTEGER NOT NULL DEFAULT 0,
      failed_records INTEGER NOT NULL DEFAULT 0,
      health_score INTEGER NOT NULL DEFAULT 100,
      status TEXT NOT NULL DEFAULT 'connected',
      last_sync_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    );

    -- 4. Leads / Inbound Pipeline
    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      company TEXT,
      phone TEXT,
      pipeline_stage TEXT NOT NULL,
      estimated_value REAL NOT NULL DEFAULT 0,
      last_interaction_at TEXT NOT NULL,
      response_delay_hours REAL NOT NULL DEFAULT 0,
      opted_out INTEGER NOT NULL DEFAULT 0,
      do_not_contact INTEGER NOT NULL DEFAULT 0,
      is_converted INTEGER NOT NULL DEFAULT 0,
      is_duplicate INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    );

    -- 5. Evidence Items
    CREATE TABLE IF NOT EXISTS evidence_items (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      opportunity_id TEXT,
      claim TEXT NOT NULL,
      source_type TEXT NOT NULL,
      sample_size INTEGER NOT NULL DEFAULT 0,
      confidence TEXT NOT NULL DEFAULT 'High',
      formula_id TEXT,
      metadata_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    );

    -- 6. Calculation Formulas
    CREATE TABLE IF NOT EXISTS calculation_formulas (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      formula_name TEXT NOT NULL,
      formula_expression TEXT NOT NULL,
      input_variables_json TEXT NOT NULL DEFAULT '{}',
      calculated_output REAL NOT NULL DEFAULT 0,
      calculated_at TEXT NOT NULL,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    );

    -- 7. Verified Revenue Opportunities
    CREATE TABLE IF NOT EXISTS opportunities (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      action_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Detected',
      effort TEXT NOT NULL DEFAULT 'Medium',
      risk_level TEXT NOT NULL DEFAULT 'Medium',
      affected_records_count INTEGER NOT NULL DEFAULT 0,
      estimated_monthly_value REAL NOT NULL DEFAULT 0,
      estimated_annual_value REAL NOT NULL DEFAULT 0,
      actual_realized_monthly_value REAL NOT NULL DEFAULT 0,
      confidence TEXT NOT NULL DEFAULT 'High',
      detected_condition TEXT NOT NULL,
      recommended_playbook TEXT NOT NULL,
      activated_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    );

    -- 8. Opportunity Projections
    CREATE TABLE IF NOT EXISTS opportunity_projections (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      opportunity_id TEXT NOT NULL,
      conservative_value REAL NOT NULL DEFAULT 0,
      expected_value REAL NOT NULL DEFAULT 0,
      upside_value REAL NOT NULL DEFAULT 0,
      assumptions_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE CASCADE
    );

    -- 9. Approval Requests
    CREATE TABLE IF NOT EXISTS approval_requests (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      opportunity_id TEXT NOT NULL,
      action_title TEXT NOT NULL,
      requested_by TEXT NOT NULL,
      approver_role TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      risk_level TEXT NOT NULL DEFAULT 'Medium',
      reasoning TEXT NOT NULL,
      financial_impact_estimate REAL NOT NULL DEFAULT 0,
      target_count INTEGER NOT NULL DEFAULT 0,
      audience_json TEXT NOT NULL DEFAULT '[]',
      proposed_content_json TEXT NOT NULL DEFAULT '{}',
      channel TEXT NOT NULL DEFAULT 'email',
      spending_limit REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      decided_at TEXT,
      decided_by TEXT,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE CASCADE
    );

    -- 10. Execution Ledger (Append-Only Event Store)
    CREATE TABLE IF NOT EXISTS execution_events (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      aggregate_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      actor_type TEXT NOT NULL DEFAULT 'system',
      actor_id TEXT NOT NULL,
      prior_state TEXT,
      resulting_state TEXT NOT NULL,
      approval_id TEXT,
      idempotency_key TEXT UNIQUE,
      channel_or_provider TEXT NOT NULL DEFAULT 'dry_run',
      correlation_id TEXT NOT NULL,
      metadata_json TEXT NOT NULL DEFAULT '{}',
      status TEXT NOT NULL DEFAULT 'completed',
      cost_incurred REAL NOT NULL DEFAULT 0,
      api_calls_count INTEGER NOT NULL DEFAULT 0,
      output_summary TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    );

    -- 11. Outcome Events
    CREATE TABLE IF NOT EXISTS outcome_events (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      opportunity_id TEXT,
      lead_id TEXT,
      event_type TEXT NOT NULL,
      value REAL NOT NULL DEFAULT 0,
      provider_message_id TEXT,
      metadata_json TEXT NOT NULL DEFAULT '{}',
      occurred_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    );

    -- 12. Attribution Records
    CREATE TABLE IF NOT EXISTS attribution_records (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      opportunity_id TEXT,
      customer_email TEXT NOT NULL,
      deal_value REAL NOT NULL DEFAULT 0,
      attribution_method TEXT NOT NULL DEFAULT 'workflow_comparison',
      attribution_status TEXT NOT NULL DEFAULT 'awaiting_data',
      baseline_window_json TEXT NOT NULL DEFAULT '{}',
      intervention_window_json TEXT NOT NULL DEFAULT '{}',
      gross_value REAL NOT NULL DEFAULT 0,
      costs REAL NOT NULL DEFAULT 0,
      net_value REAL NOT NULL DEFAULT 0,
      confidence TEXT NOT NULL DEFAULT 'High',
      caveats TEXT,
      projected_vs_actual_variance REAL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    );

    -- 13. Suppression & Eligibility Decisions
    CREATE TABLE IF NOT EXISTS suppression_decisions (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      lead_id TEXT NOT NULL,
      lead_email TEXT NOT NULL,
      decision TEXT NOT NULL,
      reasoning TEXT NOT NULL,
      rule_triggered TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    );

    -- 14. Audit Events
    CREATE TABLE IF NOT EXISTS audit_events (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      actor_id TEXT NOT NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      payload_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    );

    -- 15. Recommendation Evaluations
    CREATE TABLE IF NOT EXISTS recommendation_evaluations (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      opportunity_id TEXT NOT NULL,
      opportunity_title TEXT NOT NULL,
      predicted_value REAL NOT NULL,
      realized_value REAL NOT NULL,
      accuracy_score INTEGER NOT NULL,
      feedback_notes TEXT NOT NULL,
      learning_adjustment_applied TEXT NOT NULL,
      evaluated_at TEXT NOT NULL,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    );

    -- Indexes for performance and tenant isolation
    CREATE INDEX IF NOT EXISTS idx_leads_tenant ON leads(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_opps_tenant ON opportunities(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_appr_tenant ON approval_requests(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_exec_tenant ON execution_events(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_exec_idempotency ON execution_events(idempotency_key);
    CREATE INDEX IF NOT EXISTS idx_outcomes_tenant ON outcome_events(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_attr_tenant ON attribution_records(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_supp_tenant ON suppression_decisions(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_audit_tenant ON audit_events(tenant_id);
  `;

  db.exec(schemaDDL);
}
