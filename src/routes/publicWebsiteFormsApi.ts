import { Router, Request, Response } from 'express';
import { websiteFormService } from '../services/websiteFormService';
import { websiteAnalyticsService } from '../services/websiteAnalyticsService';

export const publicWebsiteFormsApiRouter = Router();

// Public native form endpoint (handles honeypot, XSS sanitization, rate limiting, and lead routing)
publicWebsiteFormsApiRouter.post('/forms/submit', async (req: Request, res: Response) => {
  try {
    const clientIp = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || '127.0.0.1';
    const result = await websiteFormService.processFormSubmission({
      ...req.body,
      clientIp
    });
    res.json(result);
  } catch (err: any) {
    res.status(400).json({
      success: false,
      message: err.message || 'Unable to process form submission at this time.'
    });
  }
});

// Public analytics beacon endpoint
publicWebsiteFormsApiRouter.post('/analytics/event', (req: Request, res: Response) => {
  try {
    const event = websiteAnalyticsService.recordEvent({
      tenantId: req.body.tenantId || 'tenant_ma_fresh_launch',
      projectId: req.body.projectId || 'proj_web_tenant_ma_fresh_launch',
      pageSlug: req.body.pageSlug || 'home',
      eventType: req.body.eventType || 'PAGE_VIEW',
      targetIdentifier: req.body.targetIdentifier,
      utmSource: req.body.utmSource,
      utmMedium: req.body.utmMedium,
      utmCampaign: req.body.utmCampaign,
      referrerDomain: req.body.referrerDomain,
      sessionId: req.body.sessionId || `sess_${Date.now()}`
    });
    res.json({ success: true, eventId: event.id });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});
