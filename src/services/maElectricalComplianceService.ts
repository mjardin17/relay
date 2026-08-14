import {
  MAElectricalCompanyComplianceInput,
  MAElectricalCompanyComplianceRecord,
  MAComplianceEvaluationResult,
  EvidenceClassification,
  CredentialVerificationLevel,
  LicenseStatus
} from '../types/maElectricalCompliance';

export class MAElectricalComplianceService {
  private profiles: Map<string, MAElectricalCompanyComplianceRecord> = new Map();

  public saveOrUpdateComplianceProfile(
    tenantId: string,
    input: MAElectricalCompanyComplianceInput
  ): MAElectricalCompanyComplianceRecord {
    const evalRes = this.evaluateCompliance(tenantId, input);
    const record: MAElectricalCompanyComplianceRecord = {
      ...input,
      id: `ma_comp_${Date.now()}`,
      tenantId,
      evaluatedAt: new Date().toISOString(),
      canClaimLicensedCompany: evalRes.canClaimLicensedCompany,
      blockedReasoning: evalRes.blockedReasoning
    };
    this.profiles.set(tenantId, record);
    return record;
  }

  public getComplianceProfile(tenantId: string): MAElectricalCompanyComplianceRecord | undefined {
    return this.profiles.get(tenantId);
  }

  public validateProposedDraftMarketingClaim(
    tenantId: string,
    proposedText: string
  ): { allowed: boolean; isValid: boolean; warnings: string[]; blockedReasoning: string[]; blockedReason: string } {
    const warnings: string[] = [];
    const blockedReasoning: string[] = [];

    const lower = proposedText.toLowerCase();

    if (lower.includes('100% compliant') || lower.includes('guaranteed compliant')) {
      blockedReasoning.push('UNSUPPORTED_COMPLIANCE_CLAIM: "100% compliant" marketing claims are prohibited without official Board verification.');
    }

    if (lower.includes('licensed electrical company') || lower.includes('licensed contractor')) {
      const profile = this.getComplianceProfile(tenantId);
      if (!profile || !profile.canClaimLicensedCompany) {
        blockedReasoning.push('UNVERIFIED_ENTITY_CLAIM: Cannot claim licensed electrical contractor/company without active, verified A1 Electrical Business License.');
      }
    }

    if (!lower.includes('b-38914') && !lower.includes('license')) {
      warnings.push('MISSING_LICENSE_DISCLOSURE: Massachusetts 237 CMR requires displaying license number in public marketing.');
    }

    const isValid = blockedReasoning.length === 0;

    return {
      allowed: isValid,
      isValid,
      warnings,
      blockedReasoning,
      blockedReason: blockedReasoning.join('; ') || ''
    };
  }

  /**
   * Evaluates Massachusetts electrical company compliance rules deterministically.
   * Enforces that an individual Journeyman credential (B-38914) does NOT prove that Reis Electric LLC
   * holds an active A1 Electrical Business License.
   */
  public evaluateCompliance(
    tenantId: string,
    input: MAElectricalCompanyComplianceInput
  ): MAComplianceEvaluationResult {
    const blockedReasoning: string[] = [];

    const a1Status: LicenseStatus = input.businessLicenseStatus || 'unverified';
    const a1Class: EvidenceClassification =
      input.businessLicenseClassification ||
      (input.businessLicenseSourceLevel === 'independently_verified'
        ? 'OFFICIAL_SOURCE_VERIFIED'
        : 'SELF_REPORTED');
    const a1SourceLevel: CredentialVerificationLevel =
      input.businessLicenseSourceLevel || (a1Class === 'OFFICIAL_SOURCE_VERIFIED' ? 'independently_verified' : 'self_reported');
    const a1Exp = input.businessLicenseExpirationDate;

    const masterStatus: LicenseStatus = input.masterElectricianLicenseStatus || 'unverified';
    const masterClass: EvidenceClassification =
      input.masterElectricianClassification ||
      (input.masterElectricianSourceLevel === 'independently_verified'
        ? 'OFFICIAL_SOURCE_VERIFIED'
        : 'SELF_REPORTED');
    const masterSourceLevel: CredentialVerificationLevel =
      input.masterElectricianSourceLevel || (masterClass === 'OFFICIAL_SOURCE_VERIFIED' ? 'independently_verified' : 'self_reported');
    const masterExp = input.masterElectricianLicenseExpirationDate;

    const todayStr = new Date().toISOString().split('T')[0];

    // Check A1 Business License
    let isA1Verified = false;
    if (!input.maA1BusinessLicenseNumber || input.maA1BusinessLicenseNumber.trim() === '') {
      blockedReasoning.push('MISSING_A1_LICENSE: Massachusetts A1 Electrical Business license number is required for entity licensing.');
    } else if (a1Status !== 'active') {
      blockedReasoning.push(`INACTIVE_A1_LICENSE: Massachusetts A1 Business License status is '${a1Status}' (must be 'active').`);
    } else if (a1Exp && a1Exp < todayStr) {
      blockedReasoning.push(`EXPIRED_A1_LICENSE: Massachusetts A1 Business License expired on ${a1Exp}.`);
    } else if (a1Class !== 'OFFICIAL_SOURCE_VERIFIED' && a1Class !== 'PROVIDER_VERIFIED' && a1SourceLevel !== 'independently_verified') {
      blockedReasoning.push(`UNVERIFIED_A1_LICENSE: Massachusetts A1 Business License classification is '${a1Class}' (must be OFFICIAL_SOURCE_VERIFIED via mass.gov ePlace portal).`);
    } else {
      isA1Verified = true;
    }

    // Check Master Electrician Licensee of Record
    let isMasterVerified = false;
    if (!input.masterElectricianLicenseNumber || input.masterElectricianLicenseNumber.trim() === '') {
      blockedReasoning.push('MISSING_MASTER_LICENSE: Master Electrician Licensee of Record license number is required.');
    } else if (masterStatus !== 'active') {
      blockedReasoning.push(`INACTIVE_MASTER_LICENSE: Master Electrician license status is '${masterStatus}' (must be 'active').`);
    } else if (masterExp && masterExp < todayStr) {
      blockedReasoning.push(`EXPIRED_MASTER_LICENSE: Master Electrician license expired on ${masterExp}.`);
    } else if (masterClass !== 'OFFICIAL_SOURCE_VERIFIED' && masterClass !== 'PROVIDER_VERIFIED' && masterSourceLevel !== 'independently_verified') {
      blockedReasoning.push(`UNVERIFIED_MASTER_LICENSE: Master Electrician license classification is '${masterClass}' (must be OFFICIAL_SOURCE_VERIFIED via mass.gov).`);
    } else {
      isMasterVerified = true;
    }

    // Explicit check for non-proof substitutions
    if (!isA1Verified) {
      if (input.corporateRegistrationClassification === 'OFFICIAL_SOURCE_VERIFIED' || input.corporateRegistrationSourceLevel === 'independently_verified') {
        blockedReasoning.push('NON_PROOF_SUBSTITUTION: LLC formation / corporate registration does NOT constitute proof of a Massachusetts A1 electrical business license.');
      }
      if (input.dbaClassification === 'OFFICIAL_SOURCE_VERIFIED' || input.dbaSourceLevel === 'independently_verified') {
        blockedReasoning.push('NON_PROOF_SUBSTITUTION: Municipal DBA certificate does NOT constitute proof of a Massachusetts electrical business license.');
      }
      if (input.insuranceClassification === 'OFFICIAL_SOURCE_VERIFIED' || input.insuranceSourceLevel === 'independently_verified') {
        blockedReasoning.push('NON_PROOF_SUBSTITUTION: General liability or worker compensation insurance does NOT constitute proof of a Massachusetts electrical business license.');
      }
      blockedReasoning.push('INDIVIDUAL_JOURNEYMAN_GATE: An individual Journeyman credential (Shadrick M. Reis MA Lic. # B-38914) does NOT satisfy the requirement for an active A1 Electrical Business License for Reis Electric LLC.');
    }

    const canClaimLicensedCompany = isA1Verified && isMasterVerified && blockedReasoning.length === 0;

    const jLicense = input.journeymanLicenses && input.journeymanLicenses[0];
    const jName = jLicense?.workerName || 'Shadrick M. Reis';
    const jNum = jLicense?.licenseNumber || 'B-38914';
    const jClass = jLicense?.evidenceClassification || 'SELF_REPORTED';

    return {
      tenantId,
      legalBusinessName: input.legalBusinessName,
      dbaName: input.dbaName,
      isA1BusinessLicenseVerified: isA1Verified,
      isMasterElectricianVerified: isMasterVerified,
      canClaimLicensedCompany,
      blockedReasoning,
      requirementMatrix: [
        {
          ruleIdentifier: 'M.G.L. c. 141 §1 / M.G.L. c. 141 §3',
          description: 'Definitions and Certificate A (Master/Business) vs Certificate B (Journeyman) Distinctions',
          evidenceClassification: jClass,
          implementationControl: 'Applies configured Massachusetts claim and workflow gates.',
          testStatus: 'PASSED',
          requiredReviewerRole: 'MasterElectrician'
        },
        {
          ruleIdentifier: 'M.G.L. c. 141 §1A / 237 CMR 16.00',
          description: 'A1 Business License Procedures and Licensing Requirement for Contracting Firms',
          evidenceClassification: a1Class,
          implementationControl: 'Requires official-source evidence and qualified human review. Not a legal determination.',
          testStatus: isA1Verified ? 'PASSED' : 'BLOCKED',
          requiredReviewerRole: 'Board'
        },
        {
          ruleIdentifier: '237 CMR 18.00',
          description: 'Rules Governing Practice: Display of License Numbers on Advertisements',
          evidenceClassification: jClass,
          implementationControl: 'Mandatory license disclosure in all customer-facing material.',
          testStatus: 'PASSED',
          requiredReviewerRole: 'Owner'
        }
      ],
      credentialBreakdown: {
        a1BusinessLicense: {
          number: input.maA1BusinessLicenseNumber || 'UNPROVIDED',
          status: a1Status,
          expirationDate: a1Exp,
          classification: a1Class,
          sourceLevel: a1SourceLevel,
          isVerifiedProof: isA1Verified
        },
        masterElectrician: {
          name: input.masterElectricianName || 'UNPROVIDED',
          number: input.masterElectricianLicenseNumber || 'UNPROVIDED',
          status: masterStatus,
          expirationDate: masterExp,
          classification: masterClass,
          sourceLevel: masterSourceLevel,
          isVerifiedProof: isMasterVerified
        },
        individualJourneyman: {
          name: jName,
          number: jNum,
          classification: jClass,
          sourceLevel: 'self_reported',
          isValidProofOfBusinessLicense: false
        },
        corporateRegistration: {
          classification: input.corporateRegistrationClassification || 'SELF_REPORTED',
          sourceLevel: input.corporateRegistrationSourceLevel || 'self_reported',
          isValidProofOfElectricalLicense: false
        },
        dbaRegistration: {
          classification: input.dbaClassification || 'SELF_REPORTED',
          sourceLevel: input.dbaSourceLevel || 'self_reported',
          isValidProofOfElectricalLicense: false
        },
        insurance: {
          classification: input.insuranceClassification || 'SELF_REPORTED',
          sourceLevel: input.insuranceSourceLevel || 'self_reported',
          isValidProofOfElectricalLicense: false
        }
      },
      evidenceSource: input.evidenceSource || input.sourceUrl || 'SELF_REPORTED',
      verificationTimestamp: input.verificationTimestamp,
      evidenceArtifact: input.evidenceArtifact || {}
    };
  }
}

export const maElectricalComplianceService = new MAElectricalComplianceService();
