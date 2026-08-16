import {
  DataEnvironment,
  TenantPilotState,
  LeadIntakeRecord,
  PilotLeadLifecycleStatus,
  PilotReadinessReportV2,
  ProductionFinancialMetrics,
  ManualOutcomeType,
  PaymentEvidenceState,
  PilotAuditPackage
} from '../types/productionEvidence';

export interface DrillResult {
  drillId: string;
  name: string;
  category: string;
  targetComponent: string;
  expectedBehavior: string;
  observedBehavior: string;
  passed: boolean;
  failClosedVerified: boolean;
  evidenceRef: string;
  executedAt: string;
}

class PilotClientService {
  private static instance: PilotClientService;

  private constructor() {}

  public static getInstance(): PilotClientService {
    if (!PilotClientService.instance) {
      PilotClientService.instance = new PilotClientService();
    }
    return PilotClientService.instance;
  }

  private async fetchApi<T>(url: string, options?: RequestInit): Promise<T> {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers || {})
      }
    });

    const data = await res.json();
    if (!res.ok || data.success === false) {
      throw new Error(data.error || `HTTP error ${res.status}`);
    }
    return data;
  }

  public async seedPilotScenario(tenantId: string): Promise<any> {
    const res = await this.fetchApi<{ success: boolean; result: any }>('/api/pilot/seed', {
      method: 'POST',
      body: JSON.stringify({ tenantId })
    });
    return res.result;
  }

  public async getPilotState(tenantId: string): Promise<TenantPilotState> {
    const res = await this.fetchApi<{ success: boolean; state: TenantPilotState }>(
      `/api/pilot/state?tenantId=${encodeURIComponent(tenantId)}`
    );
    return res.state;
  }

  public async evaluatePilotReadiness(tenantId: string): Promise<PilotReadinessReportV2> {
    const res = await this.fetchApi<{ success: boolean; readiness: PilotReadinessReportV2 }>(
      `/api/pilot/readiness?tenantId=${encodeURIComponent(tenantId)}`
    );
    return res.readiness;
  }

  public async activatePilot(tenantId: string, actorId: string, role: string): Promise<any> {
    const res = await this.fetchApi<{ success: boolean; result: any }>('/api/pilot/activate', {
      method: 'POST',
      body: JSON.stringify({ tenantId, actorId, role })
    });
    return res.result;
  }

  public async pausePilot(tenantId: string, actorId: string, reason: string): Promise<any> {
    const res = await this.fetchApi<{ success: boolean; result: any }>('/api/pilot/pause', {
      method: 'POST',
      body: JSON.stringify({ tenantId, actorId, reason })
    });
    return res.result;
  }

  public async resumePilot(tenantId: string, actorId: string, reason: string): Promise<any> {
    const res = await this.fetchApi<{ success: boolean; result: any }>('/api/pilot/resume', {
      method: 'POST',
      body: JSON.stringify({ tenantId, actorId, reason })
    });
    return res.result;
  }

  public async listLeads(tenantId: string, environment?: DataEnvironment): Promise<LeadIntakeRecord[]> {
    const envQuery = environment ? `&environment=${encodeURIComponent(environment)}` : '';
    const res = await this.fetchApi<{ success: boolean; leads: LeadIntakeRecord[] }>(
      `/api/pilot/leads?tenantId=${encodeURIComponent(tenantId)}${envQuery}`
    );
    return res.leads || [];
  }

  public async intakeLead(input: any): Promise<any> {
    const res = await this.fetchApi<{ success: boolean; result: any }>('/api/pilot/leads/intake', {
      method: 'POST',
      body: JSON.stringify(input)
    });
    return res.result;
  }

  public async getLeadTimeline(tenantId: string, leadId: string): Promise<any[]> {
    const res = await this.fetchApi<{ success: boolean; timeline: any[] }>(
      `/api/pilot/leads/${encodeURIComponent(leadId)}/timeline?tenantId=${encodeURIComponent(tenantId)}`
    );
    return res.timeline || [];
  }

  public async createApprovalProposal(input: any): Promise<any> {
    const res = await this.fetchApi<{ success: boolean; proposal: any }>('/api/pilot/approvals/propose', {
      method: 'POST',
      body: JSON.stringify(input)
    });
    return res.proposal;
  }

  public async decideApproval(input: any): Promise<any> {
    const res = await this.fetchApi<{ success: boolean; result: any }>('/api/pilot/approvals/decide', {
      method: 'POST',
      body: JSON.stringify(input)
    });
    return res.result;
  }

  public async recordManualOutcome(input: any): Promise<any> {
    const res = await this.fetchApi<{ success: boolean; record: any }>('/api/pilot/outcomes', {
      method: 'POST',
      body: JSON.stringify(input)
    });
    return res.record;
  }

  public async recordVerifiedPayment(input: any): Promise<any> {
    const res = await this.fetchApi<{ success: boolean; record: any }>('/api/pilot/payments', {
      method: 'POST',
      body: JSON.stringify(input)
    });
    return res.record;
  }

  public async calculateFinancialMetrics(tenantId: string): Promise<ProductionFinancialMetrics> {
    const res = await this.fetchApi<{ success: boolean; metrics: ProductionFinancialMetrics }>(
      `/api/pilot/financials?tenantId=${encodeURIComponent(tenantId)}`
    );
    return res.metrics;
  }

  public async generateAuditPackage(tenantId: string): Promise<PilotAuditPackage> {
    const res = await this.fetchApi<{ success: boolean; auditPackage: PilotAuditPackage }>(
      `/api/pilot/audit-package?tenantId=${encodeURIComponent(tenantId)}`
    );
    return res.auditPackage;
  }

  public async executeAllDrills(tenantId: string): Promise<DrillResult[]> {
    const res = await this.fetchApi<{ success: boolean; results: DrillResult[] }>(
      '/api/pilot/drills/execute-all',
      {
        method: 'POST',
        body: JSON.stringify({ tenantId })
      }
    );
    return res.results || [];
  }

  public async getEmergencyPauseState(tenantId: string): Promise<any> {
    const res = await this.fetchApi<{ success: boolean; state: any }>(
      `/api/pilot/emergency-state?tenantId=${encodeURIComponent(tenantId)}`
    );
    return res.state;
  }
}

export const pilotClientService = PilotClientService.getInstance();
