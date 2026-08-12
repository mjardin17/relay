import { Router, Request, Response } from 'express';
import { z } from 'zod';
import {
  authMiddleware,
  requirePermission,
  rateLimitMiddleware,
  idempotencyCheckMiddleware,
  saveIdempotencyResponse,
} from './launchProgramApi';
import { GBPConnectorService } from '../services/gbpConnectorService';
import { LaunchAuditService } from '../services/launchAuditService';
import { LaunchApprovalService } from '../services/launchApprovalService';
import { getDatabase } from '../db/database';

export const gbpLaunchRouter = Router();

const gbpService = new GBPConnectorService();
const auditService = new LaunchAuditService();
const approvalService = new LaunchApprovalService();

// Apply auth middleware to all GBP launch endpoints
gbpLaunchRouter.use(authMiddleware);

// ---------------------------------------------------------------------------
// 1. Zod Validation Schemas
// ---------------------------------------------------------------------------
const BusinessIntakeSchema = z.object({
  clientId: z.string().min(1, 'clientId is required'),
  companyName: z.string().min(1, 'companyName is required'),
  accountType: z.enum(['storefront', 'service_area']),
  primaryCategory: z.string().min(1, 'primaryCategory is required'),
  secondaryCategories: z.array(z.string()).default([]),
  publicPhone: z.string().min(1, 'publicPhone is required'),
  websiteUrl: z.string().url('websiteUrl must be a valid URL'),
  businessHours: z.array(
    z.object({
      day: z.string(),
      open: z.string(),
      close: z.string(),
      closed: z.boolean().optional(),
    })
  ).default([]),
  serviceAreas: z.array(z.string()).min(1, 'At least 1 service area required'),
  servicesOffered: z.array(z.string()).min(1, 'At least 1 service required'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  photos: z.array(
    z.object({
      type: z.enum(['logo', 'cover', 'work_sample', 'team']),
      url: z.string(),
      caption: z.string(),
    })
  ).default([]),
  licenseNumber: z.string().optional(),
  licenseState: z.string().optional(),
  // Private verification address (separated from public map display)
  privateStreetAddress: z.string().min(1, 'privateStreetAddress is required'),
  privateUnit: z.string().optional(),
  privateCity: z.string().min(1, 'privateCity is required'),
  privateState: z.string().min(1, 'privateState is required'),
  privateZip: z.string().min(1, 'privateZip is required'),
});

const CheckDuplicatesSchema = z.object({
  profileId: z.string().min(1, 'profileId is required'),
});

const GeneratePlanSchema = z.object({
  profileId: z.string().min(1, 'profileId is required'),
});

const ApprovePlanSchema = z.object({
  profileId: z.string().min(1, 'profileId is required'),
  planPayload: z.object({}).passthrough(),
});

const TrackVerificationSchema = z.object({
  profileId: z.string().min(1, 'profileId is required'),
  verificationMethod: z.enum(['postcard', 'phone', 'video', 'email', 'manual_guided']),
  verificationState: z.enum([
    'not_started',
    'info_validated',
    'duplicate_checked',
    'plan_approved',
    'verification_requested',
    'verification_pending',
    'verified_active',
    'suspended',
    'action_required',
  ]),
});

const CreatePostSchema = z.object({
  profileId: z.string().min(1, 'profileId is required'),
  postType: z.enum(['standard', 'offer', 'event']),
  summary: z.string().min(5, 'summary must be at least 5 characters'),
  callToAction: z.object({
    actionType: z.enum(['BOOK', 'ORDER', 'LEARN_MORE', 'CALL']),
    url: z.string().optional(),
  }).optional(),
  mediaUrl: z.string().optional(),
});

const ApprovePostSchema = z.object({
  postId: z.string().min(1, 'postId is required'),
  postContent: z.object({}).passthrough(),
});

const PublishPostSchema = z.object({
  postId: z.string().min(1, 'postId is required'),
  postContent: z.object({}).passthrough(),
});

const ReviewReplyDraftSchema = z.object({
  reviewId: z.string().min(1, 'reviewId is required'),
});

const ApproveReviewReplySchema = z.object({
  reviewId: z.string().min(1, 'reviewId is required'),
  replyText: z.string().min(1, 'replyText is required'),
});

const SubmitReviewReplySchema = z.object({
  reviewId: z.string().min(1, 'reviewId is required'),
  replyText: z.string().min(1, 'replyText is required'),
});

// ---------------------------------------------------------------------------
// 2. Endpoints
// ---------------------------------------------------------------------------

// A. Connector Status Endpoint
gbpLaunchRouter.get('/connector-status', (req: Request, res: Response) => {
  const status = gbpService.getConnectorStatus(req.tenantId!);
  return res.json({ success: true, tenantId: req.tenantId, connectorStatus: status });
});

// B. Business Intake Submission Endpoint
gbpLaunchRouter.post(
  '/intake',
  requirePermission('launch:write'),
  rateLimitMiddleware('gbp_intake', 30, 15 * 60 * 1000),
  idempotencyCheckMiddleware,
  async (req: Request, res: Response) => {
    const parseResult = BusinessIntakeSchema.safeParse(req.body);
    if (!parseResult.success) {
      auditService.recordAudit({
        tenantId: req.tenantId!,
        actorId: req.userId,
        clientIp: req.ip || 'unknown',
        endpoint: req.path,
        action: 'GBP_INTAKE_VALIDATION_FAILED',
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
      const intake = parseResult.data;
      const profile = gbpService.saveIntakeProfile(req.tenantId!, intake.clientId, intake);

      const payload = {
        success: true,
        tenantId: req.tenantId,
        profile,
        _connectorStatus: gbpService.getConnectorStatus(req.tenantId!),
      };

      saveIdempotencyResponse(req, payload);
      auditService.recordAudit({
        tenantId: req.tenantId!,
        actorId: req.userId,
        clientIp: req.ip || 'unknown',
        endpoint: req.path,
        action: 'GBP_INTAKE_SAVED',
        status: 'SUCCESS',
        details: { profileId: profile.id, companyName: profile.companyName },
      });

      return res.json(payload);
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
);

// C. Get Profile Endpoint
gbpLaunchRouter.get('/profile/:id', (req: Request, res: Response) => {
  const profile = gbpService.getProfileById(req.tenantId!, req.params.id);
  if (!profile) {
    return res.status(404).json({ success: false, error: 'GBP_PROFILE_NOT_FOUND' });
  }
  return res.json({ success: true, profile, _connectorStatus: gbpService.getConnectorStatus(req.tenantId!) });
});

// D. Check Duplicate Listings
gbpLaunchRouter.post(
  '/check-duplicates',
  requirePermission('launch:read'),
  rateLimitMiddleware('gbp_dup_check', 30, 15 * 60 * 1000),
  idempotencyCheckMiddleware,
  async (req: Request, res: Response) => {
    const parseResult = CheckDuplicatesSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ success: false, error: 'INVALID_INPUT', details: parseResult.error.format() });
    }

    try {
      const { profileId } = parseResult.data;
      const result = await gbpService.checkDuplicatesAndListings(req.tenantId!, profileId);

      const payload = {
        success: true,
        tenantId: req.tenantId,
        discovery: result,
        _connectorStatus: gbpService.getConnectorStatus(req.tenantId!),
      };

      saveIdempotencyResponse(req, payload);
      auditService.recordAudit({
        tenantId: req.tenantId!,
        actorId: req.userId,
        clientIp: req.ip || 'unknown',
        endpoint: req.path,
        action: 'GBP_DUPLICATE_CHECK_EXECUTED',
        status: 'SUCCESS',
        details: { profileId, decision: result.decision },
      });

      return res.json(payload);
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
);

// E. Generate Profile Plan
gbpLaunchRouter.post(
  '/generate-profile-plan',
  requirePermission('launch:write'),
  rateLimitMiddleware('gbp_plan_gen', 20, 15 * 60 * 1000),
  idempotencyCheckMiddleware,
  async (req: Request, res: Response) => {
    const parseResult = GeneratePlanSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ success: false, error: 'INVALID_INPUT', details: parseResult.error.format() });
    }

    try {
      const { profileId } = parseResult.data;
      const plan = await gbpService.generateProfilePlan(req.tenantId!, profileId);

      const payload = {
        success: true,
        tenantId: req.tenantId,
        plan,
        _connectorStatus: gbpService.getConnectorStatus(req.tenantId!),
      };

      saveIdempotencyResponse(req, payload);
      auditService.recordAudit({
        tenantId: req.tenantId!,
        actorId: req.userId,
        clientIp: req.ip || 'unknown',
        endpoint: req.path,
        action: 'GBP_PLAN_GENERATED',
        status: 'SUCCESS',
        details: { profileId },
      });

      return res.json(payload);
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
);

// F. Human Plan Approval Gate (Owner Gate)
gbpLaunchRouter.post(
  '/approve-profile-plan',
  requirePermission('launch:dispatch'),
  rateLimitMiddleware('gbp_plan_approve', 50, 15 * 60 * 1000),
  idempotencyCheckMiddleware,
  async (req: Request, res: Response) => {
    const parseResult = ApprovePlanSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ success: false, error: 'INVALID_INPUT', details: parseResult.error.format() });
    }

    try {
      const { profileId, planPayload } = parseResult.data;
      const approval = gbpService.approveProfilePlan(
        req.tenantId!,
        profileId,
        req.userId!,
        req.userRole!,
        planPayload
      );

      const payload = {
        success: true,
        tenantId: req.tenantId,
        approval,
        _connectorStatus: gbpService.getConnectorStatus(req.tenantId!),
      };

      saveIdempotencyResponse(req, payload);
      auditService.recordAudit({
        tenantId: req.tenantId!,
        actorId: req.userId,
        clientIp: req.ip || 'unknown',
        endpoint: req.path,
        action: 'GBP_PLAN_HUMAN_APPROVED',
        status: 'SUCCESS',
        details: { profileId, approvalId: approval.approvalId, contentHash: approval.contentHash },
      });

      return res.json(payload);
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
);

// G. Track Verification Status
gbpLaunchRouter.post(
  '/track-verification',
  requirePermission('launch:write'),
  rateLimitMiddleware('gbp_track_verif', 50, 15 * 60 * 1000),
  idempotencyCheckMiddleware,
  async (req: Request, res: Response) => {
    const parseResult = TrackVerificationSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ success: false, error: 'INVALID_INPUT', details: parseResult.error.format() });
    }

    try {
      const { profileId, verificationMethod, verificationState } = parseResult.data;
      const profile = gbpService.updateVerificationStatus(
        req.tenantId!,
        profileId,
        verificationMethod,
        verificationState
      );

      const payload = {
        success: true,
        tenantId: req.tenantId,
        profile,
        _connectorStatus: gbpService.getConnectorStatus(req.tenantId!),
      };

      saveIdempotencyResponse(req, payload);
      auditService.recordAudit({
        tenantId: req.tenantId!,
        actorId: req.userId,
        clientIp: req.ip || 'unknown',
        endpoint: req.path,
        action: 'GBP_VERIFICATION_STATUS_UPDATED',
        status: 'SUCCESS',
        details: { profileId, verificationMethod, verificationState },
      });

      return res.json(payload);
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
);

// H. Create Post Draft
gbpLaunchRouter.post(
  '/create-post-draft',
  requirePermission('launch:write'),
  rateLimitMiddleware('gbp_post_draft', 50, 15 * 60 * 1000),
  idempotencyCheckMiddleware,
  async (req: Request, res: Response) => {
    const parseResult = CreatePostSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ success: false, error: 'INVALID_INPUT', details: parseResult.error.format() });
    }

    try {
      const { profileId, postType, summary, callToAction, mediaUrl } = parseResult.data;
      const db = getDatabase();
      const postId = `gbp-post-${Date.now()}`;
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO gbp_posts (
          id, tenant_id, gbp_profile_id, post_type, summary, call_to_action_json,
          media_url, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', ?)
      `).run(
        postId,
        req.tenantId,
        profileId,
        postType,
        summary,
        JSON.stringify(callToAction || {}),
        mediaUrl || null,
        now
      );

      const postRow = db.prepare(`SELECT * FROM gbp_posts WHERE id = ? AND tenant_id = ?`).get(postId, req.tenantId) as any;

      const payload = {
        success: true,
        tenantId: req.tenantId,
        post: {
          id: postRow.id,
          profileId: postRow.gbp_profile_id,
          postType: postRow.post_type,
          summary: postRow.summary,
          callToAction: JSON.parse(postRow.call_to_action_json || '{}'),
          status: postRow.status,
          createdAt: postRow.created_at,
        },
        _connectorStatus: gbpService.getConnectorStatus(req.tenantId!),
      };

      saveIdempotencyResponse(req, payload);
      auditService.recordAudit({
        tenantId: req.tenantId!,
        actorId: req.userId,
        clientIp: req.ip || 'unknown',
        endpoint: req.path,
        action: 'GBP_POST_DRAFT_CREATED',
        status: 'SUCCESS',
        details: { postId, profileId, postType },
      });

      return res.json(payload);
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
);

// I. Approve Post (Owner Approval with SHA-256 Hash)
gbpLaunchRouter.post(
  '/approve-post',
  requirePermission('launch:dispatch'),
  rateLimitMiddleware('gbp_approve_post', 50, 15 * 60 * 1000),
  idempotencyCheckMiddleware,
  async (req: Request, res: Response) => {
    const parseResult = ApprovePostSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ success: false, error: 'INVALID_INPUT', details: parseResult.error.format() });
    }

    try {
      const { postId, postContent } = parseResult.data;
      const db = getDatabase();

      const postRow = db.prepare(`SELECT * FROM gbp_posts WHERE id = ? AND tenant_id = ?`).get(postId, req.tenantId) as any;
      if (!postRow) {
        return res.status(404).json({ success: false, error: 'POST_NOT_FOUND' });
      }

      const contentHash = approvalService.computeContentHash(postContent);
      const approvalId = `gbp-appr-post-${Date.now()}`;
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO gbp_content_approvals (
          id, tenant_id, gbp_profile_id, content_type, content_payload_json,
          content_hash, approver_id, approver_role, decision, dispatch_status, approved_at, created_at
        ) VALUES (?, ?, ?, 'post', ?, ?, ?, ?, 'approved', 'pending', ?, ?)
      `).run(
        approvalId,
        req.tenantId,
        postRow.gbp_profile_id,
        JSON.stringify(postContent),
        contentHash,
        req.userId,
        req.userRole,
        now,
        now
      );

      db.prepare(`
        UPDATE gbp_posts SET approval_id = ?, status = 'approved' WHERE id = ? AND tenant_id = ?
      `).run(approvalId, postId, req.tenantId);

      const payload = {
        success: true,
        tenantId: req.tenantId,
        approval: { approvalId, postId, contentHash, approvedAt: now },
        _connectorStatus: gbpService.getConnectorStatus(req.tenantId!),
      };

      saveIdempotencyResponse(req, payload);
      auditService.recordAudit({
        tenantId: req.tenantId!,
        actorId: req.userId,
        clientIp: req.ip || 'unknown',
        endpoint: req.path,
        action: 'GBP_POST_HUMAN_APPROVED',
        status: 'SUCCESS',
        details: { postId, approvalId, contentHash },
      });

      return res.json(payload);
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
);

// J. Publish Post (Requires Human Approval + Tamper Verification)
gbpLaunchRouter.post(
  '/publish-post',
  requirePermission('launch:dispatch'),
  rateLimitMiddleware('gbp_pub_post', 50, 15 * 60 * 1000),
  idempotencyCheckMiddleware,
  async (req: Request, res: Response) => {
    const parseResult = PublishPostSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ success: false, error: 'INVALID_INPUT', details: parseResult.error.format() });
    }

    try {
      const { postId, postContent } = parseResult.data;
      const db = getDatabase();

      const postRow = db.prepare(`SELECT * FROM gbp_posts WHERE id = ? AND tenant_id = ?`).get(postId, req.tenantId) as any;
      if (!postRow) {
        return res.status(404).json({ success: false, error: 'POST_NOT_FOUND' });
      }

      if (!postRow.approval_id || postRow.status !== 'approved') {
        auditService.recordAudit({
          tenantId: req.tenantId!,
          actorId: req.userId,
          clientIp: req.ip || 'unknown',
          endpoint: req.path,
          action: 'GBP_POST_PUBLISH_UNAPPROVED_BLOCKED',
          status: 'FORBIDDEN',
          details: { postId },
        });

        return res.status(403).json({
          success: false,
          error: 'FORBIDDEN_APPROVAL_REQUIRED',
          message: 'GBP post must be explicitly approved by human owner before publishing.',
        });
      }

      // Verify SHA-256 Hash Tamper Detection
      const approvalRow = db.prepare(`SELECT content_hash FROM gbp_content_approvals WHERE id = ? AND tenant_id = ?`).get(postRow.approval_id, req.tenantId) as any;
      const currentHash = approvalService.computeContentHash(postContent);

      if (!approvalRow || approvalRow.content_hash !== currentHash) {
        auditService.recordAudit({
          tenantId: req.tenantId!,
          actorId: req.userId,
          clientIp: req.ip || 'unknown',
          endpoint: req.path,
          action: 'GBP_POST_PUBLISH_TAMPER_DETECTED',
          status: 'FORBIDDEN',
          details: { postId, expectedHash: approvalRow?.content_hash, currentHash },
        });

        return res.status(403).json({
          success: false,
          error: 'APPROVAL_CONTENT_MISMATCH',
          message: 'Post content has been modified since human approval. Re-approval required.',
        });
      }

      const now = new Date().toISOString();
      db.prepare(`
        UPDATE gbp_posts SET status = 'published_manual', published_at = ? WHERE id = ? AND tenant_id = ?
      `).run(now, postId, req.tenantId);

      db.prepare(`
        UPDATE gbp_content_approvals SET dispatch_status = 'dispatched_manual', dispatched_at = ? WHERE id = ? AND tenant_id = ?
      `).run(now, postRow.approval_id, req.tenantId);

      const payload = {
        success: true,
        tenantId: req.tenantId,
        publishStatus: 'published_manual_guided',
        postId,
        publishedAt: now,
        _connectorStatus: gbpService.getConnectorStatus(req.tenantId!),
      };

      saveIdempotencyResponse(req, payload);
      auditService.recordAudit({
        tenantId: req.tenantId!,
        actorId: req.userId,
        clientIp: req.ip || 'unknown',
        endpoint: req.path,
        action: 'GBP_POST_PUBLISHED_GUIDED',
        status: 'SUCCESS',
        details: { postId, approvalId: postRow.approval_id },
      });

      return res.json(payload);
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
);

// K. Tenant Audit Logs Endpoint
gbpLaunchRouter.get('/audit-logs', requirePermission('audit:read'), (req: Request, res: Response) => {
  const db = getDatabase();
  const logs = db.prepare(`
    SELECT id, tenant_id, actor_id, client_ip, endpoint, action, status, details_json, created_at
    FROM launch_audit_logs
    WHERE tenant_id = ? AND action LIKE 'GBP_%'
    ORDER BY created_at DESC
    LIMIT 100
  `).all(req.tenantId) as any[];

  return res.json({
    success: true,
    tenantId: req.tenantId,
    totalLogsCount: logs.length,
    logs: logs.map((l) => ({
      ...l,
      details: JSON.parse(l.details_json || '{}'),
    })),
  });
});
