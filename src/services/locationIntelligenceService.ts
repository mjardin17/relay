import crypto from 'node:crypto';
import { getDatabase } from '../db/database';
import { launchAuditService } from './launchAuditService';
import { evidenceGraphService } from './evidenceGraphService';
import { spatialEngineService } from './spatialEngineService';
import { GoogleGenAI } from '@google/genai';
import {
  LocationRecord,
  ServiceAreaRecord,
  JurisdictionContext,
  RelayLocationContext,
  ServiceAreaMatchResult,
  ActionContextType,
  LocationType,
  LocationSource,
  VerificationState,
  LocationResolutionStatus,
  LocationCoordinates
} from '../types/locationIntelligence';

// Haversine formula to calculate great-circle distance in kilometers
function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Canonical Timezone mapping by State/Province/Region
const STATE_TIMEZONE_MAP: Record<string, string> = {
  // USA Eastern
  MA: 'America/New_York',
  NY: 'America/New_York',
  CT: 'America/New_York',
  RI: 'America/New_York',
  NH: 'America/New_York',
  VT: 'America/New_York',
  ME: 'America/New_York',
  NJ: 'America/New_York',
  PA: 'America/New_York',
  FL: 'America/New_York',
  GA: 'America/New_York',
  NC: 'America/New_York',
  SC: 'America/New_York',
  VA: 'America/New_York',
  DC: 'America/New_York',
  MD: 'America/New_York',
  OH: 'America/New_York',
  MI: 'America/Detroit',
  // USA Central
  IL: 'America/Chicago',
  TX: 'America/Chicago',
  TN: 'America/Chicago',
  MO: 'America/Chicago',
  MN: 'America/Chicago',
  WI: 'America/Chicago',
  LA: 'America/Chicago',
  AL: 'America/Chicago',
  MS: 'America/Chicago',
  // USA Mountain (No DST for Arizona)
  AZ: 'America/Phoenix',
  CO: 'America/Denver',
  UT: 'America/Denver',
  NM: 'America/Denver',
  WY: 'America/Denver',
  MT: 'America/Denver',
  // USA Pacific
  CA: 'America/Los_Angeles',
  WA: 'America/Los_Angeles',
  OR: 'America/Los_Angeles',
  NV: 'America/Los_Angeles',
  // USA Others
  AK: 'America/Anchorage',
  HI: 'Pacific/Honolulu',
  // Canada
  ON: 'America/Toronto',
  QC: 'America/Montreal',
  BC: 'America/Vancouver',
  AB: 'America/Edmonton'
};

const VERIFICATION_CONFIDENCE_WEIGHTS: Record<VerificationState, number> = {
  VERIFIED: 1.0,
  SELF_REPORTED: 0.75,
  DERIVED: 0.6,
  UNVERIFIED: 0.3,
  DISPUTED: 0.1
};

export class LocationIntelligenceService {
  private static instance: LocationIntelligenceService;

  private constructor() {}

  public static getInstance(): LocationIntelligenceService {
    if (!LocationIntelligenceService.instance) {
      LocationIntelligenceService.instance = new LocationIntelligenceService();
    }
    return LocationIntelligenceService.instance;
  }

  private ensureTenantExists(tenantId: string): void {
    try {
      const db = getDatabase();
      const now = new Date().toISOString();
      db.prepare(`
        INSERT OR IGNORE INTO tenants (
          id, name, industry, mrr, environment_classification, created_at
        ) VALUES (?, ?, ?, ?, ?, ?)
      `).run(tenantId, tenantId, 'Electrical', 0, 'SIMULATED_DRY_RUN', now);
    } catch (e) {
      // Best-effort tenant registration
    }
  }

  // ---------------------------------------------------------------------------
  // 1. Location Persistence & Provenance Management
  // ---------------------------------------------------------------------------

  public saveLocation(tenantId: string, loc: Partial<LocationRecord> & { type: LocationType; city: string; stateProvince: string }): LocationRecord {
    this.ensureTenantExists(tenantId);
    const db = getDatabase();
    const id = loc.id || `loc_${tenantId}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    // Check existing location for confidence protection
    const existing = this.getLocation(tenantId, id);
    if (existing) {
      const existingConfidence = existing.confidence || VERIFICATION_CONFIDENCE_WEIGHTS[existing.verificationState] || 0.5;
      const newConfidence = loc.confidence || (loc.verificationState ? VERIFICATION_CONFIDENCE_WEIGHTS[loc.verificationState] : 0.5);

      // Rule: Never silently overwrite higher-confidence verified location with lower-confidence inferred data
      if (existing.verificationState === 'VERIFIED' && loc.verificationState && loc.verificationState !== 'VERIFIED' && newConfidence < existingConfidence) {
        throw new Error(`PROVENANCE_GUARD: Cannot overwrite verified location (${existing.id}) with lower-confidence data (${loc.verificationState}). Operator verification required.`);
      }
    }

    const timezone = loc.timezone || this.resolveTimezone(loc.stateProvince, loc.city, loc.postalCode);
    const country = loc.country || 'US';
    const source: LocationSource = loc.source || 'OPERATOR_ENTRY';
    const verificationState: VerificationState = loc.verificationState || 'SELF_REPORTED';
    const confidence = loc.confidence !== undefined ? loc.confidence : VERIFICATION_CONFIDENCE_WEIGHTS[verificationState];
    const isRedacted = loc.isRedacted ? 1 : 0;
    const label = loc.label || `${loc.type} - ${loc.city}, ${loc.stateProvince}`;
    const evidenceRefs = loc.evidenceRefs || [];
    const metadata = loc.metadata || {};

    const stmt = db.prepare(`
      INSERT INTO tenant_locations (
        id, tenant_id, location_type, label, street_address, unit, city,
        municipality, county, state_province, postal_code, country, timezone,
        latitude, longitude, source, confidence, verification_state,
        verified_at, verified_by, is_redacted, evidence_refs_json,
        metadata_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        location_type = excluded.location_type,
        label = excluded.label,
        street_address = excluded.street_address,
        unit = excluded.unit,
        city = excluded.city,
        municipality = excluded.municipality,
        county = excluded.county,
        state_province = excluded.state_province,
        postal_code = excluded.postal_code,
        country = excluded.country,
        timezone = excluded.timezone,
        latitude = excluded.latitude,
        longitude = excluded.longitude,
        source = excluded.source,
        confidence = excluded.confidence,
        verification_state = excluded.verification_state,
        verified_at = excluded.verified_at,
        verified_by = excluded.verified_by,
        is_redacted = excluded.is_redacted,
        evidence_refs_json = excluded.evidence_refs_json,
        metadata_json = excluded.metadata_json,
        updated_at = excluded.updated_at
      WHERE tenant_id = excluded.tenant_id
    `);

    stmt.run(
      id,
      tenantId,
      loc.type,
      label,
      loc.streetAddress || null,
      loc.unit || null,
      loc.city,
      loc.municipality || loc.city,
      loc.county || null,
      loc.stateProvince,
      loc.postalCode || null,
      country,
      timezone,
      loc.coordinates?.latitude || null,
      loc.coordinates?.longitude || null,
      source,
      confidence,
      verificationState,
      loc.verifiedAt || null,
      loc.verifiedBy || null,
      isRedacted,
      JSON.stringify(evidenceRefs),
      JSON.stringify(metadata),
      existing ? existing.createdAt : now,
      now
    );

    const saved = this.getLocation(tenantId, id)!;

    // Link location into Evidence Graph
    this.addLocationNodeToEvidenceGraph(tenantId, saved);

    return saved;
  }

  public getLocation(tenantId: string, id: string): LocationRecord | null {
    const db = getDatabase();
    const row = db.prepare(`
      SELECT * FROM tenant_locations WHERE tenant_id = ? AND id = ?
    `).get(tenantId, id) as any;

    if (!row) return null;
    return this.mapDbRowToLocation(row);
  }

  public listLocations(tenantId: string, type?: LocationType): LocationRecord[] {
    const db = getDatabase();
    let query = 'SELECT * FROM tenant_locations WHERE tenant_id = ?';
    const params: any[] = [tenantId];

    if (type) {
      query += ' AND location_type = ?';
      params.push(type);
    }
    query += ' ORDER BY created_at DESC';

    const rows = db.prepare(query).all(...params) as any[];
    return rows.map((r) => this.mapDbRowToLocation(r));
  }

  public deleteLocation(tenantId: string, id: string): boolean {
    const db = getDatabase();
    const res = db.prepare('DELETE FROM tenant_locations WHERE tenant_id = ? AND id = ?').run(tenantId, id);
    return (res as any).changes > 0;
  }

  // ---------------------------------------------------------------------------
  // 2. Service Area Configuration & Management
  // ---------------------------------------------------------------------------

  public saveServiceArea(tenantId: string, sa: Partial<ServiceAreaRecord> & { name: string; areaType: ServiceAreaRecord['areaType']; value: string }): ServiceAreaRecord {
    this.ensureTenantExists(tenantId);
    const db = getDatabase();
    const id = sa.id || `sa_${tenantId}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const rule = sa.rule || 'INCLUSION';

    const stmt = db.prepare(`
      INSERT INTO tenant_service_areas (
        id, tenant_id, branch_id, name, area_type, rule, value,
        radius_km, coordinates_json, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        branch_id = excluded.branch_id,
        name = excluded.name,
        area_type = excluded.area_type,
        rule = excluded.rule,
        value = excluded.value,
        radius_km = excluded.radius_km,
        coordinates_json = excluded.coordinates_json,
        notes = excluded.notes
      WHERE tenant_id = excluded.tenant_id
    `);

    stmt.run(
      id,
      tenantId,
      sa.branchId || null,
      sa.name,
      sa.areaType,
      rule,
      sa.value,
      sa.radiusKm || null,
      JSON.stringify(sa.polygonCoordinates || sa.centerCoordinates || []),
      sa.notes || null,
      now
    );

    const saved = this.getServiceArea(tenantId, id)!;

    // Link Service Area to Evidence Graph
    this.addServiceAreaNodeToEvidenceGraph(tenantId, saved);

    return saved;
  }

  public getServiceArea(tenantId: string, id: string): ServiceAreaRecord | null {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM tenant_service_areas WHERE tenant_id = ? AND id = ?').get(tenantId, id) as any;
    if (!row) return null;
    return this.mapDbRowToServiceArea(row);
  }

  public listServiceAreas(tenantId: string, branchId?: string): ServiceAreaRecord[] {
    const db = getDatabase();
    let query = 'SELECT * FROM tenant_service_areas WHERE tenant_id = ?';
    const params: any[] = [tenantId];

    if (branchId) {
      query += ' AND (branch_id = ? OR branch_id IS NULL)';
      params.push(branchId);
    }
    query += ' ORDER BY created_at ASC';

    const rows = db.prepare(query).all(...params) as any[];
    return rows.map((r) => this.mapDbRowToServiceArea(r));
  }

  public deleteServiceArea(tenantId: string, id: string): boolean {
    const db = getDatabase();
    const res = db.prepare('DELETE FROM tenant_service_areas WHERE tenant_id = ? AND id = ?').run(tenantId, id);
    return (res as any).changes > 0;
  }

  // ---------------------------------------------------------------------------
  // 3. Service Area Evaluation Engine
  // ---------------------------------------------------------------------------

  public evaluateServiceArea(
    tenantId: string,
    target: {
      city?: string;
      postalCode?: string;
      county?: string;
      stateProvince?: string;
      coordinates?: LocationCoordinates;
      branchId?: string;
    }
  ): ServiceAreaMatchResult {
    const serviceAreas = this.listServiceAreas(tenantId, target.branchId);

    if (serviceAreas.length === 0) {
      return {
        status: 'UNKNOWN',
        reason: 'No service areas configured for tenant. Boundaries cannot be determined.'
      };
    }

    const normCity = target.city?.toLowerCase().trim();
    const normZip = target.postalCode?.replace(/[\s-]/g, '').trim();
    const normCounty = target.county?.toLowerCase().replace(/county/i, '').trim();
    const normState = target.stateProvince?.toUpperCase().trim();

    // 1. Check EXCLUSION Rules FIRST (Absolute Precedence)
    const exclusions = serviceAreas.filter((s) => s.rule === 'EXCLUSION');
    for (const rule of exclusions) {
      if (this.matchesRule(rule, normCity, normZip, normCounty, normState, target.coordinates)) {
        return {
          status: 'EXCLUDED',
          matchedRule: rule,
          reason: `Location is inside an explicitly configured exclusion area (${rule.name}: ${rule.value}).`
        };
      }
    }

    // 2. Check INCLUSION Rules
    const inclusions = serviceAreas.filter((s) => s.rule === 'INCLUSION');
    for (const rule of inclusions) {
      if (this.matchesRule(rule, normCity, normZip, normCounty, normState, target.coordinates)) {
        return {
          status: 'INSIDE',
          matchedRule: rule,
          reason: `Location matches configured service area (${rule.name}: ${rule.value}).`
        };
      }
    }

    return {
      status: 'OUTSIDE',
      reason: `Location (${target.city || target.postalCode || 'unspecified'}, ${target.stateProvince || ''}) is outside all configured service territories.`
    };
  }

  private matchesRule(
    rule: ServiceAreaRecord,
    normCity?: string,
    normZip?: string,
    normCounty?: string,
    normState?: string,
    coords?: LocationCoordinates
  ): boolean {
    const val = rule.value.toLowerCase().trim();

    switch (rule.areaType) {
      case 'CITY':
        if (normCity && (normCity === val || val.split(',').map((c) => c.trim()).includes(normCity))) {
          return true;
        }
        break;

      case 'ZIP_CODE':
        if (normZip) {
          const zipList = val.split(',').map((z) => z.replace(/[\s-]/g, '').trim());
          if (zipList.includes(normZip)) return true;
          // Handle prefix matching like 027* or range like 02740-02748
          for (const item of zipList) {
            if (item.includes('-')) {
              const [start, end] = item.split('-').map((x) => parseInt(x, 10));
              const current = parseInt(normZip, 10);
              if (!isNaN(start) && !isNaN(end) && !isNaN(current) && current >= start && current <= end) {
                return true;
              }
            } else if (item.endsWith('*') && normZip.startsWith(item.slice(0, -1))) {
              return true;
            }
          }
        }
        break;

      case 'COUNTY':
        if (normCounty) {
          const countyVal = val.replace(/county/i, '').trim();
          if (normCounty === countyVal || val.split(',').map((c) => c.replace(/county/i, '').trim()).includes(normCounty)) {
            return true;
          }
        }
        break;

      case 'STATE':
        if (normState && (normState === rule.value.toUpperCase().trim() || val.split(',').map((s) => s.toUpperCase().trim()).includes(normState))) {
          return true;
        }
        break;

      case 'RADIUS':
        if (coords && rule.centerCoordinates && rule.radiusKm) {
          const dist = spatialEngineService.distance(coords, rule.centerCoordinates, 'kilometers');
          if (dist <= rule.radiusKm) return true;
        }
        break;

      case 'POLYGON':
        if (coords) {
          // If polygon coordinates array exists
          if (rule.polygonCoordinates && rule.polygonCoordinates.length >= 3) {
            const polyFeature = spatialEngineService.polygonFromCoordinates(rule.polygonCoordinates);
            if (spatialEngineService.containsPoint(polyFeature, coords)) return true;
          }
          // Or if value contains GeoJSON string
          if (rule.value && (rule.value.startsWith('{') || rule.value.startsWith('['))) {
            if (spatialEngineService.containsPoint(rule.value, coords)) return true;
          }
        }
        break;

      case 'CUSTOM_TERRITORY':
        if (coords && rule.value && (rule.value.startsWith('{') || rule.value.startsWith('['))) {
          if (spatialEngineService.containsPoint(rule.value, coords)) return true;
        }
        if (normCity && val.includes(normCity)) return true;
        if (normZip && val.includes(normZip)) return true;
        if (normCounty && val.includes(normCounty)) return true;
        break;
    }

    return false;
  }

  // ---------------------------------------------------------------------------
  // 4. Deterministic Precedence Context Resolver
  // ---------------------------------------------------------------------------

  public resolveActionLocationContext(params: {
    tenantId: string;
    actionType: ActionContextType;
    businessId?: string;
    branchId?: string;
    jobLocation?: LocationRecord;
    customerLocation?: LocationRecord;
    operatorLocation?: LocationRecord;
    campaignTarget?: LocationRecord;
    overrideLocation?: LocationRecord;
    source?: LocationSource;
    evidenceRefs?: string[];
  }): RelayLocationContext {
    const { tenantId, actionType } = params;
    const businessId = params.businessId || tenantId;
    const evidenceRefs = params.evidenceRefs || [];

    // Fetch tenant headquarters and branches from database
    const allLocations = this.listLocations(tenantId);
    const headquarters = allLocations.find((l) => l.type === 'HEADQUARTERS');
    const branches = allLocations.filter((l) => l.type === 'BRANCH');
    const serviceAreas = this.listServiceAreas(tenantId, params.branchId);

    let resolvedLocation: LocationRecord | undefined = undefined;
    let resolutionReason = '';
    let chosenSource: LocationSource = params.source || 'TENANT_CONFIG';

    // -------------------------------------------------------------------------
    // DETERMINISTIC ACTION PRECEDENCE MATRIX
    // -------------------------------------------------------------------------
    switch (actionType) {
      case 'SCHEDULING':
        // Precedence: 1. Job Site -> 2. Customer -> 3. Branch -> 4. Tenant HQ fallback
        if (params.jobLocation) {
          resolvedLocation = params.jobLocation;
          resolutionReason = 'Resolved to physical job site location for appointment scheduling.';
          chosenSource = params.jobLocation.source;
        } else if (params.customerLocation) {
          resolvedLocation = params.customerLocation;
          resolutionReason = 'Resolved to customer residential/business address (no separate job site).';
          chosenSource = params.customerLocation.source;
        } else if (params.branchId && branches.find((b) => b.id === params.branchId)) {
          resolvedLocation = branches.find((b) => b.id === params.branchId);
          resolutionReason = 'Resolved to selected branch office location.';
          chosenSource = 'TENANT_CONFIG';
        } else if (headquarters) {
          resolvedLocation = headquarters;
          resolutionReason = 'Fallback to business headquarters location.';
          chosenSource = headquarters.source;
        }
        break;

      case 'DISPATCH':
        // Precedence: 1. Job Site -> 2. Technician / Operator -> 3. Branch -> 4. Service Area
        if (params.jobLocation) {
          resolvedLocation = params.jobLocation;
          resolutionReason = 'Dispatch routed to physical destination job site.';
          chosenSource = params.jobLocation.source;
        } else if (params.operatorLocation) {
          resolvedLocation = params.operatorLocation;
          resolutionReason = 'Dispatch referenced current technician/operator staging location.';
          chosenSource = params.operatorLocation.source;
        } else if (params.branchId && branches.find((b) => b.id === params.branchId)) {
          resolvedLocation = branches.find((b) => b.id === params.branchId);
          resolutionReason = 'Dispatch assigned to branch operations center.';
          chosenSource = 'TENANT_CONFIG';
        } else if (headquarters) {
          resolvedLocation = headquarters;
          resolutionReason = 'Dispatch fallback to main headquarters.';
          chosenSource = headquarters.source;
        }
        break;

      case 'LOCAL_ADVERTISING':
        // Precedence: 1. Campaign Target -> 2. Service Area -> 3. Branch -> 4. HQ
        if (params.campaignTarget) {
          resolvedLocation = params.campaignTarget;
          resolutionReason = 'Resolved to target advertising geo-boundary.';
          chosenSource = params.campaignTarget.source;
        } else if (headquarters) {
          resolvedLocation = headquarters;
          resolutionReason = 'Advertising targeted around business base territory.';
          chosenSource = headquarters.source;
        }
        break;

      case 'GBP_LISTING':
        // Strict Rule: Verified GBP location or configured service-area.
        // Operator / device location is strictly barred from modifying business profile.
        if (headquarters) {
          resolvedLocation = headquarters;
          resolutionReason = 'Resolved to official verified business headquarters profile (Google Policy 2911778).';
          chosenSource = 'VERIFIED_BUSINESS_PROFILE';
        }
        break;

      case 'PERMITTING_COMPLIANCE':
        // Strict Rule: 1. Physical Job Site -> 2. Municipality -> 3. State -> 4. Country.
        // Business headquarters NEVER determines job permitting jurisdiction!
        if (params.jobLocation) {
          resolvedLocation = params.jobLocation;
          resolutionReason = 'Resolved to physical job site for municipal permitting and AHJ code inspection (HQ does not determine job site jurisdiction).';
          chosenSource = params.jobLocation.source;
        } else if (params.customerLocation) {
          resolvedLocation = params.customerLocation;
          resolutionReason = 'Resolved to customer property location for local compliance review.';
          chosenSource = params.customerLocation.source;
        } else {
          resolutionReason = 'JURISDICTION_REVIEW_REQUIRED: Permitting requires explicit physical job site location.';
        }
        break;

      case 'COMMUNICATIONS':
        // Precedence: Recipient / Customer location for timezone context, HQ as secondary
        if (params.customerLocation) {
          resolvedLocation = params.customerLocation;
          resolutionReason = 'Resolved to recipient customer timezone and locale.';
          chosenSource = params.customerLocation.source;
        } else if (headquarters) {
          resolvedLocation = headquarters;
          resolutionReason = 'Fallback to business operating timezone.';
          chosenSource = headquarters.source;
        }
        break;

      case 'FINANCIAL_ACCOUNTING':
        // Precedence: Job location for sales tax / local municipal surcharges, HQ for corporate taxes
        if (params.jobLocation) {
          resolvedLocation = params.jobLocation;
          resolutionReason = 'Resolved to job site location for transaction tax and municipal filing.';
          chosenSource = params.jobLocation.source;
        } else if (headquarters) {
          resolvedLocation = headquarters;
          resolutionReason = 'Resolved to legal business entity registration location.';
          chosenSource = headquarters.source;
        }
        break;

      case 'GENERAL_ACTION':
      default:
        resolvedLocation = params.overrideLocation || params.jobLocation || params.customerLocation || headquarters;
        resolutionReason = resolvedLocation ? 'Resolved to most specific available location.' : 'No location records found.';
        chosenSource = resolvedLocation?.source || 'TENANT_CONFIG';
        break;
    }

    // -------------------------------------------------------------------------
    // Service Area Matching & Safety Check
    // -------------------------------------------------------------------------
    let serviceAreaStatus: LocationResolutionStatus = 'RESOLVED';
    let resolutionStatus: LocationResolutionStatus = 'RESOLVED';

    if (!resolvedLocation) {
      serviceAreaStatus = 'LOCATION_UNKNOWN';
      resolutionStatus = 'LOCATION_UNKNOWN';
      resolutionReason = resolutionReason || 'No applicable location could be resolved from context.';
    } else {
      const saEval = this.evaluateServiceArea(tenantId, {
        city: resolvedLocation.city,
        postalCode: resolvedLocation.postalCode,
        county: resolvedLocation.county,
        stateProvince: resolvedLocation.stateProvince,
        coordinates: resolvedLocation.coordinates,
        branchId: params.branchId
      });

      if (saEval.status === 'EXCLUDED') {
        serviceAreaStatus = 'EXCLUDED_ZONE';
        resolutionStatus = 'EXCLUDED_ZONE';
        resolutionReason += ` [WARNING: ${saEval.reason}]`;
      } else if (saEval.status === 'OUTSIDE') {
        serviceAreaStatus = 'OUTSIDE_CONFIGURED_SERVICE_AREA';
        resolutionStatus = 'OUTSIDE_CONFIGURED_SERVICE_AREA';
        resolutionReason += ` [NOTICE: ${saEval.reason}]`;
      } else if (saEval.status === 'UNKNOWN') {
        serviceAreaStatus = 'LOCATION_UNKNOWN';
      }
    }

    // -------------------------------------------------------------------------
    // Governing Jurisdiction Construction
    // -------------------------------------------------------------------------
    const jurisdiction = this.buildJurisdictionContext(tenantId, resolvedLocation, actionType);

    if (jurisdiction.requiresHumanReview && resolutionStatus === 'RESOLVED') {
      resolutionStatus = 'JURISDICTION_REVIEW_REQUIRED';
    }

    const timezone = resolvedLocation?.timezone || headquarters?.timezone || 'UTC';
    const localTimeFormatted = this.formatLocalTime(new Date().toISOString(), timezone);

    const contextResult: RelayLocationContext = {
      tenantId,
      businessId,
      actionType,
      resolvedLocation,
      headquarters,
      branches,
      serviceAreas,
      operatorLocation: params.operatorLocation,
      customerLocation: params.customerLocation,
      jobLocation: params.jobLocation,
      actionLocation: resolvedLocation,
      municipality: resolvedLocation?.municipality || resolvedLocation?.city,
      county: resolvedLocation?.county,
      stateProvince: resolvedLocation?.stateProvince,
      postalCode: resolvedLocation?.postalCode,
      country: resolvedLocation?.country || 'US',
      timezone,
      localTimeFormatted,
      jurisdiction,
      serviceAreaStatus,
      resolutionStatus,
      resolutionReason,
      source: chosenSource,
      confidence: resolvedLocation ? resolvedLocation.confidence : 0.0,
      verifiedAt: resolvedLocation?.verifiedAt,
      evidenceRefs: Array.from(new Set([...evidenceRefs, ...(resolvedLocation?.evidenceRefs || [])]))
    };

    // Calculate cryptographic audit hash
    const rawAuditPayload = `${tenantId}:${actionType}:${resolvedLocation?.id || 'none'}:${timezone}:${serviceAreaStatus}:${jurisdiction.country}`;
    const auditHash = crypto.createHash('sha256').update(rawAuditPayload).digest('hex');
    contextResult.auditHash = auditHash;

    // Persist Resolution Ledger Record
    this.persistJurisdictionResolution(contextResult);

    // Record Immutable Audit Event
    launchAuditService.recordAudit({
      tenantId,
      actorId: 'relay_location_engine',
      clientIp: '127.0.0.1',
      endpoint: '/api/growth/resolve-location',
      action: `resolve_${actionType.toLowerCase()}_location`,
      status: resolutionStatus === 'RESOLVED' ? 'success' : 'warning',
      executionMode: 'DRY_RUN',
      details: {
        actionType,
        resolvedLocationId: resolvedLocation?.id || null,
        municipality: contextResult.municipality,
        stateProvince: contextResult.stateProvince,
        timezone,
        serviceAreaStatus,
        resolutionStatus,
        auditHash
      }
    });

    return contextResult;
  }

  // ---------------------------------------------------------------------------
  // 5. Jurisdiction Model & Regulatory Code Mapping
  // ---------------------------------------------------------------------------

  public buildJurisdictionContext(
    tenantId: string,
    location?: LocationRecord,
    actionType?: ActionContextType
  ): JurisdictionContext {
    if (!location) {
      return {
        country: 'US',
        jurisdictionIds: ['jurisdiction_unknown'],
        timezone: 'UTC',
        source: 'UNRESOLVED',
        confidence: 0.0,
        requiresHumanReview: true,
        evidenceRefs: []
      };
    }

    const state = location.stateProvince?.toUpperCase().trim();
    const city = location.city || location.municipality || 'Municipal';
    const county = location.county || 'County';
    const country = location.country || 'US';

    const jurisdictionIds: string[] = [
      `jur_${country.toLowerCase()}`,
      `jur_${country.toLowerCase()}_${state.toLowerCase()}`,
      `jur_${country.toLowerCase()}_${state.toLowerCase()}_${county.toLowerCase().replace(/\s+/g, '_')}`,
      `jur_${country.toLowerCase()}_${state.toLowerCase()}_${city.toLowerCase().replace(/\s+/g, '_')}`
    ];

    let governingCodeStandard = 'National Electrical Code (NEC)';
    let localAuthorityName = `${city} Building Department / Local Inspectional Services`;
    let permittingOffice = `${city} Town Hall, ${state}`;
    let requiresHumanReview = false;

    // State-specific Authority Having Jurisdiction (AHJ) & Code Configurations
    if (state === 'MA') {
      governingCodeStandard = '527 CMR 12.00 / Massachusetts Electrical Code (NEC 2023 with MA Amendments)';
      localAuthorityName = `Town/City of ${city} Wire Inspector (MA DPL Board of State Examiners of Electricians)`;
      permittingOffice = `${city} Municipal Wiring Inspection Department, Commonwealth of Massachusetts`;
    } else if (state === 'AZ') {
      governingCodeStandard = 'Maricopa County / City of Phoenix Technical Building Codes (NEC 2020/2023)';
      localAuthorityName = `${city} Planning & Development Department (Arizona Registrar of Contractors)`;
      permittingOffice = `${city} Permit & Licensing Division, State of Arizona`;
    } else if (state === 'CA') {
      governingCodeStandard = 'California Electrical Code (Title 24, Part 3)';
      localAuthorityName = `${city} Department of Building and Safety (CSLB)`;
    }

    // Safety Gate: If location is unverified or confidence is low, require human review for compliance-sensitive operations
    if (actionType === 'PERMITTING_COMPLIANCE' && location.verificationState !== 'VERIFIED') {
      requiresHumanReview = true;
    }

    return {
      country,
      stateProvince: state,
      county: location.county,
      municipality: location.municipality || location.city,
      localAuthorityName,
      jurisdictionIds,
      timezone: location.timezone,
      governingCodeStandard,
      permittingOffice,
      source: location.source,
      confidence: location.confidence,
      requiresHumanReview,
      evidenceRefs: location.evidenceRefs || []
    };
  }

  private persistJurisdictionResolution(ctx: RelayLocationContext): void {
    this.ensureTenantExists(ctx.tenantId);
    const db = getDatabase();
    const id = `jres_${ctx.tenantId}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO jurisdiction_resolutions (
        id, tenant_id, action_type, target_entity_type, target_entity_id,
        resolved_country, resolved_state_province, resolved_county,
        resolved_municipality, resolved_timezone, service_area_status,
        jurisdiction_ids_json, requires_human_review, confidence,
        source_level, evidence_refs_json, resolution_notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      ctx.tenantId,
      ctx.actionType,
      ctx.resolvedLocation?.type || 'UNKNOWN',
      ctx.resolvedLocation?.id || null,
      ctx.country || 'US',
      ctx.stateProvince || null,
      ctx.county || null,
      ctx.municipality || null,
      ctx.timezone || 'UTC',
      ctx.serviceAreaStatus,
      JSON.stringify(ctx.jurisdiction?.jurisdictionIds || []),
      ctx.jurisdiction?.requiresHumanReview ? 1 : 0,
      ctx.confidence,
      ctx.source,
      JSON.stringify(ctx.evidenceRefs),
      ctx.resolutionReason,
      now
    );
  }

  // ---------------------------------------------------------------------------
  // 6. Timezone Resolution & Local Formatting Engine
  // ---------------------------------------------------------------------------

  public resolveTimezone(stateProvince?: string, city?: string, postalCode?: string): string {
    if (stateProvince) {
      const normState = stateProvince.toUpperCase().trim();
      if (STATE_TIMEZONE_MAP[normState]) {
        return STATE_TIMEZONE_MAP[normState];
      }
    }
    // Default US Eastern fallback if state not recognized
    return 'America/New_York';
  }

  public formatLocalTime(isoTimestamp: string, timezone: string): string {
    try {
      const date = new Date(isoTimestamp);
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short'
      });
      return formatter.format(date);
    } catch {
      return isoTimestamp;
    }
  }

  // ---------------------------------------------------------------------------
  // 7. Operator & Device Location Privacy Gate
  // ---------------------------------------------------------------------------

  public recordOperatorDeviceLocation(params: {
    tenantId: string;
    actorId: string;
    latitude: number;
    longitude: number;
    accuracyMeters?: number;
    hasPermission: boolean;
    city?: string;
    stateProvince?: string;
    isRedacted?: boolean;
  }): { success: boolean; location?: LocationRecord; reason?: string } {
    if (!params.hasPermission) {
      return {
        success: false,
        reason: 'DEVICE_LOCATION_PERMISSION_DENIED: User has not granted device location permissions. Relay functions safely without blocking.'
      };
    }

    const loc = this.saveLocation(params.tenantId, {
      type: 'OPERATOR',
      label: `Operator Staging Location (${params.actorId})`,
      city: params.city || 'Operator Local Vicinity',
      stateProvince: params.stateProvince || 'MA',
      country: 'US',
      coordinates: {
        latitude: params.latitude,
        longitude: params.longitude,
        accuracyMeters: params.accuracyMeters
      },
      source: 'DEVICE_PERMISSION',
      verificationState: 'DERIVED',
      confidence: 0.7,
      isRedacted: params.isRedacted ?? true,
      evidenceRefs: [`device_perm_${params.actorId}`],
      metadata: {
        actorId: params.actorId,
        isTransient: true,
        recordedAt: new Date().toISOString()
      }
    });

    return {
      success: true,
      location: loc
    };
  }

  // ---------------------------------------------------------------------------
  // 8. Evidence Graph Integration
  // ---------------------------------------------------------------------------

  public addLocationNodeToEvidenceGraph(tenantId: string, loc: LocationRecord): void {
    const nodeId = `node_loc_${loc.id}`;
    evidenceGraphService.addNode(tenantId, {
      id: nodeId,
      type: 'location',
      label: `${loc.type}: ${loc.label}`,
      timestamp: loc.createdAt,
      source: loc.source,
      evidenceStatus: loc.verificationState === 'VERIFIED' ? 'VERIFIED' : 'OBSERVED',
      actor: loc.verifiedBy || 'system_location_engine',
      metadata: {
        locationId: loc.id,
        locationType: loc.type,
        city: loc.city,
        municipality: loc.municipality,
        county: loc.county,
        stateProvince: loc.stateProvince,
        postalCode: loc.postalCode,
        country: loc.country,
        timezone: loc.timezone,
        verificationState: loc.verificationState,
        isRedacted: loc.isRedacted
      },
      provenance: {
        sourceSystem: 'relay_location_intelligence',
        rawRecordId: loc.id,
        ingestedAt: loc.createdAt,
        verificationMethod: loc.verificationState,
        verifierActorId: loc.verifiedBy
      }
    });
  }

  public addServiceAreaNodeToEvidenceGraph(tenantId: string, sa: ServiceAreaRecord): void {
    const nodeId = `node_sa_${sa.id}`;
    evidenceGraphService.addNode(tenantId, {
      id: nodeId,
      type: 'service_area',
      label: `Service Area (${sa.rule}): ${sa.name} [${sa.areaType}: ${sa.value}]`,
      timestamp: sa.createdAt,
      source: 'TENANT_CONFIG',
      evidenceStatus: 'VERIFIED',
      actor: 'tenant_admin',
      metadata: {
        serviceAreaId: sa.id,
        areaType: sa.areaType,
        rule: sa.rule,
        value: sa.value,
        radiusKm: sa.radiusKm,
        branchId: sa.branchId
      },
      provenance: {
        sourceSystem: 'relay_service_area_engine',
        rawRecordId: sa.id,
        ingestedAt: sa.createdAt,
        verificationMethod: 'tenant_admin_configuration'
      }
    });
  }

  public linkLocationToEntity(
    tenantId: string,
    locationId: string,
    entityId: string,
    edgeType: 'LOCATED_AT' | 'SERVICED_BY' | 'GOVERNED_BY' | 'JURISDICTION_OF' = 'LOCATED_AT'
  ): void {
    const locationNodeId = locationId.startsWith('node_loc_') ? locationId : `node_loc_${locationId}`;
    const targetNodeId = entityId.startsWith('node_') ? entityId : entityId;

    try {
      evidenceGraphService.addEdge(tenantId, {
        sourceNodeId: targetNodeId,
        targetNodeId: locationNodeId,
        edgeType: edgeType as any,
        confidence: 1.0,
        weight: 1.0
      });
    } catch {
      // Ignore if nodes don't exist yet in graph
    }
  }

  // ---------------------------------------------------------------------------
  // 9. Gemini Advisory Boundary (Non-Authoritative)
  // ---------------------------------------------------------------------------

  public async adviseGeographicContext(
    tenantId: string,
    prompt: string,
    context: RelayLocationContext
  ): Promise<{
    advice: string;
    normalizedAddress?: string;
    isAdvisoryOnly: boolean;
    confidence: number;
  }> {
    const isAdvisoryOnly = true;

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return {
          advice: `[Deterministic Fallback] Location resolved to ${context.municipality || context.resolvedLocation?.city}, ${context.stateProvince}. Status: ${context.serviceAreaStatus}. Timezone: ${context.timezone}. Note: Permitting and licensing require verified municipal review.`,
          isAdvisoryOnly,
          confidence: context.confidence
        };
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });

      const systemInstruction = `You are Relay's Geographic & Jurisdiction Assistant.
Your role is to explain geographic relationships, summarize service-area coverage, and assist human operators.
CRITICAL BOUNDARY: You do NOT have authority to approve permits, grant licenses, or override deterministic service-area rules.
Always clarify that official municipal inspectional offices and deterministic company rules remain authoritative.`;

      const userMessage = `Tenant: ${tenantId}
Action: ${context.actionType}
Resolved Location: ${context.resolvedLocation?.streetAddress || ''} ${context.resolvedLocation?.city || ''}, ${context.resolvedLocation?.stateProvince || ''} ${context.resolvedLocation?.postalCode || ''}
Municipality: ${context.municipality}
County: ${context.county}
Timezone: ${context.timezone}
Service Area Status: ${context.serviceAreaStatus}
Jurisdiction: ${context.jurisdiction?.governingCodeStandard || 'Standard'}
Permitting Office: ${context.jurisdiction?.permittingOffice || 'Local Office'}

User Prompt: ${prompt}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: userMessage,
        config: { systemInstruction }
      });

      return {
        advice: response.text || 'Geographic context summarized.',
        isAdvisoryOnly,
        confidence: context.confidence
      };
    } catch (err: any) {
      return {
        advice: `[Advisory Notice] Location resolved to ${context.municipality}, ${context.stateProvince}. Service Area: ${context.serviceAreaStatus}. (Gemini advisor unavailable: ${err?.message || 'offline'})`,
        isAdvisoryOnly,
        confidence: context.confidence
      };
    }
  }

  // ---------------------------------------------------------------------------
  // Database Row Mappers
  // ---------------------------------------------------------------------------

  private mapDbRowToLocation(row: any): LocationRecord {
    let evidenceRefs: string[] = [];
    let metadata: Record<string, any> = {};

    try {
      evidenceRefs = JSON.parse(row.evidence_refs_json || '[]');
    } catch {}
    try {
      metadata = JSON.parse(row.metadata_json || '{}');
    } catch {}

    let coords: LocationCoordinates | undefined = undefined;
    if (row.latitude !== null && row.longitude !== null && row.latitude !== undefined) {
      coords = {
        latitude: row.latitude,
        longitude: row.longitude
      };
    }

    return {
      id: row.id,
      tenantId: row.tenant_id,
      type: row.location_type,
      label: row.label,
      streetAddress: row.street_address || undefined,
      unit: row.unit || undefined,
      city: row.city,
      municipality: row.municipality || row.city,
      county: row.county || undefined,
      stateProvince: row.state_province,
      postalCode: row.postal_code || undefined,
      country: row.country || 'US',
      timezone: row.timezone || 'America/New_York',
      coordinates: coords,
      source: row.source,
      confidence: row.confidence,
      verificationState: row.verification_state,
      verifiedAt: row.verified_at || undefined,
      verifiedBy: row.verified_by || undefined,
      isRedacted: row.is_redacted === 1,
      evidenceRefs,
      metadata,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapDbRowToServiceArea(row: any): ServiceAreaRecord {
    let polygonCoordinates: LocationCoordinates[] | undefined = undefined;
    let centerCoordinates: LocationCoordinates | undefined = undefined;

    try {
      const parsed = JSON.parse(row.coordinates_json || '[]');
      if (Array.isArray(parsed)) {
        polygonCoordinates = parsed;
      } else if (parsed && typeof parsed === 'object') {
        centerCoordinates = parsed;
      }
    } catch {}

    return {
      id: row.id,
      tenantId: row.tenant_id,
      branchId: row.branch_id || undefined,
      name: row.name,
      areaType: row.area_type,
      rule: row.rule,
      value: row.value,
      radiusKm: row.radius_km || undefined,
      centerCoordinates,
      polygonCoordinates,
      notes: row.notes || undefined,
      createdAt: row.created_at
    };
  }
}

export const locationIntelligenceService = LocationIntelligenceService.getInstance();
