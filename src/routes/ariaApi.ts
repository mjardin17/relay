import { Router, Request, Response } from 'express';
import { ariaDispatchService } from '../services/ariaDispatchService';
import { launchAuditService } from '../services/launchAuditService';

export const ariaRouter = Router();

/**
 * POST /api/aria/intake
 * Speed-to-Lead Intake Endpoint for Aria
 */
ariaRouter.post('/intake', (req: Request, res: Response) => {
  try {
    const {
      tenantId = 'tenant-reis-electric',
      idempotencyKey,
      customerName,
      contactMethod = 'sms',
      phone,
      email,
      serviceAddress,
      zipCode,
      problemDescription,
      customerPhotos,
      preferredAppointmentWindow,
      consentRecord,
      consentProvided,
      source = 'web_form'
    } = req.body;

    // Validate required fields
    if (!idempotencyKey || !customerName || !zipCode || !problemDescription) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_FAILED: Required fields missing. Must specify idempotencyKey, customerName, zipCode, and problemDescription.'
      });
    }

    if (!phone && !email) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_FAILED: Must provide at least one contact method (phone or email).'
      });
    }

    const result = ariaDispatchService.intakeLead({
      tenantId,
      idempotencyKey,
      customerName,
      contactMethod,
      phone,
      email,
      serviceAddress,
      zipCode,
      problemDescription,
      customerPhotos,
      preferredAppointmentWindow,
      consentRecord,
      consentProvided,
      source
    });

    if (!result.success || !result.lead) {
      return res.status(400).json({
        success: false,
        executionMode: 'DRY_RUN',
        providerCalled: false,
        externalMessageId: null,
        customerContacted: false,
        blockReason: result.blockReason || result.error || 'INTAKE_BLOCKED'
      });
    }

    const lead = result.lead;

    return res.status(200).json({
      success: true,
      executionMode: 'DRY_RUN',
      providerCalled: false,
      externalMessageId: null,
      customerContacted: false,
      leadId: lead.id,
      draftStatus: lead.approvalStatus,
      proposedDraftText: lead.proposedDraftText,
      contentHash: lead.contentHash,
      urgencyCategory: lead.urgencyCategory,
      escalationRequired: lead.urgentHumanEscalation,
      safetyWarningEmitted: lead.safetyWarningEmitted || null,
      auditEventId: `audit_aria_${lead.id}`,
      consentVerification: {
        consentStatus: lead.consentRecord.consentStatus,
        messagePurpose: lead.consentRecord.messagePurpose,
        authorized: true
      },
      lead
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      executionMode: 'DRY_RUN',
      providerCalled: false,
      externalMessageId: null,
      customerContacted: false,
      error: err.message
    });
  }
});

/**
 * POST /api/aria/approve
 * Approval endpoint bound to SHA-256 draft content hash
 */
ariaRouter.post('/approve', (req: Request, res: Response) => {
  try {
    const { tenantId = 'tenant-reis-electric', leadId, approverId = 'owner-shadrick-reis', currentText } = req.body;

    if (!leadId || !currentText) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_FAILED: Must provide leadId and currentText.'
      });
    }

    const result = ariaDispatchService.approveDraft(tenantId, leadId, approverId, currentText);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    return res.json({
      success: true,
      lead: result.lead
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/aria/execute
 * Execution dispatch endpoint in DRY_RUN mode
 */
ariaRouter.post('/execute', async (req: Request, res: Response) => {
  try {
    const { tenantId = 'tenant-reis-electric', leadId } = req.body;

    if (!leadId) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_FAILED: Must provide leadId.'
      });
    }

    const result = await ariaDispatchService.executeDispatch(tenantId, leadId);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        executionMode: 'DRY_RUN',
        providerCalled: false,
        externalMessageId: null,
        customerContacted: false,
        error: result.error
      });
    }

    return res.json({
      success: true,
      executionMode: 'DRY_RUN',
      providerCalled: false,
      externalMessageId: null,
      customerContacted: false,
      lead: result.lead
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/aria/lead/:leadId
 */
ariaRouter.get('/lead/:leadId', (req: Request, res: Response) => {
  const tenantId = (req.query.tenantId as string) || 'tenant-reis-electric';
  const lead = ariaDispatchService.getLead(tenantId, req.params.leadId);
  if (!lead) {
    return res.status(404).json({ success: false, error: 'LEAD_NOT_FOUND' });
  }
  return res.json({ success: true, lead });
});
