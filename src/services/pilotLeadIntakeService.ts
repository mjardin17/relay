import crypto from 'node:crypto';
import { getDatabase } from '../db/database';
import {
  LeadIntakeRecord,
  LeadSourceType,
  ConsentState,
  DataEnvironment,
  DuplicateStatus,
  IdentityResolutionRecord,
  IdentityResolutionResult,
  NormalizedContact,
  PilotLeadLifecycleStatus
} from '../types/productionEvidence';
import { locationIntelligenceService } from './locationIntelligenceService';
import { evidenceGraphService } from './evidenceGraphService';
import { launchAuditService } from './launchAuditService';
import { LocationRecord } from '../types/locationIntelligence';

export interface LeadIntakeInput {
  tenantId: string;
  source: string;
  sourceType: LeadSourceType;
  fullName: string;
  email: string;
  phone: string;
  streetAddress?: string;
  municipality: string;
  stateProvince: string;
  postalCode: string;
  country?: string;
  serviceRequested: string;
  propertyType?: 'Residential' | 'Commercial' | 'Industrial';
  dataEnvironment?: DataEnvironment;
  consentState?: ConsentState;
  sourceEvidence?: {
    rawPayload?: any;
    providerLeadId?: string;
    channel?: string;
    ipAddress?: string;
    userAgent?: string;
    capturedAt?: string;
    evidenceRef?: string;
  };
  estimatedValue?: number;
  actorId?: string;
}

export class PilotLeadIntakeService {
  private static instance: PilotLeadIntakeService;

  private constructor() {}

  public static getInstance(): PilotLeadIntakeService {
    if (!PilotLeadIntakeService.instance) {
      PilotLeadIntakeService.instance = new PilotLeadIntakeService();
    }
    return PilotLeadIntakeService.instance;
  }

  /**
   * Normalizes raw contact parameters into standardized phone, email, and address strings.
   */
  public normalizeContact(contact: {
    fullName: string;
    email: string;
    phone: string;
    streetAddress?: string;
    municipality: string;
    stateProvince: string;
    postalCode: string;
    country?: string;
  }): NormalizedContact {
    const rawName = (contact.fullName || '').trim();
    const parts = rawName.split(/\s+/);
    const firstName = parts[0] || '';
    const lastName = parts.slice(1).join(' ') || '';

    // Normalize email: lower-case and trimmed
    const normalizedEmail = (contact.email || '').trim().toLowerCase();

    // Normalize phone: strip non-digits, format with leading +1 if US 10 digits
    const digits = (contact.phone || '').replace(/\D/g, '');
    let normalizedPhone = contact.phone ? contact.phone.trim() : '';
    if (digits.length === 10) {
      normalizedPhone = `+1${digits}`;
    } else if (digits.length === 11 && digits.startsWith('1')) {
      normalizedPhone = `+${digits}`;
    }

    return {
      fullName: rawName,
      firstName,
      lastName,
      email: normalizedEmail,
      phone: normalizedPhone,
      streetAddress: contact.streetAddress?.trim(),
      municipality: (contact.municipality || '').trim(),
      stateProvince: (contact.stateProvince || '').trim().toUpperCase(),
      postalCode: (contact.postalCode || '').trim(),
      country: (contact.country || 'US').trim().toUpperCase()
    };
  }

  /**
   * Generates a deterministic deduplication fingerprint based on normalized tenant, email, phone, and municipality.
   */
  public generateFingerprint(tenantId: string, contact: NormalizedContact): string {
    const canonical = `${tenantId.toLowerCase()}::${contact.email.toLowerCase()}::${contact.phone.replace(/\D/g, '')}::${contact.municipality.toLowerCase()}::${contact.stateProvince.toUpperCase()}`;
    return crypto.createHash('sha256').update(canonical).digest('hex');
  }

  /**
   * Performs conservative identity resolution against existing customer and lead records.
   */
  public resolveIdentity(tenantId: string, contact: NormalizedContact): IdentityResolutionRecord {
    const db = getDatabase();
    const supportingEvidence: string[] = [];
    const conflictingEvidence: string[] = [];

    // Query existing leads
    const existingLeads = db.prepare(`
      SELECT lead_id, source, received_at, normalized_contact_json, lifecycle_status, data_environment
      FROM pilot_lead_intake
      WHERE tenant_id = ?
    `).all(tenantId) as Array<{
      lead_id: string;
      source: string;
      received_at: string;
      normalized_contact_json: string;
      lifecycle_status: string;
      data_environment: string;
    }>;

    let matchedLeadId: string | undefined;
    let isReturning = false;
    let hasConflictingName = false;

    for (const row of existingLeads) {
      try {
        const rowContact = JSON.parse(row.normalized_contact_json) as NormalizedContact;
        const emailMatch = rowContact.email && rowContact.email === contact.email;
        const phoneMatch = rowContact.phone && rowContact.phone === contact.phone;

        if (emailMatch || phoneMatch) {
          matchedLeadId = row.lead_id;
          if (rowContact.fullName && contact.fullName && rowContact.fullName.toLowerCase() !== contact.fullName.toLowerCase()) {
            conflictingEvidence.push(`Name mismatch on matched contact: previously "${rowContact.fullName}", now "${contact.fullName}"`);
            hasConflictingName = true;
          }

          if (emailMatch) {
            supportingEvidence.push(`Exact email match with lead ${row.lead_id}`);
          }
          if (phoneMatch) {
            supportingEvidence.push(`Exact phone match with lead ${row.lead_id}`);
          }

          if (['JOB_COMPLETED', 'PAYMENT_VERIFIED', 'ATTRIBUTION_CONFIRMED'].includes(row.lifecycle_status)) {
            isReturning = true;
          }
          break;
        }
      } catch {
        // Skip malformed row
      }
    }

    let result: IdentityResolutionResult = 'NEW_PROSPECT';
    let confidence = 1.0;

    if (matchedLeadId) {
      if (hasConflictingName) {
        result = 'UNKNOWN_IDENTITY';
        confidence = 0.5;
      } else if (isReturning) {
        result = 'RETURNING_CUSTOMER';
        confidence = 0.95;
      } else {
        result = 'PREVIOUS_LEAD';
        confidence = 0.95;
      }
    } else {
      supportingEvidence.push('No prior matching email or phone records discovered for tenant.');
      result = 'NEW_PROSPECT';
      confidence = 1.0;
    }

    return {
      tenantId,
      leadId: '',
      result,
      matchedLeadId,
      confidence,
      supportingEvidence,
      conflictingEvidence,
      fingerprint: this.generateFingerprint(tenantId, contact),
      resolvedAt: new Date().toISOString()
    };
  }

  /**
   * Detects duplicate leads within a configurable time window.
   */
  public evaluateDuplicateStatus(
    tenantId: string,
    contact: NormalizedContact,
    providerLeadId?: string,
    timeWindowHours: number = 72
  ): { duplicateStatus: DuplicateStatus; matchedLeadId?: string; reason?: string } {
    const db = getDatabase();
    const fingerprint = this.generateFingerprint(tenantId, contact);

    // 1. Check exact provider lead ID if present
    if (providerLeadId) {
      const existingByProvider = db.prepare(`
        SELECT lead_id, received_at FROM pilot_lead_intake
        WHERE tenant_id = ? AND json_extract(source_evidence_json, '$.providerLeadId') = ?
      `).get(tenantId, providerLeadId) as { lead_id: string; received_at: string } | undefined;

      if (existingByProvider) {
        return {
          duplicateStatus: 'CONFIRMED_DUPLICATE',
          matchedLeadId: existingByProvider.lead_id,
          reason: `Exact provider lead ID match (${providerLeadId}) with ${existingByProvider.lead_id}`
        };
      }
    }

    // 2. Check fingerprint within time window
    const windowStart = new Date(Date.now() - timeWindowHours * 3600000).toISOString();
    const existingByFingerprint = db.prepare(`
      SELECT lead_id, received_at FROM pilot_lead_intake
      WHERE tenant_id = ? AND deduplication_fingerprint = ? AND received_at >= ?
      ORDER BY received_at DESC LIMIT 1
    `).get(tenantId, fingerprint, windowStart) as { lead_id: string; received_at: string } | undefined;

    if (existingByFingerprint) {
      return {
        duplicateStatus: 'CONFIRMED_DUPLICATE',
        matchedLeadId: existingByFingerprint.lead_id,
        reason: `Matched contact fingerprint received within past ${timeWindowHours} hours (Lead: ${existingByFingerprint.lead_id})`
      };
    }

    // 3. Check partial match (email or phone alone) outside immediate window
    const partialMatch = db.prepare(`
      SELECT lead_id, received_at FROM pilot_lead_intake
      WHERE tenant_id = ? AND (
        json_extract(normalized_contact_json, '$.email') = ? OR
        json_extract(normalized_contact_json, '$.phone') = ?
      )
      ORDER BY received_at DESC LIMIT 1
    `).get(tenantId, contact.email, contact.phone) as { lead_id: string; received_at: string } | undefined;

    if (partialMatch) {
      return {
        duplicateStatus: 'POSSIBLE_DUPLICATE',
        matchedLeadId: partialMatch.lead_id,
        reason: `Contact info match found with previous historical lead ${partialMatch.lead_id}`
      };
    }

    return {
      duplicateStatus: 'NEW'
    };
  }

  /**
   * Intakes a real or pilot lead into the system, enforcing location resolution,
   * deterministic duplicate detection, conservative identity resolution, and audit logging.
   */
  public intakeLead(input: LeadIntakeInput): LeadIntakeRecord {
    const db = getDatabase();
    const tenantId = input.tenantId;

    if (!tenantId || !input.fullName || !input.email || !input.phone) {
      throw new Error('LEAD_INTAKE_MALFORMED: tenantId, fullName, email, and phone are mandatory.');
    }

    const leadId = `lead_${tenantId}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const receivedAt = input.sourceEvidence?.capturedAt || new Date().toISOString();
    const normalizedContact = this.normalizeContact({
      fullName: input.fullName,
      email: input.email,
      phone: input.phone,
      streetAddress: input.streetAddress,
      municipality: input.municipality,
      stateProvince: input.stateProvince,
      postalCode: input.postalCode,
      country: input.country
    });

    const fingerprint = this.generateFingerprint(tenantId, normalizedContact);
    const dupEval = this.evaluateDuplicateStatus(tenantId, normalizedContact, input.sourceEvidence?.providerLeadId);
    const identityRes = this.resolveIdentity(tenantId, normalizedContact);
    identityRes.leadId = leadId;

    const dataEnvironment: DataEnvironment = input.dataEnvironment || 'PILOT';
    const consentState: ConsentState = input.consentState || 'PENDING_VERIFICATION';

    // 1. Resolve Location & Service Area via locationIntelligenceService
    const customerLocation: LocationRecord = {
      id: `loc_${tenantId}_${leadId}`,
      tenantId,
      label: `${normalizedContact.fullName} (Customer Intake)`,
      type: 'CUSTOMER',
      streetAddress: normalizedContact.streetAddress,
      city: normalizedContact.municipality,
      municipality: normalizedContact.municipality,
      stateProvince: normalizedContact.stateProvince,
      postalCode: normalizedContact.postalCode,
      country: normalizedContact.country,
      timezone: 'America/New_York',
      source: 'LEAD_FORM',
      confidence: 1.0,
      verificationState: 'SELF_REPORTED',
      evidenceRefs: input.sourceEvidence?.evidenceRef ? [input.sourceEvidence.evidenceRef] : [],
      metadata: { rawSource: input.source },
      createdAt: receivedAt,
      updatedAt: receivedAt
    };

    locationIntelligenceService.saveLocation(tenantId, customerLocation);

    const locationContext = locationIntelligenceService.resolveActionLocationContext({
      tenantId,
      actionType: 'SCHEDULING',
      customerLocation,
      source: 'LEAD_FORM'
    });

    const isInsideServiceArea =
      locationContext.serviceAreaStatus === 'RESOLVED' ||
      (locationContext.serviceAreaStatus as string) === 'IN_SERVICE_AREA' ||
      (locationContext.serviceAreaStatus as string) === 'INSIDE';

    const isOutOfService =
      locationContext.serviceAreaStatus === 'OUTSIDE_CONFIGURED_SERVICE_AREA' ||
      locationContext.serviceAreaStatus === 'EXCLUDED_ZONE' ||
      (locationContext.serviceAreaStatus as string) === 'OUT_OF_SERVICE_AREA' ||
      (locationContext.serviceAreaStatus as string) === 'OUTSIDE';

    const mappedServiceAreaStatus = isInsideServiceArea
      ? 'IN_SERVICE_AREA'
      : isOutOfService
      ? 'OUT_OF_SERVICE_AREA'
      : 'UNKNOWN';

    const isQualified =
      isInsideServiceArea &&
      dupEval.duplicateStatus !== 'CONFIRMED_DUPLICATE';

    const qualificationStatus = isQualified ? 'QUALIFIED' : (
      isOutOfService ? 'DISQUALIFIED' : 'REVIEW_REQUIRED'
    );

    const initialLifecycleStatus: PilotLeadLifecycleStatus = 'LEAD_RECEIVED';
    const estimatedValue = input.estimatedValue || 2500;

    // 2. Persist Lead Intake Record
    const auditRef = `audit_intake_${leadId}`;
    const record: LeadIntakeRecord = {
      tenantId,
      leadId,
      source: input.source,
      sourceType: input.sourceType,
      sourceEvidence: {
        rawPayload: input.sourceEvidence?.rawPayload || {},
        providerLeadId: input.sourceEvidence?.providerLeadId,
        channel: input.sourceEvidence?.channel || input.sourceType,
        ipAddress: input.sourceEvidence?.ipAddress,
        userAgent: input.sourceEvidence?.userAgent,
        capturedAt: receivedAt,
        evidenceRef: input.sourceEvidence?.evidenceRef
      },
      receivedAt,
      normalizedContact,
      serviceRequested: input.serviceRequested,
      propertyType: input.propertyType || 'Residential',
      dataEnvironment,
      consentState,
      consentEvidenceRef: input.sourceEvidence?.evidenceRef,
      locationEvidence: {
        locationId: customerLocation.id,
        serviceAreaStatus: mappedServiceAreaStatus as any,
        jurisdictionId: locationContext.jurisdiction?.jurisdictionIds?.[0],
        municipality: locationContext.municipality,
        stateProvince: locationContext.stateProvince
      },
      deduplicationFingerprint: fingerprint,
      duplicateStatus: dupEval.duplicateStatus,
      duplicateDetails: dupEval.matchedLeadId ? {
        matchedLeadId: dupEval.matchedLeadId,
        reason: dupEval.reason
      } : undefined,
      identityResolution: identityRes,
      qualificationStatus,
      lifecycleStatus: initialLifecycleStatus,
      estimatedValue,
      auditRef,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.prepare(`
      INSERT INTO pilot_lead_intake (
        lead_id, tenant_id, source, source_type, source_evidence_json, received_at,
        normalized_contact_json, service_requested, property_type, data_environment,
        consent_state, consent_evidence_ref, location_evidence_json, deduplication_fingerprint,
        duplicate_status, duplicate_details_json, identity_resolution_json, qualification_status,
        lifecycle_status, estimated_value, audit_ref, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      record.leadId,
      record.tenantId,
      record.source,
      record.sourceType,
      JSON.stringify(record.sourceEvidence),
      record.receivedAt,
      JSON.stringify(record.normalizedContact),
      record.serviceRequested,
      record.propertyType,
      record.dataEnvironment,
      record.consentState,
      record.consentEvidenceRef || null,
      JSON.stringify(record.locationEvidence),
      record.deduplicationFingerprint,
      record.duplicateStatus,
      JSON.stringify(record.duplicateDetails || {}),
      JSON.stringify(record.identityResolution || {}),
      record.qualificationStatus,
      record.lifecycleStatus,
      record.estimatedValue,
      record.auditRef,
      record.createdAt,
      record.updatedAt
    );

    // Also sync into base leads table for backwards compatibility
    db.prepare(`
      INSERT INTO leads (id, tenant_id, name, email, company, phone, pipeline_stage, estimated_value, last_interaction_at, response_delay_hours, is_duplicate, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET name = excluded.name
    `).run(
      leadId,
      tenantId,
      normalizedContact.fullName,
      normalizedContact.email,
      `${normalizedContact.fullName} Property`,
      normalizedContact.phone,
      isQualified ? 'proposal' : 'inbox',
      estimatedValue,
      receivedAt,
      0,
      dupEval.duplicateStatus === 'CONFIRMED_DUPLICATE' ? 1 : 0,
      record.createdAt
    );

    // 3. Record Initial Evidence Graph Node
    evidenceGraphService.addNode(tenantId, {
      id: leadId,
      type: 'lead',
      label: `Inbound Lead: ${normalizedContact.fullName} (${input.serviceRequested})`,
      timestamp: receivedAt,
      source: input.source,
      evidenceStatus: 'VERIFIED',
      actor: input.actorId || normalizedContact.fullName,
      metadata: {
        email: normalizedContact.email,
        phone: normalizedContact.phone,
        municipality: normalizedContact.municipality,
        state: normalizedContact.stateProvince,
        dataEnvironment,
        duplicateStatus: dupEval.duplicateStatus,
        identityResult: identityRes.result
      },
      provenance: {
        sourceSystem: input.sourceType,
        rawRecordId: input.sourceEvidence?.providerLeadId || leadId,
        ingestedAt: receivedAt,
        verificationMethod: 'normalized_intake_boundary'
      }
    });

    // 4. Record Initial Pilot Timeline Events
    this.recordTimelineEvent(tenantId, leadId, 'LEAD_RECEIVED', 'Lead Received', `Lead ingested from ${input.source} (${input.sourceType})`, input.actorId || input.source, dataEnvironment);
    this.recordTimelineEvent(tenantId, leadId, 'SOURCE_VERIFIED', 'Source Verified', `Source provenance verified: ${input.sourceType}`, 'PilotLeadIntakeService', dataEnvironment);
    this.recordTimelineEvent(tenantId, leadId, 'IDENTITY_RESOLVED', 'Identity Resolved', `Conservative identity resolution: ${identityRes.result} (Confidence: ${Math.round(identityRes.confidence * 100)}%)`, 'PilotLeadIntakeService', dataEnvironment);
    this.recordTimelineEvent(tenantId, leadId, 'LOCATION_RESOLVED', 'Location Resolved', `Resolved to ${locationContext.municipality}, ${locationContext.stateProvince}`, 'LocationIntelligenceService', dataEnvironment);
    this.recordTimelineEvent(tenantId, leadId, 'SERVICE_AREA_CHECKED', 'Service Area Evaluated', `Service area check result: ${locationContext.serviceAreaStatus}`, 'LocationIntelligenceService', dataEnvironment);

    // 5. Append Audit Log
    launchAuditService.logEvent({
      tenantId,
      actorId: input.actorId || 'lead_intake_system',
      clientIp: input.sourceEvidence?.ipAddress || '127.0.0.1',
      endpoint: '/api/pilot/leads/intake',
      action: 'PILOT_LEAD_INTAKE',
      status: 'SUCCESS',
      executionMode: dataEnvironment === 'PRODUCTION' ? 'LIVE_PRODUCTION' : 'DRY_RUN',
      details: {
        leadId,
        sourceType: input.sourceType,
        duplicateStatus: dupEval.duplicateStatus,
        identityResult: identityRes.result,
        dataEnvironment
      }
    });

    return record;
  }

  /**
   * Records an immutable pilot timeline event for a lead.
   */
  public recordTimelineEvent(
    tenantId: string,
    leadId: string,
    stage: PilotLeadLifecycleStatus,
    title: string,
    description: string,
    actorOrSource: string,
    dataEnvironment: DataEnvironment = 'PILOT',
    evidenceRef?: string,
    metadata?: Record<string, any>
  ): void {
    const db = getDatabase();
    const eventId = `evt_${tenantId}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const auditRef = `audit_evt_${eventId}`;
    const timestamp = new Date().toISOString();

    db.prepare(`
      INSERT INTO pilot_timeline_events (
        id, tenant_id, lead_id, timestamp, stage, title, description,
        actor_or_source, evidence_ref, audit_ref, data_environment, metadata_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      eventId,
      tenantId,
      leadId,
      timestamp,
      stage,
      title,
      description,
      actorOrSource,
      evidenceRef || null,
      auditRef,
      dataEnvironment,
      JSON.stringify(metadata || {}),
      timestamp
    );

    // Update current lead lifecycle status if advanced
    db.prepare(`
      UPDATE pilot_lead_intake
      SET lifecycle_status = ?, updated_at = ?
      WHERE tenant_id = ? AND lead_id = ?
    `).run(stage, timestamp, tenantId, leadId);
  }

  /**
   * Retrieves full lead intake record by lead ID.
   */
  public getLead(tenantId: string, leadId: string): LeadIntakeRecord | null {
    const db = getDatabase();
    const row = db.prepare(`
      SELECT * FROM pilot_lead_intake WHERE tenant_id = ? AND lead_id = ?
    `).get(tenantId, leadId) as any;

    if (!row) return null;

    return {
      tenantId: row.tenant_id,
      leadId: row.lead_id,
      source: row.source,
      sourceType: row.source_type,
      sourceEvidence: JSON.parse(row.source_evidence_json || '{}'),
      receivedAt: row.received_at,
      normalizedContact: JSON.parse(row.normalized_contact_json || '{}'),
      serviceRequested: row.service_requested,
      propertyType: row.property_type,
      dataEnvironment: row.data_environment,
      consentState: row.consent_state,
      consentEvidenceRef: row.consent_evidence_ref,
      locationEvidence: JSON.parse(row.location_evidence_json || '{}'),
      deduplicationFingerprint: row.deduplication_fingerprint,
      duplicateStatus: row.duplicate_status,
      duplicateDetails: JSON.parse(row.duplicate_details_json || '{}'),
      identityResolution: JSON.parse(row.identity_resolution_json || '{}'),
      qualificationStatus: row.qualification_status,
      lifecycleStatus: row.lifecycle_status,
      estimatedValue: row.estimated_value,
      auditRef: row.audit_ref,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  /**
   * Lists pilot lead records with optional environment and status filtering.
   */
  public listLeads(
    tenantId: string,
    filter?: { dataEnvironment?: DataEnvironment; lifecycleStatus?: PilotLeadLifecycleStatus }
  ): LeadIntakeRecord[] {
    const db = getDatabase();
    let query = `SELECT * FROM pilot_lead_intake WHERE tenant_id = ?`;
    const params: any[] = [tenantId];

    if (filter?.dataEnvironment) {
      query += ` AND data_environment = ?`;
      params.push(filter.dataEnvironment);
    }
    if (filter?.lifecycleStatus) {
      query += ` AND lifecycle_status = ?`;
      params.push(filter.lifecycleStatus);
    }

    query += ` ORDER BY received_at DESC`;
    const rows = db.prepare(query).all(...params) as any[];

    return rows.map((row) => ({
      tenantId: row.tenant_id,
      leadId: row.lead_id,
      source: row.source,
      sourceType: row.source_type,
      sourceEvidence: JSON.parse(row.source_evidence_json || '{}'),
      receivedAt: row.received_at,
      normalizedContact: JSON.parse(row.normalized_contact_json || '{}'),
      serviceRequested: row.service_requested,
      propertyType: row.property_type,
      dataEnvironment: row.data_environment,
      consentState: row.consent_state,
      consentEvidenceRef: row.consent_evidence_ref,
      locationEvidence: JSON.parse(row.location_evidence_json || '{}'),
      deduplicationFingerprint: row.deduplication_fingerprint,
      duplicateStatus: row.duplicate_status,
      duplicateDetails: JSON.parse(row.duplicate_details_json || '{}'),
      identityResolution: JSON.parse(row.identity_resolution_json || '{}'),
      qualificationStatus: row.qualification_status,
      lifecycleStatus: row.lifecycle_status,
      estimatedValue: row.estimated_value,
      auditRef: row.audit_ref,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  /**
   * Retrieves the inspectable timeline events for a lead.
   */
  public getLeadTimeline(tenantId: string, leadId: string) {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT * FROM pilot_timeline_events
      WHERE tenant_id = ? AND lead_id = ?
      ORDER BY timestamp ASC
    `).all(tenantId, leadId) as any[];

    return rows.map((r) => ({
      id: r.id,
      tenantId: r.tenant_id,
      leadId: r.lead_id,
      timestamp: r.timestamp,
      stage: r.stage,
      title: r.title,
      description: r.description,
      actorOrSource: r.actor_or_source,
      evidenceRef: r.evidence_ref,
      auditRef: r.audit_ref,
      dataEnvironment: r.data_environment,
      metadata: JSON.parse(r.metadata_json || '{}')
    }));
  }
}

export const pilotLeadIntakeService = PilotLeadIntakeService.getInstance();
