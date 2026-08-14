import { getDatabase } from './database';

export function seedDatabaseIfEmpty(): void {
  const db = getDatabase();
  const now = new Date().toISOString();

  try {
    const existing = db.prepare('SELECT COUNT(*) as count FROM tenants').get() as { count: number } | undefined;
    if (existing && existing.count > 0) {
      return; // Already seeded
    }
  } catch {
    // If query fails, proceed with seeding
  }

  try {
    db.exec('BEGIN TRANSACTION;');
  } catch {
    // Transaction might already be open
  }

  try {
    // 1. Seed Tenants
    const insertTenant = db.prepare(`
      INSERT OR IGNORE INTO tenants (id, name, industry, mrr, primary_bottleneck, environment_classification, company_maturity, engagement_model, operating_mode, verification_status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertTenant.run(
      'tenant_demo_1',
      'Apex Horizon Technologies',
      'B2B SaaS & Enterprise AI',
      142000,
      'Lead response latency & stale lead recovery',
      'SIMULATED_DRY_RUN',
      'Established Demo',
      'Simulation Mode',
      'Automated Simulation',
      'Simulated Test Environment',
      now
    );

    insertTenant.run(
      'tenant_demo_2',
      'Titan Health Systems',
      'Healthcare & Dental Clinics',
      98000,
      'Patient booking cancellation recovery',
      'SIMULATED_DRY_RUN',
      'Established Demo',
      'Simulation Mode',
      'Automated Simulation',
      'Simulated Test Environment',
      now
    );

    insertTenant.run(
      'tenant_ma_fresh_launch',
      'Fresh Launch MA Electrical Company',
      'Electrical Contracting',
      0,
      'Unverified onboarding & credential collection',
      'PENDING_VERIFICATION',
      'Fresh Launch',
      'Full AI Launch',
      'Guided Manual',
      'Pending owner confirmation and official-source verification',
      now
    );

    // 2. Seed Actors
    const insertActor = db.prepare(`
      INSERT OR IGNORE INTO actors (id, tenant_id, name, role, email, user_role_classification, is_licensed_electrician, is_master_electrician, is_licensee_of_record, is_legal_owner, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertActor.run('actor_1', 'tenant_demo_1', 'Relay Operator', 'owner', 'admin@apexhorizon.com', 'RELAY_OPERATOR', 0, 0, 0, 0, now);
    insertActor.run('actor_2', 'tenant_demo_1', 'Growth Specialist', 'member', 'member@apexhorizon.com', 'GROWTH_PARTNER', 0, 0, 0, 0, now);
    insertActor.run('actor_3', 'tenant_demo_2', 'Dr. Evelyn Vance', 'owner', 'evelyn@titanhealth.org', 'LEGAL_BUSINESS_OWNER', 0, 0, 0, 1, now);
    insertActor.run('actor_ma_1', 'tenant_ma_fresh_launch', 'Relay Operator', 'owner', 'operator@relay.ai', 'UNVERIFIED', 0, 0, 0, 0, now);

    // 2b. Seed Auth Sessions (Tokens)
    const insertSession = db.prepare(`
      INSERT OR IGNORE INTO auth_sessions (token, actor_id, tenant_id, role, permissions_json, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const farFuture = new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString();
    const ownerPermissions = JSON.stringify(['launch:read', 'launch:write', 'launch:dispatch', 'launch:rollback', 'audit:read']);
    const memberPermissions = JSON.stringify(['launch:read', 'launch:write']);

    // Tenant 1 Owner
    insertSession.run('token_owner_tenant1', 'actor_1', 'tenant_demo_1', 'owner', ownerPermissions, farFuture, now);
    // Tenant 1 Member (No dispatch or audit permission)
    insertSession.run('token_member_tenant1', 'actor_2', 'tenant_demo_1', 'member', memberPermissions, farFuture, now);
    // Tenant 2 Owner
    insertSession.run('token_owner_tenant2', 'actor_3', 'tenant_demo_2', 'owner', ownerPermissions, farFuture, now);
    // Fresh Launch MA Owner/Operator
    insertSession.run('token_ma_fresh_launch', 'actor_ma_1', 'tenant_ma_fresh_launch', 'owner', ownerPermissions, farFuture, now);
    // Expired Token
    insertSession.run('token_expired', 'actor_1', 'tenant_demo_1', 'owner', ownerPermissions, '2020-01-01T00:00:00.000Z', now);

    // 2c. Seed Initial Unverified Compliance Profile for MA Fresh Launch
    db.prepare(`
      INSERT OR IGNORE INTO ma_electrical_company_compliance (
        id, tenant_id, legal_business_name, dba_name, entity_registration_status, entity_registration_source_level,
        ma_a1_business_license_number, business_license_status, business_license_expiration_date, business_license_source_level,
        master_electrician_name, master_electrician_license_number, master_electrician_license_status, master_electrician_license_expiration_date, master_electrician_source_level,
        journeyman_licenses_json, corporate_registration_status, corporate_registration_source_level,
        dba_registration_status, dba_source_level, insurance_policy_status, insurance_source_level,
        source_url, verification_timestamp, evidence_artifact_json, evidence_classification,
        can_claim_licensed_company, compliance_notes_json, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )
    `).run(
      'mcomp-fresh-launch-1',
      'tenant_ma_fresh_launch',
      'Pending Owner Confirmation',
      null,
      'unverified',
      'self_reported',
      '',
      'unverified',
      null,
      'self_reported',
      '',
      '',
      'unverified',
      null,
      'self_reported',
      '[]',
      'unverified',
      'self_reported',
      'unverified',
      'self_reported',
      'unverified',
      'self_reported',
      'https://mass.gov',
      now,
      '{}',
      'SYNTHETIC_TEST',
      0,
      JSON.stringify(['Pending owner confirmation and official-source verification']),
      now,
      now
    );

    // 3. Seed Source Records / Data Sources
    const insertDs = db.prepare(`
      INSERT OR IGNORE INTO source_records (id, tenant_id, source_type, external_id, name, category, data_payload_json, records_ingested, failed_records, health_score, status, last_sync_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertDs.run('ds-stripe', 'tenant_demo_1', 'stripe', 'acc_stripe_01', 'Stripe Payments & Billing', 'Revenue & Commerce', '{}', 4820, 0, 99, 'connected', '5 mins ago', now);
    insertDs.run('ds-hubspot', 'tenant_demo_1', 'hubspot', 'acc_hubspot_01', 'HubSpot Sales CRM', 'CRM & Sales', '{}', 3150, 4, 95, 'connected', '12 mins ago', now);
    insertDs.run('ds-googleads', 'tenant_demo_1', 'google_ads', 'acc_gads_01', 'Google Ads Manager', 'Advertising', '{}', 1240, 0, 98, 'connected', '1 hour ago', now);
    insertDs.run('ds-ga4', 'tenant_demo_1', 'ga4', 'acc_ga4_01', 'Google Analytics 4', 'Analytics', '{}', 18900, 12, 94, 'connected', '30 mins ago', now);
    insertDs.run('ds-twilio', 'tenant_demo_1', 'twilio', 'acc_twilio_01', 'Twilio SMS & Voice Relay', 'Communication', '{}', 890, 1, 97, 'connected', '2 mins ago', now);

    // 4. Seed Leads (including stale, converted, opted out, and valid active leads for Stale Lead Recovery slice)
    const insertLead = db.prepare(`
      INSERT OR IGNORE INTO leads (id, tenant_id, name, email, company, phone, pipeline_stage, estimated_value, last_interaction_at, response_delay_hours, opted_out, do_not_contact, is_converted, is_duplicate, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Stale leads needing recovery (eligible)
    insertLead.run('lead-101', 'tenant_demo_1', 'Marcus Vance', 'marcus.v@cloudscale.io', 'CloudScale Inc', '+1-555-0192', 'new_inbound', 8500, new Date(Date.now() - 35 * 86400000).toISOString(), 36, 0, 0, 0, 0, now);
    insertLead.run('lead-102', 'tenant_demo_1', 'Elena Rostova', 'elena@cyberfront.net', 'CyberFront', '+1-555-0143', 'demo_completed', 14200, new Date(Date.now() - 42 * 86400000).toISOString(), 48, 0, 0, 0, 0, now);
    insertLead.run('lead-103', 'tenant_demo_1', 'David Kim', 'dkim@nexusops.com', 'NexusOps', '+1-555-0188', 'proposal_sent', 12000, new Date(Date.now() - 50 * 86400000).toISOString(), 72, 0, 0, 0, 0, now);
    insertLead.run('lead-104', 'tenant_demo_1', 'Samantha Wright', 'swright@quantumbio.com', 'QuantumBio', '+1-555-0122', 'new_inbound', 6800, new Date(Date.now() - 28 * 86400000).toISOString(), 30, 0, 0, 0, 0, now);

    // Ineligible / Suppressed leads (test cases)
    insertLead.run('lead-105', 'tenant_demo_1', 'Robert Thorne', 'robert.t@optedout.com', 'OptOut Logistics', '+1-555-0111', 'new_inbound', 9500, new Date(Date.now() - 40 * 86400000).toISOString(), 60, 1, 0, 0, 0, now); // Opted out
    insertLead.run('lead-106', 'tenant_demo_1', 'Amanda Blake', 'amanda@converted.com', 'Converted Retail', '+1-555-0222', 'closed_won', 18000, new Date(Date.now() - 10 * 86400000).toISOString(), 2, 0, 0, 1, 0, now); // Converted
    insertLead.run('lead-107', 'tenant_demo_1', 'Invalid User', 'invalid-email-format', 'Unknown', '+1-555-0333', 'new_inbound', 3000, new Date(Date.now() - 60 * 86400000).toISOString(), 90, 0, 0, 0, 0, now); // Invalid email
    insertLead.run('lead-108', 'tenant_demo_1', 'Marcus Vance Duplicate', 'marcus.v@cloudscale.io', 'CloudScale Inc', '+1-555-0192', 'new_inbound', 8500, new Date(Date.now() - 35 * 86400000).toISOString(), 36, 0, 0, 0, 1, now); // Duplicate

    // 5. Seed Verified Opportunities
    const insertOpp = db.prepare(`
      INSERT OR IGNORE INTO opportunities (id, tenant_id, title, category, description, action_type, status, effort, risk_level, affected_records_count, estimated_monthly_value, estimated_annual_value, actual_realized_monthly_value, confidence, detected_condition, recommended_playbook, activated_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertOpp.run(
      'opp-stale-lead-recovery',
      'tenant_demo_1',
      'Stale Inbound Lead Recovery Engine',
      'Lead Recovery',
      '4 high-value inbound prospects with response delays >24 hours and inactivity >25 days. Targeted AI re-engagement sequence.',
      'email_sequence',
      'Detected',
      'Low',
      'Medium',
      4,
      10790,
      129480,
      0,
      'High',
      '4 inbound leads with estimated total pipeline of $41,500 sitting unattended over 25 days.',
      'AI Stale Lead Re-engagement Playbook',
      null,
      now
    );

    insertOpp.run(
      'opp-pricing-optimization',
      'tenant_demo_1',
      'SaaS Tiered Pricing Optimization',
      'Upsell/Cross-sell',
      '38 active customers on legacy starter tier exceeding usage limits by 240%. Auto-suggest pro upgrade.',
      'pricing_update',
      'Detected',
      'Medium',
      'High',
      38,
      14200,
      170400,
      0,
      'High',
      '38 accounts on $99/mo starter tier exceeding monthly API quota by >2x.',
      'Automated Pro Upgrade Nudge',
      null,
      now
    );

    // 6. Seed Calculation Formulas & Evidence
    db.prepare(`
      INSERT OR IGNORE INTO calculation_formulas (id, tenant_id, formula_name, formula_expression, input_variables_json, calculated_output, calculated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      'form-stale-lead-1',
      'tenant_demo_1',
      'Stale Lead Expected Value Formula',
      'expectedValue = pipelineTotal * expectedConversionRate',
      JSON.stringify({ pipelineTotal: 41500, expectedConversionRate: 0.26, conservativeRate: 0.10, upsideRate: 0.40 }),
      10790,
      now
    );

    db.prepare(`
      INSERT OR IGNORE INTO evidence_items (id, tenant_id, opportunity_id, claim, source_type, sample_size, confidence, formula_id, metadata_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'ev-stale-1',
      'tenant_demo_1',
      'opp-stale-lead-recovery',
      '4 high-value leads sitting unresponded for >25 days with total pipeline value of $41,500.',
      'HubSpot CRM + Twilio Logs',
      4,
      'High',
      'form-stale-lead-1',
      JSON.stringify({
        dataSources: ['ds-hubspot', 'ds-twilio'],
        sampleSize: 4,
        confidenceScore: 0.94,
        verifiedRecords: [
          { recordId: 'lead-101', name: 'Marcus Vance', value: '$8,500', delay: '36 hours' },
          { recordId: 'lead-102', name: 'Elena Rostova', value: '$14,200', delay: '48 hours' },
          { recordId: 'lead-103', name: 'David Kim', value: '$12,000', delay: '72 hours' },
          { recordId: 'lead-104', name: 'Samantha Wright', value: '$6,800', delay: '30 hours' }
        ]
      }),
      now
    );

    // 7. Seed Opportunity Projections
    db.prepare(`
      INSERT OR IGNORE INTO opportunity_projections (id, tenant_id, opportunity_id, conservative_value, expected_value, upside_value, assumptions_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'proj-stale-1',
      'tenant_demo_1',
      'opp-stale-lead-recovery',
      4150, // 10%
      10790, // 26%
      16600, // 40%
      JSON.stringify({
        totalPipeline: 41500,
        conservativeConversion: '10%',
        expectedConversion: '26%',
        upsideConversion: '40%'
      }),
      now
    );

    // 8. Seed Recommendation Evaluations
    db.prepare(`
      INSERT OR IGNORE INTO recommendation_evaluations (id, tenant_id, opportunity_id, opportunity_title, predicted_value, realized_value, accuracy_score, feedback_notes, learning_adjustment_applied, evaluated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'rec-eval-1',
      'tenant_demo_1',
      'opp-stale-lead-recovery',
      'Stale Inbound Lead Recovery Engine',
      10790,
      9800,
      91,
      'Historical re-engagement produced 23.6% conversion, within 2.4% of predicted 26% benchmark.',
      'Adjusted decay model multiplier from 0.85 to 0.88 for tech leads with >$10k value.',
      now
    );

    db.exec('COMMIT;');
    console.log('[SQLite Seed] Database successfully initialized and seeded with tenant_demo_1.');
  } catch (err) {
    try { db.exec('ROLLBACK;'); } catch {}
    console.error('[SQLite Seed Error]', err);
    throw err;
  }
}
