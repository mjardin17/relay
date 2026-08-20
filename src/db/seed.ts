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

    // 9. Seed Initial Connector Records (Truthful states)
    const insertConnector = db.prepare(`
      INSERT OR IGNORE INTO connector_records (
        id, tenant_id, provider, capability, connector_type, configuration_state,
        authentication_state, execution_mode, health_status, permissions_json,
        scopes_json, evidence_refs_json, metadata_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '[]', ?, ?, ?)
    `);

    insertConnector.run(
      'conn_reis_maps',
      'tenant_ma_fresh_launch',
      'GOOGLE_MAPS',
      'GEOCODING',
      'LOCAL_FIXTURE',
      'CONFIGURED',
      'AUTHENTICATED',
      'DRY_RUN',
      'HEALTHY',
      JSON.stringify(['geocoding:read']),
      JSON.stringify(['https://maps.googleapis.com/maps/api/geocode']),
      JSON.stringify({ providerName: 'Local Deterministic Geocoder & Fallback' }),
      now,
      now
    );

    insertConnector.run(
      'conn_reis_gbp',
      'tenant_ma_fresh_launch',
      'GOOGLE_GBP',
      'GBP_MANAGEMENT',
      'OFFICIAL_API',
      'UNCONFIGURED',
      'NOT_APPLICABLE',
      'DRY_RUN',
      'UNKNOWN',
      JSON.stringify(['businessinformation:manage', 'posts:write']),
      JSON.stringify(['https://www.googleapis.com/auth/business.manage']),
      JSON.stringify({ notes: 'Pending owner OAuth connection' }),
      now,
      now
    );

    insertConnector.run(
      'conn_reis_sms',
      'tenant_ma_fresh_launch',
      'TWILIO_SMS',
      'CUSTOMER_DISPATCH',
      'OFFICIAL_API',
      'UNCONFIGURED',
      'NOT_APPLICABLE',
      'DRY_RUN',
      'UNKNOWN',
      JSON.stringify(['messages:create']),
      JSON.stringify(['sms:outbound']),
      JSON.stringify({ notes: 'Simulated fail-closed DRY_RUN active' }),
      now,
      now
    );

    // 10. Seed Tenant Business Profiles
    const insertBusinessProfile = db.prepare(`
      INSERT OR IGNORE INTO tenant_business_profiles (
        tenant_id, legal_name, dba_name, industry, website_url, phone, email,
        street_address, city, state_province, postal_code, country,
        business_hours_json, service_areas_json, products_and_services_json,
        business_goals_json, communication_preferences_json, publishing_preferences_json,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const standardHours = JSON.stringify([
      { day: 'Monday', open: '08:00', close: '17:00', isClosed: false },
      { day: 'Tuesday', open: '08:00', close: '17:00', isClosed: false },
      { day: 'Wednesday', open: '08:00', close: '17:00', isClosed: false },
      { day: 'Thursday', open: '08:00', close: '17:00', isClosed: false },
      { day: 'Friday', open: '08:00', close: '17:00', isClosed: false },
      { day: 'Saturday', open: '09:00', close: '14:00', isClosed: false },
      { day: 'Sunday', open: '00:00', close: '00:00', isClosed: true }
    ]);

    insertBusinessProfile.run(
      'tenant_demo_1',
      'Apex Horizon Technologies LLC',
      'Apex Horizon',
      'B2B SaaS & Enterprise AI',
      'https://apexhorizon.com',
      '+1 (555) 234-5678',
      'ops@apexhorizon.com',
      '100 Innovation Way, Suite 400',
      'Boston',
      'MA',
      '02110',
      'US',
      standardHours,
      JSON.stringify(['Greater Boston Area', 'New England', 'National Remote']),
      JSON.stringify([
        { id: 'prod_1', name: 'Enterprise Workflow Engine', category: 'Software', priceRange: '$10,000 - $50,000', status: 'ACTIVE' },
        { id: 'prod_2', name: 'AI Decision Copilot', category: 'Software', priceRange: '$2,500/mo', status: 'ACTIVE' },
        { id: 'prod_3', name: 'Integration Migration Assessment', category: 'Services', priceRange: '$5,000 fixed', status: 'ACTIVE' }
      ]),
      JSON.stringify([
        { goal: 'Accelerate lead response time to under 5 minutes', targetMetric: '< 5 min', status: 'IN_PROGRESS' },
        { goal: 'Recover 20% of dormant high-value pipeline', targetMetric: '$45,000 MRR', status: 'ON_TRACK' },
        { goal: 'Maintain 100% verified regulatory audit ledger', targetMetric: 'Zero audit discrepancies', status: 'MET' }
      ]),
      JSON.stringify({
        channel: 'EMAIL_AND_DASHBOARD',
        requireApprovalForOutbound: true,
        tone: 'DIRECT_PROFESSIONAL',
        escalationContact: 'admin@apexhorizon.com'
      }),
      JSON.stringify({
        autoPublishApprovedPosts: false,
        proofOfWorkWatermark: true,
        requireTwoPersonIntegrity: true
      }),
      now,
      now
    );

    insertBusinessProfile.run(
      'tenant_ma_fresh_launch',
      'Fresh Launch MA Electrical Company Inc.',
      'MA Electrical Pros',
      'Electrical Contracting',
      'https://ma-electrical-demo.relay.local',
      '+1 (508) 555-0199',
      'service@ma-electrical-demo.relay.local',
      '42 Circuit Lane',
      'New Bedford',
      'MA',
      '02740',
      'US',
      standardHours,
      JSON.stringify(['New Bedford', 'Dartmouth', 'Fairhaven', 'Fall River', 'Bristol County']),
      JSON.stringify([
        { id: 'prod_elec_1', name: '200A Electrical Panel Upgrade', category: 'Residential', priceRange: '$3,200 - $4,800', status: 'ACTIVE' },
        { id: 'prod_elec_2', name: 'EV Charger Level 2 Installation', category: 'Residential', priceRange: '$950 - $1,800', status: 'ACTIVE' },
        { id: 'prod_elec_3', name: 'Commercial Wiring & Code Inspection', category: 'Commercial', priceRange: '$1,500 - $8,000', status: 'ACTIVE' }
      ]),
      JSON.stringify([
        { goal: 'Complete Massachusetts A-1 license verification', targetMetric: 'State verification confirmed', status: 'PENDING_EVIDENCE' },
        { goal: 'Automate qualified residential lead triage', targetMetric: '100% human-approved response', status: 'IN_PROGRESS' },
        { goal: 'Launch Google Business Profile local presence', targetMetric: 'Owner OAuth authorization verified', status: 'IN_PROGRESS' }
      ]),
      JSON.stringify({
        channel: 'SMS_AND_EMAIL',
        requireApprovalForOutbound: true,
        tone: 'HELPFUL_CONTRACTOR',
        escalationContact: 'operator@relay.ai'
      }),
      JSON.stringify({
        autoPublishApprovedPosts: false,
        proofOfWorkWatermark: true,
        requireTwoPersonIntegrity: true
      }),
      now,
      now
    );

    // 11. Seed Tenant AI Workers
    const insertWorkerConfig = db.prepare(`
      INSERT OR IGNORE INTO tenant_worker_configs (
        id, tenant_id, worker_id, worker_name, role_description, is_enabled,
        execution_mode, assigned_permissions_json, approval_requirement,
        schedule_or_trigger, capability_status, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const standardWorkers = [
      {
        id: 'aria_executive',
        name: 'Aria — Autonomous Operations Orchestrator',
        desc: 'Executive triage, cross-agent coordination, and bottleneck prioritization.',
        perms: ['universal_actions:propose', 'opportunities:analyze', 'reports:generate'],
        appr: 'REQUIRE_APPROVAL_HIGH_IMPACT',
        trigger: 'Continuous Event Stream & Manual Trigger',
        capability: 'ACTIVE'
      },
      {
        id: 'lead_triage_agent',
        name: 'Lead Triage & Qualification Agent',
        desc: 'Evaluates incoming leads, scores qualification, checks service area eligibility, and drafts governed responses.',
        perms: ['leads:read', 'leads:score', 'communications:draft'],
        appr: 'REQUIRE_APPROVAL_ALL_ACTIONS',
        trigger: 'Inbound Webhook & Form Submissions',
        capability: 'ACTIVE'
      },
      {
        id: 'growth_recovery_agent',
        name: 'Revenue Growth & Stale Lead Recovery Agent',
        desc: 'Discovers reactivation opportunities, scans CRM for dormant value, and computes defensible ROI models.',
        perms: ['opportunities:discover', 'roi:compute', 'campaigns:draft'],
        appr: 'REQUIRE_APPROVAL_ALL_ACTIONS',
        trigger: 'Daily Nightly Scan',
        capability: 'ACTIVE'
      },
      {
        id: 'compliance_officer_agent',
        name: 'Compliance & Verification Officer',
        desc: 'Validates jurisdictional licensing, inspects consent evidence, checks SoD rules, and audits hash-chains.',
        perms: ['compliance:audit', 'evidence:verify', 'ledger:inspect'],
        appr: 'INDEPENDENT_AUDITOR_ONLY',
        trigger: 'Pre-Execution Hook & Periodic Ledger Check',
        capability: 'ACTIVE'
      },
      {
        id: 'creative_studio_agent',
        name: 'StoryForge & Content Studio Agent',
        desc: 'Drafts brand-aligned marketing posts, case studies, and local GBP updates with strict anti-hallucination guardrails.',
        perms: ['content:draft', 'brand:read', 'proof:assemble'],
        appr: 'REQUIRE_APPROVAL_ALL_ACTIONS',
        trigger: 'Content Calendar & Manual Request',
        capability: 'ACTIVE'
      },
      {
        id: 'website_presence_agent',
        name: 'Web Presence & Reputation Agent',
        desc: 'Maintains verified proof of work showcases, monitors reviews, and drafts responses with human sign-off.',
        perms: ['website:recommend', 'reviews:draft', 'gbp:propose'],
        appr: 'REQUIRE_APPROVAL_ALL_ACTIONS',
        trigger: 'Review Ingestion & Proof of Work Sync',
        capability: 'ACTIVE'
      }
    ];

    for (const tId of ['tenant_demo_1', 'tenant_demo_2', 'tenant_ma_fresh_launch']) {
      for (const w of standardWorkers) {
        insertWorkerConfig.run(
          `${tId}_${w.id}`,
          tId,
          w.id,
          w.name,
          w.desc,
          1,
          'DRY_RUN',
          JSON.stringify(w.perms),
          w.appr,
          w.trigger,
          w.capability,
          now
        );
      }
    }

    db.exec('COMMIT;');
    console.log('[SQLite Seed] Database successfully initialized and seeded with tenant_demo_1.');
  } catch (err) {
    try { db.exec('ROLLBACK;'); } catch {}
    console.error('[SQLite Seed Error]', err);
    throw err;
  }
}
