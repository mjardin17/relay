import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import express from 'express';
import { controlCenterRouter } from '../routes/controlCenterRouter';
import { universalActionsRouter } from '../routes/universalActionsRouter';
import { connectorRegistryRouter } from '../routes/connectorRegistryRouter';
import { projectIntelligenceRouter } from '../routes/projectIntelligenceRouter';
import { seedDatabaseIfEmpty } from '../db/seed';

// Simple mock request/response dispatcher for Express router testing
function makeRouterCall(
  router: express.Router,
  method: string,
  url: string,
  options?: {
    headers?: Record<string, string>;
    body?: any;
    query?: Record<string, string>;
    params?: Record<string, string>;
  }
): Promise<{ status: number; body: any }> {
  return new Promise((resolve) => {
    const req: any = {
      method: method.toUpperCase(),
      url,
      path: url.split('?')[0],
      headers: options?.headers || {},
      body: options?.body || {},
      query: options?.query || {},
      params: options?.params || {}
    };

    const res: any = {
      statusCode: 200,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(data: any) {
        resolve({ status: this.statusCode, body: data });
      },
      send(data: any) {
        resolve({ status: this.statusCode, body: data });
      }
    };

    router(req, res, (err: any) => {
      if (err) {
        resolve({ status: 500, body: { error: err.message } });
      } else {
        resolve({ status: 404, body: { error: 'Not found' } });
      }
    });
  });
}

describe('Control Center & Universal Actions Router Security', () => {
  before(() => {
    seedDatabaseIfEmpty();
  });

  it('rejects unauthenticated requests without Bearer token', async () => {
    const res = await makeRouterCall(controlCenterRouter, 'GET', '/summary');
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.error, 'UNAUTHORIZED');
  });

  it('authenticates valid session and derives session-scoped summary', async () => {
    const res = await makeRouterCall(controlCenterRouter, 'GET', '/summary', {
      headers: { authorization: 'Bearer token-shad' }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.summary);
    assert.strictEqual(typeof res.body.summary.universalActions, 'number');
  });

  it('forbids emergency pause manipulation by non-owner roles', async () => {
    const res = await makeRouterCall(controlCenterRouter, 'POST', '/emergency-pause', {
      headers: { authorization: 'Bearer token-viewer' },
      body: { paused: true, reason: 'Unauthorized pause attempt' }
    });
    assert.strictEqual(res.status, 403);
    assert.ok(res.body.error.includes('FORBIDDEN'));
  });

  it('submits universal action deriving actor and tenant strictly from session', async () => {
    const res = await makeRouterCall(universalActionsRouter, 'POST', '/submit', {
      headers: { authorization: 'Bearer token-shad' },
      body: {
        actionType: 'COMMUNICATION_OUTBOUND_SMS',
        provider: 'TWILIO',
        input: { msg: 'Hello from session' },
        requiresApprovalOverride: true
      }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.action.tenantId, 'default');
    assert.strictEqual(res.body.action.actorRole, 'ADMIN');
    assert.strictEqual(res.body.action.approvalState, 'PENDING_APPROVAL');
  });

  it('forbids action approval by viewer role', async () => {
    const res = await makeRouterCall(universalActionsRouter, 'POST', '/approve', {
      headers: { authorization: 'Bearer token-viewer' },
      body: {
        actionId: 'non_existent_or_any',
        decision: 'APPROVE'
      }
    });
    assert.strictEqual(res.status, 403);
    assert.ok(res.body.error.includes('FORBIDDEN'));
  });

  it('serves authoritative connector catalog to authenticated users', async () => {
    const res = await makeRouterCall(connectorRegistryRouter, 'GET', '/catalog', {
      headers: { authorization: 'Bearer token-shad' }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.catalog.length >= 8);
  });

  it('serves evidence-backed capability inventory to authenticated users', async () => {
    const res = await makeRouterCall(projectIntelligenceRouter, 'GET', '/capability-inventory', {
      headers: { authorization: 'Bearer token-shad' }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.capabilityInventory.length >= 8);
  });
});
