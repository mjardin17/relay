// Global Location Intelligence & Jurisdiction Models for Relay v2.0
// Multi-tenant, location-aware business operating system

export type LocationType =
  | 'HEADQUARTERS'
  | 'BRANCH'
  | 'SERVICE_AREA'
  | 'CUSTOMER'
  | 'JOB_SITE'
  | 'OPERATOR'
  | 'CAMPAIGN_TARGET'
  | 'LEAD_SOURCE'
  | 'DEVICE'
  | 'MANUAL'
  | 'DERIVED';

export type LocationSource =
  | 'TENANT_CONFIG'
  | 'CUSTOMER_ADDRESS'
  | 'LEAD_FORM'
  | 'JOB_RECORD'
  | 'CRM_DATA'
  | 'VERIFIED_BUSINESS_PROFILE'
  | 'DEVICE_PERMISSION'
  | 'GEOCODING_PROVIDER'
  | 'EXTERNAL_CONNECTOR'
  | 'OPERATOR_ENTRY'
  | 'DERIVED_GEOGRAPHIC_RELATIONSHIP';

export type VerificationState =
  | 'UNVERIFIED'
  | 'SELF_REPORTED'
  | 'DERIVED'
  | 'VERIFIED'
  | 'DISPUTED';

export type ServiceAreaType =
  | 'CITY'
  | 'ZIP_CODE'
  | 'COUNTY'
  | 'RADIUS'
  | 'POLYGON'
  | 'STATE'
  | 'CUSTOM_TERRITORY';

export type ServiceAreaRule = 'INCLUSION' | 'EXCLUSION';

export type LocationResolutionStatus =
  | 'RESOLVED'
  | 'LOCATION_UNKNOWN'
  | 'LOCATION_AMBIGUOUS'
  | 'OUTSIDE_CONFIGURED_SERVICE_AREA'
  | 'EXCLUDED_ZONE'
  | 'JURISDICTION_REVIEW_REQUIRED';

export type ActionContextType =
  | 'SCHEDULING'
  | 'DISPATCH'
  | 'LOCAL_ADVERTISING'
  | 'GBP_LISTING'
  | 'PERMITTING_COMPLIANCE'
  | 'COMMUNICATIONS'
  | 'FINANCIAL_ACCOUNTING'
  | 'GENERAL_ACTION';

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
}

export interface LocationRecord {
  id: string;
  tenantId: string;
  type: LocationType;
  label: string;
  streetAddress?: string;
  unit?: string;
  city: string;
  municipality?: string;
  county?: string;
  stateProvince: string;
  postalCode?: string;
  country: string; // ISO 3166-1 alpha-2, e.g. 'US'
  timezone: string; // IANA timezone, e.g. 'America/New_York'
  coordinates?: LocationCoordinates;
  source: LocationSource;
  confidence: number; // 0.0 to 1.0
  verificationState: VerificationState;
  verifiedAt?: string;
  verifiedBy?: string;
  isRedacted?: boolean;
  evidenceRefs: string[];
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceAreaRecord {
  id: string;
  tenantId: string;
  branchId?: string;
  name: string;
  areaType: ServiceAreaType;
  rule: ServiceAreaRule;
  value: string; // e.g. "New Bedford", "02740", "Bristol County", "MA"
  radiusKm?: number;
  centerCoordinates?: LocationCoordinates;
  polygonCoordinates?: LocationCoordinates[];
  notes?: string;
  createdAt: string;
}

export interface JurisdictionContext {
  country: string;
  stateProvince?: string;
  county?: string;
  municipality?: string;
  localAuthorityName?: string;
  jurisdictionIds: string[];
  timezone: string;
  governingCodeStandard?: string; // e.g. "527 CMR 12.00 / NEC 2023" for MA, "Maricopa County Building Safety" for AZ
  permittingOffice?: string;
  source: string;
  confidence: number;
  requiresHumanReview: boolean;
  evidenceRefs: string[];
}

export interface RelayLocationContext {
  tenantId: string;
  businessId: string;
  actionType: ActionContextType;
  resolvedLocation?: LocationRecord;
  headquarters?: LocationRecord;
  branches: LocationRecord[];
  serviceAreas: ServiceAreaRecord[];
  operatorLocation?: LocationRecord;
  customerLocation?: LocationRecord;
  jobLocation?: LocationRecord;
  actionLocation?: LocationRecord;
  municipality?: string;
  county?: string;
  stateProvince?: string;
  postalCode?: string;
  country?: string;
  timezone?: string;
  localTimeFormatted?: string;
  jurisdiction?: JurisdictionContext;
  serviceAreaStatus: LocationResolutionStatus;
  resolutionStatus: LocationResolutionStatus;
  resolutionReason: string;
  source: LocationSource;
  confidence: number;
  verifiedAt?: string;
  evidenceRefs: string[];
  auditHash?: string;
}

export interface ServiceAreaMatchResult {
  status: 'INSIDE' | 'OUTSIDE' | 'EXCLUDED' | 'UNKNOWN';
  matchedRule?: ServiceAreaRecord;
  reason: string;
}
