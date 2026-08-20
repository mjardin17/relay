import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { RelayProjectIntelligenceService } from '../services/relayProjectIntelligenceService';
import { seedDatabaseIfEmpty } from '../db/seed';

describe('Relay Project Intelligence & Capability Audit', () => {
  before(() => {
    seedDatabaseIfEmpty();
  });

  it('lists registered workspace software projects with stack metadata', () => {
    const service = RelayProjectIntelligenceService.getInstance();
    const projects = service.listProjects();

    assert.ok(projects.length >= 5);

    const relayCentral = projects.find((p) => p.id === 'relay_central');
    assert.ok(relayCentral);
    assert.ok(relayCentral.stack.frontend.includes('React 18'));
    assert.ok(relayCentral.stack.database.includes('SQLite'));

    const storyforge = projects.find((p) => p.id === 'storyforge');
    assert.ok(storyforge);
    assert.ok(storyforge.purpose.includes('AI book writing'));

    const bosslister = projects.find((p) => p.id === 'bosslister');
    assert.ok(bosslister);
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

    const queueCap = inventory.find((i) => i.capability.includes('Queue'));
    assert.ok(queueCap);
  });

  it('compares target vs source project with zero auto-merge governance', () => {
    const service = RelayProjectIntelligenceService.getInstance();
    const report = service.compareProjects('relay_central', 'storyforge');

    assert.ok(report);
    assert.ok(report.targetProject.includes('Relay'));
    assert.ok(report.sourceProject.includes('StoryForge'));
    assert.strictEqual(report.recommendation, 'KEEP_INDEPENDENT');
    assert.ok(report.integrationRiskReasoning.some((r) => r.includes('No source code auto-merges')));
    assert.ok(report.workingFeatures.length > 0);
    assert.ok(report.actionItems.length > 0);
  });
});
