export type DataClassification =
  | 'SYNTHETIC_TEST'
  | 'SIMULATED_DRY_RUN'
  | 'INTERNAL_VERIFIED'
  | 'DOCUMENT_SUPPORTED'
  | 'OWNER_CONFIRMED'
  | 'PROVIDER_VERIFIED'
  | 'OFFICIAL_SOURCE_VERIFIED'
  | 'LIVE_PRODUCTION';

export type UserRoleClassification =
  | 'UNVERIFIED'
  | 'RELAY_OPERATOR'
  | 'GROWTH_PARTNER'
  | 'ADMINISTRATIVE_USER'
  | 'AUTHORIZED_APPROVER'
  | 'LICENSED_ELECTRICAL_PROFESSIONAL'
  | 'LEGAL_BUSINESS_OWNER';

export interface EnvironmentClassificationInfo {
  classification: DataClassification;
  label: string;
  isProduction: boolean;
  requiresOfficialSource: boolean;
  disclaimer: string;
}

export const DATA_CLASSIFICATION_INFO: Record<DataClassification, EnvironmentClassificationInfo> = {
  SYNTHETIC_TEST: {
    classification: 'SYNTHETIC_TEST',
    label: 'SYNTHETIC_TEST',
    isProduction: false,
    requiresOfficialSource: false,
    disclaimer: 'DEMO / SIMULATED — NOT REAL-WORLD EVIDENCE',
  },
  SIMULATED_DRY_RUN: {
    classification: 'SIMULATED_DRY_RUN',
    label: 'SIMULATED_DRY_RUN',
    isProduction: false,
    requiresOfficialSource: false,
    disclaimer: 'DEMO / SIMULATED — NOT REAL-WORLD EVIDENCE',
  },
  INTERNAL_VERIFIED: {
    classification: 'INTERNAL_VERIFIED',
    label: 'INTERNAL_VERIFIED',
    isProduction: false,
    requiresOfficialSource: false,
    disclaimer: 'INTERNAL VERIFIED DATA — PENDING EXTERNAL CONFIRMATION',
  },
  DOCUMENT_SUPPORTED: {
    classification: 'DOCUMENT_SUPPORTED',
    label: 'DOCUMENT_SUPPORTED',
    isProduction: false,
    requiresOfficialSource: false,
    disclaimer: 'DOCUMENTATION ATTACHED — PENDING OFFICIAL SOURCE RECONCILIATION',
  },
  OWNER_CONFIRMED: {
    classification: 'OWNER_CONFIRMED',
    label: 'OWNER_CONFIRMED',
    isProduction: false,
    requiresOfficialSource: false,
    disclaimer: 'OWNER CONFIRMED STATEMENT — PENDING OFFICIAL PORTAL VERIFICATION',
  },
  PROVIDER_VERIFIED: {
    classification: 'PROVIDER_VERIFIED',
    label: 'PROVIDER_VERIFIED',
    isProduction: true,
    requiresOfficialSource: true,
    disclaimer: 'VERIFIED VIA INTEGRATION PROVIDER',
  },
  OFFICIAL_SOURCE_VERIFIED: {
    classification: 'OFFICIAL_SOURCE_VERIFIED',
    label: 'OFFICIAL_SOURCE_VERIFIED',
    isProduction: true,
    requiresOfficialSource: true,
    disclaimer: 'INDEPENDENTLY VERIFIED VIA OFFICIAL STATE PORTAL',
  },
  LIVE_PRODUCTION: {
    classification: 'LIVE_PRODUCTION',
    label: 'LIVE_PRODUCTION',
    isProduction: true,
    requiresOfficialSource: true,
    disclaimer: 'LIVE PRODUCTION OPERATIONAL EVIDENCE',
  },
};

export const MANDATORY_CORRECTED_STATUS_STATEMENT =
  'Relay’s electrical workflow has passed local software and security boundary testing using synthetic or simulated records. The real Massachusetts electrical company, its ownership, licensing, insurance, customers, integrations, jobs, revenue, profit, and production behavior remain unverified unless supported by separately captured evidence.';
