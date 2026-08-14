import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';

const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), 'relay.db');

let dbInstance: DatabaseSync | null = null;
let currentDbPath: string | null = null;

function removeDatabaseFiles(targetPath: string): void {
  try {
    const filesToRemove = [
      targetPath,
      `${targetPath}-wal`,
      `${targetPath}-shm`,
      `${targetPath}-journal`
    ];
    for (const f of filesToRemove) {
      if (fs.existsSync(f)) {
        try {
          fs.unlinkSync(f);
        } catch {
          // Ignore unlink errors
        }
      }
    }
  } catch {
    // Ignore errors
  }
}

function openAndInitDatabase(targetPath: string): DatabaseSync {
  let db: DatabaseSync;
  try {
    db = new DatabaseSync(targetPath);
    // Configure SQLite pragmas
    db.exec('PRAGMA busy_timeout = 5000;');
    db.exec('PRAGMA foreign_keys = ON;');
    db.exec('PRAGMA journal_mode = WAL;');
    // Verify file integrity
    db.exec('PRAGMA quick_check;');
    initializeDatabaseSchema(db);
  } catch (err: any) {
    console.warn(`[Database] Error initializing database at ${targetPath} (${err?.message || err}). Recreating fresh database...`);
    try {
      if (db!) {
        (db as any).close?.();
      }
    } catch {}
    removeDatabaseFiles(targetPath);
    db = new DatabaseSync(targetPath);
    db.exec('PRAGMA busy_timeout = 5000;');
    db.exec('PRAGMA foreign_keys = ON;');
    db.exec('PRAGMA journal_mode = WAL;');
    initializeDatabaseSchema(db);
  }
  return db;
}

export function getDatabase(): DatabaseSync {
  const targetPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'relay.db');
  if (!dbInstance || currentDbPath !== targetPath) {
    dbInstance = openAndInitDatabase(targetPath);
    currentDbPath = targetPath;
    try {
      // Import dynamically or invoke seed if empty
      const { seedDatabaseIfEmpty } = require('./seed');
      seedDatabaseIfEmpty();
    } catch {
      // Ignore cyclic loading or seed errors
    }
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
      environment_classification TEXT NOT NULL DEFAULT 'SIMULATED_DRY_RUN',
      company_maturity TEXT DEFAULT 'Fresh Launch',
      engagement_model TEXT DEFAULT 'Full AI Launch',
      operating_mode TEXT DEFAULT 'Guided Manual',
      verification_status TEXT DEFAULT 'Pending owner confirmation and official-source verification',
      created_at TEXT NOT NULL
    );

    -- 2. Users / Actors
    CREATE TABLE IF NOT EXISTS actors (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      email TEXT,
      user_role_classification TEXT DEFAULT 'UNVERIFIED',
      is_licensed_electrician INTEGER DEFAULT 0,
      is_master_electrician INTEGER DEFAULT 0,
      is_licensee_of_record INTEGER DEFAULT 0,
      is_legal_owner INTEGER DEFAULT 0,
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

    -- 16. Server-Verified Auth Sessions
    CREATE TABLE IF NOT EXISTS auth_sessions (
      token TEXT PRIMARY KEY,
      actor_id TEXT NOT NULL,
      tenant_id TEXT NOT NULL,
      role TEXT NOT NULL,
      permissions_json TEXT NOT NULL DEFAULT '[]',
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (actor_id) REFERENCES actors(id) ON DELETE CASCADE,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    );

    -- 17. Server-Side Durable Launch Approvals
    CREATE TABLE IF NOT EXISTS launch_approvals (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      resource_id TEXT NOT NULL,
      approver_id TEXT NOT NULL,
      approver_role TEXT NOT NULL,
      decision TEXT NOT NULL DEFAULT 'approved',
      content_hash TEXT NOT NULL,
      metadata_json TEXT NOT NULL DEFAULT '{}',
      approved_at TEXT NOT NULL,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    );

    -- 18. Shared Multi-Instance Idempotency Engine
    CREATE TABLE IF NOT EXISTS launch_idempotency (
      tenant_id TEXT NOT NULL,
      operation TEXT NOT NULL,
      idempotency_key TEXT NOT NULL,
      request_hash TEXT NOT NULL,
      response_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (tenant_id, operation, idempotency_key)
    );

    -- 19. Redacted & Tamper-Resistant Audit Logs
    CREATE TABLE IF NOT EXISTS launch_audit_logs (
      id TEXT PRIMARY KEY,
      sequence_number INTEGER,
      previous_event_hash TEXT,
      event_hash TEXT,
      canonical_payload_hash TEXT,
      execution_mode TEXT NOT NULL DEFAULT 'DRY_RUN',
      tenant_id TEXT,
      actor_id TEXT,
      client_ip TEXT NOT NULL,
      endpoint TEXT NOT NULL,
      action TEXT NOT NULL,
      status TEXT NOT NULL,
      idempotency_key TEXT,
      details_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL
    );

    CREATE TRIGGER IF NOT EXISTS prevent_launch_audit_logs_update
    BEFORE UPDATE ON launch_audit_logs
    BEGIN
      SELECT RAISE(FAIL, 'AUDIT_LOG_IMMUTABLE: UPDATE operations are strictly prohibited on audit logs.');
    END;

    CREATE TRIGGER IF NOT EXISTS prevent_launch_audit_logs_delete
    BEFORE DELETE ON launch_audit_logs
    BEGIN
      SELECT RAISE(FAIL, 'AUDIT_LOG_IMMUTABLE: DELETE operations are strictly prohibited on audit logs.');
    END;

    -- 20. Distributed Rate Limiter Table
    CREATE TABLE IF NOT EXISTS launch_rate_limits (
      key TEXT PRIMARY KEY,
      hits INTEGER NOT NULL DEFAULT 1,
      reset_at TEXT NOT NULL
    );

    -- 21. Google Business Profiles (Tenant-Isolated)
    CREATE TABLE IF NOT EXISTS gbp_profiles (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      client_id TEXT NOT NULL,
      company_name TEXT NOT NULL,
      account_type TEXT NOT NULL DEFAULT 'service_area',
      existing_listing_status TEXT NOT NULL DEFAULT 'none',
      google_location_id TEXT,
      google_account_id TEXT,
      primary_category TEXT NOT NULL,
      secondary_categories_json TEXT NOT NULL DEFAULT '[]',
      public_phone TEXT NOT NULL,
      website_url TEXT NOT NULL,
      business_hours_json TEXT NOT NULL DEFAULT '[]',
      service_areas_json TEXT NOT NULL DEFAULT '[]',
      services_offered_json TEXT NOT NULL DEFAULT '[]',
      description TEXT NOT NULL,
      photos_json TEXT NOT NULL DEFAULT '[]',
      license_number TEXT,
      license_state TEXT,
      private_street_address TEXT NOT NULL,
      private_unit TEXT,
      private_city TEXT NOT NULL,
      private_state TEXT NOT NULL,
      private_zip TEXT NOT NULL,
      verification_method TEXT NOT NULL DEFAULT 'manual_guided',
      verification_state TEXT NOT NULL DEFAULT 'not_started',
      plan_approval_hash TEXT,
      verification_code_sent_at TEXT,
      verified_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    );

    -- 22. Tenant-Scoped GBP OAuth Tokens
    CREATE TABLE IF NOT EXISTS gbp_oauth_tokens (
      tenant_id TEXT NOT NULL,
      client_id TEXT NOT NULL,
      google_user_email TEXT NOT NULL,
      google_user_id TEXT,
      access_token TEXT NOT NULL,
      refresh_token TEXT,
      expires_at TEXT NOT NULL,
      scope TEXT NOT NULL,
      token_type TEXT NOT NULL DEFAULT 'Bearer',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (tenant_id, client_id),
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    );

    -- 23. GBP Human Content Approvals
    CREATE TABLE IF NOT EXISTS gbp_content_approvals (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      gbp_profile_id TEXT NOT NULL,
      content_type TEXT NOT NULL,
      content_payload_json TEXT NOT NULL,
      content_hash TEXT NOT NULL,
      approver_id TEXT NOT NULL,
      approver_role TEXT NOT NULL,
      decision TEXT NOT NULL DEFAULT 'pending',
      dispatch_status TEXT NOT NULL DEFAULT 'pending',
      dispatched_at TEXT,
      approved_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (gbp_profile_id) REFERENCES gbp_profiles(id) ON DELETE CASCADE
    );

    -- 24. GBP Local Posts Drafts & Published Records
    CREATE TABLE IF NOT EXISTS gbp_posts (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      gbp_profile_id TEXT NOT NULL,
      post_type TEXT NOT NULL DEFAULT 'standard',
      summary TEXT NOT NULL,
      call_to_action_json TEXT NOT NULL DEFAULT '{}',
      media_url TEXT,
      approval_id TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      google_post_id TEXT,
      published_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (gbp_profile_id) REFERENCES gbp_profiles(id) ON DELETE CASCADE
    );

    -- 25. GBP Reviews Monitoring & Response Drafts
    CREATE TABLE IF NOT EXISTS gbp_reviews (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      gbp_profile_id TEXT NOT NULL,
      google_review_id TEXT NOT NULL,
      reviewer_name TEXT NOT NULL,
      star_rating INTEGER NOT NULL,
      comment TEXT NOT NULL,
      review_date TEXT NOT NULL,
      response_draft TEXT,
      response_approval_id TEXT,
      response_status TEXT NOT NULL DEFAULT 'unanswered',
      replied_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (gbp_profile_id) REFERENCES gbp_profiles(id) ON DELETE CASCADE
    );

    -- 26. Electrical Leads Workflow
    CREATE TABLE IF NOT EXISTS electrical_leads (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      lead_id TEXT NOT NULL UNIQUE,
      company_name TEXT NOT NULL DEFAULT 'Synthetic Demo Electrical',
      source TEXT NOT NULL,
      source_reference TEXT NOT NULL,
      service_requested TEXT NOT NULL,
      property_type TEXT NOT NULL DEFAULT 'Residential',
      address_city TEXT NOT NULL,
      address_state TEXT NOT NULL,
      address_zip TEXT,
      consent_provided INTEGER NOT NULL DEFAULT 1,
      consent_timestamp TEXT NOT NULL,
      qualification_status TEXT NOT NULL DEFAULT 'qualified',
      qualification_score INTEGER NOT NULL DEFAULT 85,
      qualification_confidence TEXT NOT NULL DEFAULT 'High',
      verified_facts_json TEXT NOT NULL DEFAULT '[]',
      ai_assumptions_json TEXT NOT NULL DEFAULT '[]',
      proposed_response_draft TEXT,
      proposed_response_hash TEXT,
      response_approval_id TEXT,
      approval_status TEXT NOT NULL DEFAULT 'pending',
      execution_status TEXT NOT NULL DEFAULT 'unexecuted',
      execution_mode TEXT NOT NULL DEFAULT 'simulated',
      execution_idempotency_key TEXT,
      scheduling_status TEXT NOT NULL DEFAULT 'unscheduled',
      scheduled_time TEXT,
      follow_up_status TEXT NOT NULL DEFAULT 'none',
      booking_status TEXT NOT NULL DEFAULT 'pending',
      booked_job_value REAL NOT NULL DEFAULT 0,
      actual_revenue REAL NOT NULL DEFAULT 0,
      revenue_recorded_at TEXT,
      attribution_source TEXT NOT NULL DEFAULT 'Google Business Profile',
      attribution_method TEXT NOT NULL DEFAULT 'deterministic_source_match',
      projected_roi_json TEXT NOT NULL DEFAULT '{}',
      actual_roi_json TEXT NOT NULL DEFAULT '{}',
      data_classification TEXT NOT NULL DEFAULT 'SIMULATED_DRY_RUN',
      environment_classification TEXT NOT NULL DEFAULT 'SYNTHETIC_TEST',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
    );

    -- 27. Massachusetts Electrical Company Intake & Compliance Model
    CREATE TABLE IF NOT EXISTS ma_electrical_company_compliance (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL UNIQUE,
      legal_business_name TEXT NOT NULL,
      dba_name TEXT,
      entity_registration_status TEXT DEFAULT 'unverified',
      entity_registration_source_level TEXT DEFAULT 'self_reported',
      
      ma_a1_business_license_number TEXT NOT NULL,
      business_license_status TEXT NOT NULL DEFAULT 'unverified',
      business_license_expiration_date TEXT,
      business_license_source_level TEXT NOT NULL DEFAULT 'self_reported',
      
      master_electrician_name TEXT NOT NULL,
      master_electrician_license_number TEXT NOT NULL,
      master_electrician_license_status TEXT NOT NULL DEFAULT 'unverified',
      master_electrician_license_expiration_date TEXT,
      master_electrician_source_level TEXT NOT NULL DEFAULT 'self_reported',
      
      journeyman_licenses_json TEXT NOT NULL DEFAULT '[]',
      
      corporate_registration_status TEXT DEFAULT 'unverified',
      corporate_registration_source_level TEXT NOT NULL DEFAULT 'self_reported',
      
      dba_registration_status TEXT DEFAULT 'unverified',
      dba_source_level TEXT NOT NULL DEFAULT 'self_reported',
      
      insurance_carrier TEXT,
      insurance_policy_status TEXT DEFAULT 'unverified',
      insurance_expiration_date TEXT,
      insurance_source_level TEXT NOT NULL DEFAULT 'self_reported',
      
      source_url TEXT NOT NULL,
      verification_timestamp TEXT,
      verification_method TEXT DEFAULT 'unverified',
      reviewer_id TEXT,
      evidence_artifact_json TEXT NOT NULL DEFAULT '{}',
      evidence_classification TEXT NOT NULL DEFAULT 'SYNTHETIC_TEST',
      
      can_claim_licensed_company INTEGER NOT NULL DEFAULT 0,
      compliance_notes_json TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
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
    CREATE INDEX IF NOT EXISTS idx_sessions_actor ON auth_sessions(actor_id);
    CREATE INDEX IF NOT EXISTS idx_launch_appr_tenant ON launch_approvals(tenant_id, resource_id);
    CREATE INDEX IF NOT EXISTS idx_launch_audit_tenant ON launch_audit_logs(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_gbp_prof_tenant ON gbp_profiles(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_gbp_appr_tenant ON gbp_content_approvals(tenant_id, gbp_profile_id);
    CREATE INDEX IF NOT EXISTS idx_gbp_posts_tenant ON gbp_posts(tenant_id, gbp_profile_id);
    CREATE INDEX IF NOT EXISTS idx_gbp_reviews_tenant ON gbp_reviews(tenant_id, gbp_profile_id);
    CREATE INDEX IF NOT EXISTS idx_elec_leads_tenant ON electrical_leads(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_ma_comp_tenant ON ma_electrical_company_compliance(tenant_id);
  `;

  db.exec(schemaDDL);

  // Runtime migration helper to add new columns to existing SQLite database if needed
  const safeAddColumn = (table: string, colDef: string) => {
    try {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${colDef};`);
    } catch {
      // Column likely already exists
    }
  };

  safeAddColumn('tenants', 'environment_classification TEXT NOT NULL DEFAULT "SIMULATED_DRY_RUN"');
  safeAddColumn('tenants', 'company_maturity TEXT DEFAULT "Fresh Launch"');
  safeAddColumn('tenants', 'engagement_model TEXT DEFAULT "Full AI Launch"');
  safeAddColumn('tenants', 'operating_mode TEXT DEFAULT "Guided Manual"');
  safeAddColumn('tenants', 'verification_status TEXT DEFAULT "Pending owner confirmation and official-source verification"');

  safeAddColumn('actors', 'user_role_classification TEXT DEFAULT "UNVERIFIED"');
  safeAddColumn('actors', 'is_licensed_electrician INTEGER DEFAULT 0');
  safeAddColumn('actors', 'is_master_electrician INTEGER DEFAULT 0');
  safeAddColumn('actors', 'is_licensee_of_record INTEGER DEFAULT 0');
  safeAddColumn('actors', 'is_legal_owner INTEGER DEFAULT 0');

  safeAddColumn('electrical_leads', 'data_classification TEXT NOT NULL DEFAULT "SIMULATED_DRY_RUN"');
  safeAddColumn('electrical_leads', 'environment_classification TEXT NOT NULL DEFAULT "SYNTHETIC_TEST"');

  safeAddColumn('ma_electrical_company_compliance', 'entity_registration_status TEXT DEFAULT "unverified"');
  safeAddColumn('ma_electrical_company_compliance', 'entity_registration_source_level TEXT DEFAULT "self_reported"');
  safeAddColumn('ma_electrical_company_compliance', 'insurance_carrier TEXT');
  safeAddColumn('ma_electrical_company_compliance', 'insurance_policy_status TEXT DEFAULT "unverified"');
  safeAddColumn('ma_electrical_company_compliance', 'insurance_expiration_date TEXT');
  safeAddColumn('ma_electrical_company_compliance', 'verification_method TEXT DEFAULT "unverified"');
  safeAddColumn('ma_electrical_company_compliance', 'reviewer_id TEXT');
  safeAddColumn('ma_electrical_company_compliance', 'evidence_classification TEXT NOT NULL DEFAULT "SYNTHETIC_TEST"');

  safeAddColumn('launch_audit_logs', 'sequence_number INTEGER');
  safeAddColumn('launch_audit_logs', 'previous_event_hash TEXT');
  safeAddColumn('launch_audit_logs', 'event_hash TEXT');
  safeAddColumn('launch_audit_logs', 'canonical_payload_hash TEXT');
  safeAddColumn('launch_audit_logs', 'execution_mode TEXT NOT NULL DEFAULT "DRY_RUN"');
}
