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
    console.warn(`[Database] Error initializing database at ${targetPath} (${err?.message || err}).`);
    try {
      if (db!) {
        (db as any).close?.();
      }
    } catch {}
    // Only recreate if it's explicitly a test/temp database
    const isTestDb = targetPath.includes('test') || targetPath.includes('tmp') || targetPath.includes('temp');
    if (isTestDb) {
      removeDatabaseFiles(targetPath);
      db = new DatabaseSync(targetPath);
      db.exec('PRAGMA busy_timeout = 5000;');
      db.exec('PRAGMA foreign_keys = ON;');
      db.exec('PRAGMA journal_mode = WAL;');
      initializeDatabaseSchema(db);
    } else {
      throw err;
    }
  }
  return db;
}

export function closeDatabase(): void {
  if (dbInstance) {
    try {
      (dbInstance as any).close?.();
    } catch {}
    dbInstance = null;
    currentDbPath = null;
  }
}

export function getDatabase(): DatabaseSync {
  const targetPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'relay.db');
  if (!dbInstance || currentDbPath !== targetPath) {
    if (dbInstance) {
      try {
        (dbInstance as any).close?.();
      } catch {}
      dbInstance = null;
    }
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

    -- 25b. Google Business Authorization Grants (Versioned & Unbundled)
    CREATE TABLE IF NOT EXISTS gbp_authorization_grants (
      authorization_id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      business_id TEXT NOT NULL,
      authorized_person_id TEXT NOT NULL,
      asserted_authority_role TEXT NOT NULL,
      authority_evidence_classification TEXT NOT NULL DEFAULT 'SELF_REPORTED_PENDING_EVIDENCE',
      permission_purpose TEXT NOT NULL,
      allowed_actions_json TEXT NOT NULL DEFAULT '[]',
      prohibited_actions_json TEXT NOT NULL DEFAULT '[]',
      consent_method TEXT NOT NULL DEFAULT 'OWNER_PORTAL_SIGNATURE',
      consent_disclosure_version TEXT NOT NULL DEFAULT 'v1.0-2026',
      consent_disclosure_text_hash TEXT NOT NULL,
      captured_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      revoked_at TEXT,
      revocation_status INTEGER NOT NULL DEFAULT 0,
      google_account_connected INTEGER NOT NULL DEFAULT 0,
      google_oauth_grant_id TEXT,
      approval_status TEXT NOT NULL DEFAULT 'PENDING',
      approver_id TEXT NOT NULL,
      approval_content_hash TEXT NOT NULL,
      source_form_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    );

    -- 25c. Google Business Role Attestations (Independent Roles)
    CREATE TABLE IF NOT EXISTS gbp_role_attestations (
      attestation_id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      person_name TEXT NOT NULL,
      person_identifier TEXT NOT NULL,
      role TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'SELF_REPORTED_PENDING_EVIDENCE',
      evidence_classification TEXT NOT NULL DEFAULT 'SELF_REPORTED_PENDING_EVIDENCE',
      notes TEXT NOT NULL,
      attested_at TEXT NOT NULL,
      verified_at TEXT,
      verified_by TEXT,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    );

    -- 25d. Google Business 12-Stage Onboarding Workflows
    CREATE TABLE IF NOT EXISTS gbp_onboarding_workflows (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      business_id TEXT NOT NULL,
      current_state TEXT NOT NULL DEFAULT 'OWNER_AUTHORIZATION_REQUIRED',
      current_stage_number INTEGER NOT NULL DEFAULT 1,
      stages_json TEXT NOT NULL DEFAULT '[]',
      owner_packet_json TEXT NOT NULL DEFAULT '{}',
      duplicate_checklist_json TEXT NOT NULL DEFAULT '{}',
      last_transition_reason TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
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

    -- 28. Evidence Graph Nodes (Build 1)
    CREATE TABLE IF NOT EXISTS evidence_nodes (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      type TEXT NOT NULL,
      label TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      source TEXT NOT NULL,
      evidence_status TEXT NOT NULL DEFAULT 'OBSERVED',
      actor TEXT NOT NULL,
      metadata_json TEXT NOT NULL DEFAULT '{}',
      provenance_json TEXT NOT NULL DEFAULT '{}',
      audit_link_id TEXT,
      audit_hash TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    );

    -- 29. Evidence Graph Edges (Build 1)
    CREATE TABLE IF NOT EXISTS evidence_edges (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      source_node_id TEXT NOT NULL,
      target_node_id TEXT NOT NULL,
      edge_type TEXT NOT NULL,
      weight REAL NOT NULL DEFAULT 1.0,
      confidence REAL NOT NULL DEFAULT 1.0,
      provenance_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (source_node_id) REFERENCES evidence_nodes(id) ON DELETE CASCADE,
      FOREIGN KEY (target_node_id) REFERENCES evidence_nodes(id) ON DELETE CASCADE
    );

    -- 30. Execution Evidence Ledger (Build 2)
    CREATE TABLE IF NOT EXISTS execution_evidence (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      actor TEXT NOT NULL,
      agent_name TEXT NOT NULL,
      triggering_lead_or_opportunity_id TEXT NOT NULL,
      action_type TEXT NOT NULL,
      execution_mode TEXT NOT NULL DEFAULT 'DRY_RUN',
      timestamp TEXT NOT NULL,
      approval_state TEXT NOT NULL DEFAULT 'NOT_REQUIRED',
      approval_id TEXT,
      authorization_grant_id TEXT,
      consent_evidence_ref TEXT,
      input_fingerprint TEXT NOT NULL,
      output_fingerprint TEXT NOT NULL,
      target_system_or_channel TEXT NOT NULL,
      connector_type TEXT NOT NULL,
      connector_auth_status TEXT NOT NULL DEFAULT 'SIMULATED_NO_CREDENTIALS',
      result_status TEXT NOT NULL DEFAULT 'SIMULATED',
      failure_reason TEXT,
      immutable_audit_reference TEXT NOT NULL,
      metadata_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    );

    -- 31. Structured Pipeline Outcomes (Build 3)
    CREATE TABLE IF NOT EXISTS structured_outcomes (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      stage TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      actor_or_source TEXT NOT NULL,
      evidence_type TEXT NOT NULL,
      evidence_status TEXT NOT NULL DEFAULT 'OBSERVED',
      confidence REAL NOT NULL DEFAULT 1.0,
      related_lead_id TEXT NOT NULL,
      related_customer_id TEXT,
      related_job_id TEXT,
      pipeline_value REAL NOT NULL DEFAULT 0,
      quoted_value REAL NOT NULL DEFAULT 0,
      booked_value REAL NOT NULL DEFAULT 0,
      invoiced_value REAL NOT NULL DEFAULT 0,
      collected_revenue REAL NOT NULL DEFAULT 0,
      supporting_evidence_refs_json TEXT NOT NULL DEFAULT '[]',
      notes TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    );

    -- 32. Explainable Attribution Records (Build 4 & 5)
    CREATE TABLE IF NOT EXISTS explainable_attributions (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      business_id TEXT NOT NULL,
      lead_id TEXT NOT NULL,
      opportunity_or_job_id TEXT NOT NULL,
      revenue_event_id TEXT NOT NULL,
      candidate_contributing_actions_json TEXT NOT NULL DEFAULT '[]',
      attribution_classification TEXT NOT NULL DEFAULT 'DIRECT',
      confidence_score REAL NOT NULL DEFAULT 1.0,
      confidence_level TEXT NOT NULL DEFAULT 'HIGH',
      evidence_references_json TEXT NOT NULL DEFAULT '[]',
      conflicting_evidence_json TEXT NOT NULL DEFAULT '[]',
      explanation TEXT NOT NULL,
      calculation_method TEXT NOT NULL,
      attributed_amount REAL NOT NULL DEFAULT 0,
      timestamp TEXT NOT NULL,
      model_version TEXT NOT NULL DEFAULT 'v2.0-deterministic',
      audit_hash_reference TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    );

    -- 33. Defensible ROI Snapshots (Build 6)
    CREATE TABLE IF NOT EXISTS defensible_roi_snapshots (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      metrics_json TEXT NOT NULL,
      is_simulated INTEGER NOT NULL DEFAULT 0,
      data_classification TEXT NOT NULL DEFAULT 'SIMULATED_DRY_RUN',
      calculated_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    );

    -- 34. Global Tenant Locations (Location Intelligence)
    CREATE TABLE IF NOT EXISTS tenant_locations (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      location_type TEXT NOT NULL,
      label TEXT NOT NULL,
      street_address TEXT,
      unit TEXT,
      city TEXT NOT NULL,
      municipality TEXT,
      county TEXT,
      state_province TEXT NOT NULL,
      postal_code TEXT,
      country TEXT NOT NULL DEFAULT 'US',
      phone TEXT,
      timezone TEXT NOT NULL DEFAULT 'America/New_York',
      latitude REAL,
      longitude REAL,
      source TEXT NOT NULL DEFAULT 'SELF_REPORTED',
      confidence REAL NOT NULL DEFAULT 1.0,
      verification_state TEXT NOT NULL DEFAULT 'SELF_REPORTED',
      verified_at TEXT,
      verified_by TEXT,
      is_redacted INTEGER NOT NULL DEFAULT 0,
      evidence_refs_json TEXT NOT NULL DEFAULT '[]',
      metadata_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    );

    -- 35. Configured Tenant Service Areas
    CREATE TABLE IF NOT EXISTS tenant_service_areas (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      branch_id TEXT,
      name TEXT NOT NULL,
      area_type TEXT NOT NULL,
      rule TEXT NOT NULL DEFAULT 'INCLUSION',
      value TEXT NOT NULL,
      radius_km REAL,
      coordinates_json TEXT DEFAULT '[]',
      notes TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    );

    -- 36. Dynamic Jurisdiction Resolutions Ledger
    CREATE TABLE IF NOT EXISTS jurisdiction_resolutions (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      action_type TEXT NOT NULL,
      target_entity_type TEXT,
      target_entity_id TEXT,
      resolved_country TEXT NOT NULL,
      resolved_state_province TEXT,
      resolved_county TEXT,
      resolved_municipality TEXT,
      resolved_timezone TEXT NOT NULL,
      service_area_status TEXT NOT NULL,
      jurisdiction_ids_json TEXT NOT NULL DEFAULT '[]',
      requires_human_review INTEGER NOT NULL DEFAULT 0,
      confidence REAL NOT NULL DEFAULT 1.0,
      source_level TEXT NOT NULL,
      evidence_refs_json TEXT NOT NULL DEFAULT '[]',
      resolution_notes TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    );

    -- 37. Durable Asynchronous Workflows (Resonate-Informed HITL Engine)
    CREATE TABLE IF NOT EXISTS durable_approval_workflows (
      workflow_id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      workflow_type TEXT NOT NULL,
      action_title TEXT NOT NULL,
      proposer_id TEXT NOT NULL,
      proposer_role TEXT NOT NULL,
      required_approver_role TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING_APPROVAL',
      resumption_token TEXT NOT NULL UNIQUE,
      payload_json TEXT NOT NULL,
      payload_hash TEXT NOT NULL,
      approval_record_id TEXT,
      approver_id TEXT,
      decision_reason TEXT,
      execution_result_json TEXT,
      created_at TEXT NOT NULL,
      decided_at TEXT,
      resumed_at TEXT,
      expires_at TEXT NOT NULL,
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
    CREATE INDEX IF NOT EXISTS idx_ev_nodes_tenant ON evidence_nodes(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_ev_edges_tenant ON evidence_edges(tenant_id, source_node_id, target_node_id);
    CREATE INDEX IF NOT EXISTS idx_exec_ev_tenant ON execution_evidence(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_struct_outcomes_tenant ON structured_outcomes(tenant_id, related_lead_id);
    CREATE INDEX IF NOT EXISTS idx_expl_attr_tenant ON explainable_attributions(tenant_id, lead_id);
    CREATE INDEX IF NOT EXISTS idx_roi_snap_tenant ON defensible_roi_snapshots(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_tenant_locations ON tenant_locations(tenant_id, location_type);
    CREATE INDEX IF NOT EXISTS idx_tenant_service_areas ON tenant_service_areas(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_jurisdiction_res ON jurisdiction_resolutions(tenant_id, action_type);

    -- 38. First-Class Connector Registry (Truthful State & Capability Isolation)
    CREATE TABLE IF NOT EXISTS connector_records (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      capability TEXT NOT NULL,
      connector_type TEXT NOT NULL,
      configuration_state TEXT NOT NULL DEFAULT 'UNCONFIGURED',
      authentication_state TEXT NOT NULL DEFAULT 'NOT_APPLICABLE',
      execution_mode TEXT NOT NULL DEFAULT 'DRY_RUN',
      health_status TEXT NOT NULL DEFAULT 'UNKNOWN',
      last_verification_at TEXT,
      last_successful_request_at TEXT,
      permissions_json TEXT NOT NULL DEFAULT '[]',
      scopes_json TEXT NOT NULL DEFAULT '[]',
      evidence_refs_json TEXT NOT NULL DEFAULT '[]',
      metadata_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    );

    -- 39. Connector Verification Audit Ledger
    CREATE TABLE IF NOT EXISTS connector_verifications (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      connector_id TEXT NOT NULL,
      verification_status TEXT NOT NULL,
      failure_classification TEXT,
      latency_ms INTEGER NOT NULL DEFAULT 0,
      scopes_granted_json TEXT NOT NULL DEFAULT '[]',
      scopes_missing_json TEXT NOT NULL DEFAULT '[]',
      evidence_ref TEXT,
      sanitized_message TEXT NOT NULL,
      verified_at TEXT NOT NULL,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (connector_id) REFERENCES connector_records(id) ON DELETE CASCADE
    );

    -- 40. Durable External Execution Queue (Crash-Resilient & Concurrency-Safe)
    CREATE TABLE IF NOT EXISTS durable_execution_queue (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      connector_id TEXT NOT NULL,
      operation TEXT NOT NULL,
      target TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      payload_hash TEXT NOT NULL,
      idempotency_key TEXT NOT NULL,
      execution_mode TEXT NOT NULL DEFAULT 'DRY_RUN',
      status TEXT NOT NULL DEFAULT 'QUEUED',
      approval_id TEXT,
      proposer_id TEXT NOT NULL,
      proposer_role TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      max_attempts INTEGER NOT NULL DEFAULT 3,
      next_retry_at TEXT,
      last_error TEXT,
      last_error_classification TEXT,
      result_payload_json TEXT,
      evidence_refs_json TEXT NOT NULL DEFAULT '[]',
      audit_log_ref TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    );

    -- 41. Dead Letter Queue (Durable Terminal Failure State)
    CREATE TABLE IF NOT EXISTS dead_letter_queue (
      id TEXT PRIMARY KEY,
      queue_item_id TEXT NOT NULL UNIQUE,
      tenant_id TEXT NOT NULL,
      connector_id TEXT NOT NULL,
      operation TEXT NOT NULL,
      sanitized_failure_classification TEXT NOT NULL,
      retry_count INTEGER NOT NULL DEFAULT 0,
      last_attempt_at TEXT NOT NULL,
      next_operator_action TEXT NOT NULL DEFAULT 'INSPECT',
      evidence_refs_json TEXT NOT NULL DEFAULT '[]',
      audit_log_ref TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      resolution_notes TEXT,
      created_at TEXT NOT NULL,
      resolved_at TEXT,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    );

    -- 42. Global & Scoped Emergency Controls (Emergency Stop / Pause)
    CREATE TABLE IF NOT EXISTS emergency_controls (
      id TEXT PRIMARY KEY,
      tenant_id TEXT,
      scope TEXT NOT NULL,
      target_identifier TEXT,
      is_paused INTEGER NOT NULL DEFAULT 0,
      reason TEXT NOT NULL,
      paused_by TEXT NOT NULL,
      audit_log_ref TEXT NOT NULL,
      paused_at TEXT NOT NULL,
      resumed_at TEXT,
      resumed_by TEXT
    );

    -- 43. Tenant Pilot State & Activation Lifecycle
    CREATE TABLE IF NOT EXISTS tenant_pilot_states (
      tenant_id TEXT PRIMARY KEY,
      current_state TEXT NOT NULL DEFAULT 'NOT_CONFIGURED',
      activated_at TEXT,
      activated_by TEXT,
      activation_evidence_refs_json TEXT NOT NULL DEFAULT '[]',
      last_readiness_check_json TEXT NOT NULL DEFAULT '{}',
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    );

    -- 44. Production Lead Intake Boundary
    CREATE TABLE IF NOT EXISTS pilot_lead_intake (
      lead_id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      source TEXT NOT NULL,
      source_type TEXT NOT NULL,
      source_evidence_json TEXT NOT NULL DEFAULT '{}',
      received_at TEXT NOT NULL,
      normalized_contact_json TEXT NOT NULL DEFAULT '{}',
      service_requested TEXT NOT NULL,
      property_type TEXT NOT NULL DEFAULT 'Residential',
      data_environment TEXT NOT NULL DEFAULT 'PILOT',
      consent_state TEXT NOT NULL DEFAULT 'PENDING_VERIFICATION',
      consent_evidence_ref TEXT,
      location_evidence_json TEXT NOT NULL DEFAULT '{}',
      deduplication_fingerprint TEXT NOT NULL,
      duplicate_status TEXT NOT NULL DEFAULT 'NEW',
      duplicate_details_json TEXT NOT NULL DEFAULT '{}',
      identity_resolution_json TEXT NOT NULL DEFAULT '{}',
      qualification_status TEXT NOT NULL DEFAULT 'UNQUALIFIED',
      lifecycle_status TEXT NOT NULL DEFAULT 'LEAD_RECEIVED',
      estimated_value REAL NOT NULL DEFAULT 0,
      audit_ref TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    );

    -- 45. Cryptographically-Bound Production Approvals
    CREATE TABLE IF NOT EXISTS production_approvals (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      lead_id TEXT NOT NULL,
      proposed_action TEXT NOT NULL,
      action_payload_json TEXT NOT NULL,
      canonical_payload_hash TEXT NOT NULL,
      aria_reasoning TEXT NOT NULL,
      connector_id TEXT NOT NULL,
      recipient TEXT NOT NULL,
      consent_evidence_ref TEXT NOT NULL,
      authorization_evidence_ref TEXT NOT NULL,
      jurisdiction_context TEXT NOT NULL,
      expected_external_effect TEXT NOT NULL,
      execution_mode TEXT NOT NULL DEFAULT 'DRY_RUN',
      policy_findings_json TEXT NOT NULL DEFAULT '[]',
      proposer_id TEXT NOT NULL,
      proposer_role TEXT NOT NULL,
      approved_by TEXT,
      approved_at TEXT,
      approval_status TEXT NOT NULL DEFAULT 'PENDING',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    );

    -- 46. Production Idempotency Ledger
    CREATE TABLE IF NOT EXISTS production_idempotency (
      tenant_id TEXT NOT NULL,
      connector_id TEXT NOT NULL,
      operation TEXT NOT NULL,
      idempotency_key TEXT NOT NULL,
      canonical_request_hash TEXT NOT NULL,
      target TEXT NOT NULL,
      result_json TEXT NOT NULL,
      execution_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (tenant_id, connector_id, idempotency_key)
    );

    -- 47. Pilot Lead Event Timeline
    CREATE TABLE IF NOT EXISTS pilot_timeline_events (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      lead_id TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      stage TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      actor_or_source TEXT NOT NULL,
      evidence_ref TEXT,
      audit_ref TEXT NOT NULL,
      data_environment TEXT NOT NULL DEFAULT 'PILOT',
      metadata_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    );

    -- 48. Manual Outcome Records
    CREATE TABLE IF NOT EXISTS manual_outcome_records (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      lead_id TEXT NOT NULL,
      outcome_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'OPERATOR_REPORTED',
      operator_id TEXT NOT NULL,
      operator_role TEXT NOT NULL,
      amount REAL NOT NULL DEFAULT 0,
      confidence REAL NOT NULL DEFAULT 1.0,
      notes TEXT NOT NULL,
      evidence_attachment_ref TEXT,
      payment_evidence_state TEXT,
      recorded_at TEXT NOT NULL,
      audit_event_id TEXT NOT NULL,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    );

    -- 49. Payment Evidence Records
    CREATE TABLE IF NOT EXISTS payment_evidence_records (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      lead_id TEXT NOT NULL,
      payment_amount REAL NOT NULL DEFAULT 0,
      evidence_state TEXT NOT NULL DEFAULT 'REPORTED',
      processor_name TEXT,
      transaction_reference TEXT,
      bank_deposit_reference TEXT,
      operator_id TEXT,
      notes TEXT,
      verified_at TEXT,
      verified_by TEXT,
      data_environment TEXT NOT NULL DEFAULT 'PILOT',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    );

    -- 29. Website Projects
    CREATE TABLE IF NOT EXISTS website_projects (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      business_id TEXT NOT NULL,
      site_name TEXT NOT NULL,
      site_type TEXT NOT NULL DEFAULT 'LOCAL_SERVICE',
      status TEXT NOT NULL DEFAULT 'DRAFT',
      current_version_id TEXT,
      domain TEXT,
      deployment_provider TEXT NOT NULL DEFAULT 'STATIC_EXPORT',
      data_environment TEXT NOT NULL DEFAULT 'PILOT',
      brand_profile_id TEXT NOT NULL,
      business_context_id TEXT NOT NULL,
      approval_status TEXT NOT NULL DEFAULT 'DRAFT',
      deployment_status TEXT NOT NULL DEFAULT 'UNCONFIGURED',
      evidence_refs TEXT DEFAULT '[]',
      audit_refs TEXT DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    );

    -- 30. Website Brand Profiles
    CREATE TABLE IF NOT EXISTS website_brand_profiles (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      brand_name TEXT NOT NULL,
      logo_url TEXT,
      alternate_logo_url TEXT,
      favicon_url TEXT,
      typography TEXT NOT NULL, -- JSON
      colors TEXT NOT NULL,     -- JSON
      imagery_style TEXT NOT NULL DEFAULT 'AUTHENTIC_FIELD',
      writing_tone TEXT NOT NULL DEFAULT 'DIRECT_PROFESSIONAL',
      cta_style TEXT NOT NULL,  -- JSON
      approved_terminology TEXT DEFAULT '[]', -- JSON array
      prohibited_claims TEXT DEFAULT '[]',    -- JSON array
      disclaimers TEXT DEFAULT '[]',          -- JSON array
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    );

    -- 31. Website Business Contexts
    CREATE TABLE IF NOT EXISTS website_business_contexts (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      context_json TEXT NOT NULL,
      compiled_at TEXT NOT NULL,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    );

    -- 32. Website Pages
    CREATE TABLE IF NOT EXISTS website_pages (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      tenant_id TEXT NOT NULL,
      slug TEXT NOT NULL,
      title TEXT NOT NULL,
      nav_order INTEGER NOT NULL DEFAULT 0,
      is_published INTEGER NOT NULL DEFAULT 1,
      is_index INTEGER NOT NULL DEFAULT 0,
      meta_title TEXT NOT NULL,
      meta_description TEXT NOT NULL,
      canonical_url TEXT,
      page_type TEXT NOT NULL DEFAULT 'PAGE',
      components TEXT NOT NULL DEFAULT '[]', -- JSON array of WebsiteComponent
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES website_projects(id) ON DELETE CASCADE,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    );

    -- 33. Website Versions (Audited Snapshots with SHA-256 bound hashes)
    CREATE TABLE IF NOT EXISTS website_versions (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      tenant_id TEXT NOT NULL,
      version_number INTEGER NOT NULL,
      content_hash TEXT NOT NULL,
      pages_snapshot TEXT NOT NULL,   -- JSON
      brand_snapshot TEXT NOT NULL,   -- JSON
      context_snapshot TEXT NOT NULL, -- JSON
      claims_analysis TEXT,           -- JSON
      approved_by TEXT,
      approver_role TEXT,
      approved_at TEXT,
      approval_status TEXT NOT NULL DEFAULT 'DRAFT',
      deployment_status TEXT NOT NULL DEFAULT 'UNCONFIGURED',
      deployment_provider TEXT,
      deployment_result TEXT,
      previous_version_id TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES website_projects(id) ON DELETE CASCADE,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    );

    -- 34. Website Domains
    CREATE TABLE IF NOT EXISTS website_domains (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      tenant_id TEXT NOT NULL,
      requested_domain TEXT NOT NULL,
      registered_domain TEXT,
      status TEXT NOT NULL DEFAULT 'UNCONFIGURED',
      dns_records TEXT DEFAULT '[]', -- JSON
      ssl_status TEXT NOT NULL DEFAULT 'NOT_PROVISIONED',
      ownership_verified INTEGER NOT NULL DEFAULT 0,
      verified_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES website_projects(id) ON DELETE CASCADE,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    );

    -- 35. Website Form Submissions
    CREATE TABLE IF NOT EXISTS website_form_submissions (
      submission_id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      page_slug TEXT NOT NULL,
      form_type TEXT NOT NULL,
      form_data TEXT NOT NULL, -- JSON
      consent TEXT NOT NULL,   -- JSON
      tracking TEXT NOT NULL,  -- JSON
      security TEXT NOT NULL,  -- JSON
      routed_lead_id TEXT,
      submitted_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES website_projects(id) ON DELETE CASCADE,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    );

    -- 36. Website Analytics Events
    CREATE TABLE IF NOT EXISTS website_analytics_events (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      page_slug TEXT NOT NULL,
      event_type TEXT NOT NULL,
      target_identifier TEXT,
      utm_source TEXT,
      utm_medium TEXT,
      utm_campaign TEXT,
      referrer_domain TEXT,
      session_id TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES website_projects(id) ON DELETE CASCADE,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    );

    -- 37. Web Presence Agent Recommendations
    CREATE TABLE IF NOT EXISTS website_recommendations (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      category TEXT NOT NULL,
      target_page_slug TEXT,
      title TEXT NOT NULL,
      rationale TEXT NOT NULL,
      proposed_action TEXT NOT NULL,
      proposed_content_delta TEXT,
      priority TEXT NOT NULL DEFAULT 'MEDIUM',
      status TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
      guardrail_checks TEXT NOT NULL, -- JSON
      created_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES website_projects(id) ON DELETE CASCADE,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    );

    -- 38. Website Proof Items (First-Class Structured Proof of Work Records)
    CREATE TABLE IF NOT EXISTS website_proof_items (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      title TEXT NOT NULL,
      type TEXT NOT NULL,
      verification_status TEXT NOT NULL,
      summary TEXT NOT NULL,
      source_type TEXT NOT NULL,
      source_reference TEXT NOT NULL,
      observed_at TEXT NOT NULL,
      public_safe INTEGER NOT NULL DEFAULT 1,
      approved_for_publication INTEGER NOT NULL DEFAULT 0,
      evidence_hash TEXT NOT NULL,
      product_slug TEXT,
      metadata_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES website_projects(id) ON DELETE CASCADE,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    );

    -- 39. Universal Action Engine Ledger (Universal Execution & Governance)
    CREATE TABLE IF NOT EXISTS universal_action_records (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      actor_id TEXT NOT NULL,
      actor_role TEXT NOT NULL,
      actor_name TEXT NOT NULL,
      action_type TEXT NOT NULL,
      provider TEXT NOT NULL,
      input_payload_json TEXT NOT NULL,
      input_fingerprint TEXT NOT NULL,
      execution_state TEXT NOT NULL DEFAULT 'REQUESTED',
      approval_state TEXT NOT NULL DEFAULT 'NOT_REQUIRED',
      approval_required INTEGER NOT NULL DEFAULT 0,
      approved_by TEXT,
      approved_at TEXT,
      approval_reason TEXT,
      attempt_count INTEGER NOT NULL DEFAULT 0,
      max_attempts INTEGER NOT NULL DEFAULT 3,
      result_payload_json TEXT,
      error_json TEXT,
      idempotency_key TEXT NOT NULL,
      audit_reference TEXT NOT NULL,
      requested_at TEXT NOT NULL,
      validated_at TEXT,
      authorized_at TEXT,
      planned_at TEXT,
      queued_at TEXT,
      executed_at TEXT,
      verified_at TEXT,
      completed_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    );

    -- 40. Authoritative Connector Definitions & Tenant Instances
    CREATE TABLE IF NOT EXISTS tenant_connector_instances (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      category TEXT NOT NULL,
      connector_type TEXT NOT NULL,
      connection_state TEXT NOT NULL DEFAULT 'DISCONNECTED',
      auth_method TEXT NOT NULL,
      configured_by TEXT NOT NULL,
      credentials_masked_json TEXT NOT NULL DEFAULT '{}',
      last_verification_at TEXT,
      last_verification_status TEXT,
      last_verification_message TEXT,
      last_successful_request_at TEXT,
      last_failure_at TEXT,
      last_failure_message TEXT,
      enabled_operations_json TEXT NOT NULL DEFAULT '[]',
      paused_operations_json TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    );

    -- 41. Project Intelligence Registry & Saved Comparisons
    CREATE TABLE IF NOT EXISTS project_intelligence_projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      purpose TEXT NOT NULL,
      stack_json TEXT NOT NULL,
      root_directory TEXT NOT NULL,
      repo_url TEXT,
      last_scanned_at TEXT,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS project_intelligence_comparisons (
      id TEXT PRIMARY KEY,
      target_project_id TEXT NOT NULL,
      source_project_id TEXT NOT NULL,
      comparison_report_json TEXT NOT NULL,
      compared_at TEXT NOT NULL
    );

    -- 42. Tenant Business Profiles (Unified Business Data Layer)
    CREATE TABLE IF NOT EXISTS tenant_business_profiles (
      tenant_id TEXT PRIMARY KEY,
      legal_name TEXT NOT NULL,
      dba_name TEXT,
      industry TEXT NOT NULL,
      website_url TEXT,
      phone TEXT,
      email TEXT,
      street_address TEXT,
      city TEXT,
      state_province TEXT,
      postal_code TEXT,
      country TEXT NOT NULL DEFAULT 'US',
      business_hours_json TEXT NOT NULL DEFAULT '[]',
      service_areas_json TEXT NOT NULL DEFAULT '[]',
      products_and_services_json TEXT NOT NULL DEFAULT '[]',
      business_goals_json TEXT NOT NULL DEFAULT '[]',
      communication_preferences_json TEXT NOT NULL DEFAULT '{}',
      publishing_preferences_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    );

    -- 43. Tenant AI Worker Configurations & Governance
    CREATE TABLE IF NOT EXISTS tenant_worker_configs (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      worker_id TEXT NOT NULL,
      worker_name TEXT NOT NULL,
      role_description TEXT NOT NULL,
      is_enabled INTEGER NOT NULL DEFAULT 1,
      execution_mode TEXT NOT NULL DEFAULT 'DRY_RUN',
      assigned_permissions_json TEXT NOT NULL DEFAULT '[]',
      approval_requirement TEXT NOT NULL DEFAULT 'REQUIRE_APPROVAL_ALL_ACTIONS',
      schedule_or_trigger TEXT NOT NULL DEFAULT 'ON_EVENT_OR_MANUAL',
      capability_status TEXT NOT NULL DEFAULT 'ACTIVE',
      updated_at TEXT NOT NULL,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      UNIQUE(tenant_id, worker_id)
    );

    CREATE INDEX IF NOT EXISTS idx_connector_tenant ON connector_records(tenant_id, provider, capability);
    CREATE INDEX IF NOT EXISTS idx_conn_verif_tenant ON connector_verifications(tenant_id, connector_id);
    CREATE INDEX IF NOT EXISTS idx_exec_q_tenant_status ON durable_execution_queue(tenant_id, status);
    CREATE INDEX IF NOT EXISTS idx_exec_q_idempotency ON durable_execution_queue(tenant_id, connector_id, idempotency_key);
    CREATE INDEX IF NOT EXISTS idx_dlq_tenant_status ON dead_letter_queue(tenant_id, status);
    CREATE INDEX IF NOT EXISTS idx_emergency_scope ON emergency_controls(scope, target_identifier);
    CREATE INDEX IF NOT EXISTS idx_pilot_leads_tenant ON pilot_lead_intake(tenant_id, data_environment, lifecycle_status);
    CREATE INDEX IF NOT EXISTS idx_pilot_leads_fingerprint ON pilot_lead_intake(tenant_id, deduplication_fingerprint);
    CREATE INDEX IF NOT EXISTS idx_prod_appr_tenant ON production_approvals(tenant_id, lead_id, approval_status);
    CREATE INDEX IF NOT EXISTS idx_pilot_timeline_lead ON pilot_timeline_events(tenant_id, lead_id, timestamp);
    CREATE INDEX IF NOT EXISTS idx_manual_outcomes_lead ON manual_outcome_records(tenant_id, lead_id);
    CREATE INDEX IF NOT EXISTS idx_payment_evidence_lead ON payment_evidence_records(tenant_id, lead_id, evidence_state);
    CREATE INDEX IF NOT EXISTS idx_web_proj_tenant ON website_projects(tenant_id, status);
    CREATE INDEX IF NOT EXISTS idx_web_pages_proj ON website_pages(project_id, tenant_id, slug);
    CREATE INDEX IF NOT EXISTS idx_web_vers_proj ON website_versions(project_id, version_number);
    CREATE INDEX IF NOT EXISTS idx_web_dom_proj ON website_domains(project_id, requested_domain);
    CREATE INDEX IF NOT EXISTS idx_web_sub_tenant ON website_form_submissions(tenant_id, project_id, submitted_at);
    CREATE INDEX IF NOT EXISTS idx_web_analytics_proj ON website_analytics_events(tenant_id, project_id, timestamp);
    CREATE INDEX IF NOT EXISTS idx_web_recs_proj ON website_recommendations(tenant_id, project_id, status);
    CREATE INDEX IF NOT EXISTS idx_web_proof_proj ON website_proof_items(tenant_id, project_id, product_slug);
    CREATE INDEX IF NOT EXISTS idx_univ_actions_tenant ON universal_action_records(tenant_id, action_type, execution_state);
    CREATE INDEX IF NOT EXISTS idx_univ_actions_idempotency ON universal_action_records(tenant_id, idempotency_key);
    CREATE INDEX IF NOT EXISTS idx_tenant_conn_inst ON tenant_connector_instances(tenant_id, provider);
    CREATE INDEX IF NOT EXISTS idx_tenant_workers ON tenant_worker_configs(tenant_id, worker_id);
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

  safeAddColumn('tenants', 'status TEXT DEFAULT "active"');
  safeAddColumn('tenants', 'settings_json TEXT DEFAULT "{}"');
  safeAddColumn('tenants', 'updated_at TEXT');
  safeAddColumn('tenants', 'environment_classification TEXT NOT NULL DEFAULT "SIMULATED_DRY_RUN"');
  safeAddColumn('tenants', 'company_maturity TEXT DEFAULT "Fresh Launch"');
  safeAddColumn('tenants', 'engagement_model TEXT DEFAULT "Full AI Launch"');
  safeAddColumn('tenants', 'operating_mode TEXT DEFAULT "Guided Manual"');
  safeAddColumn('tenants', 'verification_status TEXT DEFAULT "Pending owner confirmation and official-source verification"');

  safeAddColumn('tenant_locations', 'phone TEXT');

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

  safeAddColumn('universal_action_records', 'approval_signature TEXT');
  safeAddColumn('universal_action_records', 'policy_version TEXT DEFAULT "v1.0"');
  safeAddColumn('universal_action_records', 'retry_classification TEXT');
  safeAddColumn('universal_action_records', 'next_retry_at TEXT');
  safeAddColumn('universal_action_records', 'dead_letter_id TEXT');
  safeAddColumn('opportunities', 'updated_at TEXT');
}
