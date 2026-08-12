import { maElectricalComplianceService } from '../src/services/maElectricalComplianceService';
import { electricalWorkflowEngine } from '../src/services/electricalWorkflowEngine';
import { getDatabase } from '../src/db/database';
import { launchAuditService } from '../src/services/launchAuditService';
import { MAElectricalCompanyComplianceInput } from '../src/types/maElectricalCompliance';

function runMAComplianceBoundaryTests() {
  console.log('================================================================');
  console.log(' RUNNING MASSACHUSETTS ELECTRICAL COMPLIANCE BOUNDARY TESTS');
  console.log('================================================================');

  const tenantA = 'tenant_ma_test_1';
  const tenantB = 'tenant_ma_test_2';
  const db = getDatabase();

  // Clean up test tenants
  db.prepare('DELETE FROM ma_electrical_company_compliance WHERE tenant_id IN (?, ?)').run(tenantA, tenantB);
  db.prepare('DELETE FROM tenants WHERE id IN (?, ?)').run(tenantA, tenantB);

  const now = new Date().toISOString();
  db.prepare('INSERT INTO tenants (id, name, industry, created_at) VALUES (?, ?, ?, ?)').run(tenantA, 'Beacon Hill Electric LLC', 'Electrical Contractor', now);
  db.prepare('INSERT INTO tenants (id, name, industry, created_at) VALUES (?, ?, ?, ?)').run(tenantB, 'Bay State Power Inc', 'Electrical Contractor', now);

  let passCount = 0;
  let testTotal = 0;

  function assertTest(condition: boolean, testName: string, failDetails?: string) {
    testTotal++;
    if (condition) {
      passCount++;
      console.log(`  [PASS] Test ${testTotal}: ${testName}`);
    } else {
      console.error(`  [FAIL] Test ${testTotal}: ${testName}`);
      if (failDetails) console.error(`         Details: ${failDetails}`);
      throw new Error(`Test failed: ${testName}`);
    }
  }

  // ---------------------------------------------------------------------------
  // Test 1: Record and Retrieve All 8 Separate Fields
  // ---------------------------------------------------------------------------
  console.log('\n--- 1. Testing Separate Field Storage & Retrieval ---');
  const fullInput: MAElectricalCompanyComplianceInput = {
    legalBusinessName: 'Beacon Hill Electrical Services LLC',
    dbaName: 'Beacon Hill Electric',
    maA1BusinessLicenseNumber: 'MA-A1-884920',
    businessLicenseStatus: 'active',
    businessLicenseExpirationDate: '2028-12-31',
    businessLicenseSourceLevel: 'independently_verified',

    masterElectricianName: 'John Doe',
    masterElectricianLicenseNumber: 'MA-ME-44102',
    masterElectricianLicenseStatus: 'active',
    masterElectricianLicenseExpirationDate: '2028-12-31',
    masterElectricianSourceLevel: 'independently_verified',

    journeymanLicenses: [
      {
        workerName: 'Alice Smith',
        licenseNumber: 'MA-JY-19203',
        licenseStatus: 'active',
        expirationDate: '2027-06-30',
        verificationSourceLevel: 'independently_verified',
      },
    ],

    corporateRegistrationStatus: 'active',
    corporateRegistrationSourceLevel: 'independently_verified',
    dbaRegistrationStatus: 'active',
    dbaSourceLevel: 'independently_verified',
    insuranceStatus: 'active',
    insuranceSourceLevel: 'independently_verified',

    sourceUrl: 'https://eplace.eea.mass.gov/citizenaccess/lookup?lic=MA-A1-884920',
    verificationTimestamp: '2026-08-12T03:00:00Z',
    evidenceArtifact: {
      lookupSha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
      boardName: 'Massachusetts Board of State Examiners of Electricians',
    },
  };

  const recordA = maElectricalComplianceService.saveOrUpdateComplianceProfile(tenantA, fullInput);

  assertTest(recordA.legalBusinessName === 'Beacon Hill Electrical Services LLC', '1.1 Legal Business Name recorded correctly');
  assertTest(recordA.dbaName === 'Beacon Hill Electric', '1.2 DBA Name recorded correctly');
  assertTest(recordA.maA1BusinessLicenseNumber === 'MA-A1-884920', '1.3 MA A1 Business License Number recorded correctly');
  assertTest(recordA.businessLicenseStatus === 'active' && recordA.businessLicenseExpirationDate === '2028-12-31', '1.4 Business License status & expiration date recorded');
  assertTest(recordA.masterElectricianName === 'John Doe', '1.5 Master Electrician Licensee of Record recorded');
  assertTest(recordA.masterElectricianLicenseNumber === 'MA-ME-44102' && recordA.masterElectricianLicenseStatus === 'active', '1.6 Master Electrician number & status recorded');
  assertTest(recordA.journeymanLicenses.length === 1 && recordA.journeymanLicenses[0].licenseNumber === 'MA-JY-19203', '1.7 Journeyman licenses recorded');
  assertTest(recordA.sourceUrl.includes('mass.gov') && recordA.evidenceArtifact.lookupSha256 !== undefined, '1.8 Source URL, timestamp & evidence artifact recorded');

  // ---------------------------------------------------------------------------
  // Test 2: Rejection of Individual Electrician License as Business Entity Proof
  // ---------------------------------------------------------------------------
  console.log('\n--- 2. Testing Rejection of Individual License as Business Proof ---');
  const individualOnlyInput: MAElectricalCompanyComplianceInput = {
    legalBusinessName: 'Bay State Electrical LLC',
    dbaName: undefined,
    maA1BusinessLicenseNumber: '', // Missing business license
    businessLicenseStatus: 'unverified',
    businessLicenseSourceLevel: 'self_reported',

    masterElectricianName: 'Robert Vance',
    masterElectricianLicenseNumber: 'MA-ME-99102',
    masterElectricianLicenseStatus: 'active',
    masterElectricianLicenseExpirationDate: '2028-05-01',
    masterElectricianSourceLevel: 'independently_verified', // Master verified, but NO A1 Business license!

    sourceUrl: 'https://www.mass.gov/orgs/board-of-state-examiners-of-electricians',
  };

  const evalIndividualOnly = maElectricalComplianceService.evaluateCompliance(tenantB, individualOnlyInput);
  assertTest(evalIndividualOnly.canClaimLicensedCompany === false, '2.1 Individual Master Electrician license alone cannot claim licensed business entity');
  assertTest(evalIndividualOnly.blockedReasoning.some(r => r.includes('MISSING_A1_LICENSE') || r.includes('NON_PROOF_SUBSTITUTION')), '2.2 Blocked reasoning explicitly cites missing A1 business license');

  // ---------------------------------------------------------------------------
  // Test 3: Rejection of LLC, DBA, Insurance, or Self-Reported Info as Business License Proof
  // ---------------------------------------------------------------------------
  console.log('\n--- 3. Testing Rejection of Non-Electrical Proofs (LLC/DBA/Insurance/Self-Reported) ---');
  const nonProofInput: MAElectricalCompanyComplianceInput = {
    legalBusinessName: 'Commonwealth Wiring Corp',
    dbaName: 'Comm Wiring',
    maA1BusinessLicenseNumber: 'MA-A1-SELF-123',
    businessLicenseStatus: 'active',
    businessLicenseSourceLevel: 'self_reported', // Self-reported!

    masterElectricianName: 'Sam Adams',
    masterElectricianLicenseNumber: 'MA-ME-11111',
    masterElectricianLicenseStatus: 'active',
    masterElectricianSourceLevel: 'self_reported',

    corporateRegistrationStatus: 'active',
    corporateRegistrationSourceLevel: 'independently_verified', // LLC registration verified
    dbaRegistrationStatus: 'active',
    dbaSourceLevel: 'independently_verified', // DBA certificate verified
    insuranceStatus: 'active',
    insuranceSourceLevel: 'independently_verified', // Insurance certificate verified

    sourceUrl: 'https://eplace.eea.mass.gov',
  };

  const evalNonProof = maElectricalComplianceService.evaluateCompliance(tenantB, nonProofInput);
  assertTest(evalNonProof.canClaimLicensedCompany === false, '3.1 LLC, DBA, and Insurance verification cannot substitute for independently verified A1 Business License');
  assertTest(evalNonProof.blockedReasoning.some(r => r.includes('UNVERIFIED_A1_LICENSE') || r.includes('NON_PROOF_SUBSTITUTION')), '3.2 Blocked reasoning flags unverified A1 license and non-proof substitution');

  // ---------------------------------------------------------------------------
  // Test 4: Credential Source Level Marking
  // ---------------------------------------------------------------------------
  console.log('\n--- 4. Testing Credential Source Level Markings ---');
  assertTest(evalNonProof.credentialBreakdown.a1BusinessLicense.sourceLevel === 'self_reported', '4.1 A1 Business license source level marked as self_reported');
  assertTest(evalNonProof.credentialBreakdown.corporateRegistration.sourceLevel === 'independently_verified', '4.2 Corporate registration marked as independently_verified');
  assertTest(evalNonProof.credentialBreakdown.corporateRegistration.isValidProofOfElectricalLicense === false, '4.3 Corporate registration explicitly flagged as NOT valid proof of electrical license');
  assertTest(evalNonProof.credentialBreakdown.insurance.isValidProofOfElectricalLicense === false, '4.4 Insurance explicitly flagged as NOT valid proof of electrical license');

  // ---------------------------------------------------------------------------
  // Test 5: Blocking Relay from Describing Company as "Licensed Electrical Company"
  // ---------------------------------------------------------------------------
  console.log('\n--- 5. Testing Marketing Claim Blocking ---');
  maElectricalComplianceService.saveOrUpdateComplianceProfile(tenantB, nonProofInput); // Tenant B is unverified!

  const claimCheckUnverified = maElectricalComplianceService.validateProposedDraftMarketingClaim(
    tenantB,
    'Hi customer, we are a licensed electrical company in Boston. Can we schedule an estimate?'
  );
  assertTest(claimCheckUnverified.allowed === false, '5.1 Marketing claim describing company as "licensed electrical company" blocked for unverified tenant');
  assertTest(claimCheckUnverified.blockedReasoning?.includes('COMPLIANCE_BLOCKED') === true, '5.2 Blocked reasoning provided for marketing claim block');

  const claimCheckVerified = maElectricalComplianceService.validateProposedDraftMarketingClaim(
    tenantA, // Tenant A is independently verified!
    'Hi customer, we are a licensed electrical company in Boston. Can we schedule an estimate?'
  );
  assertTest(claimCheckVerified.allowed === true, '5.3 Marketing claim allowed for independently verified tenant');

  // ---------------------------------------------------------------------------
  // Test 6: Tenant Isolation & Privacy Requirements
  // ---------------------------------------------------------------------------
  console.log('\n--- 6. Testing Tenant Isolation & Audit/Evidence Trail ---');
  const profA = maElectricalComplianceService.getComplianceProfile(tenantA);
  const profB = maElectricalComplianceService.getComplianceProfile(tenantB);

  assertTest(profA !== null && profA.tenantId === tenantA, '6.1 Tenant A profile isolated');
  assertTest(profB !== null && profB.tenantId === tenantB, '6.2 Tenant B profile isolated');
  assertTest(profA?.legalBusinessName !== profB?.legalBusinessName, '6.3 Tenant data non-overlapping');

  // Check audit logs
  const auditLogs = db.prepare('SELECT * FROM launch_audit_logs WHERE tenant_id = ?').all(tenantA) as any[];
  assertTest(auditLogs.length > 0 && auditLogs.some(l => l.action === 'ma_compliance_profile_updated'), '6.4 Compliance profile updates recorded in launch_audit_logs');

  // Check evidence graph
  const evidenceItems = db.prepare('SELECT * FROM evidence_items WHERE tenant_id = ?').all(tenantA) as any[];
  assertTest(evidenceItems.length > 0, '6.5 Verification evidence created in evidence_items');

  console.log(`\n================================================================`);
  console.log(` MASSACHUSETTS COMPLIANCE BOUNDARY TESTS PASSED (${passCount}/${testTotal})`);
  console.log(`================================================================\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runMAComplianceBoundaryTests();
}

export { runMAComplianceBoundaryTests };
