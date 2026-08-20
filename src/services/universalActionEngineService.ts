import crypto from 'node:crypto';
import { getDatabase } from '../db/database';
import {
  UniversalActionRequest,
  UniversalActionRecord,
  UniversalActionExecutionResult,
  UniversalActionState,
  UniversalApprovalState
} from '../types/universalActionEngine';
import { AuthoritativeConnectorRegistryService } from './authoritativeConnectorRegistryService';
import { EmergencyControlService } from './emergencyControlService';
import { LaunchAuditService } from './launchAuditService';
import { EvidenceGraphService } from './evidenceGraphService';
import { ProviderAdapterRegistry, ProviderExecutionOutcome } from './providerAdapters/universalProviderAdapters';

export class UniversalActionEngineService {
  private static instance: UniversalActionEngineService;
  private connectorRegistry: AuthoritativeConnectorRegistryService;
  private emergencyControls: EmergencyControlService;
  private auditService: LaunchAuditService;
  private evidenceGraph: EvidenceGraphService;
  private adapterRegistry: ProviderAdapterRegistry;

  private constructor() {
    this.connectorRegistry = AuthoritativeConnectorRegistryService.getInstance();
    this.emergencyControls = EmergencyControlService.getInstance();
    this.auditService = LaunchAuditService.getInstance();
    this.evidenceGraph = EvidenceGraphService.getInstance();
    this.adapterRegistry = ProviderAdapterRegistry.getInstance();
  }

  public static getInstance(): UniversalActionEngineService {
    if (!UniversalActionEngineService.instance) {
      UniversalActionEngineService.instance = new UniversalActionEngineService();
    }
    return UniversalActionEngineService.instance;
  }

  private canonicalJson(obj: any): string {
    if (obj === null || typeof obj !== 'object') {
      return JSON.stringify(obj);
    }
    if (Array.isArray(obj)) {
      return `[${obj.map((item) => this.canonicalJson(item)).join(',')}]`;
    }
    const keys = Object.keys(obj).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${this.canonicalJson(obj[k])}`).join(',')}}`;
  }

  public generateIdempotencyKey(tenantId: string, actionType: string, inputPayload?: Record<string, any>): string {
    const safePayload = inputPayload || {};
    const serialized = this.canonicalJson(safePayload);
    const hash = crypto.createHash('sha256').update(`${tenantId}:${actionType}:${serialized}`).digest('hex');
    return `idemp_${actionType.toLowerCase()}_${hash.substring(0, 16)}`;
  }

  public generateFingerprint(payload?: Record<string, any>): string {
    const safePayload = payload || {};
    const serialized = this.canonicalJson(safePayload);
    return crypto.createHash('sha256').update(serialized).digest('hex');
  }

  /**
   * Universal Lifecycle Step 1-5:
   * REQUEST -> VALIDATE -> AUTHORIZE -> PLAN -> APPROVAL CHECK -> QUEUE
   */
  public async submitAction(request: UniversalActionRequest): Promise<UniversalActionRecord> {
    const db = getDatabase();
    const now = new Date().toISOString();
    const actionId = `act_${request.tenantId}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const payload = request.input || (request as any).inputPayload || {};
    const idempotencyKey = request.idempotencyKey || this.generateIdempotencyKey(request.tenantId, request.actionType, payload);
    const inputFingerprint = this.generateFingerprint(payload);

    // 1. Idempotency Check with Payload Conflict Detection
    const existingRow = db.prepare(`
      SELECT * FROM universal_action_records WHERE tenant_id = ? AND idempotency_key = ?
    `).get(request.tenantId, idempotencyKey) as any;

    if (existingRow) {
      if (existingRow.input_fingerprint !== inputFingerprint) {
        throw new Error(
          `IDEMPOTENCY_CONFLICT: Idempotency key '${idempotencyKey}' was already submitted with a different payload hash.`
        );
      }
      return this.mapRowToRecord(existingRow);
    }

    // 2. Validate input and connector catalog
    const connectorDef = this.connectorRegistry.getCatalogDefinition(request.provider);
    if (!connectorDef) {
      throw new Error(`VALIDATION_FAILED: Unknown connector provider ${request.provider}`);
    }

    const validatedAt = new Date().toISOString();

    // 3. Authorize: check emergency control
    const emergencyState = this.emergencyControls.getEmergencyStatus(request.tenantId);
    if (emergencyState.isEmergencyPaused) {
      const errorMsg = `SYSTEM_PAUSED_EMERGENCY: All automation is currently paused. Reason: ${emergencyState.reason || 'Safety hold'}`;
      const record = this.createInitialRecord({
        id: actionId,
        request,
        idempotencyKey,
        inputFingerprint,
        executionState: 'AUTHORIZE_FAILED',
        approvalState: 'NOT_REQUIRED',
        approvalRequired: false,
        validatedAt,
        error: { code: 'EMERGENCY_PAUSED', message: errorMsg, failedClosed: true }
      });
      return record;
    }

    const authorizedAt = new Date().toISOString();

    // 4. Plan & Check Approval Requirement
    // Mandatory approval policy: cannot be bypassed by requiresApprovalOverride: false
    const policyRequiresApproval =
      connectorDef.approvalRequirements.some((op) => request.actionType.includes(op) || op.includes(request.actionType)) ||
      request.actor.role === 'AI_AGENT';

    const requiresApproval = policyRequiresApproval || request.requiresApprovalOverride === true;

    const plannedAt = new Date().toISOString();
    const initialApprovalState: UniversalApprovalState = requiresApproval ? 'PENDING_APPROVAL' : 'NOT_REQUIRED';
    const initialExecutionState: UniversalActionState = requiresApproval ? 'PENDING_APPROVAL' : 'QUEUED';

    const record = this.createInitialRecord({
      id: actionId,
      request,
      idempotencyKey,
      inputFingerprint,
      executionState: initialExecutionState,
      approvalState: initialApprovalState,
      approvalRequired: requiresApproval,
      validatedAt,
      authorizedAt,
      plannedAt,
      queuedAt: requiresApproval ? undefined : plannedAt
    });

    // If auto-executable (no approval required), we can process directly
    if (!requiresApproval) {
      return this.executeAction(actionId);
    }

    return record;
  }

  /**
   * Human Approver Decision with Cryptographic Signature Binding
   */
  public async decideApproval(
    actionId: string,
    params: {
      decision: 'APPROVE' | 'REJECT';
      approverId: string;
      approverRole: string;
      reason?: string;
    }
  ): Promise<UniversalActionRecord> {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM universal_action_records WHERE id = ?').get(actionId) as any;
    if (!row) {
      throw new Error(`ACTION_NOT_FOUND: ${actionId}`);
    }

    const record = this.mapRowToRecord(row);
    if (record.approvalState !== 'PENDING_APPROVAL') {
      throw new Error(`INVALID_APPROVAL_STATE: Action is currently ${record.approvalState}`);
    }

    // Role check: Only OWNER or ADMIN may approve
    const roleNormalized = (params.approverRole || '').toUpperCase();
    if (roleNormalized !== 'OWNER' && roleNormalized !== 'ADMIN') {
      throw new Error(`UNAUTHORIZED_APPROVER_ROLE: Role ${params.approverRole} is not authorized to approve consequential actions.`);
    }

    // Self-Approval Rejection
    if (record.actorId === params.approverId) {
      throw new Error(`SELF_APPROVAL_REJECTED: Proposer ${record.actorId} cannot approve their own action.`);
    }

    // Payload verification
    const currentFingerprint = this.generateFingerprint(record.inputPayload);
    if (currentFingerprint !== record.inputFingerprint) {
      throw new Error(`APPROVAL_PAYLOAD_TAMPERED: Payload does not match original submission hash.`);
    }

    const now = new Date().toISOString();
    const policyVersion = 'v1.0';
    const signaturePayload = `${record.tenantId}:${record.id}:${record.actionType}:${record.provider}:${record.inputFingerprint}:${record.actorId}:${params.approverId}:${params.decision}:${now}:${policyVersion}`;
    const approvalSignature = crypto.createHash('sha256').update(signaturePayload).digest('hex');

    if (params.decision === 'REJECT') {
      db.prepare(`
        UPDATE universal_action_records SET
          approval_state = 'REJECTED',
          execution_state = 'REJECTED',
          approved_by = ?,
          approved_at = ?,
          approval_reason = ?,
          approval_signature = ?,
          policy_version = ?,
          completed_at = ?,
          updated_at = ?
        WHERE id = ?
      `).run(params.approverId, now, params.reason || 'Rejected by operator', approvalSignature, policyVersion, now, now, actionId);

      this.auditService.logAuditEvent({
        tenantId: record.tenantId,
        actorId: params.approverId,
        action: 'ACTION_REJECTED',
        endpoint: '/api/universal-actions/approve',
        status: 'REJECTED',
        details: { actionId, actionType: record.actionType, reason: params.reason, approvalSignature }
      });

      return this.getAction(actionId)!;
    }

    // APPROVED: Transition to QUEUED and execute
    db.prepare(`
      UPDATE universal_action_records SET
        approval_state = 'APPROVED',
        execution_state = 'QUEUED',
        approved_by = ?,
        approved_at = ?,
        approval_reason = ?,
        approval_signature = ?,
        policy_version = ?,
        queued_at = ?,
        updated_at = ?
      WHERE id = ?
    `).run(params.approverId, now, params.reason || 'Approved by operator', approvalSignature, policyVersion, now, now, actionId);

    this.auditService.logAuditEvent({
      tenantId: record.tenantId,
      actorId: params.approverId,
      action: 'ACTION_APPROVED',
      endpoint: '/api/universal-actions/approve',
      status: 'APPROVED',
      details: { actionId, actionType: record.actionType, approvalSignature }
    });

    return this.executeAction(actionId);
  }

  /**
   * Universal Lifecycle Step 6-10:
   * QUEUE -> EXECUTE -> VERIFY -> RECORD RESULT -> AUDIT
   */
  public async executeAction(actionId: string): Promise<UniversalActionRecord> {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM universal_action_records WHERE id = ?').get(actionId) as any;
    if (!row) {
      throw new Error(`ACTION_NOT_FOUND: ${actionId}`);
    }

    const record = this.mapRowToRecord(row);
    const now = new Date().toISOString();

    // 1. Re-check Emergency Pause
    const emergencyState = this.emergencyControls.getEmergencyStatus(record.tenantId);
    if (emergencyState.isEmergencyPaused) {
      const error = {
        code: 'EMERGENCY_PAUSED',
        message: 'Action aborted. System is in emergency pause state.',
        failedClosed: true
      };
      this.updateExecutionState(actionId, 'FAILED_CLOSED', { error, completedAt: now });
      return this.getAction(actionId)!;
    }

    // 2. Re-check Approval if required
    if (record.approvalRequired && record.approvalState !== 'APPROVED') {
      const error = {
        code: 'APPROVAL_MISSING',
        message: `Action requires explicit approval before execution. Current state: ${record.approvalState}`,
        failedClosed: true
      };
      this.updateExecutionState(actionId, 'FAILED_CLOSED', { error, completedAt: now });
      return this.getAction(actionId)!;
    }

    // 3. Mark EXECUTING and increment attempt count
    this.recordExecutionAttemptStart(actionId, now);

    const tenantConnector = this.connectorRegistry.getTenantConnector(record.tenantId, record.provider);
    const catalogDef = this.connectorRegistry.getCatalogDefinition(record.provider);

    // 4. Perform execution via registered Provider Adapter
    try {
      const adapter = this.adapterRegistry.getAdapter(record.provider);
      const outcome = await adapter.execute(record, tenantConnector, catalogDef);

      if (!outcome.success || outcome.status === 'FAILED_CLOSED') {
        const completedAt = new Date().toISOString();
        const error = outcome.error || {
          code: 'EXECUTION_FAILED_CLOSED',
          message: `Provider adapter returned failure for ${record.provider}`,
          failedClosed: true
        };

        this.updateExecutionState(actionId, 'FAILED_CLOSED', {
          error,
          resultPayload: outcome.resultPayload,
          completedAt
        });

        this.auditService.logAuditEvent({
          tenantId: record.tenantId,
          actorId: record.actorId,
          action: `UNIVERSAL_EXECUTION_${record.actionType}`,
          endpoint: `/api/universal-actions/execute`,
          status: 'FAILED_CLOSED',
          details: { actionId, provider: record.provider, error: error.message }
        });

        return this.getAction(actionId)!;
      }

      // Step 9: VERIFYING
      const verifiedAt = new Date().toISOString();
      this.updateExecutionState(actionId, 'VERIFYING', { verifiedAt });

      if (!outcome.confirmedByProvider) {
        throw new Error(`PROVIDER_CONFIRMATION_MISSING: External provider ${record.provider} did not confirm execution.`);
      }

      // Step 10: SUCCEEDED & AUDIT
      const completedAt = new Date().toISOString();
      this.updateExecutionState(actionId, 'SUCCEEDED', {
        resultPayload: outcome.resultPayload,
        completedAt
      });

      this.auditService.logAuditEvent({
        tenantId: record.tenantId,
        actorId: record.actorId,
        action: `UNIVERSAL_EXECUTION_${record.actionType}`,
        endpoint: `/api/universal-actions/execute`,
        status: 'SUCCEEDED',
        details: {
          actionId,
          provider: record.provider,
          verifiedResourceId: outcome.verifiedResourceId,
          statusOutcome: outcome.status
        }
      });

      return this.getAction(actionId)!;
    } catch (err: any) {
      const completedAt = new Date().toISOString();
      const error = {
        code: 'EXECUTION_EXCEPTION',
        message: err?.message || 'External execution error',
        details: err?.stack,
        failedClosed: true
      };

      this.updateExecutionState(actionId, 'FAILED_CLOSED', {
        error,
        completedAt
      });

      this.auditService.logAuditEvent({
        tenantId: record.tenantId,
        actorId: record.actorId,
        action: `UNIVERSAL_EXECUTION_${record.actionType}`,
        endpoint: `/api/universal-actions/execute`,
        status: 'FAILED_CLOSED',
        details: { actionId, provider: record.provider, error: error.message }
      });

      return this.getAction(actionId)!;
    }
  }

  private recordExecutionAttemptStart(actionId: string, executedAt: string): void {
    const db = getDatabase();
    db.prepare(`
      UPDATE universal_action_records SET
        execution_state = 'EXECUTING',
        attempt_count = attempt_count + 1,
        executed_at = ?,
        updated_at = ?
      WHERE id = ?
    `).run(executedAt, executedAt, actionId);
  }

  private updateExecutionState(
    actionId: string,
    state: UniversalActionState,
    updates: {
      verifiedAt?: string;
      completedAt?: string;
      resultPayload?: any;
      error?: any;
    }
  ): void {
    const db = getDatabase();
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE universal_action_records SET
        execution_state = ?,
        verified_at = COALESCE(?, verified_at),
        completed_at = COALESCE(?, completed_at),
        result_payload_json = COALESCE(?, result_payload_json),
        error_json = COALESCE(?, error_json),
        updated_at = ?
      WHERE id = ?
    `).run(
      state,
      updates.verifiedAt || null,
      updates.completedAt || null,
      updates.resultPayload ? JSON.stringify(updates.resultPayload) : null,
      updates.error ? JSON.stringify(updates.error) : null,
      now,
      actionId
    );
  }

  public getAction(actionId: string): UniversalActionRecord | null {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM universal_action_records WHERE id = ?').get(actionId) as any;
    if (!row) return null;
    return this.mapRowToRecord(row);
  }

  public listActions(tenantId: string, limit: number = 50): UniversalActionRecord[] {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT * FROM universal_action_records WHERE tenant_id = ? ORDER BY created_at DESC LIMIT ?
    `).all(tenantId, limit) as any[];

    return rows.map((r) => this.mapRowToRecord(r));
  }

  private createInitialRecord(params: {
    id: string;
    request: UniversalActionRequest;
    idempotencyKey: string;
    inputFingerprint: string;
    executionState: UniversalActionState;
    approvalState: UniversalApprovalState;
    approvalRequired: boolean;
    validatedAt?: string;
    authorizedAt?: string;
    plannedAt?: string;
    queuedAt?: string;
    error?: any;
  }): UniversalActionRecord {
    const db = getDatabase();
    const now = new Date().toISOString();
    const auditReference = `audit_univ_${params.id}_${now}`;

    // Ensure tenant exists in database
    db.prepare(`
      INSERT OR IGNORE INTO tenants (id, name, industry, created_at)
      VALUES (?, ?, 'Technology', ?)
    `).run(params.request.tenantId, params.request.tenantId, now);

    const payload = params.request.input || (params.request as any).inputPayload || {};
    const inputJson = JSON.stringify(payload);

    db.prepare(`
      INSERT INTO universal_action_records (
        id, tenant_id, actor_id, actor_role, actor_name,
        action_type, provider, input_payload_json, input_fingerprint,
        execution_state, approval_state, approval_required,
        attempt_count, max_attempts, error_json,
        idempotency_key, audit_reference, requested_at,
        validated_at, authorized_at, planned_at, queued_at,
        policy_version, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 3, ?, ?, ?, ?, ?, ?, ?, ?, 'v1.0', ?, ?)
    `).run(
      params.id,
      params.request.tenantId,
      params.request.actor.id,
      params.request.actor.role,
      params.request.actor.name || 'System Actor',
      params.request.actionType,
      params.request.provider,
      inputJson,
      params.inputFingerprint,
      params.executionState,
      params.approvalState,
      params.approvalRequired ? 1 : 0,
      params.error ? JSON.stringify(params.error) : null,
      params.idempotencyKey,
      auditReference,
      now,
      params.validatedAt || null,
      params.authorizedAt || null,
      params.plannedAt || null,
      params.queuedAt || null,
      now,
      now
    );

    return this.getAction(params.id)!;
  }

  private mapRowToRecord(row: any): UniversalActionRecord {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      actorId: row.actor_id,
      actorRole: row.actor_role,
      actorName: row.actor_name,
      actionType: row.action_type,
      provider: row.provider,
      inputPayload: JSON.parse(row.input_payload_json || '{}'),
      inputFingerprint: row.input_fingerprint,
      executionState: row.execution_state,
      approvalState: row.approval_state,
      approvalRequired: Boolean(row.approval_required),
      approvedBy: row.approved_by,
      approvedAt: row.approved_at,
      approvalReason: row.approval_reason,
      approvalSignature: row.approval_signature,
      policyVersion: row.policy_version,
      retryClassification: row.retry_classification,
      nextRetryAt: row.next_retry_at,
      deadLetterId: row.dead_letter_id,
      attemptCount: row.attempt_count,
      maxAttempts: row.max_attempts,
      resultPayload: row.result_payload_json ? JSON.parse(row.result_payload_json) : undefined,
      error: row.error_json ? JSON.parse(row.error_json) : undefined,
      idempotencyKey: row.idempotency_key,
      auditReference: row.audit_reference,
      requestedAt: row.requested_at,
      validatedAt: row.validated_at,
      authorizedAt: row.authorized_at,
      plannedAt: row.planned_at,
      queuedAt: row.queued_at,
      executedAt: row.executed_at,
      verifiedAt: row.verified_at,
      completedAt: row.completed_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}
