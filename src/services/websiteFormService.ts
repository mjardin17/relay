import crypto from 'node:crypto';
import { getDatabase } from '../db/database';
import { WebsitePublicFormSubmission } from '../types/websiteBuilder';
import { pilotLeadIntakeService, LeadIntakeInput } from './pilotLeadIntakeService';
import { websiteAnalyticsService } from './websiteAnalyticsService';

export interface PublicFormSubmitPayload {
  tenantId: string;
  projectId?: string;
  pageSlug?: string;
  formType: string;
  fullName: string;
  phone: string;
  email?: string;
  street?: string;
  city: string;
  state?: string;
  postalCode?: string;
  requestedService: string;
  urgencyLevel?: 'EMERGENCY' | 'SAME_DAY' | 'NEXT_DAY' | 'FLEXIBLE';
  notes?: string;
  disclosureVersion?: string;
  consentGiven: boolean;
  company_fax_check?: string; // Honeypot
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  referringDomain?: string;
  landingPage?: string;
  ctaId?: string;
  clientIp?: string;
  idempotencyKey?: string;
}

export class WebsiteFormService {
  private static instance: WebsiteFormService;
  private submissionRateMap: Map<string, number[]> = new Map();

  private constructor() {}

  public static getInstance(): WebsiteFormService {
    if (!WebsiteFormService.instance) {
      WebsiteFormService.instance = new WebsiteFormService();
    }
    return WebsiteFormService.instance;
  }

  public async processFormSubmission(payload: PublicFormSubmitPayload): Promise<{
    success: boolean;
    submissionId: string;
    routedLeadId?: string;
    leadStatus?: string;
    message: string;
    isDuplicate?: boolean;
  }> {
    const tenantId = this.sanitizeInput(payload.tenantId || 'tenant_ma_fresh_launch');
    const projectId = this.sanitizeInput(payload.projectId || `proj_web_${tenantId}`);
    const pageSlug = this.sanitizeInput(payload.pageSlug || 'contact');
    const formType = this.sanitizeInput(payload.formType || 'QUOTE_REQUEST');

    // 1. Honeypot Security Check
    if (payload.company_fax_check && payload.company_fax_check.trim().length > 0) {
      // Bot detected — fail safely without disclosing bot detection
      return {
        success: false,
        submissionId: `sub_bot_${Date.now()}`,
        message: 'Security validation failed.'
      };
    }

    // 2. Schema / Required Field Validation
    if (!payload.fullName || payload.fullName.trim().length < 2) {
      throw new Error('Validation Error: Full name is required.');
    }
    if (!payload.phone || payload.phone.trim().length < 7) {
      throw new Error('Validation Error: Valid contact phone number is required.');
    }
    if (!payload.city || payload.city.trim().length < 2) {
      throw new Error('Validation Error: Service city is required for location and territory resolution.');
    }
    if (!payload.requestedService) {
      throw new Error('Validation Error: Requested service selection is required.');
    }
    if (!payload.consentGiven) {
      throw new Error('Validation Error: Consent to receive transactional communication must be explicitly accepted.');
    }

    // 3. Payload Sanitization
    const sanitizedName = this.sanitizeInput(payload.fullName);
    const sanitizedPhone = this.sanitizeInput(payload.phone);
    const sanitizedEmail = payload.email ? this.sanitizeInput(payload.email) : '';
    const sanitizedStreet = payload.street ? this.sanitizeInput(payload.street) : '';
    const sanitizedCity = this.sanitizeInput(payload.city);
    const sanitizedState = this.sanitizeInput(payload.state || 'MA');
    const sanitizedPostalCode = this.sanitizeInput(payload.postalCode || '02740');
    const sanitizedService = this.sanitizeInput(payload.requestedService);
    const sanitizedNotes = payload.notes ? this.sanitizeInput(payload.notes) : '';

    // 4. Rate Limiting Check (Max 5 submissions per 60 seconds per IP/Phone)
    const clientKey = `${payload.clientIp || 'unknown'}:${sanitizedPhone}`;
    const now = Date.now();
    const timestamps = (this.submissionRateMap.get(clientKey) || []).filter(t => now - t < 60000);
    if (timestamps.length >= 5) {
      throw new Error('Rate limit exceeded: Too many form submissions. Please wait 1 minute before submitting again.');
    }
    timestamps.push(now);
    this.submissionRateMap.set(clientKey, timestamps);

    // 5. Versioned Consent Evidence Record
    const disclosureVersion = payload.disclosureVersion || 'v1.0';
    const disclosureText = 'By checking this box, I consent to receive transactional phone calls, emails, or SMS notifications from this contractor regarding this estimate request.';
    const disclosureTextHash = crypto.createHash('sha256').update(disclosureText).digest('hex');

    const submissionId = `sub_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    const fallbackEmail = sanitizedEmail || (sanitizedName ? `${sanitizedName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'web.lead'}@inquiry.local` : 'web.lead@inquiry.local');

    // 6. Ingest into Relay's Pilot Lead Intake Pipeline
    const intakeInput: LeadIntakeInput = {
      tenantId,
      source: `Website: ${projectId} (${pageSlug})`,
      sourceType: 'WEBSITE_FORM',
      fullName: sanitizedName,
      email: fallbackEmail,
      phone: sanitizedPhone,
      streetAddress: sanitizedStreet,
      municipality: sanitizedCity,
      stateProvince: sanitizedState,
      postalCode: sanitizedPostalCode,
      country: 'US',
      serviceRequested: sanitizedService,
      propertyType: 'Residential',
      dataEnvironment: 'PILOT',
      consentState: 'OPTED_IN',
      sourceEvidence: {
        rawPayload: {
          submissionId,
          formType,
          pageSlug,
          notes: sanitizedNotes
        },
        providerLeadId: submissionId,
        channel: 'WEBSITE_NATIVE_FORM',
        ipAddress: payload.clientIp ? this.maskIp(payload.clientIp) : '127.0.0.1',
        capturedAt: new Date().toISOString()
      }
    };

    const leadResult = pilotLeadIntakeService.intakeLead(intakeInput);

    // 7. Store Website Form Submission Record
    const submissionRecord: WebsitePublicFormSubmission = {
      submissionId,
      tenantId,
      projectId,
      pageSlug,
      formType,
      formData: {
        fullName: sanitizedName,
        phone: sanitizedPhone,
        email: sanitizedEmail,
        serviceAddress: {
          street: sanitizedStreet,
          city: sanitizedCity,
          state: sanitizedState,
          postalCode: sanitizedPostalCode
        },
        requestedService: sanitizedService,
        urgencyLevel: payload.urgencyLevel,
        notes: sanitizedNotes
      },
      consent: {
        purpose: 'ESTIMATE_AND_SERVICE_COORDINATION',
        communicationChannel: 'SMS',
        disclosureVersion,
        disclosureTextHash,
        captureMethod: 'WEB_FORM_EXPLICIT',
        timestamp: new Date().toISOString(),
        recipientPhoneOrEmail: sanitizedPhone,
        ipAddressSanitized: payload.clientIp ? this.maskIp(payload.clientIp) : '127.0.0.1'
      },
      tracking: {
        utmSource: this.sanitizeInput(payload.utmSource || ''),
        utmMedium: this.sanitizeInput(payload.utmMedium || ''),
        utmCampaign: this.sanitizeInput(payload.utmCampaign || ''),
        utmContent: this.sanitizeInput(payload.utmContent || ''),
        utmTerm: this.sanitizeInput(payload.utmTerm || ''),
        referringDomain: this.sanitizeInput(payload.referringDomain || ''),
        landingPage: this.sanitizeInput(payload.landingPage || `/${pageSlug}.html`),
        ctaId: this.sanitizeInput(payload.ctaId || 'form_lead_main')
      },
      security: {
        honeypotTriggered: false,
        rateLimitPassed: true,
        sanitized: true,
        idempotencyKey: payload.idempotencyKey
      },
      routedLeadId: leadResult.leadId,
      submittedAt: new Date().toISOString()
    };

    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO website_form_submissions (
        submission_id, tenant_id, project_id, page_slug, form_type,
        form_data, consent, tracking, security, routed_lead_id, submitted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      submissionRecord.submissionId,
      submissionRecord.tenantId,
      submissionRecord.projectId,
      submissionRecord.pageSlug,
      submissionRecord.formType,
      JSON.stringify(submissionRecord.formData),
      JSON.stringify(submissionRecord.consent),
      JSON.stringify(submissionRecord.tracking),
      JSON.stringify(submissionRecord.security),
      submissionRecord.routedLeadId || null,
      submissionRecord.submittedAt
    );

    // 8. Track First-Party Analytics Event
    try {
      websiteAnalyticsService.recordEvent({
        tenantId,
        projectId,
        pageSlug,
        eventType: 'FORM_SUBMIT',
        targetIdentifier: `form_${formType}`,
        utmSource: payload.utmSource,
        utmMedium: payload.utmMedium,
        utmCampaign: payload.utmCampaign,
        referrerDomain: payload.referringDomain,
        sessionId: `sess_${Date.now()}`
      });
    } catch {}

    return {
      success: true,
      submissionId,
      routedLeadId: leadResult.leadId,
      leadStatus: leadResult.lifecycleStatus,
      isDuplicate: leadResult.duplicateStatus === 'CONFIRMED_DUPLICATE',
      message: 'Your service request has been received by our master electrician team. We will review your request shortly.'
    };
  }

  public getSubmissions(tenantId: string, projectId?: string): WebsitePublicFormSubmission[] {
    const db = getDatabase();
    const query = projectId
      ? `SELECT * FROM website_form_submissions WHERE tenant_id = ? AND project_id = ? ORDER BY submitted_at DESC`
      : `SELECT * FROM website_form_submissions WHERE tenant_id = ? ORDER BY submitted_at DESC`;
    const params = projectId ? [tenantId, projectId] : [tenantId];
    const stmt = db.prepare(query);
    const rows = (stmt.all(...params) || []) as any[];

    return rows.map(r => ({
      submissionId: r.submission_id,
      tenantId: r.tenant_id,
      projectId: r.project_id,
      pageSlug: r.page_slug,
      formType: r.form_type,
      formData: JSON.parse(r.form_data || '{}'),
      consent: JSON.parse(r.consent || '{}'),
      tracking: JSON.parse(r.tracking || '{}'),
      security: JSON.parse(r.security || '{}'),
      routedLeadId: r.routed_lead_id || undefined,
      submittedAt: r.submitted_at
    }));
  }

  private sanitizeInput(input: string): string {
    if (!input) return '';
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/[<>]/g, '')
      .trim();
  }

  private maskIp(ip: string): string {
    if (!ip) return '127.0.0.1';
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.***.***`;
    }
    return ip.substring(0, 8) + ':****';
  }
}

export const websiteFormService = WebsiteFormService.getInstance();
