import crypto from 'node:crypto';
import { Client, GeocodeRequest, TimeZoneRequest } from '@googlemaps/google-maps-services-js';
import {
  GeocodingProvider,
  GeocodingProviderStatus,
  GeocodingResult,
  TimezoneResult,
  GeocodeOptions,
  ReverseGeocodeOptions
} from './geocodingTypes';
import { LocationCoordinates } from '../../types/locationIntelligence';
import { evidenceGraphService } from '../evidenceGraphService';

// Redaction utility: ensures secrets and API keys are never included in output or error strings
export function redactGeocodingSecrets(str: string): string {
  if (!str) return str;
  return str
    .replace(/(AIzaSy[A-Za-z0-9_-]{33})/g, '[REDACTED_GOOGLE_MAPS_KEY]')
    .replace(/(key=)[A-Za-z0-9_-]+/gi, '$1[REDACTED]')
    .replace(/(Bearer\s+)[A-Za-z0-9._-]+/gi, '$1[REDACTED]');
}

// -----------------------------------------------------------------------------
// 1. Local Deterministic Geocoding Provider (Offline & Fixture-backed)
// -----------------------------------------------------------------------------

export class LocalDeterministicGeocodingProvider implements GeocodingProvider {
  public readonly name = 'LOCAL_DETERMINISTIC';

  private fixtures: Record<string, Partial<GeocodingResult>> = {
    '1184 acushnet ave, new bedford, ma': {
      formattedAddress: '1184 Acushnet Ave, New Bedford, MA 02746, USA',
      streetNumber: '1184',
      route: 'Acushnet Ave',
      city: 'New Bedford',
      municipality: 'New Bedford',
      county: 'Bristol County',
      stateProvince: 'MA',
      postalCode: '02746',
      country: 'US',
      coordinates: { latitude: 41.6582, longitude: -70.9298 },
      timezone: 'America/New_York',
      confidence: 1.0,
      verificationState: 'VERIFIED'
    },
    'new bedford, ma': {
      formattedAddress: 'New Bedford, MA, USA',
      city: 'New Bedford',
      municipality: 'New Bedford',
      county: 'Bristol County',
      stateProvince: 'MA',
      postalCode: '02740',
      country: 'US',
      coordinates: { latitude: 41.6362, longitude: -70.9342 },
      timezone: 'America/New_York',
      confidence: 0.95,
      verificationState: 'VERIFIED'
    },
    '25 elm st, fairhaven, ma': {
      formattedAddress: '25 Elm St, Fairhaven, MA 02719, USA',
      streetNumber: '25',
      route: 'Elm St',
      city: 'Fairhaven',
      municipality: 'Fairhaven',
      county: 'Bristol County',
      stateProvince: 'MA',
      postalCode: '02719',
      country: 'US',
      coordinates: { latitude: 41.6375, longitude: -70.9038 },
      timezone: 'America/New_York',
      confidence: 0.95,
      verificationState: 'VERIFIED'
    },
    'fairhaven, ma': {
      formattedAddress: 'Fairhaven, MA 02719, USA',
      city: 'Fairhaven',
      municipality: 'Fairhaven',
      county: 'Bristol County',
      stateProvince: 'MA',
      postalCode: '02719',
      country: 'US',
      coordinates: { latitude: 41.6375, longitude: -70.9038 },
      timezone: 'America/New_York',
      confidence: 0.9,
      verificationState: 'VERIFIED'
    },
    'dartmouth, ma': {
      formattedAddress: 'Dartmouth, MA 02747, USA',
      city: 'Dartmouth',
      municipality: 'Dartmouth',
      county: 'Bristol County',
      stateProvince: 'MA',
      postalCode: '02747',
      country: 'US',
      coordinates: { latitude: 41.6026, longitude: -70.9922 },
      timezone: 'America/New_York',
      confidence: 0.9,
      verificationState: 'VERIFIED'
    },
    '4500 e camelback rd, phoenix, az': {
      formattedAddress: '4500 E Camelback Rd, Phoenix, AZ 85018, USA',
      streetNumber: '4500',
      route: 'E Camelback Rd',
      city: 'Phoenix',
      municipality: 'Phoenix',
      county: 'Maricopa County',
      stateProvince: 'AZ',
      postalCode: '85018',
      country: 'US',
      coordinates: { latitude: 33.5092, longitude: -111.9845 },
      timezone: 'America/Phoenix',
      confidence: 1.0,
      verificationState: 'VERIFIED'
    },
    'scottsdale, az': {
      formattedAddress: 'Scottsdale, AZ, USA',
      city: 'Scottsdale',
      municipality: 'Scottsdale',
      county: 'Maricopa County',
      stateProvince: 'AZ',
      postalCode: '85251',
      country: 'US',
      coordinates: { latitude: 33.4942, longitude: -111.9261 },
      timezone: 'America/Phoenix',
      confidence: 0.9,
      verificationState: 'VERIFIED'
    },
    '10 main st, nantucket, ma': {
      formattedAddress: '10 Main St, Nantucket, MA 02554, USA',
      streetNumber: '10',
      route: 'Main St',
      city: 'Nantucket',
      municipality: 'Nantucket',
      county: 'Nantucket County',
      stateProvince: 'MA',
      postalCode: '02554',
      country: 'US',
      coordinates: { latitude: 41.2835, longitude: -70.0995 },
      timezone: 'America/New_York',
      confidence: 0.95,
      verificationState: 'VERIFIED'
    }
  };

  public getProviderStatus() {
    return {
      status: 'CONFIGURED' as GeocodingProviderStatus,
      provider: this.name,
      message: 'Local deterministic geocoder active with zero network dependencies.',
      isConfigured: true
    };
  }

  public async geocodeAddress(address: string, options?: GeocodeOptions): Promise<GeocodingResult> {
    const raw = address.trim();
    if (!raw) {
      throw new Error('GEOCODE_EMPTY_ADDRESS: Address cannot be empty.');
    }

    const norm = raw.toLowerCase().replace(/,\s*usa$/i, '').trim();

    // Check for simulated ambiguous address
    if (norm === 'springfield' || norm === 'main st' || norm === '100 main st') {
      if (options?.allowAmbiguous) {
        return {
          formattedAddress: 'Springfield, MA, USA',
          city: 'Springfield',
          stateProvince: 'MA',
          country: 'US',
          coordinates: { latitude: 42.1015, longitude: -72.5898 },
          timezone: 'America/New_York',
          confidence: 0.5,
          verificationState: 'DERIVED',
          provider: this.name,
          provenanceHash: crypto.createHash('sha256').update(`AMBIGUOUS_${norm}`).digest('hex'),
          isAmbiguous: true,
          ambiguityCandidates: [
            {
              formattedAddress: 'Springfield, MA, USA',
              city: 'Springfield',
              stateProvince: 'MA',
              coordinates: { latitude: 42.1015, longitude: -72.5898 }
            },
            {
              formattedAddress: 'Springfield, IL, USA',
              city: 'Springfield',
              stateProvince: 'IL',
              coordinates: { latitude: 39.7817, longitude: -89.6501 }
            },
            {
              formattedAddress: 'Springfield, MO, USA',
              city: 'Springfield',
              stateProvince: 'MO',
              coordinates: { latitude: 37.209, longitude: -93.2923 }
            }
          ]
        };
      } else {
        const err: any = new Error('GEOCODE_AMBIGUOUS_ADDRESS: Multiple matching locations found across states.');
        err.isAmbiguous = true;
        throw err;
      }
    }

    // Exact fixture match
    if (this.fixtures[norm]) {
      const match = this.fixtures[norm];
      const provHash = crypto.createHash('sha256').update(`${this.name}:${raw}:${JSON.stringify(match)}`).digest('hex');
      return {
        formattedAddress: match.formattedAddress || raw,
        streetNumber: match.streetNumber,
        route: match.route,
        city: match.city || 'Unknown',
        municipality: match.municipality || match.city,
        county: match.county,
        stateProvince: match.stateProvince || 'MA',
        postalCode: match.postalCode,
        country: match.country || 'US',
        coordinates: match.coordinates || { latitude: 41.65, longitude: -70.93 },
        timezone: match.timezone || 'America/New_York',
        confidence: match.confidence || 0.85,
        verificationState: match.verificationState || 'DERIVED',
        provider: this.name,
        provenanceHash: provHash
      };
    }

    // Partial fixture search
    for (const [key, match] of Object.entries(this.fixtures)) {
      if (norm.includes(key) || key.includes(norm)) {
        const provHash = crypto.createHash('sha256').update(`${this.name}:${raw}:${JSON.stringify(match)}`).digest('hex');
        return {
          formattedAddress: match.formattedAddress || raw,
          streetNumber: match.streetNumber,
          route: match.route,
          city: match.city || 'Unknown',
          municipality: match.municipality || match.city,
          county: match.county,
          stateProvince: match.stateProvince || 'MA',
          postalCode: match.postalCode,
          country: match.country || 'US',
          coordinates: match.coordinates || { latitude: 41.65, longitude: -70.93 },
          timezone: match.timezone || 'America/New_York',
          confidence: match.confidence || 0.8,
          verificationState: match.verificationState || 'DERIVED',
          provider: this.name,
          provenanceHash: provHash
        };
      }
    }

    // Heuristic address parser: "123 Main St, City, ST 12345"
    const parsed = this.parseAddressHeuristic(raw);
    if (parsed) {
      const provHash = crypto.createHash('sha256').update(`${this.name}:${raw}:${JSON.stringify(parsed)}`).digest('hex');
      return {
        formattedAddress: parsed.formattedAddress || raw,
        streetNumber: parsed.streetNumber,
        route: parsed.route,
        city: parsed.city || 'Unknown',
        municipality: parsed.municipality || parsed.city,
        county: parsed.county,
        stateProvince: parsed.stateProvince || 'MA',
        postalCode: parsed.postalCode,
        country: parsed.country || 'US',
        coordinates: parsed.coordinates || { latitude: 41.65, longitude: -70.93 },
        timezone: parsed.timezone || 'America/New_York',
        confidence: parsed.confidence || 0.8,
        verificationState: parsed.verificationState || 'DERIVED',
        provider: this.name,
        provenanceHash: provHash
      };
    }

    throw new Error(`GEOCODE_NO_RESULTS: No geographic match found for "${raw}".`);
  }

  public async reverseGeocode(coords: LocationCoordinates, options?: ReverseGeocodeOptions): Promise<GeocodingResult> {
    if (typeof coords.latitude !== 'number' || typeof coords.longitude !== 'number') {
      throw new Error('REVERSE_GEOCODE_INVALID_COORDINATES: Coordinates must be numbers.');
    }

    // Find closest fixture within 25km
    let closestFixture: Partial<GeocodingResult> | null = null;
    let minDistance = 25;

    for (const fix of Object.values(this.fixtures)) {
      if (fix.coordinates) {
        const d = this.calculateRoughDistance(coords, fix.coordinates);
        if (d < minDistance) {
          minDistance = d;
          closestFixture = fix;
        }
      }
    }

    if (closestFixture) {
      const provHash = crypto.createHash('sha256').update(`${this.name}:REVERSE:${coords.latitude},${coords.longitude}`).digest('hex');
      return {
        formattedAddress: closestFixture.formattedAddress || `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`,
        streetNumber: closestFixture.streetNumber,
        route: closestFixture.route,
        city: closestFixture.city || 'Unknown',
        municipality: closestFixture.municipality || closestFixture.city,
        county: closestFixture.county,
        stateProvince: closestFixture.stateProvince || 'MA',
        postalCode: closestFixture.postalCode,
        country: closestFixture.country || 'US',
        coordinates: coords,
        timezone: closestFixture.timezone || 'America/New_York',
        confidence: 0.9,
        verificationState: 'DERIVED',
        provider: this.name,
        provenanceHash: provHash
      };
    }

    // Fallback derived result
    const isArizona = coords.latitude >= 31 && coords.latitude <= 37 && coords.longitude >= -115 && coords.longitude <= -109;
    const tz = isArizona ? 'America/Phoenix' : 'America/New_York';
    const state = isArizona ? 'AZ' : 'MA';

    const provHash = crypto.createHash('sha256').update(`${this.name}:REVERSE_FALLBACK:${coords.latitude},${coords.longitude}`).digest('hex');
    return {
      formattedAddress: `Approx Coordinates (${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)})`,
      city: isArizona ? 'Phoenix Metro' : 'South Coast Region',
      stateProvince: state,
      country: 'US',
      coordinates: coords,
      timezone: tz,
      confidence: 0.7,
      verificationState: 'DERIVED',
      provider: this.name,
      provenanceHash: provHash
    };
  }

  public async resolveTimezone(coords: LocationCoordinates): Promise<TimezoneResult> {
    const isArizona = coords.latitude >= 31 && coords.latitude <= 37 && coords.longitude >= -115 && coords.longitude <= -109;
    const isPacific = coords.longitude < -115;
    const isCentral = coords.longitude >= -105 && coords.longitude < -85;
    const isMountain = coords.longitude >= -115 && coords.longitude < -105 && !isArizona;

    let tzId = 'America/New_York';
    let tzName = 'Eastern Standard Time';
    let rawOffset = -18000;

    if (isArizona) {
      tzId = 'America/Phoenix';
      tzName = 'Mountain Standard Time (No DST)';
      rawOffset = -25200;
    } else if (isPacific) {
      tzId = 'America/Los_Angeles';
      tzName = 'Pacific Standard Time';
      rawOffset = -28800;
    } else if (isMountain) {
      tzId = 'America/Denver';
      tzName = 'Mountain Standard Time';
      rawOffset = -25200;
    } else if (isCentral) {
      tzId = 'America/Chicago';
      tzName = 'Central Standard Time';
      rawOffset = -21600;
    }

    const provHash = crypto.createHash('sha256').update(`${this.name}:TIMEZONE:${coords.latitude},${coords.longitude}:${tzId}`).digest('hex');

    return {
      timezoneId: tzId,
      timeZoneName: tzName,
      rawOffsetSeconds: rawOffset,
      dstOffsetSeconds: isArizona ? 0 : 3600,
      provider: this.name,
      provenanceHash: provHash
    };
  }

  private parseAddressHeuristic(address: string): Partial<GeocodingResult> | null {
    // Basic regex: Street, City, ST ZIP
    const match = address.match(/^([^,]+),\s*([^,]+),\s*([A-Z]{2})\s*(\d{5})?/i);
    if (!match) return null;

    const street = match[1].trim();
    const city = match[2].trim();
    const state = match[3].toUpperCase().trim();
    const zip = match[4]?.trim();

    const isAZ = state === 'AZ';
    const tz = isAZ ? 'America/Phoenix' : 'America/New_York';

    return {
      formattedAddress: address,
      route: street,
      city: city,
      municipality: city,
      stateProvince: state,
      postalCode: zip,
      country: 'US',
      coordinates: isAZ ? { latitude: 33.45, longitude: -112.07 } : { latitude: 41.65, longitude: -70.93 },
      timezone: tz,
      confidence: 0.8,
      verificationState: 'DERIVED'
    };
  }

  private calculateRoughDistance(a: LocationCoordinates, b: LocationCoordinates): number {
    const dLat = (b.latitude - a.latitude) * 111;
    const dLon = (b.longitude - a.longitude) * 85;
    return Math.sqrt(dLat * dLat + dLon * dLon);
  }
}

// -----------------------------------------------------------------------------
// 2. Official Google Maps Services Client Provider (with Secret Redaction)
// -----------------------------------------------------------------------------

export class GoogleMapsGeocodingProvider implements GeocodingProvider {
  public readonly name = 'GOOGLE_MAPS_OFFICIAL';
  private client: Client;
  private apiKey: string | null = null;

  constructor() {
    this.client = new Client({});
    this.refreshApiKey();
  }

  public refreshApiKey(): void {
    const key = process.env.GOOGLE_MAPS_API_KEY?.trim();
    if (key && key !== 'UNCONFIGURED' && key.length > 10) {
      this.apiKey = key;
    } else {
      this.apiKey = null;
    }
  }

  public getProviderStatus() {
    this.refreshApiKey();
    if (!this.apiKey) {
      return {
        status: 'UNCONFIGURED' as GeocodingProviderStatus,
        provider: this.name,
        message: 'Google Maps API key is not configured or set to UNCONFIGURED. Provider is disabled.',
        isConfigured: false
      };
    }
    return {
      status: 'CONFIGURED' as GeocodingProviderStatus,
      provider: this.name,
      message: 'Google Maps Services client is configured with server-side credential.',
      isConfigured: true
    };
  }

  public async geocodeAddress(address: string, options?: GeocodeOptions): Promise<GeocodingResult> {
    this.refreshApiKey();
    if (!this.apiKey) {
      throw new Error('GEOCODING_PROVIDER_UNCONFIGURED: Google Maps API key is not configured.');
    }

    try {
      const req: GeocodeRequest = {
        params: {
          address,
          key: this.apiKey,
          region: options?.regionBias,
          components: options?.countryBias ? { country: options.countryBias } : undefined
        },
        timeout: options?.timeoutMs || 5000
      };

      const resp = await this.client.geocode(req);

      if (resp.data.status === 'ZERO_RESULTS' || !resp.data.results || resp.data.results.length === 0) {
        throw new Error(`GEOCODE_NO_RESULTS: Google Maps found no results for address.`);
      }

      if (resp.data.status === 'OVER_QUERY_LIMIT') {
        const err: any = new Error('GEOCODE_RATE_LIMITED: Google Maps query limit exceeded.');
        err.statusCode = 429;
        throw err;
      }

      if (resp.data.status === 'REQUEST_DENIED') {
        const err: any = new Error('GEOCODE_AUTH_ERROR: Google Maps request denied. Invalid or unauthorized API key.');
        err.statusCode = 403;
        throw err;
      }

      if (resp.data.status !== 'OK') {
        throw new Error(`GEOCODE_API_ERROR: Google Maps returned status ${resp.data.status}`);
      }

      const topResult = resp.data.results[0];
      const isAmbiguous = resp.data.results.length > 1;

      // Extract address components
      let streetNumber: string | undefined;
      let route: string | undefined;
      let city = '';
      let county: string | undefined;
      let stateProvince = '';
      let postalCode: string | undefined;
      let country = 'US';

      for (const comp of topResult.address_components) {
        const types: string[] = comp.types as any;
        if (types.includes('street_number')) streetNumber = comp.long_name;
        if (types.includes('route')) route = comp.long_name;
        if (types.includes('locality')) city = comp.long_name;
        if (!city && types.includes('sublocality')) city = comp.long_name;
        if (!city && types.includes('postal_town')) city = comp.long_name;
        if (types.includes('administrative_area_level_2')) county = comp.long_name;
        if (types.includes('administrative_area_level_1')) stateProvince = comp.short_name;
        if (types.includes('postal_code')) postalCode = comp.long_name;
        if (types.includes('country')) country = comp.short_name;
      }

      const coords: LocationCoordinates = {
        latitude: topResult.geometry.location.lat,
        longitude: topResult.geometry.location.lng
      };

      const provHash = crypto.createHash('sha256').update(`${this.name}:${topResult.place_id}:${topResult.formatted_address}`).digest('hex');

      return {
        formattedAddress: topResult.formatted_address,
        streetNumber,
        route,
        city: city || 'Unknown City',
        municipality: city,
        county,
        stateProvince: stateProvince || 'MA',
        postalCode,
        country,
        coordinates: coords,
        timezone: 'America/New_York', // Fallback or updated via resolveTimezone
        confidence: topResult.geometry.location_type === 'ROOFTOP' ? 1.0 : 0.85,
        verificationState: 'VERIFIED',
        provider: this.name,
        provenanceHash: provHash,
        isAmbiguous,
        ambiguityCandidates: isAmbiguous
          ? resp.data.results.slice(1, 4).map((r) => ({
              formattedAddress: r.formatted_address,
              city: (r.address_components as any).find((c: any) => c.types.includes('locality'))?.long_name || '',
              stateProvince: (r.address_components as any).find((c: any) => c.types.includes('administrative_area_level_1'))?.short_name || '',
              coordinates: { latitude: r.geometry.location.lat, longitude: r.geometry.location.lng }
            }))
          : undefined,
        rawResponseRef: topResult.place_id
      };
    } catch (err: any) {
      const sanitizedMessage = redactGeocodingSecrets(err.message || String(err));
      const wrappedError: any = new Error(sanitizedMessage);
      wrappedError.statusCode = err.statusCode || (sanitizedMessage.includes('TIMEOUT') ? 408 : 500);
      throw wrappedError;
    }
  }

  public async reverseGeocode(coords: LocationCoordinates, options?: ReverseGeocodeOptions): Promise<GeocodingResult> {
    this.refreshApiKey();
    if (!this.apiKey) {
      throw new Error('GEOCODING_PROVIDER_UNCONFIGURED: Google Maps API key is not configured.');
    }

    try {
      const resp = await this.client.reverseGeocode({
        params: {
          latlng: { lat: coords.latitude, lng: coords.longitude },
          key: this.apiKey
        },
        timeout: options?.timeoutMs || 5000
      });

      if (resp.data.status !== 'OK' || !resp.data.results || resp.data.results.length === 0) {
        throw new Error(`REVERSE_GEOCODE_NO_RESULTS: No reverse geocoding result for coordinates.`);
      }

      const top = resp.data.results[0];
      const provHash = crypto.createHash('sha256').update(`${this.name}:REVERSE:${coords.latitude},${coords.longitude}`).digest('hex');

      return {
        formattedAddress: top.formatted_address,
        city: (top.address_components as any).find((c: any) => c.types.includes('locality'))?.long_name || 'Unknown',
        stateProvince: (top.address_components as any).find((c: any) => c.types.includes('administrative_area_level_1'))?.short_name || 'MA',
        country: (top.address_components as any).find((c: any) => c.types.includes('country'))?.short_name || 'US',
        coordinates: coords,
        timezone: 'America/New_York',
        confidence: 0.9,
        verificationState: 'VERIFIED',
        provider: this.name,
        provenanceHash: provHash
      };
    } catch (err: any) {
      throw new Error(redactGeocodingSecrets(err.message || String(err)));
    }
  }

  public async resolveTimezone(coords: LocationCoordinates, options?: { timestamp?: number; timeoutMs?: number }): Promise<TimezoneResult> {
    this.refreshApiKey();
    if (!this.apiKey) {
      throw new Error('GEOCODING_PROVIDER_UNCONFIGURED: Google Maps API key is not configured.');
    }

    try {
      const ts = options?.timestamp || Math.floor(Date.now() / 1000);
      const resp = await this.client.timezone({
        params: {
          location: { lat: coords.latitude, lng: coords.longitude },
          timestamp: ts,
          key: this.apiKey
        },
        timeout: options?.timeoutMs || 5000
      });

      if (resp.data.status !== 'OK') {
        throw new Error(`TIMEZONE_API_ERROR: Google Maps timezone returned ${resp.data.status}`);
      }

      const provHash = crypto.createHash('sha256').update(`${this.name}:TZ:${coords.latitude},${coords.longitude}:${resp.data.timeZoneId}`).digest('hex');

      return {
        timezoneId: resp.data.timeZoneId,
        timeZoneName: resp.data.timeZoneName,
        rawOffsetSeconds: resp.data.rawOffset,
        dstOffsetSeconds: resp.data.dstOffset,
        provider: this.name,
        provenanceHash: provHash
      };
    } catch (err: any) {
      throw new Error(redactGeocodingSecrets(err.message || String(err)));
    }
  }
}

// -----------------------------------------------------------------------------
// 3. Geocoding Management & Cache Isolation Service
// -----------------------------------------------------------------------------

export class GeocodingService {
  private localProvider = new LocalDeterministicGeocodingProvider();
  private googleProvider = new GoogleMapsGeocodingProvider();

  // Multi-tenant isolated geocoding cache: Map<tenantId, Map<queryHash, GeocodingResult>>
  private tenantCache = new Map<string, Map<string, { result: GeocodingResult; cachedAt: number }>>();
  private globalCache = new Map<string, { result: GeocodingResult; cachedAt: number }>();
  private readonly CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

  public getProviderStatus(preferredProvider?: 'GOOGLE' | 'LOCAL') {
    if (preferredProvider === 'GOOGLE') {
      return this.googleProvider.getProviderStatus();
    }
    return {
      active: this.googleProvider.getProviderStatus().isConfigured ? 'GOOGLE_MAPS_OFFICIAL' : 'LOCAL_DETERMINISTIC',
      google: this.googleProvider.getProviderStatus(),
      local: this.localProvider.getProviderStatus()
    };
  }

  public async geocode(address: string, options?: GeocodeOptions & { forceProvider?: 'GOOGLE' | 'LOCAL' }): Promise<GeocodingResult> {
    const tenantId = options?.tenantId || 'global';
    const queryHash = crypto.createHash('sha256').update(address.trim().toLowerCase()).digest('hex');

    // 1. Check isolated cache
    const cacheMap = tenantId === 'global' ? this.globalCache : this.getTenantCacheMap(tenantId);
    const cached = cacheMap.get(queryHash);
    if (cached && Date.now() - cached.cachedAt < this.CACHE_TTL_MS) {
      return cached.result;
    }

    let result: GeocodingResult;

    // 2. Select Provider
    if (options?.forceProvider === 'GOOGLE' || (!options?.forceProvider && this.googleProvider.getProviderStatus().isConfigured)) {
      try {
        result = await this.googleProvider.geocodeAddress(address, options);
      } catch (err: any) {
        // Fallback to local if unconfigured or degraded
        if (options?.forceProvider === 'GOOGLE') {
          throw err;
        }
        result = await this.localProvider.geocodeAddress(address, options);
      }
    } else {
      result = await this.localProvider.geocodeAddress(address, options);
    }

    // 3. Cache isolated result
    cacheMap.set(queryHash, { result, cachedAt: Date.now() });

    // 4. Record provenance in Evidence Graph if tenant is specified
    if (options?.tenantId) {
      try {
        evidenceGraphService.addNode(options.tenantId, {
          id: `node_geo_${queryHash.substring(0, 12)}`,
          type: 'location',
          label: `Geocoded Address: ${result.city}, ${result.stateProvince}`,
          timestamp: new Date().toISOString(),
          source: result.provider,
          actor: 'GEOCODING_SERVICE',
          evidenceStatus: result.verificationState === 'VERIFIED' ? 'VERIFIED' : 'REPORTED',
          metadata: {
            address,
            formattedAddress: result.formattedAddress,
            coordinates: result.coordinates,
            provider: result.provider,
            confidence: result.confidence
          },
          provenance: {
            sourceSystem: result.provider,
            ingestedAt: new Date().toISOString(),
            verificationMethod: 'geocoding_api',
            fingerprintHash: result.provenanceHash
          }
        });
      } catch {
        // Evidence graph optional recording
      }
    }

    return result;
  }

  public async reverseGeocode(coords: LocationCoordinates, options?: ReverseGeocodeOptions & { forceProvider?: 'GOOGLE' | 'LOCAL' }): Promise<GeocodingResult> {
    if (options?.forceProvider === 'GOOGLE' || (!options?.forceProvider && this.googleProvider.getProviderStatus().isConfigured)) {
      try {
        return await this.googleProvider.reverseGeocode(coords, options);
      } catch (err) {
        if (options?.forceProvider === 'GOOGLE') throw err;
        return await this.localProvider.reverseGeocode(coords, options);
      }
    }
    return await this.localProvider.reverseGeocode(coords, options);
  }

  public async resolveTimezone(coords: LocationCoordinates, options?: { forceProvider?: 'GOOGLE' | 'LOCAL' }): Promise<TimezoneResult> {
    if (options?.forceProvider === 'GOOGLE' || (!options?.forceProvider && this.googleProvider.getProviderStatus().isConfigured)) {
      try {
        return await this.googleProvider.resolveTimezone(coords);
      } catch (err) {
        if (options?.forceProvider === 'GOOGLE') throw err;
        return await this.localProvider.resolveTimezone(coords);
      }
    }
    return await this.localProvider.resolveTimezone(coords);
  }

  public clearTenantCache(tenantId: string): void {
    if (this.tenantCache.has(tenantId)) {
      this.tenantCache.get(tenantId)!.clear();
    }
  }

  private getTenantCacheMap(tenantId: string): Map<string, { result: GeocodingResult; cachedAt: number }> {
    if (!this.tenantCache.has(tenantId)) {
      this.tenantCache.set(tenantId, new Map());
    }
    return this.tenantCache.get(tenantId)!;
  }
}

export const geocodingService = new GeocodingService();
