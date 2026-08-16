import crypto from 'node:crypto';
import { launchAuditService } from './launchAuditService';
import { launchIdempotencyService } from './launchIdempotencyService';
import { pricingRulesService } from './pricingRulesService';
import { locationIntelligenceService } from './locationIntelligenceService';
import { getDatabase } from '../db/database';
import { EvidenceClassification } from '../types/maElectricalCompliance';
import { RelayLocationContext } from '../types/locationIntelligence';

export type LeadUrgencyCategory =
  | 'EMERGENCY_HAZARD'
  | 'URGENT_SERVICE'
  | 'STANDARD_SERVICE'
  | 'ESTIMATE_REQUEST'
  | 'OUTSIDE_SERVICE_AREA';

export interface ConsentRecord {
  consentStatus: 'OPTED_IN' | 'OPTED_OUT' | 'NOT_PROVIDED';
  communicationChannel: 'sms' | 'email' | 'voice';
  messagePurpose: 'LEAD_RESPONSE' | 'APPOINTMENT' | 'TRANSACTIONAL' | 'REVIEW_REQUEST' | 'PROMOTIONAL';
  consentMethod: 'WEB_FORM_CHECKBOX' | 'VERBAL_RECORDED' | 'WRITTEN';
  capturedAt: string;
  disclosureVersion: string;
  disclosureTextHash: string;
  sourceFormId: string;
  normalizedRecipient: string;
  tenantId: string;
  revocationStatus: boolean;
  revokedAt: string | null;
  evidenceClassification: EvidenceClassification;
}

export interface AriaLeadIntakePayload {
  tenantId: string;
  idempotencyKey: string;
  customerName: string;
  contactMethod: 'phone' | 'sms' | 'email';
  phone?: string;
  email?: string;
  serviceAddress?: string;
  zipCode: string;
  problemDescription: string;
  customerPhotos?: string[];
  preferredAppointmentWindow?: string;
  consentRecord?: ConsentRecord;
  consentProvided?: boolean;
  source: string;
}

export interface AriaLeadRecord {
  id: string;
  tenantId: string;
  idempotencyKey: string;
  customerName: string;
  contactMethod: string;
  phone?: string;
  email?: string;
  serviceAddress?: string;
  zipCode: string;
  problemDescription: string;
  customerPhotos: string[];
  preferredAppointmentWindow?: string;
  consentRecord: ConsentRecord;
  source: string;
  urgencyCategory: LeadUrgencyCategory;
  safetyWarningEmitted?: string;
  urgentHumanEscalation: boolean;
  proposedDraftText: string;
  contentHash: string;
  approvalStatus: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  approvedBy?: string;
  approvalTimestamp?: string;
  executionMode: 'DRY_RUN' | 'LIVE';
  dispatchStatus: 'UNSENT' | 'SIMULATED_SENT' | 'FAILED' | 'BLOCKED';
  dispatchResultNote?: string;
  locationContext?: RelayLocationContext;
  createdAt: string;
  updatedAt: string;
}

export function detectEmergencyHazard(description: string): {
  isEmergency: boolean;
  detectedSignals: string[];
  negatedTerms: string[];
} {
  const text = description.toLowerCase();
  
  const hazardTerms = [
    'fire', 'smoke', 'smokey', 'smoking', 'burning', 'burn smell', 'smell of burning',
    'spark', 'sparks', 'sparking', 'smoldering', 'arc', 'arcing', 'zap', 'shock',
    'electric shock', 'exposed wire', 'exposed wiring', 'water on panel', 'flooded panel'
  ];

  const detectedSignals: string[] = [];
  const negatedTerms: string[] = [];

  for (const term of hazardTerms) {
    if (text.includes(term)) {
      const termRegex = new RegExp(`(?:no|not|without|zero|never|no sign of)\\s+(?:\\w+\\s+)*${term}`, 'i');
      if (termRegex.test(text)) {
        negatedTerms.push(term);
      } else {
        detectedSignals.push(term);
      }
    }
  }

  return {
    isEmergency: detectedSignals.length > 0,
    detectedSignals,
    negatedTerms
  };
}

export class AriaDispatchAdapter {
  /**
   * Default adapter mode is DRY_RUN to prevent unauthorized external SMS sends.
   */
  public async sendDispatch(payload: {
    tenantId: string;
    leadId: string;
    recipient: string;
    text: string;
    mode: 'DRY_RUN' | 'LIVE';
  }): Promise<{ success: boolean; simulated: boolean; carrierId?: string; error?: string }> {
    if (payload.mode !== 'LIVE') {
      return {
        success: true,
        simulated: true,
        carrierId: `DRY_RUN_DISPATCH_${Date.now()}`
      };
    }
    return {
      success: false,
      simulated: false,
      error: 'LIVE_CARRIER_BLOCKED: Outbound live SMS provider is unverified. Dispatch remains in DRY_RUN.'
    };
  }
}

export class AriaDispatchService {
  private static instance: AriaDispatchService;

  public static getInstance(): AriaDispatchService {
    if (!AriaDispatchService.instance) {
      AriaDispatchService.instance = new AriaDispatchService();
    }
    return AriaDispatchService.instance;
  }

  private leads: Map<string, AriaLeadRecord> = new Map();
  private optOutSuppressionList: Set<string> = new Set();
  private emergencyStopTenants: Set<string> = new Set();
  private suspendedTenants: Set<string> = new Set();
  private adapter = new AriaDispatchAdapter();

  public computeContentHash(tenantId: string, leadId: string, recipient: string, text: string): string {
    const raw = `${tenantId}:${leadId}:${recipient}:${text.trim()}`;
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  public setOptOut(contact: string): void {
    this.optOutSuppressionList.add(contact.toLowerCase().trim());
  }

  public setEmergencyStop(tenantId: string, active: boolean): void {
    if (active) {
      this.emergencyStopTenants.add(tenantId);
    } else {
      this.emergencyStopTenants.delete(tenantId);
    }
  }

  public setTenantSuspended(tenantId: string, suspended: boolean): void {
    if (suspended) {
      this.suspendedTenants.add(tenantId);
    } else {
      this.suspendedTenants.delete(tenantId);
    }
  }

  public intakeLead(payload: AriaLeadIntakePayload): {
    success: boolean;
    lead?: AriaLeadRecord;
    error?: string;
    blockReason?: string;
  } {
    // 1. Tenant Emergency Stop / Suspension Check
    if (this.emergencyStopTenants.has(payload.tenantId)) {
      return {
        success: false,
        blockReason: 'EMERGENCY_STOP_ACTIVE: Aria dispatch is paused by emergency stop for this tenant.'
      };
    }

    if (this.suspendedTenants.has(payload.tenantId)) {
      return {
        success: false,
        blockReason: 'TENANT_SUSPENDED: Tenant account is suspended.'
      };
    }

    // 2. Consent Record Validation
    let consentRec: ConsentRecord;
    if (payload.consentRecord) {
      consentRec = payload.consentRecord;
    } else if (payload.consentProvided === true) {
      const recipient = payload.phone || payload.email || 'customer';
      consentRec = {
        consentStatus: 'OPTED_IN',
        communicationChannel: payload.contactMethod === 'email' ? 'email' : 'sms',
        messagePurpose: 'LEAD_RESPONSE',
        consentMethod: 'WEB_FORM_CHECKBOX',
        capturedAt: new Date().toISOString(),
        disclosureVersion: 'v1.0-2026-08',
        disclosureTextHash: crypto.createHash('sha256').update('Standard Lead Consent Disclosure').digest('hex'),
        sourceFormId: payload.source || 'web_lead_form',
        normalizedRecipient: recipient,
        tenantId: payload.tenantId,
        revocationStatus: false,
        revokedAt: null,
        evidenceClassification: 'SELF_REPORTED'
      };
    } else {
      return {
        success: false,
        blockReason: 'MISSING_CONSENT: Versioned communication consent record was not provided.'
      };
    }

    if (consentRec.revocationStatus || consentRec.consentStatus !== 'OPTED_IN') {
      return {
        success: false,
        blockReason: 'CONSENT_REVOKED: Customer has revoked consent or is not opted in.'
      };
    }

    if (consentRec.messagePurpose !== 'LEAD_RESPONSE') {
      return {
        success: false,
        blockReason: `UNBUNDLED_CONSENT_VIOLATION: Consent for ${consentRec.messagePurpose} does not authorize LEAD_RESPONSE communication.`
      };
    }

    // 3. Opt-out Suppression Check
    const contact = payload.phone || payload.email || '';
    if (contact && this.optOutSuppressionList.has(contact.toLowerCase().trim())) {
      return {
        success: false,
        blockReason: 'CONTACT_SUPPRESSED: Customer has opted out or is on the do-not-contact list.'
      };
    }

    // 4. Duplicate Check via Idempotency Service
    const idempotency = launchIdempotencyService.claimIdempotency(
      payload.tenantId,
      'aria_lead_intake',
      payload.idempotencyKey,
      payload
    );
    if (idempotency.isCached || idempotency.isConflict || idempotency.isInProgress) {
      const existing = Array.from(this.leads.values()).find(
        (l) => l.tenantId === payload.tenantId && l.idempotencyKey === payload.idempotencyKey
      );
      if (existing) {
        return {
          success: true,
          lead: existing
        };
      }
      return {
        success: false,
        blockReason: 'DUPLICATE_IDEMPOTENCY_KEY: Request previously processed.'
      };
    }

    // 5. Hazard Detection & Classification
    const hazardResult = detectEmergencyHazard(payload.problemDescription);
    const descLower = payload.problemDescription.toLowerCase();

    let urgencyCategory: LeadUrgencyCategory = 'STANDARD_SERVICE';
    let safetyWarningEmitted: string | undefined = undefined;
    let urgentHumanEscalation = false;

    if (hazardResult.isEmergency) {
      urgencyCategory = 'EMERGENCY_HAZARD';
      urgentHumanEscalation = true;
      safetyWarningEmitted =
        'SAFETY WARNING: Do not touch any exposed electrical equipment, switches, or panels. If there is active fire, heavy smoke, or immediate physical danger, evacuate the property immediately and contact 911 or your local fire department.';
    } else if (descLower.includes('urgent') || descLower.includes('outage') || descLower.includes('no power')) {
      urgencyCategory = 'URGENT_SERVICE';
    } else if (descLower.includes('estimate') || descLower.includes('quote')) {
      urgencyCategory = 'ESTIMATE_REQUEST';
    }

    // Dynamic Location Resolution & Service Area Safety Check
    const db = getDatabase();
    const tenantRow = db.prepare('SELECT name FROM tenants WHERE id = ?').get(payload.tenantId) as any;
    const businessName = tenantRow?.name || 'our service team';

    // Parse City/State/Zip from service address or zipCode
    let parsedCity = payload.serviceAddress || payload.zipCode;
    let parsedState = 'MA';
    if (payload.serviceAddress && payload.serviceAddress.includes(',')) {
      const parts = payload.serviceAddress.split(',');
      if (parts.length >= 2) {
        parsedCity = parts[parts.length - 2].trim();
        const lastPart = parts[parts.length - 1].trim();
        const stateMatch = lastPart.match(/^[A-Za-z]{2}/);
        if (stateMatch) {
          parsedState = stateMatch[0].toUpperCase();
        }
      }
    }

    // Resolve Location Context
    const locationContext = locationIntelligenceService.resolveActionLocationContext({
      tenantId: payload.tenantId,
      actionType: 'SCHEDULING',
      jobLocation: {
        id: `loc_inbound_${Date.now()}`,
        tenantId: payload.tenantId,
        type: 'JOB_SITE',
        label: `Inbound Service Request (${payload.customerName})`,
        streetAddress: payload.serviceAddress,
        city: parsedCity,
        stateProvince: parsedState,
        postalCode: payload.zipCode,
        country: 'US',
        timezone: locationIntelligenceService.resolveTimezone(parsedState, parsedCity, payload.zipCode),
        source: 'LEAD_FORM',
        confidence: 0.8,
        verificationState: 'SELF_REPORTED',
        isRedacted: false,
        evidenceRefs: [`lead_intake_${payload.idempotencyKey}`],
        metadata: { customerName: payload.customerName },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      source: 'LEAD_FORM',
      evidenceRefs: [`lead_intake_${payload.idempotencyKey}`]
    });

    if (locationContext.serviceAreaStatus === 'EXCLUDED_ZONE' || locationContext.serviceAreaStatus === 'OUTSIDE_CONFIGURED_SERVICE_AREA') {
      urgencyCategory = 'OUTSIDE_SERVICE_AREA';
    }

    // Evaluate Pricing Safety
    const priceEval = pricingRulesService.evaluatePricing({
      tenantId: payload.tenantId,
      serviceRequested: payload.problemDescription,
      city: parsedCity,
      zip: payload.zipCode
    });

    // 6. Draft Text Construction adhering to Safety & Location Guidelines
    const leadId = `aria_lead_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    let draftText = `Hi ${payload.customerName}, thank you for contacting ${businessName}. `;

    if (safetyWarningEmitted) {
      draftText += `${safetyWarningEmitted} Your request has been flagged for urgent human escalation. `;
    } else if (locationContext.serviceAreaStatus === 'EXCLUDED_ZONE' || locationContext.serviceAreaStatus === 'OUTSIDE_CONFIGURED_SERVICE_AREA') {
      draftText += `We received your request regarding: "${payload.problemDescription}". Please note that your location (${parsedCity}, ${payload.zipCode}) is outside our standard rapid dispatch service area. Our team will review availability. `;
    } else {
      draftText += `We received your request regarding: "${payload.problemDescription}". `;
      if (priceEval.allowed && priceEval.suggestedRangeText) {
        draftText += `${priceEval.suggestedRangeText} `;
      } else {
        draftText += `An authorized representative will review your request for a formal quote. `;
      }
    }

    draftText += `(Applies configured location intelligence and compliance workflow gates. Requires qualified human review. Not a legal determination.)`;

    const recipient = payload.phone || payload.email || 'customer';
    const contentHash = this.computeContentHash(payload.tenantId, leadId, recipient, draftText);

    const record: AriaLeadRecord = {
      id: leadId,
      tenantId: payload.tenantId,
      idempotencyKey: payload.idempotencyKey,
      customerName: payload.customerName,
      contactMethod: payload.contactMethod,
      phone: payload.phone,
      email: payload.email,
      serviceAddress: payload.serviceAddress,
      zipCode: payload.zipCode,
      problemDescription: payload.problemDescription,
      customerPhotos: payload.customerPhotos || [],
      preferredAppointmentWindow: payload.preferredAppointmentWindow,
      consentRecord: consentRec,
      source: payload.source,
      urgencyCategory,
      safetyWarningEmitted,
      urgentHumanEscalation,
      proposedDraftText: draftText,
      contentHash,
      approvalStatus: 'PENDING_APPROVAL',
      executionMode: 'DRY_RUN',
      dispatchStatus: 'UNSENT',
      locationContext,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.leads.set(leadId, record);

    // Record Immutable Audit Event
    launchAuditService.recordAudit({
      tenantId: payload.tenantId,
      actorId: 'agent-dispatch (Aria)',
      clientIp: '127.0.0.1',
      endpoint: '/api/aria/intake',
      action: 'ai_agent_intake',
      status: 'success',
      executionMode: 'DRY_RUN',
      idempotencyKey: payload.idempotencyKey,
      details: {
        resourceTarget: record.id,
        contentHash,
        urgencyCategory,
        urgentHumanEscalation,
        locationContextHash: locationContext.auditHash,
        serviceAreaStatus: locationContext.serviceAreaStatus,
        municipality: locationContext.municipality
      }
    });

    return {
      success: true,
      lead: record
    };
  }

  /**
   * Approves response draft. Hash MUST match exact proposed draft text.
   */
  public approveDraft(
    tenantId: string,
    leadId: string,
    approverId: string,
    currentText: string
  ): { success: boolean; lead?: AriaLeadRecord; error?: string } {
    const record = this.leads.get(leadId);
    if (!record || record.tenantId !== tenantId) {
      return { success: false, error: 'LEAD_NOT_FOUND: Invalid lead ID or cross-tenant access violation.' };
    }

    const recipient = record.phone || record.email || 'customer';
    const computedHash = this.computeContentHash(tenantId, leadId, recipient, currentText);

    if (computedHash !== record.contentHash) {
      record.approvalStatus = 'REJECTED';
      record.updatedAt = new Date().toISOString();
      return {
        success: false,
        error:
          'APPROVAL_HASH_MISMATCH: The proposed draft text was modified after generation. Approval invalidated. Please generate a new draft.'
      };
    }

    record.approvalStatus = 'APPROVED';
    record.approvedBy = approverId;
    record.approvalTimestamp = new Date().toISOString();
    record.updatedAt = new Date().toISOString();

    launchAuditService.recordAudit({
      tenantId,
      actorId: approverId,
      clientIp: '127.0.0.1',
      endpoint: '/api/aria/approve',
      action: 'ai_agent_approve',
      status: 'success',
      details: { leadId, contentHash: record.contentHash }
    });

    return { success: true, lead: record };
  }

  /**
   * Dispatches approved draft using DRY_RUN mode.
   */
  public async executeDispatch(
    tenantId: string,
    leadId: string
  ): Promise<{ success: boolean; lead?: AriaLeadRecord; error?: string }> {
    const record = this.leads.get(leadId);
    if (!record || record.tenantId !== tenantId) {
      return { success: false, error: 'LEAD_NOT_FOUND: Invalid lead ID or cross-tenant access violation.' };
    }

    if (record.approvalStatus !== 'APPROVED') {
      return { success: false, error: 'APPROVAL_REQUIRED: Lead draft must be approved before dispatch.' };
    }

    if (record.dispatchStatus === 'SIMULATED_SENT') {
      return { success: true, lead: record }; // Idempotent skip
    }

    const result = await this.adapter.sendDispatch({
      tenantId,
      leadId,
      recipient: record.phone || record.email || 'customer',
      text: record.proposedDraftText,
      mode: record.executionMode
    });

    if (result.success) {
      record.dispatchStatus = 'SIMULATED_SENT';
      record.dispatchResultNote = `Simulated send completed in DRY_RUN mode (ID: ${result.carrierId}). No live external SMS sent.`;
      record.updatedAt = new Date().toISOString();

      launchAuditService.recordAudit({
        tenantId,
        actorId: 'agent-dispatch (Aria)',
        clientIp: '127.0.0.1',
        endpoint: '/api/aria/execute',
        action: 'ai_agent_dispatch',
        status: 'success',
        details: {
          leadId,
          executionMode: record.executionMode,
          carrierResult: result
        }
      });

      return { success: true, lead: record };
    }

    record.dispatchStatus = 'FAILED';
    record.dispatchResultNote = result.error;
    return { success: false, error: result.error };
  }

  public getLead(tenantId: string, leadId: string): AriaLeadRecord | undefined {
    const lead = this.leads.get(leadId);
    if (lead && lead.tenantId === tenantId) return lead;
    return undefined;
  }

  public processLeadIntake(params: {
    tenantId: string;
    customerName: string;
    phone?: string;
    email?: string;
    problemDescription: string;
    serviceType?: string;
    hasConsent?: boolean;
    consentEvidence?: {
      consentMethod: 'WEB_FORM_CHECKBOX' | 'VERBAL_RECORDED' | 'WRITTEN';
      disclosureVersion: string;
      disclosureTextHash: string;
      consentTimestamp: string;
      recordedBy: string;
    };
    idempotencyKey: string;
  }): {
    success: boolean;
    error?: string;
    dryRunFlags?: {
      executionMode: string;
      providerCalled: boolean;
      customerContacted: boolean;
      externalMutationCreated: boolean;
    };
    lead?: AriaLeadRecord & { dispatchStatus: string };
  } {
    if (!params.consentEvidence) {
      return {
        success: false,
        error: 'CONSENT_EVIDENCE_MANDATORY',
      };
    }

    const intakeResult = this.intakeLead({
      tenantId: params.tenantId,
      idempotencyKey: params.idempotencyKey,
      customerName: params.customerName,
      contactMethod: params.phone ? 'phone' : 'email',
      phone: params.phone,
      email: params.email,
      zipCode: '01701',
      problemDescription: params.problemDescription,
      source: 'web_form',
      consentRecord: {
        consentStatus: 'OPTED_IN',
        communicationChannel: params.phone ? 'sms' : 'email',
        messagePurpose: 'LEAD_RESPONSE',
        consentMethod: params.consentEvidence.consentMethod,
        capturedAt: params.consentEvidence.consentTimestamp,
        disclosureVersion: params.consentEvidence.disclosureVersion,
        disclosureTextHash: params.consentEvidence.disclosureTextHash,
        sourceFormId: params.consentEvidence.recordedBy,
        normalizedRecipient: params.phone || params.email || 'customer',
        tenantId: params.tenantId,
        revocationStatus: false,
        revokedAt: null,
        evidenceClassification: 'SELF_REPORTED',
      },
    });

    if (!intakeResult.success) {
      return {
        success: false,
        error: intakeResult.blockReason || 'INTAKE_FAILED',
      };
    }

    const lead = intakeResult.lead;
    const modifiedLead: any = lead ? { ...lead, dispatchStatus: 'DRAFT_PENDING_APPROVAL' } : undefined;

    return {
      success: true,
      dryRunFlags: {
        executionMode: 'DRY_RUN',
        providerCalled: false,
        customerContacted: false,
        externalMutationCreated: false,
      },
      lead: modifiedLead,
    };
  }
}

export const ariaDispatchService = new AriaDispatchService();
