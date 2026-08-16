import crypto from 'node:crypto';
import { getDatabase } from '../db/database';
import { launchAuditService } from './launchAuditService';
import { evidenceGraphService } from './evidenceGraphService';

export interface PolicyEvaluationRequest {
  tenantId: string;
  actorId: string;
  actorRole: string;
  resourceType: string;
  action: string;
  environment: 'SIMULATED_DRY_RUN' | 'LIVE_PRODUCTION';
  parameters: Record<string, any>;
  hasOperatorConsent?: boolean;
}

export interface PolicyDecisionProvenance {
  policyVersion: string;
  evaluatedRuleIds: string[];
  inputFingerprint: string;
  decision: 'ALLOW' | 'DENY' | 'REQUIRES_HUMAN_APPROVAL';
  reason: string;
  cryptographicSignature: string;
  evaluatedAt: string;
  appliedGates: Array<{
    ruleId: string;
    gateName: string;
    passed: boolean;
    reason: string;
  }>;
}

export class GovernancePolicyEngine {
  private static instance: GovernancePolicyEngine;
  private readonly POLICY_VERSION = 'v2.0-relay-governance';

  public static getInstance(): GovernancePolicyEngine {
    if (!GovernancePolicyEngine.instance) {
      GovernancePolicyEngine.instance = new GovernancePolicyEngine();
    }
    return GovernancePolicyEngine.instance;
  }

  public evaluateAction(params: {
    tenantId: string;
    actionType: string;
    actorId: string;
    actorRole: string;
    isLiveExecution?: boolean;
    hasExplicitConsent?: boolean;
    isEmergencyHazard?: boolean;
    serviceAreaStatus?: string;
  }): PolicyDecisionProvenance {
    return this.evaluatePolicy({
      tenantId: params.tenantId,
      actorId: params.actorId,
      actorRole: params.actorRole,
      resourceType: 'DISPATCH',
      action: params.actionType,
      environment: params.isLiveExecution ? 'LIVE_PRODUCTION' : 'SIMULATED_DRY_RUN',
      hasOperatorConsent: params.hasExplicitConsent,
      parameters: {
        isEmergencyHazard: params.isEmergencyHazard,
        serviceAreaStatus: params.serviceAreaStatus
      }
    });
  }

  /**
   * Declaratively evaluates policies and outputs an immutable cryptographic decision provenance record.
   */
  public evaluatePolicy(request: PolicyEvaluationRequest): PolicyDecisionProvenance {
    const evaluatedAt = new Date().toISOString();
    const evaluatedRuleIds: string[] = [];
    const appliedGates: Array<{ ruleId: string; gateName: string; passed: boolean; reason: string }> = [];

    // Calculate deterministic input fingerprint
    const inputFingerprint = crypto
      .createHash('sha256')
      .update(
        JSON.stringify({
          tenantId: request.tenantId,
          actorId: request.actorId,
          actorRole: request.actorRole,
          resourceType: request.resourceType,
          action: request.action,
          environment: request.environment,
          parameters: request.parameters
        })
      )
      .digest('hex');

    let decision: 'ALLOW' | 'DENY' | 'REQUIRES_HUMAN_APPROVAL' = 'ALLOW';
    let finalReason = 'Policy evaluation passed all authorization gates.';

    // Gate 1: Fail-Closed Live Execution Protection (RULE_GATE_DRY_RUN)
    evaluatedRuleIds.push('RULE_GATE_DRY_RUN');
    if (request.environment === 'LIVE_PRODUCTION' && !request.hasOperatorConsent) {
      decision = 'REQUIRES_HUMAN_APPROVAL';
      finalReason = 'LIVE_PRODUCTION actions require explicit operator confirmation and consent grant.';
      appliedGates.push({
        ruleId: 'RULE_GATE_DRY_RUN',
        gateName: 'Fail-Closed Live Execution Guard',
        passed: false,
        reason: finalReason
      });
    } else {
      appliedGates.push({
        ruleId: 'RULE_GATE_DRY_RUN',
        gateName: 'Fail-Closed Live Execution Guard',
        passed: true,
        reason: 'Execution environment satisfies dry-run or consent requirements.'
      });
    }

    // Gate 2: Financial Threshold Authorization (RULE_GATE_FINANCIAL_LIMIT)
    evaluatedRuleIds.push('RULE_GATE_FINANCIAL_LIMIT');
    const spendingAmount = Number(request.parameters?.spendingLimit || request.parameters?.estimatedCost || 0);
    if (spendingAmount > 500 && request.actorRole !== 'OWNER' && request.actorRole !== 'MASTER_ELECTRICIAN') {
      decision = 'REQUIRES_HUMAN_APPROVAL';
      finalReason = `Financial spending exceeds standard threshold ($${spendingAmount} > $500). Elevated approval required.`;
      appliedGates.push({
        ruleId: 'RULE_GATE_FINANCIAL_LIMIT',
        gateName: 'Financial Spending Authorization Guard',
        passed: false,
        reason: finalReason
      });
    } else {
      appliedGates.push({
        ruleId: 'RULE_GATE_FINANCIAL_LIMIT',
        gateName: 'Financial Spending Authorization Guard',
        passed: true,
        reason: 'Spending amount within authorized tier limit.'
      });
    }

    // Gate 3: Permitting & Licensee Scope (RULE_GATE_PERMIT_AUTHORITY)
    if (request.action === 'FILE_PERMIT' || request.action === 'APPROVE_PANEL_UPGRADE') {
      evaluatedRuleIds.push('RULE_GATE_PERMIT_AUTHORITY');
      if (request.actorRole !== 'MASTER_ELECTRICIAN' && request.actorRole !== 'OWNER') {
        decision = 'DENY';
        finalReason = 'Permitting actions strictly require Master Electrician or Licensee of Record authority.';
        appliedGates.push({
          ruleId: 'RULE_GATE_PERMIT_AUTHORITY',
          gateName: 'Master Electrician Permitting Authority',
          passed: false,
          reason: finalReason
        });
      } else {
        appliedGates.push({
          ruleId: 'RULE_GATE_PERMIT_AUTHORITY',
          gateName: 'Master Electrician Permitting Authority',
          passed: true,
          reason: 'Actor possesses required master trade licensing credentials.'
        });
      }
    }

    // Generate cryptographic decision signature
    const signaturePayload = `${this.POLICY_VERSION}:${request.tenantId}:${inputFingerprint}:${decision}:${evaluatedAt}`;
    const cryptographicSignature = crypto.createHash('sha256').update(signaturePayload).digest('hex');

    const provenance: PolicyDecisionProvenance = {
      policyVersion: this.POLICY_VERSION,
      evaluatedRuleIds,
      inputFingerprint,
      decision,
      reason: finalReason,
      cryptographicSignature,
      evaluatedAt,
      appliedGates
    };

    // Record decision in Audit Log
    launchAuditService.recordAudit({
      tenantId: request.tenantId,
      actorId: request.actorId,
      clientIp: '127.0.0.1',
      endpoint: '/api/governance/policy-evaluate',
      action: 'POLICY_EVALUATION',
      status: decision,
      details: {
        resourceType: request.resourceType,
        policyAction: request.action,
        decision,
        reason: finalReason,
        signature: cryptographicSignature
      }
    });

    return provenance;
  }
}

export const governancePolicyEngine = new GovernancePolicyEngine();
