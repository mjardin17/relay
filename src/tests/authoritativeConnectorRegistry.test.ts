import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { AuthoritativeConnectorRegistryService } from '../services/authoritativeConnectorRegistryService';
import { seedDatabaseIfEmpty } from '../db/seed';

describe('Authoritative Connector Registry & Diagnostic Probes', () => {
  before(() => {
    seedDatabaseIfEmpty();
  });

  it('provides complete official connector catalog with safety policies', () => {
    const service = AuthoritativeConnectorRegistryService.getInstance();
    const catalog = service.listCatalog();

    assert.ok(catalog.length >= 8);

    const twilio = service.getCatalogDefinition('TWILIO');
    assert.ok(twilio);
    assert.strictEqual(twilio.category, 'MESSAGING');
    assert.strictEqual(twilio.authMethod, 'API_KEY');
    assert.strictEqual(twilio.rateLimitHandling.requestsPerMinute, 100);
    assert.ok(twilio.writeOperations.includes('SEND_SMS'));

    const cloudflare = service.getCatalogDefinition('CLOUDFLARE_PAGES');
    assert.strictEqual(cloudflare?.connectorType, 'OFFICIAL_API');
    assert.strictEqual(cloudflare?.authMethod, 'API_KEY');

    const poshmark = service.getCatalogDefinition('POSHMARK');
    assert.strictEqual(poshmark?.connectorType, 'DRAFT_ONLY');
  });

  it('configures and verifies tenant connector with sanitized credentials', () => {
    const service = AuthoritativeConnectorRegistryService.getInstance();
    const tenantId = `tenant_connector_${Date.now()}`;

    const configured = service.configureTenantConnector(tenantId, {
      provider: 'TWILIO',
      credentials: { apiKey: 'secret_token_val' },
      enabledOperations: ['SEND_SMS'],
      configuredBy: 'operator-1'
    });

    assert.strictEqual(configured.provider, 'TWILIO');
    assert.strictEqual(configured.tenantId, tenantId);
    assert.strictEqual(configured.connectionState, 'CONFIGURED_UNVERIFIED');

    // Run verification probe
    const probe = service.verifyTenantConnector(tenantId, 'TWILIO', { simulateSuccess: true });
    assert.strictEqual(probe.status, 'VERIFIED');
    assert.strictEqual(probe.connectionState, 'VERIFIED');
    assert.ok(probe.sanitizedMessage.includes('confirmed successful connection'));

    // Verify persisted state is now VERIFIED
    const updated = service.getTenantConnector(tenantId, 'TWILIO');
    assert.strictEqual(updated?.connectionState, 'VERIFIED');
    assert.ok(updated?.lastVerificationAt);
  });

  it('marks connection state as ERROR when probe fails', () => {
    const service = AuthoritativeConnectorRegistryService.getInstance();
    const tenantId = `tenant_fail_${Date.now()}`;

    service.configureTenantConnector(tenantId, {
      provider: 'SENDGRID',
      credentials: { apiKey: 'invalid_key' },
      enabledOperations: ['SEND_TRANSACTIONAL_EMAIL'],
      configuredBy: 'operator-1'
    });

    const probe = service.verifyTenantConnector(tenantId, 'SENDGRID', { simulateSuccess: false });
    assert.strictEqual(probe.status, 'FAILED');
    assert.strictEqual(probe.connectionState, 'ERROR');

    const updated = service.getTenantConnector(tenantId, 'SENDGRID');
    assert.strictEqual(updated?.connectionState, 'ERROR');
    assert.ok(updated?.lastFailureMessage);
  });
});
