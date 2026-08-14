export type EvidenceClassification =
  | 'SELF_REPORTED'
  | 'OWNER_CONFIRMED'
  | 'DOCUMENT_SUPPORTED'
  | 'OFFICIAL_SOURCE_VERIFIED'
  | 'PROVIDER_VERIFIED';

export type CredentialVerificationLevel =
  | 'self_reported'
  | 'owner_confirmed'
  | 'document_supported'
  | 'independently_verified';

export type LicenseStatus =
  | 'active'
  | 'expired'
  | 'suspended'
  | 'revoked'
  | 'pending'
  | 'unverified';

export type EntityGovernanceRole =
  | 'legalBusinessOwner'
  | 'relayAdministrator'
  | 'authorizedCommunicationsApprover'
  | 'pricingApprover'
  | 'licensedWorkApprover'
  | 'masterElectrician'
  | 'licenseeOfRecord'
  | 'financialPartner';

export interface EntityRoleAssignment {
  role: EntityGovernanceRole;
  assignedActorId: string | null;
  assignedActorName: string | null;
  verificationStatus: 'UNVERIFIED' | 'OWNER_CONFIRMED' | 'DOCUMENTED' | 'OFFICIAL_SOURCE_VERIFIED';
  verifiedAt: string | null;
  evidenceSource: string | null;
}

export interface StatutoryRuleReference {
  statuteOrRegulation: string;
  section: string;
  title: string;
  traceableSourceUrl: string;
  versionOrEffectiveDate: string;
  summary: string;
}

export const MA_STATUTORY_RULE_MAP: Record<string, StatutoryRuleReference> = {
  'MGL_141_1': {
    statuteOrRegulation: 'M.G.L. c. 141',
    section: '§1',
    title: 'Definitions (Master Electrician & Journeyman Electrician)',
    traceableSourceUrl: 'https://malegislature.gov/Laws/GeneralLaws/PartI/TitleXX/Chapter141/Section1',
    versionOrEffectiveDate: '2026-01-01',
    summary: 'Defines Master Electrician (Certificate A) and Journeyman Electrician (Certificate B) licensing terms.'
  },
  'MGL_141_1A': {
    statuteOrRegulation: 'M.G.L. c. 141',
    section: '§1A',
    title: 'Licensing Requirement and Exceptions',
    traceableSourceUrl: 'https://malegislature.gov/Laws/GeneralLaws/PartI/TitleXX/Chapter141/Section1A',
    versionOrEffectiveDate: '2026-01-01',
    summary: 'Prohibits engaging in electrical contracting work without a valid license issued by the Board.'
  },
  'MGL_141_3': {
    statuteOrRegulation: 'M.G.L. c. 141',
    section: '§3',
    title: 'Certificate A (Master) and Certificate B (Journeyman) Distinctions',
    traceableSourceUrl: 'https://malegislature.gov/Laws/GeneralLaws/PartI/TitleXX/Chapter141/Section3',
    versionOrEffectiveDate: '2026-01-01',
    summary: 'Distinguishes firm/contractor licensing (Certificate A) from individual technician licensing (Certificate B).'
  },
  'CMR_237_16': {
    statuteOrRegulation: '237 CMR',
    section: '16.00',
    title: 'Business-License Procedures',
    traceableSourceUrl: 'https://www.mass.gov/doc/237-cmr-1600-licenses-and-examinations/download',
    versionOrEffectiveDate: '2026-01-01',
    summary: 'Establishes requirements for electrical contracting firm business licenses (A1 Business License).'
  },
  'CMR_237_18': {
    statuteOrRegulation: '237 CMR',
    section: '18.00',
    title: 'Rules Governing Practice',
    traceableSourceUrl: 'https://www.mass.gov/doc/237-cmr-1800-rules-governing-practice/download',
    versionOrEffectiveDate: '2026-01-01',
    summary: 'Mandates displaying license numbers on public advertising, vehicles, and customer communications.'
  }
};

export interface JourneymanLicenseRecord {
  workerName: string;
  licenseNumber: string;
  licenseStatus: LicenseStatus;
  expirationDate?: string;
  evidenceClassification?: EvidenceClassification;
  verificationSourceLevel?: CredentialVerificationLevel;
}

export interface MAElectricalCompanyComplianceInput {
  legalBusinessName: string;
  dbaName?: string;
  entityRegistration?: string;

  // Massachusetts A1 Electrical Business License
  maA1BusinessLicenseNumber: string;
  businessLicenseStatus?: LicenseStatus;
  businessLicenseExpirationDate?: string;
  businessLicenseClassification?: EvidenceClassification;
  businessLicenseSourceLevel?: CredentialVerificationLevel;

  // Licensee of Record / Master Electrician
  licenseeOfRecord?: string;
  masterElectricianName: string;
  masterElectricianLicenseNumber: string;
  masterElectricianLicenseStatus?: LicenseStatus;
  masterElectricianLicenseExpirationDate?: string;
  masterElectricianClassification?: EvidenceClassification;
  masterElectricianSourceLevel?: CredentialVerificationLevel;

  // Journeyman Licenses
  journeymanLicenses?: JourneymanLicenseRecord[];

  // Supporting (Non-Proof) Credentials
  corporateRegistrationStatus?: string;
  corporateRegistrationClassification?: EvidenceClassification;
  corporateRegistrationSourceLevel?: CredentialVerificationLevel;
  dbaRegistrationStatus?: string;
  dbaClassification?: EvidenceClassification;
  dbaSourceLevel?: CredentialVerificationLevel;
  insuranceStatus?: string;
  insuranceClassification?: EvidenceClassification;
  insuranceSourceLevel?: CredentialVerificationLevel;

  // Verification & Audit Metadata
  evidenceSource?: string;
  sourceUrl?: string;
  verificationMethod?: string;
  verificationTimestamp?: string;
  reviewer?: string;
  evidenceArtifact?: Record<string, any>;
}

export interface MAElectricalCompanyComplianceRecord extends MAElectricalCompanyComplianceInput {
  id: string;
  tenantId: string;
  evaluatedAt: string;
  canClaimLicensedCompany: boolean;
  blockedReasoning: string[];
}

export interface MAComplianceEvaluationResult {
  tenantId: string;
  legalBusinessName: string;
  dbaName?: string;
  isA1BusinessLicenseVerified: boolean;
  isMasterElectricianVerified: boolean;
  canClaimLicensedCompany: boolean;
  blockedReasoning: string[];
  requirementMatrix: {
    ruleIdentifier: string;
    description: string;
    evidenceClassification: EvidenceClassification;
    implementationControl: string;
    testStatus: 'PASSED' | 'FAILED' | 'BLOCKED';
    requiredReviewerRole: 'Attorney' | 'Board' | 'MasterElectrician' | 'Owner';
  }[];
  credentialBreakdown: {
    a1BusinessLicense: {
      number: string;
      status: LicenseStatus;
      expirationDate?: string;
      classification: EvidenceClassification;
      sourceLevel: CredentialVerificationLevel;
      isVerifiedProof: boolean;
    };
    masterElectrician: {
      name: string;
      number: string;
      status: LicenseStatus;
      expirationDate?: string;
      classification: EvidenceClassification;
      sourceLevel: CredentialVerificationLevel;
      isVerifiedProof: boolean;
    };
    individualJourneyman: {
      name: string;
      number: string;
      classification: EvidenceClassification;
      sourceLevel: CredentialVerificationLevel;
      isValidProofOfBusinessLicense: false;
    };
    corporateRegistration: {
      classification: EvidenceClassification;
      sourceLevel: CredentialVerificationLevel;
      isValidProofOfElectricalLicense: false;
    };
    dbaRegistration: {
      classification: EvidenceClassification;
      sourceLevel: CredentialVerificationLevel;
      isValidProofOfElectricalLicense: false;
    };
    insurance: {
      classification: EvidenceClassification;
      sourceLevel: CredentialVerificationLevel;
      isValidProofOfElectricalLicense: false;
    };
  };
  evidenceSource: string;
  verificationTimestamp?: string;
  evidenceArtifact: Record<string, any>;
}
