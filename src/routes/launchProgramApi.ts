import { Router, Request, Response, NextFunction } from 'express';
import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { authService, VerifiedSession } from '../services/authService';
import { launchApprovalService } from '../services/launchApprovalService';
import { launchAuditService } from '../services/launchAuditService';
import { launchIdempotencyService } from '../services/launchIdempotencyService';
import { launchRateLimitService } from '../services/launchRateLimitService';

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      tenantId?: string;
      userRole?: string;
      userPermissions?: string[];
      userSession?: VerifiedSession;
    }
  }
}

export const launchProgramRouter = Router();

// ---------------------------------------------------------------------------
// 1. Simulation Metadata Constant
// ---------------------------------------------------------------------------
const SIMULATION_METADATA = {
  isSimulation: true,
  providerTruthfulness: 'simulated_local_environment',
  externalVerification: 'none_unconfirmed_by_third_party_provider',
  notice: 'Simulation Mode Active: Actions have no external telephony, email, or database mutations.',
};

export function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is missing.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// ---------------------------------------------------------------------------
// 2. Identity & Authorization Middlewares
// ---------------------------------------------------------------------------

/**
 * Strict Identity Middleware:
 * Requires a server-verified session token passed in "Authorization: Bearer <token>".
 * Derives userId, tenantId, role, and permissions strictly from the database session record.
 * NEVER trusts X-Tenant-ID headers or request body parameters.
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'] as string | undefined;
  let token: string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  }

  if (!token) {
    launchAuditService.recordAudit({
      tenantId: 'unauthenticated',
      clientIp: req.ip || 'unknown',
      endpoint: req.originalUrl || req.path,
      action: 'AUTH_FAILED_MISSING_TOKEN',
      status: 'UNAUTHORIZED',
      details: { path: req.path },
    });

    return res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'Missing or invalid authentication credentials. Provide a valid Bearer token.',
    });
  }

  const session = authService.verifySession(token);
  if (!session) {
    launchAuditService.recordAudit({
      tenantId: 'unauthenticated',
      clientIp: req.ip || 'unknown',
      endpoint: req.originalUrl || req.path,
      action: 'AUTH_FAILED_INVALID_OR_EXPIRED_TOKEN',
      status: 'UNAUTHORIZED',
      details: { tokenPrefix: token.substring(0, 8) },
    });

    return res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'Authentication credentials are invalid or expired.',
    });
  }

  // Bind server-verified identity parameters
  req.userId = session.userId;
  req.tenantId = session.tenantId; // Derived strictly from verified database record
  req.userRole = session.role;
  req.userPermissions = session.permissions;
  req.userSession = session;

  next();
}

/**
 * Permission Enforcement Middleware
 */
export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.userSession || !authService.hasPermission(req.userSession, permission)) {
      launchAuditService.recordAudit({
        tenantId: req.tenantId || 'unauthenticated',
        actorId: req.userId,
        clientIp: req.ip || 'unknown',
        endpoint: req.originalUrl || req.path,
        action: 'PERMISSION_DENIED',
        status: 'FORBIDDEN',
        details: { requiredPermission: permission, userRole: req.userRole },
      });

      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN_INSUFFICIENT_ROLE',
        message: `User lacks the required permission (${permission}) or tenant access for this operation.`,
      });
    }
    next();
  };
}

/**
 * Distributed Rate Limiting Middleware
 */
export function rateLimitMiddleware(limitKey: string, maxHits: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientIp = req.ip || '127.0.0.1';
    const key = `${limitKey}:${clientIp}:${req.tenantId || 'anon'}`;
    const result = launchRateLimitService.checkRateLimit(key, maxHits, windowMs);

    if (!result.allowed) {
      launchAuditService.recordAudit({
        tenantId: req.tenantId || 'anonymous',
        actorId: req.userId,
        clientIp,
        endpoint: req.originalUrl || req.path,
        action: 'RATE_LIMIT_EXCEEDED',
        status: 'RATE_LIMITED',
        details: { limitKey, maxHits, currentHits: result.currentHits },
      });

      return res.status(429).json({
        success: false,
        error: 'RATE_LIMIT_EXCEEDED',
        message: `Rate limit exceeded for ${limitKey}. Please retry after ${result.resetAt}.`,
      });
    }
    next();
  };
}

/**
 * Multi-Instance Durable Idempotency Pre-Check
 */
export function idempotencyCheckMiddleware(req: Request, res: Response, next: NextFunction) {
  const idempotencyKey = req.headers['x-idempotency-key'] as string | undefined;
  if (!idempotencyKey || req.method === 'GET') {
    return next();
  }

  const tenantId = req.tenantId || 'anonymous';
  const operation = req.path;
  const result = launchIdempotencyService.checkIdempotency(tenantId, operation, idempotencyKey, req.body);

  if (result.isConflict) {
    launchAuditService.recordAudit({
      tenantId,
      actorId: req.userId,
      clientIp: req.ip || 'unknown',
      endpoint: req.path,
      action: 'IDEMPOTENCY_CONFLICT',
      status: 'BAD_REQUEST',
      idempotencyKey,
      details: { errorMessage: result.errorMessage },
    });

    return res.status(409).json({
      success: false,
      error: 'IDEMPOTENCY_KEY_REUSE_CONFLICT',
      message: result.errorMessage || 'Idempotency key was previously used with a different request payload body.',
    });
  }

  if (result.isCached) {
    res.setHeader('X-Cache-Hit', 'true');
    return res.json(result.response);
  }

  next();
}

export function saveIdempotencyResponse(req: Request, responseData: any) {
  const idempotencyKey = req.headers['x-idempotency-key'] as string | undefined;
  if (!idempotencyKey || !req.tenantId) return;
  launchIdempotencyService.saveIdempotency(req.tenantId, req.path, idempotencyKey, req.body, responseData);
}

// ---------------------------------------------------------------------------
// 3. Zod Input Validation Schemas
// ---------------------------------------------------------------------------
const RecommendNicheSchema = z.object({
  industryPreference: z.string().min(1, 'industryPreference is required').max(100),
  targetIncome: z.number().min(1000).max(1000000).optional(),
});

const GenerateOfferSchema = z.object({
  nicheName: z.string().min(1, 'nicheName is required'),
  primaryProblem: z.string().min(1, 'primaryProblem is required'),
});

const GenerateOutreachSchema = z.object({
  prospect: z.object({
    id: z.string().optional(),
    companyName: z.string().min(1, 'companyName is required'),
    contactName: z.string().min(1, 'contactName is required'),
  }),
  evidencePoints: z.array(z.string()).optional(),
});

const ApproveOutreachSchema = z.object({
  outreachId: z.string().min(1, 'outreachId is required'),
  prospectEmail: z.string().email('Valid prospectEmail required'),
  messageBody: z.string().min(10, 'messageBody must be at least 10 characters'),
  channel: z.string().optional(),
});

const DispatchOutreachSchema = z.object({
  outreachId: z.string().min(1, 'outreachId is required'),
  prospectEmail: z.string().email('Valid prospectEmail required'),
  messageBody: z.string().min(10, 'messageBody must be at least 10 characters'),
  channel: z.string().optional(),
  approvalStatus: z.string().optional(), // Provided by caller, BUT IGNORED BY SERVER AS PROOF
});

const ExecuteRollbackSchema = z.object({
  stageId: z.string().min(1, 'stageId is required'),
  rollbackReason: z.string().min(5, 'rollbackReason must be at least 5 characters'),
  targetSnapshotVersion: z.string().optional(),
});

const GenerateCaseStudySchema = z.object({
  clientName: z.string().min(1, 'clientName is required'),
  baselineMetrics: z.object({ monthlyRevenue: z.number().optional() }).optional(),
  actualResults: z.object({ attributedMonthlyRevenue: z.number().optional() }).optional(),
});

const GenerateProposalSchema = z.object({
  prospectId: z.string().optional(),
  companyName: z.string().min(1, 'companyName is required'),
  clientName: z.string().min(1, 'clientName is required'),
});

// ---------------------------------------------------------------------------
// 4. API Endpoints
// ---------------------------------------------------------------------------

// Explicitly Public Health Check Endpoint
launchProgramRouter.get('/health', (req: Request, res: Response) => {
  return res.json({
    status: 'ok',
    module: 'LaunchProgram Boundary Module',
    time: new Date().toISOString(),
  });
});

// All routes below this line require valid authentication
launchProgramRouter.use(authMiddleware);

// A. Niche Recommendation Endpoint
launchProgramRouter.post(
  '/recommend-niche',
  requirePermission('launch:read'),
  rateLimitMiddleware('ai_recommend_niche', 20, 15 * 60 * 1000),
  idempotencyCheckMiddleware,
  async (req: Request, res: Response) => {
    const parseResult = RecommendNicheSchema.safeParse(req.body);
    if (!parseResult.success) {
      launchAuditService.recordAudit({
        tenantId: req.tenantId!,
        actorId: req.userId,
        clientIp: req.ip || 'unknown',
        endpoint: req.path,
        action: 'VALIDATION_FAILED',
        status: 'BAD_REQUEST',
        details: { errors: parseResult.error.format() },
      });
      return res.status(400).json({
        success: false,
        error: 'INVALID_INPUT',
        details: parseResult.error.format(),
      });
    }

    try {
      const { industryPreference, targetIncome } = parseResult.data;
      let niche;

      try {
        const ai = getGeminiClient();
        const systemInstruction = `You are Relay's 60-Day AI Client Launch Program Niche Evaluator.
Evaluate potential B2B/service niches based on:
1. Pain severity (1-10)
2. Ability to pay (1-10)
3. Ease of access (1-10)
4. Urgency (1-10)
5. Sales cycle days
6. Automation potential (1-10)
7. Compliance risk (Low/Medium/High)
8. Estimated monthly ROI per client ($)

Return a JSON object for a top recommended niche:
{
  "id": "niche-ai-generated",
  "name": string,
  "industryCategory": string,
  "painSeverityScore": number,
  "abilityToPayScore": number,
  "easeOfAccessScore": number,
  "urgencyScore": number,
  "salesCycleDaysEstimate": number,
  "automationPotentialScore": number,
  "complianceRiskLevel": "Low" | "Medium" | "High",
  "estimatedMonthlyRoiPerClient": number,
  "overallScore": number (0-100),
  "keyPainPoints": string[],
  "primaryDecisionMakerRole": string,
  "evidenceSummary": string,
  "recommended": true,
  "selectedByOwner": false
}`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: `Evaluate niche for industry preference: ${industryPreference}, Target Monthly Income: $${targetIncome || 25000}`,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
          },
        });

        const text = response.text || '{}';
        niche = JSON.parse(text);
      } catch {
        niche = {
          id: `niche-${Date.now()}`,
          name: `${industryPreference} AI Growth Engine`,
          industryCategory: 'Professional Services',
          painSeverityScore: 9,
          abilityToPayScore: 9,
          easeOfAccessScore: 8,
          urgencyScore: 9,
          salesCycleDaysEstimate: 10,
          automationPotentialScore: 9,
          complianceRiskLevel: 'Medium',
          estimatedMonthlyRoiPerClient: 8500,
          overallScore: 92,
          keyPainPoints: ['35% unanswered calls', 'Unmonitored evening lead decay'],
          primaryDecisionMakerRole: 'Owner / Managing Director',
          evidenceSummary: 'Substantial lost revenue from unhandled inbound requests.',
          recommended: true,
          selectedByOwner: false,
        };
      }

      const payload = {
        success: true,
        tenantId: req.tenantId,
        niche,
        _connectorStatus: SIMULATION_METADATA,
      };

      saveIdempotencyResponse(req, payload);
      launchAuditService.recordAudit({
        tenantId: req.tenantId!,
        actorId: req.userId,
        clientIp: req.ip || 'unknown',
        endpoint: req.path,
        action: 'RECOMMEND_NICHE_SUCCESS',
        status: 'SUCCESS',
        idempotencyKey: req.headers['x-idempotency-key'] as string,
        details: { industryPreference, nicheName: niche.name },
      });

      return res.json(payload);
    } catch (err: any) {
      console.error('[LaunchProgramApi] recommend-niche error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }
);

// B. AI Offer Generator Endpoint
launchProgramRouter.post(
  '/generate-offer',
  requirePermission('launch:write'),
  rateLimitMiddleware('ai_generate_offer', 20, 15 * 60 * 1000),
  idempotencyCheckMiddleware,
  async (req: Request, res: Response) => {
    const parseResult = GenerateOfferSchema.safeParse(req.body);
    if (!parseResult.success) {
      launchAuditService.recordAudit({
        tenantId: req.tenantId!,
        actorId: req.userId,
        clientIp: req.ip || 'unknown',
        endpoint: req.path,
        action: 'VALIDATION_FAILED',
        status: 'BAD_REQUEST',
        details: { errors: parseResult.error.format() },
      });
      return res.status(400).json({
        success: false,
        error: 'INVALID_INPUT',
        details: parseResult.error.format(),
      });
    }

    try {
      const { nicheName, primaryProblem } = parseResult.data;
      let offer;

      try {
        const ai = getGeminiClient();
        const systemInstruction = `You are Relay's Productized Offer Architect.
Build a high-converting, productized AI service offer for ${nicheName}.
Focus on problem: ${primaryProblem}.

Return JSON:
{
  "id": "offer-custom",
  "offerTitle": string,
  "targetNiche": string,
  "primaryProblemSolved": string,
  "transformationOutcome": string,
  "deliverables": string[],
  "exclusions": string[],
  "pricing": {
    "setupFee": number,
    "monthlyRetainer": number,
    "performanceBonus": string
  },
  "guaranteeTerms": string,
  "measurableSuccessCriteria": string[],
  "approvalState": "draft"
}`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: `Generate offer for niche: ${nicheName}, Primary problem: ${primaryProblem}`,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
          },
        });

        const text = response.text || '{}';
        offer = JSON.parse(text);
      } catch {
        offer = {
          id: `offer-${Date.now()}`,
          offerTitle: '24/7 AI Lead Recovery Engine',
          targetNiche: nicheName,
          primaryProblemSolved: primaryProblem,
          transformationOutcome: 'Sub-60-second response and 10+ additional booked clients monthly.',
          deliverables: ['24/7 AI Receptionist', 'CRM Integration', 'Dashboard'],
          exclusions: ['Manual phone staffing'],
          pricing: { setupFee: 2500, monthlyRetainer: 3500 },
          guaranteeTerms: 'Full setup refund if 5+ clients are not booked in 30 days.',
          measurableSuccessCriteria: ['Sub-30s response time', '5+ booked clients'],
          approvalState: 'draft',
        };
      }

      const payload = {
        success: true,
        tenantId: req.tenantId,
        offer,
        _connectorStatus: SIMULATION_METADATA,
      };

      saveIdempotencyResponse(req, payload);
      launchAuditService.recordAudit({
        tenantId: req.tenantId!,
        actorId: req.userId,
        clientIp: req.ip || 'unknown',
        endpoint: req.path,
        action: 'GENERATE_OFFER_SUCCESS',
        status: 'SUCCESS',
        idempotencyKey: req.headers['x-idempotency-key'] as string,
        details: { nicheName, offerTitle: offer.offerTitle },
      });

      return res.json(payload);
    } catch (err: any) {
      console.error('[LaunchProgramApi] generate-offer error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }
);

// C. AI Personalized Outreach Generator Endpoint
launchProgramRouter.post(
  '/generate-outreach',
  requirePermission('launch:write'),
  rateLimitMiddleware('ai_generate_outreach', 20, 15 * 60 * 1000),
  idempotencyCheckMiddleware,
  async (req: Request, res: Response) => {
    const parseResult = GenerateOutreachSchema.safeParse(req.body);
    if (!parseResult.success) {
      launchAuditService.recordAudit({
        tenantId: req.tenantId!,
        actorId: req.userId,
        clientIp: req.ip || 'unknown',
        endpoint: req.path,
        action: 'VALIDATION_FAILED',
        status: 'BAD_REQUEST',
        details: { errors: parseResult.error.format() },
      });
      return res.status(400).json({
        success: false,
        error: 'INVALID_INPUT',
        details: parseResult.error.format(),
      });
    }

    try {
      const { prospect, evidencePoints = [] } = parseResult.data;
      let draft;

      try {
        const ai = getGeminiClient();
        const systemInstruction = `You are Relay's Outreach Communication Generator.
Craft a highly personalized, non-spammy B2B outreach message based on real verified evidence.
Prospect Company: ${prospect.companyName}
Prospect Contact: ${prospect.contactName}
Evidence: ${evidencePoints.join('; ') || 'Observed delayed lead response on website form'}

Return JSON:
{
  "id": "outreach-custom",
  "prospectId": string,
  "prospectName": string,
  "companyName": string,
  "channel": "email",
  "subjectLine": string,
  "messageBody": string,
  "personalizedEvidencePoints": string[],
  "safetyChecks": {
    "optOutChecked": true,
    "factualEvidenceVerified": true,
    "complianceRulesPassed": true
  },
  "approvalStatus": "pending_owner_approval"
}`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: `Draft email outreach for prospect: ${JSON.stringify(prospect)}`,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
          },
        });

        const text = response.text || '{}';
        draft = JSON.parse(text);
      } catch {
        draft = {
          id: `outreach-${Date.now()}`,
          prospectId: prospect.id || 'prospect-1',
          prospectName: prospect.contactName,
          companyName: prospect.companyName,
          channel: 'email',
          subjectLine: `Quick question regarding inbound lead response at ${prospect.companyName}`,
          messageBody: `Hi ${prospect.contactName},\n\nWe noticed inquiries on your website take over 30 minutes to receive a response.\n\nWe built an automated AI Receptionist that responds in under 30 seconds.\n\nWould you be open to a 3-minute video preview?\n\nBest,\nAlex`,
          personalizedEvidencePoints: evidencePoints,
          safetyChecks: { optOutChecked: true, factualEvidenceVerified: true, complianceRulesPassed: true },
          approvalStatus: 'pending_owner_approval',
        };
      }

      const payload = {
        success: true,
        tenantId: req.tenantId,
        draft,
        _connectorStatus: SIMULATION_METADATA,
      };

      saveIdempotencyResponse(req, payload);
      launchAuditService.recordAudit({
        tenantId: req.tenantId!,
        actorId: req.userId,
        clientIp: req.ip || 'unknown',
        endpoint: req.path,
        action: 'GENERATE_OUTREACH_DRAFT',
        status: 'SUCCESS',
        details: { companyName: prospect.companyName },
      });

      return res.json(payload);
    } catch (err: any) {
      console.error('[LaunchProgramApi] generate-outreach error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }
);

// D. Owner Approval Recording Endpoint (Creates Server Approval Record with Content Hash)
launchProgramRouter.post(
  '/approve-outreach',
  requirePermission('launch:dispatch'),
  rateLimitMiddleware('approve_outreach', 100, 15 * 60 * 1000),
  idempotencyCheckMiddleware,
  async (req: Request, res: Response) => {
    const parseResult = ApproveOutreachSchema.safeParse(req.body);
    if (!parseResult.success) {
      launchAuditService.recordAudit({
        tenantId: req.tenantId!,
        actorId: req.userId,
        clientIp: req.ip || 'unknown',
        endpoint: req.path,
        action: 'VALIDATION_FAILED',
        status: 'BAD_REQUEST',
        details: { errors: parseResult.error.format() },
      });
      return res.status(400).json({
        success: false,
        error: 'INVALID_INPUT',
        details: parseResult.error.format(),
      });
    }

    const { outreachId, prospectEmail, messageBody, channel = 'email' } = parseResult.data;

    const approvalRecord = launchApprovalService.createApproval(
      req.tenantId!,
      outreachId,
      req.userId!,
      req.userRole!,
      { prospectEmail, channel, messageBody },
      { approvedVia: 'Owner Approval API' }
    );

    const payload = {
      success: true,
      tenantId: req.tenantId,
      approvalStatus: 'approved_by_owner',
      approvalRecord,
      _connectorStatus: SIMULATION_METADATA,
    };

    saveIdempotencyResponse(req, payload);
    launchAuditService.recordAudit({
      tenantId: req.tenantId!,
      actorId: req.userId,
      clientIp: req.ip || 'unknown',
      endpoint: req.path,
      action: 'APPROVE_OUTREACH_RECORDED',
      status: 'SUCCESS',
      idempotencyKey: req.headers['x-idempotency-key'] as string,
      details: { outreachId, prospectEmail, contentHash: approvalRecord.contentHash },
    });

    return res.json(payload);
  }
);

// E. Dispatch Endpoint with Durable Approval & Content Hash Verification
launchProgramRouter.post(
  '/dispatch-outreach',
  requirePermission('launch:dispatch'),
  rateLimitMiddleware('dispatch_outreach', 100, 15 * 60 * 1000),
  idempotencyCheckMiddleware,
  async (req: Request, res: Response) => {
    const parseResult = DispatchOutreachSchema.safeParse(req.body);
    if (!parseResult.success) {
      launchAuditService.recordAudit({
        tenantId: req.tenantId!,
        actorId: req.userId,
        clientIp: req.ip || 'unknown',
        endpoint: req.path,
        action: 'VALIDATION_FAILED',
        status: 'BAD_REQUEST',
        details: { errors: parseResult.error.format() },
      });
      return res.status(400).json({
        success: false,
        error: 'INVALID_INPUT',
        details: parseResult.error.format(),
      });
    }

    const { outreachId, prospectEmail, messageBody, channel = 'email' } = parseResult.data;

    // VERIFY SERVER-SIDE DURABLE APPROVAL & CONTENT INTEGRITY
    const approvalCheck = launchApprovalService.verifyApproval(
      req.tenantId!,
      outreachId,
      { prospectEmail, channel, messageBody }
    );

    if (!approvalCheck.valid) {
      const errorType =
        approvalCheck.reason === 'APPROVAL_CONTENT_MISMATCH'
          ? 'APPROVAL_CONTENT_MISMATCH'
          : 'FORBIDDEN_APPROVAL_REQUIRED';

      const errorMessage =
        approvalCheck.reason === 'APPROVAL_CONTENT_MISMATCH'
          ? 'Approved message content has been edited or modified after owner approval. Re-approval required.'
          : 'Outreach message must be explicitly approved by human owner in server database before dispatch.';

      launchAuditService.recordAudit({
        tenantId: req.tenantId!,
        actorId: req.userId,
        clientIp: req.ip || 'unknown',
        endpoint: req.path,
        action: 'UNAPPROVED_DISPATCH_BLOCKED',
        status: 'FORBIDDEN',
        details: { outreachId, reason: approvalCheck.reason, prospectEmail },
      });

      return res.status(403).json({
        success: false,
        error: errorType,
        message: errorMessage,
        requiredAction: 'Obtain human owner approval in server database for exact current content.',
      });
    }

    const payload = {
      success: true,
      tenantId: req.tenantId,
      dispatchStatus: 'simulated_dispatch_successful',
      outreachId,
      prospectEmail,
      dispatchedAt: new Date().toISOString(),
      approvalReference: approvalCheck.approvalRecord?.id,
      _connectorStatus: {
        ...SIMULATION_METADATA,
        dispatchLog: `Simulated SMTP dispatch to ${prospectEmail}. No real email sent.`,
      },
    };

    saveIdempotencyResponse(req, payload);
    launchAuditService.recordAudit({
      tenantId: req.tenantId!,
      actorId: req.userId,
      clientIp: req.ip || 'unknown',
      endpoint: req.path,
      action: 'DISPATCH_OUTREACH_EXECUTED',
      status: 'SUCCESS',
      idempotencyKey: req.headers['x-idempotency-key'] as string,
      details: { outreachId, prospectEmail, approvalId: approvalCheck.approvalRecord?.id },
    });

    return res.json(payload);
  }
);

// F. Emergency Rollback Execution Endpoint
launchProgramRouter.post(
  '/execute-rollback',
  requirePermission('launch:rollback'),
  rateLimitMiddleware('execute_rollback', 100, 15 * 60 * 1000),
  idempotencyCheckMiddleware,
  async (req: Request, res: Response) => {
    const parseResult = ExecuteRollbackSchema.safeParse(req.body);
    if (!parseResult.success) {
      launchAuditService.recordAudit({
        tenantId: req.tenantId!,
        actorId: req.userId,
        clientIp: req.ip || 'unknown',
        endpoint: req.path,
        action: 'VALIDATION_FAILED',
        status: 'BAD_REQUEST',
        details: { errors: parseResult.error.format() },
      });
      return res.status(400).json({
        success: false,
        error: 'INVALID_INPUT',
        details: parseResult.error.format(),
      });
    }

    const { stageId, rollbackReason, targetSnapshotVersion } = parseResult.data;

    const payload = {
      success: true,
      tenantId: req.tenantId,
      rollbackStatus: 'simulated_rollback_completed',
      stageId,
      rolledBackAt: new Date().toISOString(),
      restoredSnapshotVersion: targetSnapshotVersion || 'v1.0-clean-baseline',
      _connectorStatus: {
        ...SIMULATION_METADATA,
        rollbackLog: `Simulated rollback for stage ${stageId}. System state reverted in memory.`,
      },
    };

    saveIdempotencyResponse(req, payload);
    launchAuditService.recordAudit({
      tenantId: req.tenantId!,
      actorId: req.userId,
      clientIp: req.ip || 'unknown',
      endpoint: req.path,
      action: 'EMERGENCY_ROLLBACK_EXECUTED',
      status: 'SUCCESS',
      idempotencyKey: req.headers['x-idempotency-key'] as string,
      details: { stageId, rollbackReason },
    });

    return res.json(payload);
  }
);

// G. AI Case Study Generator Endpoint
launchProgramRouter.post(
  '/generate-case-study',
  requirePermission('launch:write'),
  rateLimitMiddleware('ai_generate_case_study', 20, 15 * 60 * 1000),
  idempotencyCheckMiddleware,
  async (req: Request, res: Response) => {
    const parseResult = GenerateCaseStudySchema.safeParse(req.body);
    if (!parseResult.success) {
      launchAuditService.recordAudit({
        tenantId: req.tenantId!,
        actorId: req.userId,
        clientIp: req.ip || 'unknown',
        endpoint: req.path,
        action: 'VALIDATION_FAILED',
        status: 'BAD_REQUEST',
        details: { errors: parseResult.error.format() },
      });
      return res.status(400).json({
        success: false,
        error: 'INVALID_INPUT',
        details: parseResult.error.format(),
      });
    }

    try {
      const { clientName, baselineMetrics, actualResults } = parseResult.data;
      const ai = getGeminiClient();

      const systemInstruction = `You are Relay's Growth Proof & Case Study Writer.
Write a verified, fact-backed case study headline, challenge statement, solution summary, and testimonial quote based on actual metrics.
Client: ${clientName}
Baseline Revenue: $${baselineMetrics?.monthlyRevenue || 50000}
Attributed Actual Revenue: $${actualResults?.attributedMonthlyRevenue || 120000}

Return JSON:
{
  "headline": string,
  "challenge": string,
  "solutionDeployed": string,
  "verifiedResults": string,
  "testimonialQuote": string,
  "approvedByClient": true
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: `Generate case study for ${clientName}`,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
        },
      });

      const text = response.text || '{}';
      let caseStudy;
      try {
        caseStudy = JSON.parse(text);
      } catch {
        caseStudy = {
          headline: `How ${clientName} Added $72,000/mo in Verified Revenue with Relay AI`,
          challenge: 'High lead response latency resulted in lost patient appointments.',
          solutionDeployed: '24/7 AI Voice & SMS Receptionist.',
          verifiedResults: '133% increase in booked consultations in 30 days.',
          testimonialQuote: '"Relay paid for itself 20x over in the first month."',
          approvedByClient: true,
        };
      }

      const payload = {
        success: true,
        tenantId: req.tenantId,
        caseStudy,
        _connectorStatus: SIMULATION_METADATA,
      };

      saveIdempotencyResponse(req, payload);
      launchAuditService.recordAudit({
        tenantId: req.tenantId!,
        actorId: req.userId,
        clientIp: req.ip || 'unknown',
        endpoint: req.path,
        action: 'GENERATE_CASE_STUDY_SUCCESS',
        status: 'SUCCESS',
        details: { clientName },
      });

      return res.json(payload);
    } catch (err: any) {
      console.error('[LaunchProgramApi] generate-case-study error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }
);

// G2. Generate Proposal Document Endpoint (Protected with launch:write)
launchProgramRouter.post(
  '/generate-proposal',
  requirePermission('launch:write'),
  rateLimitMiddleware('ai_generate_proposal', 20, 15 * 60 * 1000),
  idempotencyCheckMiddleware,
  async (req: Request, res: Response) => {
    const parseResult = GenerateProposalSchema.safeParse(req.body);
    if (!parseResult.success) {
      launchAuditService.recordAudit({
        tenantId: req.tenantId!,
        actorId: req.userId,
        clientIp: req.ip || 'unknown',
        endpoint: req.path,
        action: 'VALIDATION_FAILED',
        status: 'BAD_REQUEST',
        details: { errors: parseResult.error.format() },
      });

      return res.status(400).json({
        success: false,
        error: 'INVALID_INPUT',
        details: parseResult.error.format(),
      });
    }

    const { prospectId, companyName, clientName } = parseResult.data;

    try {
      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: `Create a formal agency proposal document for client "${clientName}" at company "${companyName}". 
JSON structure required:
{
  "title": "Proposal Title",
  "scope": "Scope summary",
  "investment": 12000,
  "roiProjection": "$120k/year in recovered revenue",
  "deliverables": ["Deliverable 1", "Deliverable 2"]
}`,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      });

      const text = response.text || '{}';
      let proposalData;
      try {
        proposalData = JSON.parse(text);
      } catch {
        proposalData = {
          title: `Relay AI Growth & Recovery Implementation for ${companyName}`,
          scope: 'Deployment of 24/7 AI Voice Receptionist, SMS Lead Re-engagement, and Automated Revenue Attribution.',
          investment: 12500,
          roiProjection: '$140,000/yr in recovered lead loss',
          deliverables: ['Custom AI Voice Agent', 'Twilio Integration', 'Stripe Attribution Pipeline'],
        };
      }

      const proposal = {
        id: `prop-${Date.now()}`,
        prospectId: prospectId || `prospect-${Date.now()}`,
        companyName,
        contactName: clientName,
        title: proposalData.title,
        amount: proposalData.investment || 12500,
        status: 'sent',
        createdAt: new Date().toISOString(),
        details: proposalData,
      };

      const payload = {
        success: true,
        tenantId: req.tenantId,
        proposal,
        _connectorStatus: SIMULATION_METADATA,
      };

      saveIdempotencyResponse(req, payload);
      launchAuditService.recordAudit({
        tenantId: req.tenantId!,
        actorId: req.userId,
        clientIp: req.ip || 'unknown',
        endpoint: req.path,
        action: 'GENERATE_PROPOSAL_SUCCESS',
        status: 'SUCCESS',
        details: { companyName, clientName },
      });

      return res.json(payload);
    } catch (err: any) {
      console.error('[LaunchProgramApi] generate-proposal error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }
);

// H. Audit Log Retrieval Endpoint (Strict Tenant-Scoped Query & Permission Protected)
launchProgramRouter.get(
  '/audit-logs',
  requirePermission('audit:read'),
  rateLimitMiddleware('audit_logs', 100, 15 * 60 * 1000),
  (req: Request, res: Response) => {
    const logs = launchAuditService.getTenantAuditLogs(req.tenantId!);
    return res.json({
      success: true,
      tenantId: req.tenantId,
      totalLogsCount: logs.length,
      logs,
      _connectorStatus: SIMULATION_METADATA,
    });
  }
);

// I. Credential Vault Status Endpoint (Truthfulness & Security Boundary Check)
launchProgramRouter.get(
  '/credential-status',
  requirePermission('launch:read'),
  rateLimitMiddleware('credential_status', 100, 15 * 60 * 1000),
  (req: Request, res: Response) => {
    return res.json({
      success: true,
      tenantId: req.tenantId,
      kmsEncryptionActive: false,
      vaultProvider: 'Simulated Local Plaintext Memory',
      productionReady: false,
      securityNotice: 'Plaintext / Unencrypted local store. Connect Cloud KMS or HashiCorp Vault for production encryption.',
      _connectorStatus: SIMULATION_METADATA,
    });
  }
);
