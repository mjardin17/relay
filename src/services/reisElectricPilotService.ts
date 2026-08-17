import { evidenceGraphService } from './evidenceGraphService';
import { electricalWorkflowEngine } from './electricalWorkflowEngine';
import { locationIntelligenceService } from './locationIntelligenceService';
import { getDatabase } from '../db/database';
import { LocationRecord, RelayLocationContext } from '../types/locationIntelligence';

export class ReisElectricPilotService {
  private static instance: ReisElectricPilotService;

  private constructor() {}

  public static getInstance(): ReisElectricPilotService {
    if (!ReisElectricPilotService.instance) {
      ReisElectricPilotService.instance = new ReisElectricPilotService();
    }
    return ReisElectricPilotService.instance;
  }

  /**
   * Initializes or resets the Reis Electric Pilot fixture in the tenant database
   * providing a deterministic, verifiable evidence graph from lead to payment,
   * linked with Global Location Intelligence and Jurisdiction Context.
   */
  public seedPilotScenario(tenantId: string = 'tenant_ma_fresh_launch'): {
    leadId: string;
    nodesCount: number;
    edgesCount: number;
    metrics: any;
    reconciliation: any;
    locationContext: RelayLocationContext;
    headquarters: LocationRecord;
    customerLocation: LocationRecord;
    jobLocation: LocationRecord;
  } {
    const db = getDatabase();

    // Ensure tenant exists
    db.prepare(`
      INSERT INTO tenants (id, name, industry, mrr, primary_bottleneck, environment_classification, company_maturity, engagement_model, operating_mode, verification_status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET name = excluded.name
    `).run(
      tenantId,
      'Reis Electric LLC',
      'Electrical Contractor (Commercial & Residential)',
      14500,
      'Estimating Lead Velocity & Follow-Up Capacity',
      'SIMULATED_DRY_RUN',
      'Fresh Launch',
      'Full AI Launch',
      'Guided Manual',
      'Official Master Electrician License Verified',
      new Date().toISOString()
    );

    // Ensure MA compliance profile exists
    db.prepare(`
      INSERT INTO ma_electrical_company_compliance (
        id, tenant_id, legal_business_name, dba_name, entity_registration_status,
        ma_a1_business_license_number, business_license_status, business_license_source_level,
        master_electrician_name, master_electrician_license_number, master_electrician_license_status,
        master_electrician_source_level, insurance_carrier, insurance_policy_status, insurance_expiration_date,
        source_url, can_claim_licensed_company, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(tenant_id) DO UPDATE SET
        legal_business_name = excluded.legal_business_name,
        ma_a1_business_license_number = excluded.ma_a1_business_license_number,
        master_electrician_name = excluded.master_electrician_name,
        master_electrician_license_number = excluded.master_electrician_license_number,
        business_license_status = excluded.business_license_status,
        master_electrician_license_status = excluded.master_electrician_license_status,
        insurance_carrier = excluded.insurance_carrier,
        insurance_policy_status = excluded.insurance_policy_status,
        can_claim_licensed_company = excluded.can_claim_licensed_company,
        source_url = excluded.source_url
    `).run(
      `ma_comp_${tenantId}`,
      tenantId,
      'Reis Electric LLC',
      'Reis Electric',
      'verified_active',
      '50421-A1',
      'active',
      'independently_verified',
      'Shad Reis',
      '19842-A',
      'active',
      'independently_verified',
      'Sentinel Risk Management',
      'verified',
      '2027-01-15',
      'https://mass.gov/dpl/boards/el',
      1,
      new Date().toISOString(),
      new Date().toISOString()
    );

    // Ensure Shad Reis is seeded as authorized owner actor
    db.prepare(`
      INSERT INTO actors (
        id, tenant_id, name, role, email, user_role_classification,
        is_licensed_electrician, is_master_electrician, is_licensee_of_record, is_legal_owner, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        tenant_id = excluded.tenant_id,
        user_role_classification = excluded.user_role_classification,
        is_master_electrician = excluded.is_master_electrician,
        is_legal_owner = excluded.is_legal_owner
    `).run(
      `actor_shad_reis_${tenantId}`,
      tenantId,
      'Shad Reis',
      'owner',
      'shad@reiselectric.com',
      'LEGAL_BUSINESS_OWNER',
      1,
      1,
      1,
      1,
      new Date().toISOString()
    );

    // -------------------------------------------------------------------------
    // 1. Configure Tenant Headquarters in New Bedford, MA (Pilot Tenant Data)
    // -------------------------------------------------------------------------
    const hq = locationIntelligenceService.saveLocation(tenantId, {
      id: `loc_hq_${tenantId}`,
      type: 'HEADQUARTERS',
      label: 'Reis Electric LLC Headquarters',
      streetAddress: '1184 Acushnet Ave',
      city: 'New Bedford',
      municipality: 'New Bedford',
      county: 'Bristol County',
      stateProvince: 'MA',
      postalCode: '02746',
      country: 'US',
      timezone: 'America/New_York',
      coordinates: { latitude: 41.6565, longitude: -70.9312 },
      source: 'VERIFIED_BUSINESS_PROFILE',
      verificationState: 'VERIFIED',
      verifiedAt: new Date(Date.now() - 3600000 * 240).toISOString(),
      verifiedBy: 'Shad Reis (Master Electrician)',
      evidenceRefs: ['ma_dpl_license_50421_a1', 'sec_state_corp_0014921'],
      metadata: {
        isPilotHQ: true,
        licenseBoard: 'Massachusetts Board of State Examiners of Electricians'
      }
    });

    // Configure Service Areas for Reis Electric (South Coast MA & Bristol County)
    locationIntelligenceService.saveServiceArea(tenantId, {
      id: `sa_bristol_${tenantId}`,
      name: 'Greater New Bedford & South Coast Municipalities',
      areaType: 'CITY',
      rule: 'INCLUSION',
      value: 'New Bedford, Dartmouth, Fairhaven, Acushnet, Westport, Mattapoisett, Marion',
      notes: 'Primary rapid dispatch electrical territory'
    });

    locationIntelligenceService.saveServiceArea(tenantId, {
      id: `sa_bristol_county_${tenantId}`,
      name: 'Bristol County MA Service Area',
      areaType: 'COUNTY',
      rule: 'INCLUSION',
      value: 'Bristol County',
      notes: 'General contractor electrical service region'
    });

    locationIntelligenceService.saveServiceArea(tenantId, {
      id: `sa_islands_excl_${tenantId}`,
      name: 'Offshore Islands Exclusion Zone',
      areaType: 'ZIP_CODE',
      rule: 'EXCLUSION',
      value: '02554, 02584',
      notes: 'Nantucket and Martha Vineyard ferry logistics excluded'
    });

    // -------------------------------------------------------------------------
    // 2. Configure Customer in Neighboring Municipality (Dartmouth, MA)
    // -------------------------------------------------------------------------
    const customerLocation = locationIntelligenceService.saveLocation(tenantId, {
      id: `loc_cust_${tenantId}`,
      type: 'CUSTOMER',
      label: 'Sarah Jenkins (Billing Address)',
      streetAddress: '42 Russell Mills Rd',
      city: 'Dartmouth',
      municipality: 'Dartmouth',
      county: 'Bristol County',
      stateProvince: 'MA',
      postalCode: '02748',
      country: 'US',
      timezone: 'America/New_York',
      coordinates: { latitude: 41.5732, longitude: -70.9856 },
      source: 'CUSTOMER_ADDRESS',
      verificationState: 'VERIFIED',
      verifiedAt: new Date(Date.now() - 3600000 * 72).toISOString(),
      evidenceRefs: ['lead_intake_form_98231'],
      metadata: { billingContact: 'Sarah Jenkins' }
    });

    // -------------------------------------------------------------------------
    // 3. Configure Physical Job Site in Neighboring Municipality (Fairhaven, MA)
    // -------------------------------------------------------------------------
    const jobLocation = locationIntelligenceService.saveLocation(tenantId, {
      id: `loc_job_${tenantId}`,
      type: 'JOB_SITE',
      label: 'Jenkins Coastal Residence (Job Site)',
      streetAddress: '18 Fort Street',
      city: 'Fairhaven',
      municipality: 'Fairhaven',
      county: 'Bristol County',
      stateProvince: 'MA',
      postalCode: '02719',
      country: 'US',
      timezone: 'America/New_York',
      coordinates: { latitude: 41.6362, longitude: -70.9034 },
      source: 'JOB_RECORD',
      verificationState: 'VERIFIED',
      verifiedAt: new Date(Date.now() - 3600000 * 70).toISOString(),
      evidenceRefs: ['job_work_order_842'],
      metadata: { propertyType: 'Single Family Residence', panelLocation: 'Basement East Wall' }
    });

    // -------------------------------------------------------------------------
    // 4. Resolve Dynamic Action Location Context (Scheduling & Permitting)
    // -------------------------------------------------------------------------
    const schedulingContext = locationIntelligenceService.resolveActionLocationContext({
      tenantId,
      actionType: 'SCHEDULING',
      jobLocation,
      customerLocation,
      source: 'JOB_RECORD',
      evidenceRefs: ['job_work_order_842']
    });

    const permittingContext = locationIntelligenceService.resolveActionLocationContext({
      tenantId,
      actionType: 'PERMITTING_COMPLIANCE',
      jobLocation,
      customerLocation,
      source: 'JOB_RECORD',
      evidenceRefs: ['ma_dpl_permit_app_842']
    });

    // -------------------------------------------------------------------------
    // 5. Ingest Inbound Lead & Build Verifiable Evidence Graph
    // -------------------------------------------------------------------------
    const leadId = `lead_reis_pilot_${tenantId}`;
    const contactName = 'Sarah Jenkins';
    const email = 'sjenkins.southcoast@gmail.com';
    const phone = '+1-508-555-0182';
    const serviceRequested = '200A Electrical Panel Upgrade & Level 2 EV Charger';

    db.prepare(`
      INSERT INTO leads (id, tenant_id, name, email, company, phone, pipeline_stage, estimated_value, last_interaction_at, response_delay_hours, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET name = excluded.name
    `).run(
      leadId,
      tenantId,
      contactName,
      email,
      'Jenkins Residence',
      phone,
      'proposal',
      2850,
      new Date().toISOString(),
      0.25,
      new Date().toISOString()
    );

    // Add Lead Node to Evidence Graph (Build 1)
    const leadNode = evidenceGraphService.addNode(tenantId, {
      id: leadId,
      type: 'lead',
      label: `Inbound Lead: ${contactName} (${serviceRequested})`,
      timestamp: new Date(Date.now() - 3600000 * 72).toISOString(),
      source: 'Google Business Profile (New Bedford & South Coast Area)',
      evidenceStatus: 'VERIFIED',
      actor: 'Sarah Jenkins (Inbound Prospect)',
      metadata: {
        email,
        phone,
        serviceRequested,
        customerCity: 'Dartmouth',
        jobSiteCity: 'Fairhaven',
        state: 'MA',
        propertyType: 'Residential',
        consentProvided: true,
        sourceCampaign: 'GBP_EV_UPGRADE_CAMPAIGN_SOUTHCOAST'
      },
      provenance: {
        sourceSystem: 'google_business_profile',
        rawRecordId: 'gbp_msg_98231',
        ingestedAt: new Date(Date.now() - 3600000 * 72).toISOString(),
        verificationMethod: 'sms_consent_confirmed'
      }
    });

    // Ensure authorized human actor exists for Segregation of Duties
    db.prepare(`
      INSERT INTO actors (id, tenant_id, name, email, role, user_role_classification, is_licensed_electrician, is_master_electrician, is_licensee_of_record, is_legal_owner, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET name = excluded.name, user_role_classification = excluded.user_role_classification
    `).run(
      'actor_shad_reis',
      tenantId,
      'Shad Reis',
      'shad@reselectricma.com',
      'LEGAL_BUSINESS_OWNER',
      'LEGAL_BUSINESS_OWNER',
      1,
      1,
      1,
      1,
      new Date().toISOString()
    );

    // Register primary verified connectors for Reis Electric
    db.prepare(`
      INSERT INTO connector_records (id, tenant_id, provider, capability, connector_type, configuration_state, authentication_state, execution_mode, health_status, scopes_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET health_status = excluded.health_status
    `).run(
      `conn_twilio_${tenantId}`,
      tenantId,
      'TWILIO',
      'SMS_DISPATCH',
      'REST_API',
      'CONFIGURED',
      'AUTHENTICATED',
      'DRY_RUN',
      'HEALTHY',
      JSON.stringify(['messages:send', 'messages:read']),
      new Date().toISOString(),
      new Date().toISOString()
    );

    db.prepare(`
      INSERT INTO connector_records (id, tenant_id, provider, capability, connector_type, configuration_state, authentication_state, execution_mode, health_status, scopes_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET health_status = excluded.health_status
    `).run(
      `conn_gbp_${tenantId}`,
      tenantId,
      'GOOGLE_BUSINESS_PROFILE',
      'POST_PUBLISH',
      'OAUTH2',
      'CONFIGURED',
      'AUTHENTICATED',
      'DRY_RUN',
      'HEALTHY',
      JSON.stringify(['https://www.googleapis.com/auth/business.manage']),
      new Date().toISOString(),
      new Date().toISOString()
    );

    // Seed production pilot lead intake record
    db.prepare(`
      INSERT INTO pilot_lead_intake (
        lead_id, tenant_id, source, source_type, source_evidence_json, received_at,
        normalized_contact_json, service_requested, property_type, data_environment,
        consent_state, location_evidence_json, deduplication_fingerprint, duplicate_status,
        identity_resolution_json, qualification_status, lifecycle_status, estimated_value, audit_ref, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(lead_id) DO UPDATE SET lifecycle_status = excluded.lifecycle_status
    `).run(
      leadId,
      tenantId,
      'Google Business Profile (New Bedford)',
      'AUTHENTICATED_CONNECTOR',
      JSON.stringify({ providerLeadId: 'gbp_msg_98231', channel: 'GBP_MESSAGING', capturedAt: new Date(Date.now() - 3600000 * 72).toISOString() }),
      new Date(Date.now() - 3600000 * 72).toISOString(),
      JSON.stringify({ fullName: contactName, email, phone, municipality: 'Dartmouth', stateProvince: 'MA', postalCode: '02748', country: 'US' }),
      serviceRequested,
      'Residential',
      'PILOT',
      'OPTED_IN',
      JSON.stringify({ locationId: customerLocation.id, serviceAreaStatus: 'IN_SERVICE_AREA', municipality: 'Dartmouth', stateProvince: 'MA' }),
      'fp_sarah_jenkins_pilot_001',
      'NEW',
      JSON.stringify({ result: 'NEW_PROSPECT', confidence: 1.0, supportingEvidence: ['First inbound inquiry from Sarah Jenkins'] }),
      'QUALIFIED',
      'ATTRIBUTION_CONFIRMED',
      2850,
      `audit_${leadId}`,
      new Date(Date.now() - 3600000 * 72).toISOString(),
      new Date().toISOString()
    );

    // Initialize Tenant Pilot State
    db.prepare(`
      INSERT INTO tenant_pilot_states (tenant_id, current_state, activated_at, activated_by, activation_evidence_refs_json, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(tenant_id) DO UPDATE SET current_state = excluded.current_state
    `).run(
      tenantId,
      'PILOT_READY',
      null,
      null,
      JSON.stringify(['ma_comp_license_verified', 'conn_twilio_verified']),
      'Reis Electric pilot configured and ready for human operator activation.',
      new Date().toISOString(),
      new Date().toISOString()
    );

    // Add Consent Node
    const consentNodeId = `consent_${leadId}`;
    evidenceGraphService.addNode(tenantId, {
      id: consentNodeId,
      type: 'consent_evidence',
      label: 'Explicit Communication Consent (SMS/Email)',
      timestamp: new Date(Date.now() - 3600000 * 72).toISOString(),
      source: 'GBP Inquiry Form',
      evidenceStatus: 'VERIFIED',
      actor: 'Sarah Jenkins',
      metadata: {
        disclosureVersion: 'v1.0-2026',
        ipAddress: '198.51.100.45',
        optInMethod: 'explicit_checkbox'
      },
      provenance: {
        sourceSystem: 'inbound_web_form',
        ingestedAt: new Date(Date.now() - 3600000 * 72).toISOString(),
        verificationMethod: 'sha256_audit_record'
      }
    });

    evidenceGraphService.addEdge(tenantId, {
      sourceNodeId: leadId,
      targetNodeId: consentNodeId,
      edgeType: 'ORIGINATED_FROM',
      confidence: 1.0,
      weight: 1.0
    });

    // Link Locations into Evidence Graph
    locationIntelligenceService.linkLocationToEntity(tenantId, customerLocation.id, leadId, 'LOCATED_AT');
    locationIntelligenceService.linkLocationToEntity(tenantId, jobLocation.id, leadId, 'LOCATED_AT');

    // 6. Add AI Qualification & Human Approval Gate (Build 2)
    const approvalId = `appr_${leadId}`;
    evidenceGraphService.addNode(tenantId, {
      id: approvalId,
      type: 'approval',
      label: 'Human Approval: Shad Reis (Licensee of Record)',
      timestamp: new Date(Date.now() - 3600000 * 70).toISOString(),
      source: 'Relay Authorization Center',
      evidenceStatus: 'VERIFIED',
      actor: 'Shad Reis (Master Electrician #19842-A)',
      metadata: {
        role: 'Master Electrician & Owner',
        decision: 'approved',
        jobSiteMunicipality: 'Fairhaven',
        governingJurisdiction: permittingContext.jurisdiction?.governingCodeStandard,
        contentHash: 'a7f9b8c2d1e4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abc'
      },
      provenance: {
        sourceSystem: 'relay_human_gate',
        ingestedAt: new Date(Date.now() - 3600000 * 70).toISOString(),
        verificationMethod: 'owner_session_signature'
      }
    });

    evidenceGraphService.addEdge(tenantId, {
      sourceNodeId: leadId,
      targetNodeId: approvalId,
      edgeType: 'APPROVED_BY',
      confidence: 1.0,
      weight: 1.0
    });

    // 7. Add Execution Evidence (Build 2)
    const exec = evidenceGraphService.recordExecutionEvidence(tenantId, {
      actor: 'Aria Electrical Growth Agent (Supervised by Shad Reis)',
      agentName: 'Aria',
      triggeringLeadOrOpportunityId: leadId,
      actionType: 'sms_dispatch_and_estimate_link',
      executionMode: 'EXECUTED',
      approvalState: 'APPROVED',
      approvalId,
      consentEvidenceRef: consentNodeId,
      inputData: {
        leadName: contactName,
        serviceRequested,
        jobLocation: '18 Fort Street, Fairhaven, MA 02719',
        draftText: `Hi Sarah, this is Shad with Reis Electric. We received your request regarding the 200A panel upgrade and EV charger for your property in Fairhaven. We would love to provide an on-site estimate tomorrow morning. Click here to confirm: https://reselectric.com/estimate`
      },
      outputData: {
        messageId: 'sms_out_918237',
        carrierStatus: 'DELIVERED',
        deliveryTimestamp: new Date(Date.now() - 3600000 * 69).toISOString()
      },
      targetSystemOrChannel: 'Twilio SMS Provider (MA South Coast)',
      connectorType: 'twilio_sms',
      connectorAuthStatus: 'LIVE_AUTHENTICATED',
      resultStatus: 'SUCCESS',
      metadata: {
        deliveryReport: 'DELIVERED_TO_HANDSET',
        carrierNetwork: 'Verizon Wireless',
        locationContextHash: schedulingContext.auditHash
      }
    });

    // 8. Structured Outcomes Progression (Build 3)
    evidenceGraphService.recordStageOutcome(tenantId, {
      stage: 'qualified',
      relatedLeadId: leadId,
      actorOrSource: 'Aria & Shad Reis',
      evidenceType: 'CRM_STATUS_CHANGE',
      confidence: 1.0,
      pipelineValue: 2850,
      notes: 'Qualified: Residential single-family home in Fairhaven requiring 200A service upgrade + Tesla Universal Wall Connector.'
    });

    evidenceGraphService.recordStageOutcome(tenantId, {
      stage: 'estimate_scheduled',
      relatedLeadId: leadId,
      actorOrSource: 'Relay Dispatch Calendar',
      evidenceType: 'DISPATCH_RECORD',
      confidence: 1.0,
      pipelineValue: 2850,
      notes: 'On-site estimate booked for Shad Reis at 10:00 AM at 18 Fort Street, Fairhaven.'
    });

    const bookingOutcome = evidenceGraphService.recordStageOutcome(tenantId, {
      stage: 'job_booked',
      relatedLeadId: leadId,
      actorOrSource: 'Shad Reis (Signed Contract)',
      evidenceType: 'CUSTOMER_CONFIRMATION',
      confidence: 1.0,
      bookedValue: 2850,
      pipelineValue: 2850,
      notes: 'Customer signed contract for $2,850 (Materials: $920, Fairhaven Wiring Permit: $180, Labor: $1,750).'
    });

    evidenceGraphService.recordStageOutcome(tenantId, {
      stage: 'job_completed',
      relatedLeadId: leadId,
      actorOrSource: 'Reis Electric Field Crew',
      evidenceType: 'DISPATCH_RECORD',
      confidence: 1.0,
      bookedValue: 2850,
      notes: '200A panel installed at Fairhaven job site, Eversource utility inspection passed, Town of Fairhaven wire inspector signed off.'
    });

    evidenceGraphService.recordStageOutcome(tenantId, {
      stage: 'invoice_issued',
      relatedLeadId: leadId,
      actorOrSource: 'QuickBooks Online / Relay Accounting',
      evidenceType: 'INVOICE_RECEIPT',
      confidence: 1.0,
      invoicedValue: 2850,
      supportingEvidenceRefs: ['INV-2026-0842'],
      notes: 'Invoice #INV-2026-0842 sent to customer.'
    });

    const paymentOutcome = evidenceGraphService.recordStageOutcome(tenantId, {
      stage: 'payment_received',
      relatedLeadId: leadId,
      actorOrSource: 'Stripe / Bank Merchant Deposit',
      evidenceType: 'VERIFIED_PAYMENT',
      evidenceStatus: 'VERIFIED',
      confidence: 1.0,
      collectedRevenue: 2850,
      supportingEvidenceRefs: ['ch_3Pz79xLkdIw45B01', 'dep_982310'],
      notes: 'Full payment of $2,850 deposited into Reis Electric operating account.'
    });

    // 9. Evaluate Attribution (Build 4 & 5)
    evidenceGraphService.evaluateAttribution(
      tenantId,
      leadId,
      paymentOutcome.id,
      { isPreExistingCustomer: false }
    );

    // 10. Calculate ROI & Reconciliation (Build 6 & 8)
    const metrics = evidenceGraphService.calculateDefensibleROI(tenantId);
    const reconciliation = evidenceGraphService.reconcileTenantOutcomes(tenantId);
    const graph = evidenceGraphService.getGraph(tenantId);

    // 11. Seed Pilot Lead Intake & Timeline Records for Relay v2.0
    db.prepare(`
      INSERT INTO pilot_lead_intake (
        lead_id, tenant_id, source, source_type, source_evidence_json, received_at,
        normalized_contact_json, service_requested, property_type, data_environment,
        consent_state, consent_evidence_ref, location_evidence_json, deduplication_fingerprint,
        duplicate_status, duplicate_details_json, identity_resolution_json, qualification_status,
        lifecycle_status, estimated_value, audit_ref, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(lead_id) DO UPDATE SET
        service_requested = excluded.service_requested,
        estimated_value = excluded.estimated_value
    `).run(
      leadId,
      tenantId,
      'Google Business Profile (New Bedford & South Coast Area)',
      'AUTHENTICATED_CONNECTOR',
      JSON.stringify({ rawPayload: { campaign: 'GBP_EV_UPGRADE_CAMPAIGN_SOUTHCOAST' }, providerLeadId: 'gbp_msg_98231' }),
      new Date(Date.now() - 3600000 * 72).toISOString(),
      JSON.stringify({
        fullName: contactName,
        firstName: 'Sarah',
        lastName: 'Jenkins',
        email,
        phone,
        streetAddress: '42 Russell Mills Rd',
        municipality: 'Dartmouth',
        stateProvince: 'MA',
        postalCode: '02748',
        country: 'US'
      }),
      serviceRequested,
      'Residential',
      'PILOT',
      'OPTED_IN',
      consentNodeId,
      JSON.stringify({
        locationId: customerLocation.id,
        serviceAreaStatus: 'IN_SERVICE_AREA',
        municipality: 'Dartmouth',
        stateProvince: 'MA'
      }),
      'fingerprint_sarah_jenkins_pilot',
      'NEW',
      '{}',
      JSON.stringify({
        tenantId,
        leadId,
        result: 'NEW_PROSPECT',
        confidence: 1.0,
        supportingEvidence: ['First-time inbound contact from Google Business Profile'],
        conflictingEvidence: [],
        resolvedAt: new Date(Date.now() - 3600000 * 72).toISOString()
      }),
      'QUALIFIED',
      'LEAD_RECEIVED',
      2850,
      `audit_seed_${leadId}`,
      new Date().toISOString(),
      new Date().toISOString()
    );

    db.prepare(`
      INSERT INTO pilot_timeline_events (
        id, tenant_id, lead_id, timestamp, stage, title, description,
        actor_or_source, evidence_ref, audit_ref, data_environment, metadata_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO NOTHING
    `).run(
      `tl_seed_${leadId}`,
      tenantId,
      leadId,
      new Date(Date.now() - 3600000 * 72).toISOString(),
      'LEAD_RECEIVED',
      'Inbound Lead Ingested via GBP',
      'Sarah Jenkins requested 200A panel upgrade & Level 2 EV Charger in Fairhaven, MA',
      'Google Business Profile Connector',
      consentNodeId,
      `audit_tl_seed_${leadId}`,
      'PILOT',
      JSON.stringify({ service: serviceRequested }),
      new Date(Date.now() - 3600000 * 72).toISOString()
    );

    db.prepare(`
      INSERT INTO tenant_pilot_states (
        tenant_id, current_state, activated_at, activated_by,
        activation_evidence_refs_json, notes, created_at, updated_at
      ) VALUES (?, 'PILOT_READY', NULL, NULL, '[]', 'Verified MA compliance and connectors ready for pilot activation', ?, ?)
      ON CONFLICT(tenant_id) DO UPDATE SET current_state = excluded.current_state
    `).run(
      tenantId,
      new Date().toISOString(),
      new Date().toISOString()
    );

    return {
      leadId,
      nodesCount: graph.nodes.length,
      edgesCount: graph.edges.length,
      metrics,
      reconciliation,
      locationContext: schedulingContext,
      headquarters: hq,
      customerLocation,
      jobLocation
    };
  }

  /**
   * Seeds a second synthetic tenant outside Massachusetts (Phoenix, Arizona)
   * to prove global location independence, timezone handling (America/Phoenix, no DST),
   * and strict tenant isolation.
   */
  public seedSecondTenantScenario(tenantId: string = 'tenant_desert_comfort_az'): {
    leadId: string;
    tenantId: string;
    locationContext: RelayLocationContext;
    headquarters: LocationRecord;
    jobLocation: LocationRecord;
  } {
    const db = getDatabase();

    db.prepare(`
      INSERT INTO tenants (id, name, industry, mrr, primary_bottleneck, environment_classification, company_maturity, engagement_model, operating_mode, verification_status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET name = excluded.name
    `).run(
      tenantId,
      'Desert Comfort HVAC LLC',
      'HVAC & Climate Solutions',
      24000,
      'Peak Summer Emergency Call Response',
      'SIMULATED_DRY_RUN',
      'Established Demo',
      'Full AI Launch',
      'Guided Manual',
      'Arizona ROC License #329184 Verified',
      new Date().toISOString()
    );

    // 1. Headquarters in Phoenix, AZ
    const hq = locationIntelligenceService.saveLocation(tenantId, {
      id: `loc_hq_${tenantId}`,
      type: 'HEADQUARTERS',
      label: 'Desert Comfort HVAC Headquarters',
      streetAddress: '2401 E Camelback Rd',
      city: 'Phoenix',
      municipality: 'Phoenix',
      county: 'Maricopa County',
      stateProvince: 'AZ',
      postalCode: '85016',
      country: 'US',
      timezone: 'America/Phoenix',
      coordinates: { latitude: 33.5092, longitude: -112.0298 },
      source: 'VERIFIED_BUSINESS_PROFILE',
      verificationState: 'VERIFIED',
      verifiedAt: new Date().toISOString(),
      verifiedBy: 'Marcus Vance (ROC Qualifying Party)',
      evidenceRefs: ['az_roc_lic_329184'],
      metadata: { licenseBoard: 'Arizona Registrar of Contractors' }
    });

    // 2. Service Areas: Valley of the Sun (Maricopa County)
    locationIntelligenceService.saveServiceArea(tenantId, {
      id: `sa_maricopa_${tenantId}`,
      name: 'Greater Phoenix Metro & East Valley',
      areaType: 'CITY',
      rule: 'INCLUSION',
      value: 'Phoenix, Scottsdale, Tempe, Mesa, Chandler, Gilbert, Paradise Valley',
      notes: 'Valley-wide HVAC service coverage'
    });

    // 3. Customer & Job Site in Scottsdale, AZ
    const jobLocation = locationIntelligenceService.saveLocation(tenantId, {
      id: `loc_job_${tenantId}`,
      type: 'JOB_SITE',
      label: 'Scottsdale Luxury Villa AC Replacement',
      streetAddress: '7412 E Indian School Rd',
      city: 'Scottsdale',
      municipality: 'Scottsdale',
      county: 'Maricopa County',
      stateProvince: 'AZ',
      postalCode: '85251',
      country: 'US',
      timezone: 'America/Phoenix',
      coordinates: { latitude: 33.4942, longitude: -111.9261 },
      source: 'JOB_RECORD',
      verificationState: 'VERIFIED',
      evidenceRefs: ['hvac_contract_az_912']
    });

    // 4. Resolve Context
    const locationContext = locationIntelligenceService.resolveActionLocationContext({
      tenantId,
      actionType: 'SCHEDULING',
      jobLocation,
      source: 'JOB_RECORD'
    });

    const leadId = `lead_desert_${tenantId}`;
    db.prepare(`
      INSERT INTO leads (id, tenant_id, name, email, company, phone, pipeline_stage, estimated_value, last_interaction_at, response_delay_hours, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET name = excluded.name
    `).run(
      leadId,
      tenantId,
      'David Miller',
      'dmiller.az@gmail.com',
      'Scottsdale Residence',
      '+1-480-555-0199',
      'closed_won',
      6400,
      new Date().toISOString(),
      0.1,
      new Date().toISOString()
    );

    return {
      leadId,
      tenantId,
      locationContext,
      headquarters: hq,
      jobLocation
    };
  }
}

export const reisElectricPilotService = ReisElectricPilotService.getInstance();
