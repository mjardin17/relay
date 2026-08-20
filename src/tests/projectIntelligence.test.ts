import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { RelayProjectIntelligenceService } from '../services/relayProjectIntelligenceService';
import { seedDatabaseIfEmpty } from '../db/seed';

describe('Relay Project Intelligence & Zero Auto-Merge Governance', () => {
  before(() => {
    seedDatabaseIfEmpty();
  });

  it('generates runtime-backed capability inventory with verified filesystem evidence', () => {
    const service = RelayProjectIntelligenceService.getInstance();
    const inventory = service.getWorkspaceCapabilityInventory();

    assert.ok(inventory.length >= 8);
    for (const item of inventory) {
      assert.ok(item.capability);
      assert.ok(item.existingImplementation);
      assert.ok(item.status);
      assert.ok(item.dependencies.length > 0);

      // Verify all claimed test files actually exist on disk
      for (const testFile of item.testsCoveringIt) {
        assert.ok(
          fs.existsSync(path.join(process.cwd(), testFile)),
          `Claimed test file must exist on disk: ${testFile}`
        );
      }
    }
  });

  it('performs read-only inspection for Relay Central with zero auto-merge', () => {
    const service = RelayProjectIntelligenceService.getInstance();
    const report = service.compareProjects('relay_central', 'relay_central');

    assert.strictEqual(report.status, 'COMPLETED');
    assert.ok(report.governanceNotice?.includes('ZERO AUTO-MERGE GOVERNANCE'));
    assert.strictEqual(report.targetProject, report.sourceProject);
    assert.strictEqual(report.recommendation, 'KEEP_INDEPENDENT');
    assert.ok(report.functionalCapabilities.length > 0);
  });

  it('returns BLOCKED_NEEDS_SOURCE when inspecting external projects without local source checkouts', () => {
    const service = RelayProjectIntelligenceService.getInstance();
    const report = service.compareProjects('relay_central', 'unseeded_external_app');

    assert.strictEqual(report.status, 'BLOCKED_NEEDS_SOURCE');
    assert.ok(report.governanceNotice?.includes('ZERO AUTO-MERGE GOVERNANCE'));
    assert.ok(report.blockerDetails?.includes('unseeded_external_app'));
    assert.strictEqual(report.recommendation, 'NEEDS_REVIEW');
    assert.strictEqual(report.integrationRisk, 'CRITICAL');
  });
});
