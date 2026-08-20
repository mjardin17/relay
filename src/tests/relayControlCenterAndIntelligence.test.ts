import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { RelayProjectIntelligenceService } from '../services/relayProjectIntelligenceService';
import { seedDatabaseIfEmpty } from '../db/seed';

describe('Relay Project Intelligence & Capability Audit', () => {
  before(() => {
    seedDatabaseIfEmpty();
  });

  it('lists registered workspace software projects with verified stack metadata', () => {
    const service = RelayProjectIntelligenceService.getInstance();
    const projects = service.listProjects();

    assert.ok(projects.length >= 1);

    const relayCentral = projects.find((p) => p.id === 'relay_central');
    assert.ok(relayCentral);
    assert.ok(relayCentral.stack.frontend.includes('React 18'));
    assert.ok(relayCentral.stack.database.includes('SQLite'));
    assert.strictEqual(relayCentral.status, 'ACTIVE');
  });

  it('generates runtime-backed capability inventory (Phase 1 Audit)', () => {
    const service = RelayProjectIntelligenceService.getInstance();
    const inventory = service.getWorkspaceCapabilityInventory();

    assert.ok(inventory.length >= 8);

    const universalActions = inventory.find((i) => i.capability.includes('Universal Action Engine'));
    assert.ok(universalActions);
    assert.strictEqual(universalActions.status, 'production');
    assert.strictEqual(universalActions.reusableAcrossTenants, true);

    const connectorReg = inventory.find((i) => i.capability.includes('Authoritative Connector'));
    assert.ok(connectorReg);
    assert.strictEqual(connectorReg.status, 'production');
  });

  it('compares target vs source project with zero auto-merge governance', () => {
    const service = RelayProjectIntelligenceService.getInstance();
    const report = service.compareProjects('relay_central', 'relay_central');

    assert.ok(report);
    assert.strictEqual(report.status, 'COMPLETED');
    assert.ok(report.governanceNotice?.includes('ZERO AUTO-MERGE GOVERNANCE'));
    assert.strictEqual(report.recommendation, 'KEEP_INDEPENDENT');
    assert.ok(report.workingFeatures.length > 0);
    assert.ok(report.actionItems.length > 0);
  });
});
