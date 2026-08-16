import * as turf from '@turf/turf';
import { LocationCoordinates } from '../types/locationIntelligence';

export interface SpatialEngine {
  containsPoint(
    area: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon> | GeoJSON.Polygon | GeoJSON.MultiPolygon | string,
    point: LocationCoordinates | [number, number]
  ): boolean;
  distance(a: LocationCoordinates, b: LocationCoordinates, units?: 'kilometers' | 'miles'): number;
  intersects(a: any, b: any): boolean;
  buffer(origin: LocationCoordinates, radiusKm: number, steps?: number): GeoJSON.Feature<GeoJSON.Polygon>;
  validateGeoJson(geoJson: any): { valid: boolean; error?: string; normalized?: any };
  nearestLocation(
    target: LocationCoordinates,
    locations: Array<{ id: string; coordinates: LocationCoordinates }>
  ): { locationId: string; distanceKm: number } | null;
  polygonFromCoordinates(coordinates: LocationCoordinates[]): GeoJSON.Feature<GeoJSON.Polygon>;
  calculateTerritoryOverlap(territoryA: any, territoryB: any): { overlaps: boolean; overlapAreaKm2?: number };
}

export class SpatialEngineService implements SpatialEngine {
  /**
   * Evaluates whether a geographic point is contained within a GeoJSON Polygon or MultiPolygon.
   * Encapsulates turf.booleanPointInPolygon.
   */
  public containsPoint(
    area: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon> | GeoJSON.Polygon | GeoJSON.MultiPolygon | string,
    point: LocationCoordinates | [number, number]
  ): boolean {
    try {
      let pt: [number, number];
      if (Array.isArray(point)) {
        pt = point;
      } else {
        if (typeof point.longitude !== 'number' || typeof point.latitude !== 'number' || isNaN(point.longitude) || isNaN(point.latitude)) {
          return false;
        }
        pt = [point.longitude, point.latitude];
      }

      const turfPoint = turf.point(pt);

      let parsedArea: any = area;
      if (typeof area === 'string') {
        try {
          parsedArea = JSON.parse(area);
        } catch {
          return false;
        }
      }

      if (!parsedArea) return false;

      // Wrap raw Geometry in Feature if necessary
      let feature: any = parsedArea;
      if (parsedArea.type === 'Polygon' || parsedArea.type === 'MultiPolygon') {
        feature = turf.feature(parsedArea);
      } else if (parsedArea.type === 'FeatureCollection' && parsedArea.features && parsedArea.features.length > 0) {
        // Test against all polygon features in collection
        return parsedArea.features.some((f: any) => this.containsPoint(f, point));
      }

      if (!feature || !feature.geometry) return false;

      return turf.booleanPointInPolygon(turfPoint, feature, { ignoreBoundary: false });
    } catch {
      return false;
    }
  }

  /**
   * Computes the great-circle distance between two geographic coordinates using Turf.js.
   */
  public distance(a: LocationCoordinates, b: LocationCoordinates, units: 'kilometers' | 'miles' = 'kilometers'): number {
    if (
      typeof a.longitude !== 'number' ||
      typeof a.latitude !== 'number' ||
      typeof b.longitude !== 'number' ||
      typeof b.latitude !== 'number' ||
      isNaN(a.longitude) ||
      isNaN(a.latitude) ||
      isNaN(b.longitude) ||
      isNaN(b.latitude)
    ) {
      return Infinity;
    }

    const from = turf.point([a.longitude, a.latitude]);
    const to = turf.point([b.longitude, b.latitude]);
    return turf.distance(from, to, { units });
  }

  /**
   * Determines if two GeoJSON geometries or features intersect.
   */
  public intersects(a: any, b: any): boolean {
    try {
      const featA = this.normalizeToFeature(a);
      const featB = this.normalizeToFeature(b);
      if (!featA || !featB) return false;

      return turf.booleanIntersects(featA, featB);
    } catch {
      return false;
    }
  }

  /**
   * Generates a circular polygon buffer around origin coordinates.
   */
  public buffer(origin: LocationCoordinates, radiusKm: number, steps: number = 64): GeoJSON.Feature<GeoJSON.Polygon> {
    if (radiusKm <= 0) {
      radiusKm = 0.001; // Minimum valid non-zero radius
    }
    const center = [origin.longitude, origin.latitude];
    return turf.circle(center, radiusKm, { steps, units: 'kilometers' });
  }

  /**
   * Validates and normalizes GeoJSON structure.
   */
  public validateGeoJson(geoJson: any): { valid: boolean; error?: string; normalized?: any } {
    if (!geoJson) {
      return { valid: false, error: 'Empty GeoJSON payload' };
    }

    let parsed = geoJson;
    if (typeof geoJson === 'string') {
      try {
        parsed = JSON.parse(geoJson);
      } catch (err: any) {
        return { valid: false, error: `Invalid JSON syntax: ${err.message}` };
      }
    }

    if (!parsed || typeof parsed !== 'object') {
      return { valid: false, error: 'GeoJSON must be a valid object' };
    }

    const validTypes = ['Feature', 'FeatureCollection', 'Polygon', 'MultiPolygon', 'Point', 'MultiPoint', 'LineString'];
    if (!validTypes.includes(parsed.type)) {
      return { valid: false, error: `Unsupported GeoJSON type: ${parsed.type}` };
    }

    if (parsed.type === 'Polygon') {
      if (!Array.isArray(parsed.coordinates) || parsed.coordinates.length === 0) {
        return { valid: false, error: 'Polygon must have a non-empty coordinates array' };
      }
      const ring = parsed.coordinates[0];
      if (!Array.isArray(ring) || ring.length < 3) {
        return { valid: false, error: 'Polygon exterior ring must have at least 3 coordinates' };
      }
      // Auto-close ring if needed
      const first = ring[0];
      const last = ring[ring.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) {
        ring.push([first[0], first[1]]);
      }
    }

    return { valid: true, normalized: parsed };
  }

  /**
   * Finds the nearest location to target coordinates from a list of candidate locations.
   */
  public nearestLocation(
    target: LocationCoordinates,
    locations: Array<{ id: string; coordinates: LocationCoordinates }>
  ): { locationId: string; distanceKm: number } | null {
    if (!locations || locations.length === 0) return null;

    let closest: { locationId: string; distanceKm: number } | null = null;
    for (const loc of locations) {
      if (!loc.coordinates) continue;
      const d = this.distance(target, loc.coordinates, 'kilometers');
      if (!closest || d < closest.distanceKm) {
        closest = { locationId: loc.id, distanceKm: d };
      }
    }

    return closest;
  }

  /**
   * Constructs a valid GeoJSON Polygon Feature from an array of LocationCoordinates.
   */
  public polygonFromCoordinates(coordinates: LocationCoordinates[]): GeoJSON.Feature<GeoJSON.Polygon> {
    if (!coordinates || coordinates.length < 3) {
      throw new Error('At least 3 coordinates are required to construct a polygon.');
    }

    const ring: [number, number][] = coordinates.map((c) => [c.longitude, c.latitude]);
    // Ensure ring is closed
    const first = ring[0];
    const last = ring[ring.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) {
      ring.push([first[0], first[1]]);
    }

    return turf.polygon([ring]);
  }

  /**
   * Calculates whether two territories overlap and returns the overlap status and approximate area.
   */
  public calculateTerritoryOverlap(territoryA: any, territoryB: any): { overlaps: boolean; overlapAreaKm2?: number } {
    try {
      const featA = this.normalizeToFeature(territoryA);
      const featB = this.normalizeToFeature(territoryB);
      if (!featA || !featB) return { overlaps: false };

      const overlaps = turf.booleanIntersects(featA, featB);
      if (!overlaps) return { overlaps: false, overlapAreaKm2: 0 };

      // Turf intersect requires Feature<Polygon | MultiPolygon>
      if (
        (featA.geometry.type === 'Polygon' || featA.geometry.type === 'MultiPolygon') &&
        (featB.geometry.type === 'Polygon' || featB.geometry.type === 'MultiPolygon')
      ) {
        const intersection = turf.intersect(turf.featureCollection([featA, featB]));
        if (intersection) {
          const areaSqMeters = turf.area(intersection);
          return { overlaps: true, overlapAreaKm2: areaSqMeters / 1_000_000 };
        }
      }

      return { overlaps: true };
    } catch {
      return { overlaps: false };
    }
  }

  private normalizeToFeature(input: any): any {
    if (!input) return null;
    let parsed = input;
    if (typeof input === 'string') {
      try {
        parsed = JSON.parse(input);
      } catch {
        return null;
      }
    }
    if (parsed.type === 'Feature') return parsed;
    if (parsed.type === 'Polygon' || parsed.type === 'MultiPolygon' || parsed.type === 'Point') {
      return turf.feature(parsed);
    }
    if (parsed.type === 'FeatureCollection' && parsed.features && parsed.features.length > 0) {
      return parsed.features[0];
    }
    return null;
  }
}

export const spatialEngineService = new SpatialEngineService();
