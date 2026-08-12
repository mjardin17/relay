export type CredentialVerificationLevel =
  | 'self_reported'
  | 'document_supported'
  | 'independently_verified';

export type LicenseStatus =
  | 'active'
  | 'expired'
  | 'suspended'
  | 'revoked'
  | 'pending'
  | 'unverified';

export interface JourneymanLicenseRecord {
  workerName: string;
  licenseNumber: string;
  licenseStatus: LicenseStatus;
  expirationDate?: string;
  verificationSourceLevel: CredentialVerificationLevel;
}

export interface MAElectricalCompanyComplianceInput {
  legalBusinessName: string;
  dbaName?: string;

  // Massachusetts A1 Electrical Business License
  maA1BusinessLicenseNumber: string;
  businessLicenseStatus?: LicenseStatus;
  businessLicenseExpirationDate?: string;
  businessLicenseSourceLevel?: CredentialVerificationLevel;

  // Master Electrician Licensee of Record
  masterElectricianName: string;
  masterElectricianLicenseNumber: string;
  masterElectricianLicenseStatus?: LicenseStatus;
  masterElectricianLicenseExpirationDate?: string;
  masterElectricianSourceLevel?: CredentialVerificationLevel;

  // Journeyman Licenses
  journeymanLicenses?: JourneymanLicenseRecord[];

  // Supporting (Non-Proof) Credentials
  corporateRegistrationStatus?: string;
  corporateRegistrationSourceLevel?: CredentialVerificationLevel;
  dbaRegistrationStatus?: string;
  dbaSourceLevel?: CredentialVerificationLevel;
  insuranceStatus?: string;
  insuranceSourceLevel?: CredentialVerificationLevel;

  // Verification & Evidence
  sourceUrl: string;
  verificationTimestamp?: string;
  evidenceArtifact?: Record<string, any>;
}

export interface MAElectricalCompanyComplianceRecord {
  id: string;
  tenantId: string;
  legalBusinessName: string;
  dbaName?: string;

  maA1BusinessLicenseNumber: string;
  businessLicenseStatus: LicenseStatus;
  businessLicenseExpirationDate?: string;
  businessLicenseSourceLevel: CredentialVerificationLevel;

  masterElectricianName: string;
  masterElectricianLicenseNumber: string;
  masterElectricianLicenseStatus: LicenseStatus;
  masterElectricianLicenseExpirationDate?: string;
  masterElectricianSourceLevel: CredentialVerificationLevel;

  journeymanLicenses: JourneymanLicenseRecord[];

  corporateRegistrationStatus: string;
  corporateRegistrationSourceLevel: CredentialVerificationLevel;
  dbaRegistrationStatus: string;
  dbaSourceLevel: CredentialVerificationLevel;
  insuranceStatus: string;
  insuranceSourceLevel: CredentialVerificationLevel;

  sourceUrl: string;
  verificationTimestamp?: string;
  evidenceArtifact: Record<string, any>;

  canClaimLicensedCompany: boolean;
  complianceNotes: string[];
  createdAt: string;
  updatedAt: string;
}

export interface MAComplianceEvaluationResult {
  tenantId: string;
  legalBusinessName: string;
  dbaName?: string;
  isA1BusinessLicenseVerified: boolean;
  isMasterElectricianVerified: boolean;
  canClaimLicensedCompany: boolean;
  blockedReasoning: string[];
  credentialBreakdown: {
    a1BusinessLicense: {
      number: string;
      status: LicenseStatus;
      expirationDate?: string;
      sourceLevel: CredentialVerificationLevel;
      isVerifiedProof: boolean;
    };
    masterElectrician: {
      name: string;
      number: string;
      status: LicenseStatus;
      expirationDate?: string;
      sourceLevel: CredentialVerificationLevel;
      isVerifiedProof: boolean;
    };
    corporateRegistration: {
      sourceLevel: CredentialVerificationLevel;
      isValidProofOfElectricalLicense: false;
    };
    dbaRegistration: {
      sourceLevel: CredentialVerificationLevel;
      isValidProofOfElectricalLicense: false;
    };
    insurance: {
      sourceLevel: CredentialVerificationLevel;
      isValidProofOfElectricalLicense: false;
    };
    individualElectriciansOnly: {
      isValidProofOfBusinessLicense: false;
    };
  };
  verifiedSourceUrl: string;
  verificationTimestamp?: string;
  evidenceArtifact: Record<string, any>;
}
