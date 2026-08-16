import { describe, it, before, beforeEach } from 'node:test';
import assert from 'node:assert';
import crypto from 'node:crypto';
import * as turf from '@turf/turf';
import { spatialEngineService } from '../services/spatialEngineService';
import {
  LocalDeterministicGeocodingProvider,
  GoogleMapsGeocodingProvider,
  GeocodingService,
  redactGeocodingSecrets
} from '../services/geocoding/geocodingService';
import { locationIntelligenceService } from '../services/locationIntelligenceService';
import { durableApprovalService } from '../services/durableApprovalService';
import { governancePolicyEngine } from '../services/governancePolicyEngine';
import { evidenceGraphService } from '../services/evidenceGraphService';
import { getDatabase } from '../db/database';

describe('Relay v2.0 — Spatial Hardening, Geocoding & Durable Governance Suite', () => {
  const tenantA = 'test_tenant_spatial_a';
  const tenantB = 'test_tenant_spatial_b';

  before(() => {
    const db = getDatabase();
    db.prepare(`
      INSERT INTO tenants (id, name, industry, mrr, created_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET name = excluded.name
    `).run(tenantA, 'Reis Electric North', 'Electrical Contractor', 12000);

    db.prepare(`
      INSERT INTO tenants (id, name, industry, mrr, created_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET name = excluded.name
    `).run(tenantB, 'Reis Electric South', 'Electrical Contractor', 18000);
  });

  beforeEach(() => {
    const db = getDatabase();
    db.prepare('DELETE FROM tenant_locations WHERE tenant_id IN (?, ?)').run(tenantA, tenantB);
    db.prepare('DELETE FROM tenant_service_areas WHERE tenant_id IN (?, ?)').run(tenantA, tenantB);
    db.prepare('DELETE FROM evidence_nodes WHERE tenant_id IN (?, ?)').run(tenantA, tenantB);
    db.prepare('DELETE FROM evidence_edges WHERE tenant_id IN (?, ?)').run(tenantA, tenantB);
    db.prepare('DELETE FROM durable_approval_workflows WHERE tenant_id IN (?, ?)').run(tenantA, tenantB);
  });

  // ===========================================================================
  // 1. Turf.js Spatial Engine Tests
  // ===========================================================================
  describe('1. Turf.js Deterministic Spatial Engine', () => {
    // Defined polygon for New Bedford & Fairhaven Region
    const newBedfordPolygon = spatialEngineService.polygonFromCoordinates([
      { latitude: 41.60, longitude: -70.98 },
      { latitude: 41.72, longitude: -70.98 },
      { latitude: 41.72, longitude: -70.88 },
      { latitude: 41.60, longitude: -70.88 },
      { latitude: 41.60, longitude: -70.98 }
    ]);

    it('identifies point inside service area polygon', () => {
      // Inside New Bedford (41.65, -70.93)
      const insidePoint = { latitude: 41.65, longitude: -70.93 };
      const isInside = spatialEngineService.containsPoint(newBedfordPolygon, insidePoint);
      assert.strictEqual(isInside, true);
    });

    it('identifies point outside service area polygon', () => {
      // Boston (42.36, -71.06) is well outside New Bedford polygon
      const outsidePoint = { latitude: 42.36, longitude: -71.06 };
      const isInside = spatialEngineService.containsPoint(newBedfordPolygon, outsidePoint);
      assert.strictEqual(isInside, false);
    });

    it('evaluates boundary points on polygon perimeter correctly', () => {
      // Point exactly on northern boundary
      const boundaryPoint = { latitude: 41.72, longitude: -70.93 };
      const onBoundary = spatialEngineService.containsPoint(newBedfordPolygon, boundaryPoint);
      assert.strictEqual(onBoundary, true);
    });

    it('supports MultiPolygon service areas with disjoint zones', () => {
      const multiPoly = turf.multiPolygon([
        // Zone 1: New Bedford
        [
          [
            [-70.98, 41.60],
            [-70.98, 41.72],
            [-70.88, 41.72],
            [-70.88, 41.60],
            [-70.98, 41.60]
          ]
        ],
        // Zone 2: Fall River
        [
          [
            [-71.20, 41.65],
            [-71.20, 41.75],
            [-71.10, 41.75],
            [-71.10, 41.65],
            [-71.20, 41.65]
          ]
        ]
      ]);

      // Point in Zone 1
      assert.strictEqual(spatialEngineService.containsPoint(multiPoly, { latitude: 41.65, longitude: -70.93 }), true);
      // Point in Zone 2
      assert.strictEqual(spatialEngineService.containsPoint(multiPoly, { latitude: 41.70, longitude: -71.15 }), true);
      // Point between zones
      assert.strictEqual(spatialEngineService.containsPoint(multiPoly, { latitude: 41.65, longitude: -71.04 }), false);
    });

    it('enforces exclusion polygons with absolute priority in service area evaluation', () => {
      // Setup inclusion polygon for New Bedford region
      locationIntelligenceService.saveServiceArea(tenantA, {
        name: 'South Coast Primary Zone',
        areaType: 'POLYGON',
        rule: 'INCLUSION',
        value: JSON.stringify(newBedfordPolygon)
      });

      // Setup exclusion polygon for protected water/island zone
      const exclusionZone = spatialEngineService.polygonFromCoordinates([
        { latitude: 41.62, longitude: -70.92 },
        { latitude: 41.64, longitude: -70.92 },
        { latitude: 41.64, longitude: -70.90 },
        { latitude: 41.62, longitude: -70.90 },
        { latitude: 41.62, longitude: -70.92 }
      ]);

      locationIntelligenceService.saveServiceArea(tenantA, {
        name: 'Harbor Restricted Shipping Zone',
        areaType: 'POLYGON',
        rule: 'EXCLUSION',
        value: JSON.stringify(exclusionZone)
      });

      // Point in inclusion area but outside exclusion
      const matchAllowed = locationIntelligenceService.evaluateServiceArea(tenantA, {
        coordinates: { latitude: 41.68, longitude: -70.94 }
      });
      assert.strictEqual(matchAllowed.status, 'INSIDE');

      // Point inside exclusion area
      const matchExcluded = locationIntelligenceService.evaluateServiceArea(tenantA, {
        coordinates: { latitude: 41.63, longitude: -70.91 }
      });
      assert.strictEqual(matchExcluded.status, 'EXCLUDED');
      assert.ok(matchExcluded.reason.includes('Harbor Restricted Shipping Zone'));
    });

    it('calculates radius buffer geometry and distance containment', () => {
      const hqCoords = { latitude: 41.6582, longitude: -70.9298 };
      const bufferPolygon = spatialEngineService.buffer(hqCoords, 10); // 10km buffer

      assert.strictEqual(bufferPolygon.type, 'Feature');
      assert.strictEqual(bufferPolygon.geometry.type, 'Polygon');

      // Point 4km away is inside buffer
      const nearPoint = { latitude: 41.6375, longitude: -70.9038 };
      assert.strictEqual(spatialEngineService.containsPoint(bufferPolygon, nearPoint), true);

      // Point 25km away is outside buffer
      const farPoint = { latitude: 41.9, longitude: -71.1 };
      assert.strictEqual(spatialEngineService.containsPoint(bufferPolygon, farPoint), false);
    });

    it('calculates territory overlap between branches', () => {
      const branchA = spatialEngineService.buffer({ latitude: 41.65, longitude: -70.93 }, 15);
      const branchB = spatialEngineService.buffer({ latitude: 41.70, longitude: -71.05 }, 15);
      const branchC = spatialEngineService.buffer({ latitude: 42.36, longitude: -71.06 }, 10); // Boston

      const overlapAB = spatialEngineService.calculateTerritoryOverlap(branchA, branchB);
      assert.strictEqual(overlapAB.overlaps, true);
      assert.ok(overlapAB.overlapAreaKm2 !== undefined && overlapAB.overlapAreaKm2 > 0);

      const overlapAC = spatialEngineService.calculateTerritoryOverlap(branchA, branchC);
      assert.strictEqual(overlapAC.overlaps, false);
    });

    it('finds nearest location from candidate list', () => {
      const target = { latitude: 41.64, longitude: -70.91 };
      const candidates = [
        { id: 'loc_boston', coordinates: { latitude: 42.36, longitude: -71.06 } },
        { id: 'loc_fairhaven', coordinates: { latitude: 41.6375, longitude: -70.9038 } },
        { id: 'loc_fall_river', coordinates: { latitude: 41.7015, longitude: -71.155 } }
      ];

      const nearest = spatialEngineService.nearestLocation(target, candidates);
      assert.ok(nearest);
      assert.strictEqual(nearest?.locationId, 'loc_fairhaven');
      assert.ok(nearest!.distanceKm < 2.0);
    });

    it('gracefully handles invalid geometry or malformed inputs without crashing', () => {
      const invalidNull = spatialEngineService.validateGeoJson(null);
      assert.strictEqual(invalidNull.valid, false);

      const invalidType = spatialEngineService.validateGeoJson({ type: 'InvalidGeom' });
      assert.strictEqual(invalidType.valid, false);

      // Malformed coordinates to containsPoint
      const res = spatialEngineService.containsPoint(null as any, { latitude: NaN, longitude: NaN });
      assert.strictEqual(res, false);
    });

    it('strictly maintains cross-tenant geographic isolation', () => {
      // Tenant A configures Dartmouth zone
      locationIntelligenceService.saveServiceArea(tenantA, {
        name: 'Tenant A Dartmouth Zone',
        areaType: 'CITY',
        rule: 'INCLUSION',
        value: 'Dartmouth'
      });

      // Tenant B configures Fall River zone
      locationIntelligenceService.saveServiceArea(tenantB, {
        name: 'Tenant B Fall River Zone',
        areaType: 'CITY',
        rule: 'INCLUSION',
        value: 'Fall River'
      });

      // Tenant A cannot evaluate against Tenant B's service areas
      const matchA = locationIntelligenceService.evaluateServiceArea(tenantA, { city: 'Fall River', stateProvince: 'MA' });
      assert.strictEqual(matchA.status, 'OUTSIDE');

      const matchB = locationIntelligenceService.evaluateServiceArea(tenantB, { city: 'Fall River', stateProvince: 'MA' });
      assert.strictEqual(matchB.status, 'INSIDE');
    });
  });

  // ===========================================================================
  // 2. Geocoding Provider Abstraction Tests
  // ===========================================================================
  describe('2. Geocoding Provider Abstraction & Security Gates', () => {
    it('successfully geocodes standard addresses using local deterministic provider', async () => {
      const geocodingService = new GeocodingService();
      const result = await geocodingService.geocode('1184 Acushnet Ave, New Bedford, MA', { tenantId: tenantA });

      assert.ok(result);
      assert.strictEqual(result.city, 'New Bedford');
      assert.strictEqual(result.stateProvince, 'MA');
      assert.strictEqual(result.postalCode, '02746');
      assert.strictEqual(result.coordinates.latitude, 41.6582);
      assert.strictEqual(result.coordinates.longitude, -70.9298);
      assert.strictEqual(result.verificationState, 'VERIFIED');
      assert.ok(result.provenanceHash);
    });

    it('accurately reports ambiguous addresses and multiple candidate locations', async () => {
      const localProvider = new LocalDeterministicGeocodingProvider();

      // Disallow ambiguous by default -> throws clear error
      await assert.rejects(async () => {
        await localProvider.geocodeAddress('Springfield');
      }, /GEOCODE_AMBIGUOUS_ADDRESS/);

      // When allowAmbiguous is enabled, returns structured ambiguity candidates
      const ambiguousResult = await localProvider.geocodeAddress('Springfield', { allowAmbiguous: true });
      assert.strictEqual(ambiguousResult.isAmbiguous, true);
      assert.ok(ambiguousResult.ambiguityCandidates && ambiguousResult.ambiguityCandidates.length >= 3);
    });

    it('handles no result queries with clean error', async () => {
      const localProvider = new LocalDeterministicGeocodingProvider();
      await assert.rejects(async () => {
        await localProvider.geocodeAddress('NonexistentUnknownCityXYZ12345');
      }, /GEOCODE_NO_RESULTS/);
    });

    it('truthfully reports UNCONFIGURED status when Google Maps API key is missing or unconfigured', () => {
      const googleProvider = new GoogleMapsGeocodingProvider();
      const status = googleProvider.getProviderStatus();

      // In test container without live Google Maps credentials, provider must truthfully report UNCONFIGURED
      if (!process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY === 'UNCONFIGURED') {
        assert.strictEqual(status.status, 'UNCONFIGURED');
        assert.strictEqual(status.isConfigured, false);
      }
    });

    it('redacts API keys and secrets from all geocoding output and error messages', () => {
      const rawSecret = 'AIzaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q';
      const errorMessage = `Failed to connect with key=${rawSecret} and Bearer abc123def456`;
      const redacted = redactGeocodingSecrets(errorMessage);

      assert.ok(!redacted.includes(rawSecret));
      assert.ok(redacted.includes('[REDACTED]'));
    });

    it('maintains multi-tenant cache isolation for geocoding results', async () => {
      const geocodingService = new GeocodingService();

      // Geocode for Tenant A
      const resA = await geocodingService.geocode('25 Elm St, Fairhaven, MA', { tenantId: tenantA });
      assert.ok(resA);

      // Clear Tenant A cache; verify Tenant B is unaffected
      geocodingService.clearTenantCache(tenantA);

      const resB = await geocodingService.geocode('25 Elm St, Fairhaven, MA', { tenantId: tenantB });
      assert.ok(resB);
      assert.strictEqual(resB.city, 'Fairhaven');
    });

    it('logs geocoding resolution provenance to the Evidence Graph', async () => {
      const geocodingService = new GeocodingService();
      await geocodingService.geocode('4500 E Camelback Rd, Phoenix, AZ', { tenantId: tenantA });

      const graph = evidenceGraphService.getGraph(tenantA);
      const geoNode = graph.nodes.find((n) => n.type === 'location' && n.source === 'LOCAL_DETERMINISTIC');
      assert.ok(geoNode);
      assert.ok(geoNode?.provenance?.fingerprintHash);
      assert.strictEqual(geoNode?.source, 'LOCAL_DETERMINISTIC');
    });
  });

  // ===========================================================================
  // 3. Durable Human Approval & Continuation Tests (Resonate-Informed Architecture)
  // ===========================================================================
  describe('3. Durable Human-in-the-Loop Approval & Continuation State Machine', () => {
    it('suspends an asynchronous workflow pending human approval with durable resumption token', () => {
      const suspended = durableApprovalService.suspendWorkflow({
        tenantId: tenantA,
        workflowType: 'PANEL_UPGRADE_EXECUTION',
        actionTitle: 'Execute 200A Service Upgrade Dispatch',
        proposerId: 'agent_aria_intake',
        proposerRole: 'AI_DISPATCH_AGENT',
        requiredApproverRole: 'MASTER_ELECTRICIAN',
        executionPayload: {
          jobId: 'job_solar_2026',
          serviceType: 'PANEL_UPGRADE',
          targetAmperage: 200,
          quoteTotal: 3450
        }
      });

      assert.ok(suspended.workflowId);
      assert.strictEqual(suspended.status, 'PENDING_APPROVAL');
      assert.ok(suspended.resumptionToken.startsWith('token_'));
      assert.ok(suspended.payloadHash);
    });

    it('survives process restart / database recovery and permits delayed resumption', () => {
      // Create initial suspended workflow
      const initial = durableApprovalService.suspendWorkflow({
        tenantId: tenantA,
        workflowType: 'REBATE_SUBMISSION',
        actionTitle: 'Submit Mass Save $1,250 Panel Rebate Application',
        proposerId: 'agent_rebate_advisor',
        proposerRole: 'AI_AGENT',
        requiredApproverRole: 'OWNER',
        executionPayload: {
          customerName: 'Sarah Jenkins',
          rebateAmount: 1250,
          utility: 'Eversource'
        }
      });

      // Simulate process restart / new service instance reading from persistent database
      const fetched = durableApprovalService.getWorkflow(tenantA, initial.workflowId);
      assert.ok(fetched);
      assert.strictEqual(fetched?.status, 'PENDING_APPROVAL');
      assert.strictEqual(fetched?.resumptionToken, initial.resumptionToken);

      // Perform delayed human approval
      const resumeResult = durableApprovalService.resumeWorkflow({
        tenantId: tenantA,
        workflowId: initial.workflowId,
        resumptionToken: initial.resumptionToken,
        approverId: 'operator_shad_reis',
        approverRole: 'OWNER',
        decision: 'APPROVE'
      });

      assert.strictEqual(resumeResult.success, true);
      assert.strictEqual(resumeResult.status, 'APPROVED_READY_FOR_EXECUTION');
      assert.ok(resumeResult.workflow?.approvalRecordId);
      assert.strictEqual(resumeResult.resumedPayload?.rebateAmount, 1250);
    });

    it('strictly enforces Segregation of Duties: proposer cannot approve their own action', () => {
      const workflow = durableApprovalService.suspendWorkflow({
        tenantId: tenantA,
        workflowType: 'PERMIT_DISPATCH',
        actionTitle: 'Submit Town of Fairhaven Wiring Permit',
        proposerId: 'tech_bob_apprentice',
        proposerRole: 'JOURNEYMAN',
        requiredApproverRole: 'MASTER_ELECTRICIAN',
        executionPayload: { permitFee: 150 }
      });

      // Attempting to approve by the same person who proposed it
      const selfApproval = durableApprovalService.resumeWorkflow({
        tenantId: tenantA,
        workflowId: workflow.workflowId,
        resumptionToken: workflow.resumptionToken,
        approverId: 'tech_bob_apprentice', // Same as proposer
        approverRole: 'JOURNEYMAN',
        decision: 'APPROVE'
      });

      assert.strictEqual(selfApproval.success, false);
      assert.ok(selfApproval.reason?.includes('SEGREGATION_OF_DUTIES_VIOLATION'));
    });

    it('rejects replay attacks and duplicate callbacks on already decided workflows', () => {
      const workflow = durableApprovalService.suspendWorkflow({
        tenantId: tenantA,
        workflowType: 'COMMUNICATION_BROADCAST',
        actionTitle: 'Customer Seasonal Inspection Notice',
        proposerId: 'agent_aria',
        proposerRole: 'AI_AGENT',
        requiredApproverRole: 'OFFICE_MANAGER',
        executionPayload: { recipientCount: 25 }
      });

      // First decision: Reject
      const firstDecision = durableApprovalService.resumeWorkflow({
        tenantId: tenantA,
        workflowId: workflow.workflowId,
        resumptionToken: workflow.resumptionToken,
        approverId: 'manager_alice',
        approverRole: 'OFFICE_MANAGER',
        decision: 'REJECT',
        reason: 'Incorrect recipient filters'
      });
      assert.strictEqual(firstDecision.status, 'REJECTED');

      // Second duplicate callback attempt
      const secondAttempt = durableApprovalService.resumeWorkflow({
        tenantId: tenantA,
        workflowId: workflow.workflowId,
        resumptionToken: workflow.resumptionToken,
        approverId: 'manager_alice',
        approverRole: 'OFFICE_MANAGER',
        decision: 'APPROVE'
      });

      assert.strictEqual(secondAttempt.success, false);
      assert.ok(secondAttempt.reason?.includes('WORKFLOW_ALREADY_DECIDED'));
    });
  });

  // ===========================================================================
  // 4. Declarative Governance Policy Evaluation Tests
  // ===========================================================================
  describe('4. Declarative Governance Policy Evaluation & Decision Provenance', () => {
    it('evaluates declarative authorization policies and generates cryptographic decision provenance', () => {
      const decision = governancePolicyEngine.evaluatePolicy({
        tenantId: tenantA,
        actorId: 'operator_shad_reis',
        actorRole: 'MASTER_ELECTRICIAN',
        resourceType: 'ELECTRICAL_PERMIT',
        action: 'FILE_PERMIT',
        environment: 'LIVE_PRODUCTION',
        hasOperatorConsent: true,
        parameters: {
          jobLocation: 'Fairhaven, MA',
          serviceAmperage: 200,
          estimatedCost: 350
        }
      });

      assert.strictEqual(decision.decision, 'ALLOW');
      assert.ok(decision.cryptographicSignature);
      assert.ok(decision.inputFingerprint);
      assert.strictEqual(decision.appliedGates.length, 3);
      assert.ok(decision.appliedGates.every((g) => g.passed));
    });

    it('fails closed when live production actions lack explicit operator consent', () => {
      const decision = governancePolicyEngine.evaluatePolicy({
        tenantId: tenantA,
        actorId: 'agent_aria',
        actorRole: 'AI_AGENT',
        resourceType: 'MARKETING_CAMPAIGN',
        action: 'LAUNCH_AD_SPEND',
        environment: 'LIVE_PRODUCTION',
        hasOperatorConsent: false, // Missing consent
        parameters: { spendingLimit: 100 }
      });

      assert.strictEqual(decision.decision, 'REQUIRES_HUMAN_APPROVAL');
      assert.ok(decision.reason.includes('LIVE_PRODUCTION actions require explicit operator confirmation'));
    });

    it('denies trade permitting actions proposed by unauthorized non-master roles', () => {
      const decision = governancePolicyEngine.evaluatePolicy({
        tenantId: tenantA,
        actorId: 'apprentice_sam',
        actorRole: 'APPRENTICE',
        resourceType: 'ELECTRICAL_PERMIT',
        action: 'FILE_PERMIT',
        environment: 'SIMULATED_DRY_RUN',
        parameters: { serviceAmperage: 200 }
      });

      assert.strictEqual(decision.decision, 'DENY');
      assert.ok(decision.reason.includes('Master Electrician'));
    });
  });
});
