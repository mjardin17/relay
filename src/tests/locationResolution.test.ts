import { describe, it, before, beforeEach } from 'node:test';
import assert from 'node:assert';
import crypto from 'node:crypto';
import { locationIntelligenceService } from '../services/locationIntelligenceService';
import { reisElectricPilotService } from '../services/reisElectricPilotService';
import { ariaDispatchService } from '../services/ariaDispatchService';
import { evidenceGraphService } from '../services/evidenceGraphService';
import { getDatabase } from '../db/database';

describe('Global Location Intelligence & Jurisdiction Resolution Engine', () => {
  const tenantMA = 'test_tenant_reis_electric_ma';
  const tenantAZ = 'test_tenant_desert_comfort_az';

  before(() => {
    const db = getDatabase();
    // Ensure test tenants exist in database for foreign key constraints
    db.prepare(`
      INSERT INTO tenants (id, name, industry, mrr, created_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET name = excluded.name
    `).run(tenantMA, 'Reis Electric LLC', 'Electrical Contractor', 14500);

    db.prepare(`
      INSERT INTO tenants (id, name, industry, mrr, created_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET name = excluded.name
    `).run(tenantAZ, 'Desert Comfort HVAC LLC', 'HVAC Contractor', 24000);
  });

  beforeEach(() => {
    const db = getDatabase();
    db.prepare('DELETE FROM tenant_locations WHERE tenant_id IN (?, ?)').run(tenantMA, tenantAZ);
    db.prepare('DELETE FROM tenant_service_areas WHERE tenant_id IN (?, ?)').run(tenantMA, tenantAZ);
    db.prepare('DELETE FROM jurisdiction_resolutions WHERE tenant_id IN (?, ?)').run(tenantMA, tenantAZ);
    db.prepare('DELETE FROM evidence_nodes WHERE tenant_id IN (?, ?)').run(tenantMA, tenantAZ);
    db.prepare('DELETE FROM evidence_edges WHERE tenant_id IN (?, ?)').run(tenantMA, tenantAZ);
    db.prepare('DELETE FROM leads WHERE tenant_id IN (?, ?)').run(tenantMA, tenantAZ);
  });

  describe('1. Location Persistence & Provenance Guards', () => {
    it('saves a location and records provenance in evidence graph', () => {
      const loc = locationIntelligenceService.saveLocation(tenantMA, {
        type: 'HEADQUARTERS',
        label: 'Reis Electric HQ',
        streetAddress: '1184 Acushnet Ave',
        city: 'New Bedford',
        municipality: 'New Bedford',
        county: 'Bristol County',
        stateProvince: 'MA',
        postalCode: '02746',
        country: 'US',
        timezone: 'America/New_York',
        source: 'VERIFIED_BUSINESS_PROFILE',
        verificationState: 'VERIFIED',
        confidence: 1.0,
        verifiedBy: 'Master Electrician Shad Reis'
      });

      assert.ok(loc.id);
      assert.strictEqual(loc.city, 'New Bedford');
      assert.strictEqual(loc.verificationState, 'VERIFIED');
      assert.strictEqual(loc.confidence, 1.0);

      // Verify fetch
      const fetched = locationIntelligenceService.getLocation(tenantMA, loc.id);
      assert.ok(fetched);
      assert.strictEqual(fetched?.city, 'New Bedford');

      // Verify node created in Evidence Graph
      const graph = evidenceGraphService.getGraph(tenantMA);
      const locNode = graph.nodes.find((n) => n.id === `node_loc_${loc.id}`);
      assert.ok(locNode);
      assert.strictEqual(locNode?.type, 'location');
      assert.strictEqual(locNode?.evidenceStatus, 'VERIFIED');
    });

    it('protects verified locations from being silently overwritten with lower confidence data', () => {
      locationIntelligenceService.saveLocation(tenantMA, {
        id: 'loc_hq_protected',
        type: 'HEADQUARTERS',
        label: 'Verified Main Office',
        city: 'New Bedford',
        stateProvince: 'MA',
        verificationState: 'VERIFIED',
        confidence: 1.0
      });

      // Attempting to overwrite verified location with an unverified/lower confidence location must throw
      assert.throws(() => {
        locationIntelligenceService.saveLocation(tenantMA, {
          id: 'loc_hq_protected',
          type: 'HEADQUARTERS',
          label: 'Inferred Office Location',
          city: 'Framingham',
          stateProvince: 'MA',
          verificationState: 'UNVERIFIED',
          confidence: 0.3
        });
      }, /PROVENANCE_GUARD/);
    });
  });

  describe('2. Service Area Engine & Boundary Rules', () => {
    beforeEach(() => {
      // Configure Inclusion Service Areas
      locationIntelligenceService.saveServiceArea(tenantMA, {
        id: 'sa_south_coast_cities',
        name: 'South Coast Core Cities',
        areaType: 'CITY',
        rule: 'INCLUSION',
        value: 'New Bedford, Dartmouth, Fairhaven, Acushnet, Westport, Mattapoisett'
      });

      locationIntelligenceService.saveServiceArea(tenantMA, {
        id: 'sa_bristol_county',
        name: 'Bristol County Zone',
        areaType: 'COUNTY',
        rule: 'INCLUSION',
        value: 'Bristol County'
      });

      locationIntelligenceService.saveServiceArea(tenantMA, {
        id: 'sa_providence_radius',
        name: 'Fall River Staging Radius',
        areaType: 'RADIUS',
        rule: 'INCLUSION',
        value: 'Fall River 15km Buffer',
        radiusKm: 15,
        centerCoordinates: { latitude: 41.7015, longitude: -71.155 }
      });

      // Configure Explicit Exclusion Zone
      locationIntelligenceService.saveServiceArea(tenantMA, {
        id: 'sa_nantucket_excl',
        name: 'Nantucket Island (Ferry Logistics Exclusion)',
        areaType: 'ZIP_CODE',
        rule: 'EXCLUSION',
        value: '02554, 02584'
      });
    });

    it('correctly matches municipalities inside configured service areas', () => {
      const matchFairhaven = locationIntelligenceService.evaluateServiceArea(tenantMA, {
        city: 'Fairhaven',
        stateProvince: 'MA'
      });
      assert.strictEqual(matchFairhaven.status, 'INSIDE');
      assert.strictEqual(matchFairhaven.matchedRule?.name, 'South Coast Core Cities');

      const matchDartmouth = locationIntelligenceService.evaluateServiceArea(tenantMA, {
        city: 'Dartmouth',
        stateProvince: 'MA'
      });
      assert.strictEqual(matchDartmouth.status, 'INSIDE');

      const matchTaunton = locationIntelligenceService.evaluateServiceArea(tenantMA, {
        city: 'Taunton',
        county: 'Bristol County',
        stateProvince: 'MA'
      });
      assert.strictEqual(matchTaunton.status, 'INSIDE');
      assert.strictEqual(matchTaunton.matchedRule?.name, 'Bristol County Zone');
    });

    it('correctly evaluates radial distance using Haversine algorithm', () => {
      // 5km from Fall River center coordinates
      const matchNear = locationIntelligenceService.evaluateServiceArea(tenantMA, {
        coordinates: { latitude: 41.71, longitude: -71.14 }
      });
      assert.strictEqual(matchNear.status, 'INSIDE');

      // 40km away (outside 15km radius)
      const matchFar = locationIntelligenceService.evaluateServiceArea(tenantMA, {
        coordinates: { latitude: 42.1, longitude: -71.14 }
      });
      assert.strictEqual(matchFar.status, 'OUTSIDE');
    });

    it('enforces exclusion rules with absolute precedence over inclusion rules', () => {
      const matchNantucket = locationIntelligenceService.evaluateServiceArea(tenantMA, {
        postalCode: '02554',
        stateProvince: 'MA'
      });
      assert.strictEqual(matchNantucket.status, 'EXCLUDED');
      assert.ok(matchNantucket.reason.includes('exclusion area'));
    });

    it('returns OUTSIDE for locations beyond all configured service areas', () => {
      const matchWorcester = locationIntelligenceService.evaluateServiceArea(tenantMA, {
        city: 'Worcester',
        county: 'Worcester County',
        stateProvince: 'MA'
      });
      assert.strictEqual(matchWorcester.status, 'OUTSIDE');
    });
  });

  describe('3. Deterministic Precedence Context Resolver', () => {
    let hq: any;
    let customerLoc: any;
    let jobLoc: any;

    beforeEach(() => {
      hq = locationIntelligenceService.saveLocation(tenantMA, {
        type: 'HEADQUARTERS',
        label: 'Reis Electric HQ',
        city: 'New Bedford',
        municipality: 'New Bedford',
        stateProvince: 'MA',
        timezone: 'America/New_York',
        source: 'TENANT_CONFIG',
        verificationState: 'VERIFIED'
      });

      customerLoc = locationIntelligenceService.saveLocation(tenantMA, {
        type: 'CUSTOMER',
        label: 'Sarah Jenkins Billing',
        city: 'Dartmouth',
        municipality: 'Dartmouth',
        stateProvince: 'MA',
        timezone: 'America/New_York',
        source: 'CUSTOMER_ADDRESS',
        verificationState: 'VERIFIED'
      });

      jobLoc = locationIntelligenceService.saveLocation(tenantMA, {
        type: 'JOB_SITE',
        label: 'Coastal Solar Site',
        city: 'Fairhaven',
        municipality: 'Fairhaven',
        stateProvince: 'MA',
        timezone: 'America/New_York',
        source: 'JOB_RECORD',
        verificationState: 'VERIFIED'
      });

      locationIntelligenceService.saveServiceArea(tenantMA, {
        name: 'South Coast Area',
        areaType: 'CITY',
        rule: 'INCLUSION',
        value: 'New Bedford, Fairhaven, Dartmouth'
      });
    });

    it('resolves SCHEDULING to Job Site location when provided', () => {
      const context = locationIntelligenceService.resolveActionLocationContext({
        tenantId: tenantMA,
        actionType: 'SCHEDULING',
        jobLocation: jobLoc,
        customerLocation: customerLoc
      });

      assert.strictEqual(context.resolvedLocation?.id, jobLoc.id);
      assert.strictEqual(context.municipality, 'Fairhaven');
      assert.strictEqual(context.timezone, 'America/New_York');
      assert.strictEqual(context.serviceAreaStatus, 'RESOLVED');
      assert.ok(context.auditHash);
    });

    it('resolves SCHEDULING to Customer Location when no job site exists', () => {
      const context = locationIntelligenceService.resolveActionLocationContext({
        tenantId: tenantMA,
        actionType: 'SCHEDULING',
        customerLocation: customerLoc
      });

      assert.strictEqual(context.resolvedLocation?.id, customerLoc.id);
      assert.strictEqual(context.municipality, 'Dartmouth');
    });

    it('strictly resolves GBP_LISTING to official verified business headquarters', () => {
      const context = locationIntelligenceService.resolveActionLocationContext({
        tenantId: tenantMA,
        actionType: 'GBP_LISTING',
        jobLocation: jobLoc,
        customerLocation: customerLoc
      });

      assert.strictEqual(context.resolvedLocation?.id, hq.id);
      assert.strictEqual(context.municipality, 'New Bedford');
    });

    it('strictly resolves PERMITTING_COMPLIANCE to Job Site and builds governing code jurisdiction', () => {
      const context = locationIntelligenceService.resolveActionLocationContext({
        tenantId: tenantMA,
        actionType: 'PERMITTING_COMPLIANCE',
        jobLocation: jobLoc,
        customerLocation: customerLoc
      });

      assert.strictEqual(context.resolvedLocation?.id, jobLoc.id);
      assert.strictEqual(context.municipality, 'Fairhaven');
      assert.ok(context.jurisdiction?.governingCodeStandard?.includes('527 CMR 12.00'));
      assert.ok(context.jurisdiction?.localAuthorityName?.includes('Fairhaven'));
    });
  });

  describe('4. Timezone Resolution & Local Formatting Engine', () => {
    it('correctly maps various states and provinces to canonical IANA timezones', () => {
      assert.strictEqual(locationIntelligenceService.resolveTimezone('MA'), 'America/New_York');
      assert.strictEqual(locationIntelligenceService.resolveTimezone('AZ'), 'America/Phoenix');
      assert.strictEqual(locationIntelligenceService.resolveTimezone('CA'), 'America/Los_Angeles');
      assert.strictEqual(locationIntelligenceService.resolveTimezone('IL'), 'America/Chicago');
      assert.strictEqual(locationIntelligenceService.resolveTimezone('BC'), 'America/Vancouver');
    });

    it('formats ISO timestamps according to resolved action timezone', () => {
      const iso = '2026-07-15T14:30:00.000Z';
      const formattedNY = locationIntelligenceService.formatLocalTime(iso, 'America/New_York');
      const formattedPhoenix = locationIntelligenceService.formatLocalTime(iso, 'America/Phoenix');

      assert.ok(formattedNY.includes('EDT') || formattedNY.includes('EST') || formattedNY.includes('GMT-4') || formattedNY.includes('AM') || formattedNY.includes('PM'));
      assert.ok(formattedPhoenix.includes('MST') || formattedPhoenix.includes('GMT-7') || formattedPhoenix.includes('AM') || formattedPhoenix.includes('PM'));
    });
  });

  describe('5. Operator Device Location & Privacy Gate', () => {
    it('gracefully handles denied device location permission without crashing or blocking', () => {
      const result = locationIntelligenceService.recordOperatorDeviceLocation({
        tenantId: tenantMA,
        actorId: 'tech_bob_123',
        latitude: 41.65,
        longitude: -70.93,
        hasPermission: false
      });

      assert.strictEqual(result.success, false);
      assert.ok(result.reason?.includes('DEVICE_LOCATION_PERMISSION_DENIED'));
    });

    it('records operator device location when permission granted, marking isRedacted correctly', () => {
      const result = locationIntelligenceService.recordOperatorDeviceLocation({
        tenantId: tenantMA,
        actorId: 'tech_bob_123',
        latitude: 41.65,
        longitude: -70.93,
        hasPermission: true,
        city: 'New Bedford Vicinity',
        isRedacted: true
      });

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.location?.type, 'OPERATOR');
      assert.strictEqual(result.location?.isRedacted, true);
      assert.strictEqual(result.location?.source, 'DEVICE_PERMISSION');
    });
  });

  describe('6. Aria Intake Integration with Dynamic Location Context', () => {
    beforeEach(() => {
      locationIntelligenceService.saveServiceArea(tenantMA, {
        name: 'South Coast Area',
        areaType: 'CITY',
        rule: 'INCLUSION',
        value: 'New Bedford, Dartmouth, Fairhaven'
      });
      locationIntelligenceService.saveServiceArea(tenantMA, {
        name: 'Offshore Exclusion',
        areaType: 'ZIP_CODE',
        rule: 'EXCLUSION',
        value: '02554'
      });
    });

    it('attaches resolved location context to lead record during intake', () => {
      const result = ariaDispatchService.intakeLead({
        tenantId: tenantMA,
        idempotencyKey: `idemp_${Date.now()}_1`,
        customerName: 'Robert Morse',
        contactMethod: 'sms',
        phone: '+15085550199',
        serviceAddress: '25 Elm St, Fairhaven, MA',
        zipCode: '02719',
        problemDescription: 'Need 100A to 200A panel replacement.',
        source: 'web_form',
        consentRecord: {
          consentStatus: 'OPTED_IN',
          communicationChannel: 'sms',
          messagePurpose: 'LEAD_RESPONSE',
          consentMethod: 'WEB_FORM_CHECKBOX',
          capturedAt: new Date().toISOString(),
          disclosureVersion: 'v1.0-2026-08',
          disclosureTextHash: crypto.createHash('sha256').update('Lead Consent').digest('hex'),
          sourceFormId: 'lead_form_1',
          normalizedRecipient: '+15085550199',
          tenantId: tenantMA,
          revocationStatus: false,
          revokedAt: null,
          evidenceClassification: 'SELF_REPORTED'
        }
      });

      assert.strictEqual(result.success, true);
      assert.ok(result.lead?.locationContext);
      assert.strictEqual(result.lead?.locationContext?.municipality, 'Fairhaven');
      assert.strictEqual(result.lead?.locationContext?.serviceAreaStatus, 'RESOLVED');
    });

    it('flags leads outside configured service territory or in exclusion zones', () => {
      const result = ariaDispatchService.intakeLead({
        tenantId: tenantMA,
        idempotencyKey: `idemp_${Date.now()}_2`,
        customerName: 'Island Resident',
        contactMethod: 'sms',
        phone: '+15085550188',
        serviceAddress: '10 Main St, Nantucket, MA',
        zipCode: '02554',
        problemDescription: 'Emergency panel repair needed.',
        source: 'web_form',
        consentRecord: {
          consentStatus: 'OPTED_IN',
          communicationChannel: 'sms',
          messagePurpose: 'LEAD_RESPONSE',
          consentMethod: 'WEB_FORM_CHECKBOX',
          capturedAt: new Date().toISOString(),
          disclosureVersion: 'v1.0-2026-08',
          disclosureTextHash: crypto.createHash('sha256').update('Lead Consent').digest('hex'),
          sourceFormId: 'lead_form_2',
          normalizedRecipient: '+15085550188',
          tenantId: tenantMA,
          revocationStatus: false,
          revokedAt: null,
          evidenceClassification: 'SELF_REPORTED'
        }
      });

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.lead?.locationContext?.serviceAreaStatus, 'EXCLUDED_ZONE');
      assert.strictEqual(result.lead?.urgencyCategory, 'OUTSIDE_SERVICE_AREA');
      assert.ok(result.lead?.proposedDraftText?.includes('outside our standard rapid dispatch service area'));
    });
  });

  describe('7. Full Reis Electric Pilot Validation Scenario', () => {
    it('executes full Reis Electric Pilot scenario with New Bedford HQ, Dartmouth customer, and Fairhaven job site', () => {
      const scenario = reisElectricPilotService.seedPilotScenario(tenantMA);

      assert.ok(scenario.leadId);
      assert.strictEqual(scenario.headquarters.city, 'New Bedford');
      assert.strictEqual(scenario.headquarters.county, 'Bristol County');
      assert.strictEqual(scenario.headquarters.timezone, 'America/New_York');

      assert.strictEqual(scenario.customerLocation.city, 'Dartmouth');
      assert.strictEqual(scenario.jobLocation.city, 'Fairhaven');

      // Verify resolved location for scheduling action is the Fairhaven Job Site
      assert.strictEqual(scenario.locationContext.municipality, 'Fairhaven');
      assert.strictEqual(scenario.locationContext.timezone, 'America/New_York');
      assert.strictEqual(scenario.locationContext.serviceAreaStatus, 'RESOLVED');
      assert.ok(scenario.locationContext.auditHash);

      // Verify Evidence Graph contains nodes and edges
      const graph = evidenceGraphService.getGraph(tenantMA);
      assert.ok(graph.nodes.length >= 8);
      assert.ok(graph.edges.length >= 4);

      // Verify ROI metrics and reconciliation
      assert.ok(scenario.metrics.attributedGrossRevenue >= 2850);
      assert.strictEqual(scenario.reconciliation.status, 'CLEAN');
      assert.strictEqual(scenario.reconciliation.integrityScore, 100);
    });
  });

  describe('8. Multi-Tenant Global Isolation (Phoenix, AZ Scenario)', () => {
    it('correctly manages a separate tenant in Phoenix, AZ without cross-tenant bleed or MA hardcoding', () => {
      // Seed first tenant (MA)
      reisElectricPilotService.seedPilotScenario(tenantMA);

      // Seed second tenant (AZ)
      const azScenario = reisElectricPilotService.seedSecondTenantScenario(tenantAZ);

      assert.strictEqual(azScenario.tenantId, tenantAZ);
      assert.strictEqual(azScenario.headquarters.city, 'Phoenix');
      assert.strictEqual(azScenario.headquarters.stateProvince, 'AZ');
      assert.strictEqual(azScenario.headquarters.timezone, 'America/Phoenix');
      assert.strictEqual(azScenario.jobLocation.city, 'Scottsdale');
      assert.strictEqual(azScenario.locationContext.municipality, 'Scottsdale');
      assert.strictEqual(azScenario.locationContext.timezone, 'America/Phoenix');

      // Verify Strict Tenant Isolation: MA tenant cannot see AZ locations
      const maLocations = locationIntelligenceService.listLocations(tenantMA);
      const azLocations = locationIntelligenceService.listLocations(tenantAZ);

      assert.ok(maLocations.every((l) => l.tenantId === tenantMA));
      assert.ok(azLocations.every((l) => l.tenantId === tenantAZ));
      assert.ok(!maLocations.some((l) => l.city === 'Phoenix'));
      assert.ok(!azLocations.some((l) => l.city === 'New Bedford'));
    });
  });

  describe('9. Gemini Advisory Boundary (Non-Authoritative)', () => {
    it('returns advisory notice stamped as non-authoritative when advice is requested', async () => {
      const hq = locationIntelligenceService.saveLocation(tenantMA, {
        type: 'HEADQUARTERS',
        city: 'New Bedford',
        stateProvince: 'MA'
      });

      const context = locationIntelligenceService.resolveActionLocationContext({
        tenantId: tenantMA,
        actionType: 'PERMITTING_COMPLIANCE',
        jobLocation: hq
      });

      const guidance = await locationIntelligenceService.adviseGeographicContext(
        tenantMA,
        'What permits are required for this 200A panel job in Fairhaven?',
        context
      );

      assert.strictEqual(guidance.isAdvisoryOnly, true);
      assert.ok(guidance.advice);
    });
  });
});
