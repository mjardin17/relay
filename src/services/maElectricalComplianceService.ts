import { getDatabase } from '../db/database';
import { launchAuditService } from './launchAuditService';
import { growthPersistenceService } from './growthPersistenceService';
import {
  MAElectricalCompanyComplianceInput,
  MAElectricalCompanyComplianceRecord,
  MAComplianceEvaluationResult,
  CredentialVerificationLevel,
  LicenseStatus,
  JourneymanLicenseRecord,
} from '../types/maElectricalCompliance';

const OFFICIAL_MA_SOURCE_DOMAIN = 'mass.gov';

export class MAElectricalComplianceService {
  /**
   * Evaluates Massachusetts electrical company compliance rules deterministically.
   */
  public evaluateCompliance(
    tenantId: string,
    input: MAElectricalCompanyComplianceInput
  ): MAComplianceEvaluationResult {
    const blockedReasoning: string[] = [];

    const a1Status: LicenseStatus = input.businessLicenseStatus || 'unverified';
    const a1Source: CredentialVerificationLevel = input.businessLicenseSourceLevel || 'self_reported';
    const a1Exp = input.businessLicenseExpirationDate;

    const masterStatus: LicenseStatus = input.masterElectricianLicenseStatus || 'unverified';
    const masterSource: CredentialVerificationLevel = input.masterElectricianSourceLevel || 'self_reported';
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
    } else if (a1Source !== 'independently_verified') {
      blockedReasoning.push(`UNVERIFIED_A1_LICENSE: Massachusetts A1 Business License verification level is '${a1Source}' (must be 'independently_verified' via official MA source).`);
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
    } else if (masterSource !== 'independently_verified') {
      blockedReasoning.push(`UNVERIFIED_MASTER_LICENSE: Master Electrician license verification level is '${masterSource}' (must be 'independently_verified' via official MA source).`);
    } else {
      isMasterVerified = true;
    }

    // Check official MA source URL
    if (!input.sourceUrl || (!input.sourceUrl.includes('mass.gov') && !input.sourceUrl.includes('eplace'))) {
      blockedReasoning.push('INVALID_SOURCE_URL: Verification source URL must point to an official Massachusetts verification portal (e.g. mass.gov or eplace).');
    }

    // Explicit check for non-proof substitutions
    if (a1Source !== 'independently_verified') {
      if (input.corporateRegistrationSourceLevel === 'independently_verified') {
        blockedReasoning.push('NON_PROOF_SUBSTITUTION: LLC formation / corporate registration does NOT constitute proof of a Massachusetts electrical business license.');
      }
      if (input.dbaSourceLevel === 'independently_verified') {
        blockedReasoning.push('NON_PROOF_SUBSTITUTION: Municipal DBA certificate does NOT constitute proof of a Massachusetts electrical business license.');
      }
      if (input.insuranceSourceLevel === 'independently_verified') {
        blockedReasoning.push('NON_PROOF_SUBSTITUTION: General liability or worker compensation insurance does NOT constitute proof of a Massachusetts electrical business license.');
      }
      if (isMasterVerified && !isA1Verified) {
        blockedReasoning.push('NON_PROOF_SUBSTITUTION: An individual Master Electrician license alone does NOT prove that the business entity holds an active A1 Electrical Business license.');
      }
    }

    const canClaimLicensedCompany = isA1Verified && isMasterVerified && blockedReasoning.length === 0;

    return {
      tenantId,
      legalBusinessName: input.legalBusinessName,
      dbaName: input.dbaName,
      isA1BusinessLicenseVerified: isA1Verified,
      isMasterElectricianVerified: isMasterVerified,
      canClaimLicensedCompany,
      blockedReasoning,
      credentialBreakdown: {
        a1BusinessLicense: {
          number: input.maA1BusinessLicenseNumber,
          status: a1Status,
          expirationDate: a1Exp,
          sourceLevel: a1Source,
          isVerifiedProof: isA1Verified,
        },
        masterElectrician: {
          name: input.masterElectricianName,
          number: input.masterElectricianLicenseNumber,
          status: masterStatus,
          expirationDate: masterExp,
          sourceLevel: masterSource,
          isVerifiedProof: isMasterVerified,
        },
        corporateRegistration: {
          sourceLevel: input.corporateRegistrationSourceLevel || 'self_reported',
          isValidProofOfElectricalLicense: false,
        },
        dbaRegistration: {
          sourceLevel: input.dbaSourceLevel || 'self_reported',
          isValidProofOfElectricalLicense: false,
        },
        insurance: {
          sourceLevel: input.insuranceSourceLevel || 'self_reported',
          isValidProofOfElectricalLicense: false,
        },
        individualElectriciansOnly: {
          isValidProofOfBusinessLicense: false,
        },
      },
      verifiedSourceUrl: input.sourceUrl,
      verificationTimestamp: input.verificationTimestamp,
      evidenceArtifact: input.evidenceArtifact || {},
    };
  }

  /**
   * Intake or update Massachusetts electrical company compliance record in SQLite database.
   */
  public saveOrUpdateComplianceProfile(
    tenantId: string,
    input: MAElectricalCompanyComplianceInput
  ): MAElectricalCompanyComplianceRecord {
    const db = getDatabase();
    const now = new Date().toISOString();

    const evaluation = this.evaluateCompliance(tenantId, input);

    const recordId = `mcomp-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const journeymanJson = JSON.stringify(input.journeymanLicenses || []);
    const evidenceJson = JSON.stringify(input.evidenceArtifact || {});
    const complianceNotesJson = JSON.stringify(evaluation.blockedReasoning);

    db.prepare(`
      INSERT INTO ma_electrical_company_compliance (
        id, tenant_id, legal_business_name, dba_name,
        ma_a1_business_license_number, business_license_status, business_license_expiration_date, business_license_source_level,
        master_electrician_name, master_electrician_license_number, master_electrician_license_status, master_electrician_license_expiration_date, master_electrician_source_level,
        journeyman_licenses_json,
        corporate_registration_status, corporate_registration_source_level,
        dba_registration_status, dba_source_level,
        insurance_status, insurance_source_level,
        source_url, verification_timestamp, evidence_artifact_json,
        can_claim_licensed_company, compliance_notes_json,
        created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?,
        ?, ?,
        ?, ?,
        ?, ?,
        ?, ?, ?,
        ?, ?,
        ?, ?
      ) ON CONFLICT(tenant_id) DO UPDATE SET
        legal_business_name = excluded.legal_business_name,
        dba_name = excluded.dba_name,
        ma_a1_business_license_number = excluded.ma_a1_business_license_number,
        business_license_status = excluded.business_license_status,
        business_license_expiration_date = excluded.business_license_expiration_date,
        business_license_source_level = excluded.business_license_source_level,
        master_electrician_name = excluded.master_electrician_name,
        master_electrician_license_number = excluded.master_electrician_license_number,
        master_electrician_license_status = excluded.master_electrician_license_status,
        master_electrician_license_expiration_date = excluded.master_electrician_license_expiration_date,
        master_electrician_source_level = excluded.master_electrician_source_level,
        journeyman_licenses_json = excluded.journeyman_licenses_json,
        corporate_registration_status = excluded.corporate_registration_status,
        corporate_registration_source_level = excluded.corporate_registration_source_level,
        dba_registration_status = excluded.dba_registration_status,
        dba_source_level = excluded.dba_source_level,
        insurance_status = excluded.insurance_status,
        insurance_source_level = excluded.insurance_source_level,
        source_url = excluded.source_url,
        verification_timestamp = excluded.verification_timestamp,
        evidence_artifact_json = excluded.evidence_artifact_json,
        can_claim_licensed_company = excluded.can_claim_licensed_company,
        compliance_notes_json = excluded.compliance_notes_json,
        updated_at = excluded.updated_at
    `).run(
      recordId,
      tenantId,
      input.legalBusinessName,
      input.dbaName || null,
      input.maA1BusinessLicenseNumber,
      input.businessLicenseStatus || 'unverified',
      input.businessLicenseExpirationDate || null,
      input.businessLicenseSourceLevel || 'self_reported',
      input.masterElectricianName,
      input.masterElectricianLicenseNumber,
      input.masterElectricianLicenseStatus || 'unverified',
      input.masterElectricianLicenseExpirationDate || null,
      input.masterElectricianSourceLevel || 'self_reported',
      journeymanJson,
      input.corporateRegistrationStatus || 'unverified',
      input.corporateRegistrationSourceLevel || 'self_reported',
      input.dbaRegistrationStatus || 'unverified',
      input.dbaSourceLevel || 'self_reported',
      input.insuranceStatus || 'unverified',
      input.insuranceSourceLevel || 'self_reported',
      input.sourceUrl,
      input.verificationTimestamp || now,
      evidenceJson,
      evaluation.canClaimLicensedCompany ? 1 : 0,
      complianceNotesJson,
      now,
      now
    );

    // Record audit event
    launchAuditService.recordAudit({
      tenantId,
      actorId: 'system',
      clientIp: '127.0.0.1',
      endpoint: '/api/growth/ma-compliance/intake',
      action: 'ma_compliance_profile_updated',
      status: evaluation.canClaimLicensedCompany ? 'verified' : 'unverified',
      details: {
        legalBusinessName: input.legalBusinessName,
        maA1BusinessLicenseNumber: input.maA1BusinessLicenseNumber,
        canClaimLicensedCompany: evaluation.canClaimLicensedCompany,
        blockedReasoning: evaluation.blockedReasoning,
      },
    });

    // Create evidence item in evidence_items table
    const evId = `ev-macomp-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const evClaim = evaluation.canClaimLicensedCompany
      ? `Massachusetts A1 Electrical Business License (${input.maA1BusinessLicenseNumber}) and Master Electrician (${input.masterElectricianLicenseNumber}) independently verified.`
      : `Massachusetts Electrical Business License unverified for ${input.legalBusinessName}.`;

    db.prepare(`
      INSERT INTO evidence_items (
        id, tenant_id, opportunity_id, claim, source_type, sample_size, confidence, metadata_json, created_at
      ) VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)
    `).run(
      evId,
      tenantId,
      'opp-ma-compliance',
      evClaim,
      'official_state_portal_lookup',
      evaluation.canClaimLicensedCompany ? 'High' : 'Low',
      JSON.stringify({
        sourceUrl: input.sourceUrl,
        verificationTimestamp: input.verificationTimestamp || now,
        blockedReasoning: evaluation.blockedReasoning,
        evidenceArtifact: input.evidenceArtifact || {},
      }),
      now
    );

    return this.getComplianceProfile(tenantId)!;
  }

  /**
   * Retrieves Massachusetts electrical company compliance record for a tenant.
   */
  public getComplianceProfile(tenantId: string): MAElectricalCompanyComplianceRecord | null {
    const db = getDatabase();
    const row: any = db
      .prepare('SELECT * FROM ma_electrical_company_compliance WHERE tenant_id = ?')
      .get(tenantId);

    if (!row) {
      return null;
    }

    let journeymanList: JourneymanLicenseRecord[] = [];
    try {
      journeymanList = JSON.parse(row.journeyman_licenses_json || '[]');
    } catch {
      journeymanList = [];
    }

    let evidenceArtifactObj: Record<string, any> = {};
    try {
      evidenceArtifactObj = JSON.parse(row.evidence_artifact_json || '{}');
    } catch {
      evidenceArtifactObj = {};
    }

    let notes: string[] = [];
    try {
      notes = JSON.parse(row.compliance_notes_json || '[]');
    } catch {
      notes = [];
    }

    return {
      id: row.id,
      tenantId: row.tenant_id,
      legalBusinessName: row.legal_business_name,
      dbaName: row.dba_name,
      maA1BusinessLicenseNumber: row.ma_a1_business_license_number,
      businessLicenseStatus: row.business_license_status,
      businessLicenseExpirationDate: row.business_license_expiration_date,
      businessLicenseSourceLevel: row.business_license_source_level,
      masterElectricianName: row.master_electrician_name,
      masterElectricianLicenseNumber: row.master_electrician_license_number,
      masterElectricianLicenseStatus: row.master_electrician_license_status,
      masterElectricianLicenseExpirationDate: row.master_electrician_license_expiration_date,
      masterElectricianSourceLevel: row.master_electrician_source_level,
      journeymanLicenses: journeymanList,
      corporateRegistrationStatus: row.corporate_registration_status,
      corporateRegistrationSourceLevel: row.corporate_registration_source_level,
      dbaRegistrationStatus: row.dba_registration_status,
      dbaSourceLevel: row.dba_source_level,
      insuranceStatus: row.insurance_status,
      insuranceSourceLevel: row.insurance_source_level,
      sourceUrl: row.source_url,
      verificationTimestamp: row.verification_timestamp,
      evidenceArtifact: evidenceArtifactObj,
      canClaimLicensedCompany: Boolean(row.can_claim_licensed_company),
      complianceNotes: notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Validates proposed draft marketing copy to block descriptions claiming "licensed electrical company"
   * if the company does not have independently verified A1 Business License & Master Electrician License.
   */
  public validateProposedDraftMarketingClaim(
    tenantId: string,
    proposedText: string
  ): { allowed: boolean; blockedReasoning?: string } {
    const profile = this.getComplianceProfile(tenantId);

    const regexLicensedCompanyClaim = /(licensed\s+electrical\s+(company|contractor|business)|licensed\s+electrical\s+contractor\s+company|licensed\s+company)/i;

    if (regexLicensedCompanyClaim.test(proposedText)) {
      if (!profile || !profile.canClaimLicensedCompany) {
        const reasoning = profile
          ? `COMPLIANCE_BLOCKED: Cannot describe company as a 'licensed electrical company'. Massachusetts A1 Business License and Master Electrician Licensee of Record must both be active and independently verified through an official Massachusetts source. Current issues: ${profile.complianceNotes.join('; ')}`
          : `COMPLIANCE_BLOCKED: Cannot describe company as a 'licensed electrical company'. No Massachusetts electrical compliance profile found for tenant ${tenantId}.`;

        launchAuditService.recordAudit({
          tenantId,
          actorId: 'system',
          clientIp: '127.0.0.1',
          endpoint: '/api/growth/ma-compliance/validate-draft',
          action: 'marketing_claim_blocked',
          status: 'blocked',
          details: { proposedText, reasoning },
        });

        return { allowed: false, blockedReasoning: reasoning };
      }
    }

    return { allowed: true };
  }
}

export const maElectricalComplianceService = new MAElectricalComplianceService();
