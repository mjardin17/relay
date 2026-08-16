import { LocationCoordinates, LocationSource, VerificationState } from '../../types/locationIntelligence';

export type GeocodingProviderStatus = 'CONFIGURED' | 'UNCONFIGURED' | 'DEGRADED' | 'RATE_LIMITED' | 'AUTH_ERROR';

export interface GeocodingResult {
  formattedAddress: string;
  streetNumber?: string;
  route?: string;
  city: string;
  municipality?: string;
  county?: string;
  stateProvince: string;
  postalCode?: string;
  country: string;
  coordinates: LocationCoordinates;
  timezone: string;
  confidence: number;
  verificationState: VerificationState;
  provider: string;
  provenanceHash: string;
  isAmbiguous?: boolean;
  ambiguityCandidates?: Array<{
    formattedAddress: string;
    city: string;
    stateProvince: string;
    coordinates: LocationCoordinates;
  }>;
  rawResponseRef?: string;
}

export interface TimezoneResult {
  timezoneId: string; // e.g. "America/New_York", "America/Phoenix"
  timeZoneName: string; // e.g. "Eastern Standard Time"
  rawOffsetSeconds: number;
  dstOffsetSeconds: number;
  provider: string;
  provenanceHash: string;
}

export interface GeocodeOptions {
  tenantId?: string;
  countryBias?: string;
  regionBias?: string;
  timeoutMs?: number;
  allowAmbiguous?: boolean;
}

export interface ReverseGeocodeOptions {
  tenantId?: string;
  timeoutMs?: number;
}

export interface GeocodingProvider {
  readonly name: string;
  getProviderStatus(): {
    status: GeocodingProviderStatus;
    provider: string;
    message: string;
    isConfigured: boolean;
  };
  geocodeAddress(address: string, options?: GeocodeOptions): Promise<GeocodingResult>;
  reverseGeocode(coords: LocationCoordinates, options?: ReverseGeocodeOptions): Promise<GeocodingResult>;
  resolveTimezone(coords: LocationCoordinates, options?: { timestamp?: number; timeoutMs?: number }): Promise<TimezoneResult>;
}
