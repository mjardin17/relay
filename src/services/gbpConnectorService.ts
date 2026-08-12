import { getDatabase } from '../db/database';
import { getGeminiClient } from '../routes/launchProgramApi';
import { LaunchApprovalService, canonicalize } from './launchApprovalService';
import {
  GBPBusinessIntake,
  GBPProfile,
  GBPProfilePlan,
  GBPConnectorStatus,
  GBPPost,
  GBPReview,
  GBPApprovalRecord,
} from '../types/gbpLaunch';

const approvalService = new LaunchApprovalService();

export class GBPConnectorService {
  /**
   * Returns current truthfulness and mode status for GBP integration.
   */
  getConnectorStatus(tenantId: string): GBPConnectorStatus {
    const db = getDatabase();
    
    // Check if OAuth token exists for this tenant
    const row = db.prepare(`
      SELECT google_user_email, access_token, expires_at
      FROM gbp_oauth_tokens
      WHERE tenant_id = ?
    `).get(tenantId) as { google_user_email: string; access_token: string; expires_at: string } | undefined;

    const oauthConnected = !!row && new Date(row.expires_at) > new Date();

    return {
      isSimulation: true,
      mode: 'GUIDED_MANUAL',
      apiApproved: false, // Google Business Profile API production access requires Google Project Audit & Approval
      oauthConnected,
      googleAccountEmail: row?.google_user_email,
      notice: 'Guided/Manual Execution Mode Active for Electrical Company Pilot. Direct API submission is awaiting Google Project OAuth verification.',
      verificationReady: true,
    };
  }

  /**
   * Saves or updates a tenant's business profile intake with private verification address separation.
   */
  saveIntakeProfile(tenantId: string, clientId: string, intake: GBPBusinessIntake): GBPProfile {
    const db = getDatabase();
    const now = new Date().toISOString();

    const existing = db.prepare(`
      SELECT id, verification_state, existing_listing_status, google_location_id, google_account_id, plan_approval_hash
      FROM gbp_profiles
      WHERE tenant_id = ? AND client_id = ?
    `).get(tenantId, clientId) as {
      id: string;
      verification_state: string;
      existing_listing_status: string;
      google_location_id?: string;
      google_account_id?: string;
      plan_approval_hash?: string;
    } | undefined;

    const profileId = existing?.id || `gbp-prof-${Date.now()}`;
    const verificationState = existing?.verification_state || 'info_validated';

    const secondaryCategoriesJson = JSON.stringify(intake.secondaryCategories || []);
    const businessHoursJson = JSON.stringify(intake.businessHours || []);
    const serviceAreasJson = JSON.stringify(intake.serviceAreas || []);
    const servicesOfferedJson = JSON.stringify(intake.servicesOffered || []);
    const photosJson = JSON.stringify(intake.photos || []);

    if (existing) {
      db.prepare(`
        UPDATE gbp_profiles SET
          company_name = ?,
          account_type = ?,
          primary_category = ?,
          secondary_categories_json = ?,
          public_phone = ?,
          website_url = ?,
          business_hours_json = ?,
          service_areas_json = ?,
          services_offered_json = ?,
          description = ?,
          photos_json = ?,
          license_number = ?,
          license_state = ?,
          private_street_address = ?,
          private_unit = ?,
          private_city = ?,
          private_state = ?,
          private_zip = ?,
          verification_state = ?,
          updated_at = ?
        WHERE id = ? AND tenant_id = ?
      `).run(
        intake.companyName,
        intake.accountType,
        intake.primaryCategory,
        secondaryCategoriesJson,
        intake.publicPhone,
        intake.websiteUrl,
        businessHoursJson,
        serviceAreasJson,
        servicesOfferedJson,
        intake.description,
        photosJson,
        intake.licenseNumber || null,
        intake.licenseState || null,
        intake.privateStreetAddress,
        intake.privateUnit || null,
        intake.privateCity,
        intake.privateState,
        intake.privateZip,
        verificationState,
        now,
        profileId,
        tenantId
      );
    } else {
      db.prepare(`
        INSERT INTO gbp_profiles (
          id, tenant_id, client_id, company_name, account_type, existing_listing_status,
          primary_category, secondary_categories_json, public_phone, website_url,
          business_hours_json, service_areas_json, services_offered_json, description,
          photos_json, license_number, license_state, private_street_address, private_unit,
          private_city, private_state, private_zip, verification_method, verification_state,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 'none', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'manual_guided', ?, ?, ?)
      `).run(
        profileId,
        tenantId,
        clientId,
        intake.companyName,
        intake.accountType,
        intake.primaryCategory,
        secondaryCategoriesJson,
        intake.publicPhone,
        intake.websiteUrl,
        businessHoursJson,
        serviceAreasJson,
        servicesOfferedJson,
        intake.description,
        photosJson,
        intake.licenseNumber || null,
        intake.licenseState || null,
        intake.privateStreetAddress,
        intake.privateUnit || null,
        intake.privateCity,
        intake.privateState,
        intake.privateZip,
        verificationState,
        now,
        now
      );
    }

    return this.getProfileById(tenantId, profileId)!;
  }

  /**
   * Retrieves profile record by ID and converts SQLite JSON fields.
   */
  getProfileById(tenantId: string, profileId: string): GBPProfile | null {
    const db = getDatabase();
    const row = db.prepare(`
      SELECT * FROM gbp_profiles WHERE id = ? AND tenant_id = ?
    `).get(profileId, tenantId) as any;

    if (!row) return null;

    return {
      id: row.id,
      tenantId: row.tenant_id,
      clientId: row.client_id,
      companyName: row.company_name,
      accountType: row.account_type,
      existingListingStatus: row.existing_listing_status,
      googleLocationId: row.google_location_id,
      googleAccountId: row.google_account_id,
      primaryCategory: row.primary_category,
      secondaryCategories: JSON.parse(row.secondary_categories_json || '[]'),
      publicPhone: row.public_phone,
      websiteUrl: row.website_url,
      businessHours: JSON.parse(row.business_hours_json || '[]'),
      serviceAreas: JSON.parse(row.service_areas_json || '[]'),
      servicesOffered: JSON.parse(row.services_offered_json || '[]'),
      description: row.description,
      photos: JSON.parse(row.photos_json || '[]'),
      licenseNumber: row.license_number,
      licenseState: row.license_state,
      privateStreetAddress: row.private_street_address,
      privateUnit: row.private_unit,
      privateCity: row.private_city,
      privateState: row.private_state,
      privateZip: row.private_zip,
      verificationMethod: row.verification_method,
      verificationState: row.verification_state,
      planApprovalHash: row.plan_approval_hash,
      verificationCodeSentAt: row.verification_code_sent_at,
      verifiedAt: row.verified_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Performs existing-profile discovery and duplicate checking.
   */
  async checkDuplicatesAndListings(
    tenantId: string,
    profileId: string
  ): Promise<{
    profileId: string;
    existingListingStatus: string;
    possibleDuplicates: {
      title: string;
      address: string;
      phone: string;
      matchConfidence: 'High' | 'Medium' | 'Low';
      recommendation: 'CLAIM_EXISTING' | 'CREATE_NEW_SERVICE_AREA' | 'MERGE_DUPLICATE';
    }[];
    decision: 'CREATE_NEW_SERVICE_AREA' | 'CLAIM_EXISTING';
  }> {
    const profile = this.getProfileById(tenantId, profileId);
    if (!profile) throw new Error('PROFILE_NOT_FOUND');

    const db = getDatabase();

    // Simulated search / discovery check against electrical business profile criteria
    const duplicates = [
      {
        title: `${profile.companyName}`,
        address: `${profile.privateCity}, ${profile.privateState} (Address Hidden)`,
        phone: profile.publicPhone,
        matchConfidence: 'High' as const,
        recommendation: 'CREATE_NEW_SERVICE_AREA' as const,
      },
    ];

    const decision = profile.accountType === 'service_area' ? 'CREATE_NEW_SERVICE_AREA' : 'CLAIM_EXISTING';
    const existingListingStatus = 'none';

    db.prepare(`
      UPDATE gbp_profiles SET existing_listing_status = ?, verification_state = 'duplicate_checked', updated_at = ?
      WHERE id = ? AND tenant_id = ?
    `).run(existingListingStatus, new Date().toISOString(), profileId, tenantId);

    return {
      profileId,
      existingListingStatus,
      possibleDuplicates: duplicates,
      decision,
    };
  }

  /**
   * Generates a policy-compliant Google Business Profile launch plan.
   */
  async generateProfilePlan(tenantId: string, profileId: string): Promise<GBPProfilePlan> {
    const profile = this.getProfileById(tenantId, profileId);
    if (!profile) throw new Error('PROFILE_NOT_FOUND');

    const ai = getGeminiClient();
    const prompt = `Generate a policy-compliant Google Business Profile setup plan for an electrical contractor.
Company Name: ${profile.companyName}
Account Type: ${profile.accountType} (Service Area Business)
Primary Category: ${profile.primaryCategory}
Service Areas: ${profile.serviceAreas.join(', ')}
Services: ${profile.servicesOffered.join(', ')}
City/State: ${profile.privateCity}, ${profile.privateState}

Rules:
1. Electrical contractors operating at customer homes MUST hide street address on Google Maps (Service Area Business policy).
2. Primary category MUST be exact match (e.g. "Electrician").
3. Description must avoid spam keywords or promo text.

Respond with JSON:
{
  "optimizedName": "${profile.companyName}",
  "complianceNotes": ["Hide private physical address from public view", "Set 20-mile service radius"],
  "suggestedPosts": [
    {"type": "offer", "title": "24/7 Emergency Electrical Service", "body": "Licensed electrical repairs, panel upgrades, and generator installations in ${profile.privateCity}."}
  ],
  "verificationGuideSteps": [
    "Owner signs into official Google account",
    "Enter physical verification address (hidden from public)",
    "Request video or postcard verification code from Google",
    "Complete owner-verified confirmation in Google Business Manager"
  ],
  "reviewStrategyNotes": "Automate post-job review requests after panel or EV charger installs."
}`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' },
      });

      const parsed = JSON.parse(response.text || '{}');

      return {
        profileId,
        companyName: profile.companyName,
        accountType: profile.accountType,
        optimizedName: parsed.optimizedName || profile.companyName,
        primaryCategory: profile.primaryCategory,
        secondaryCategories: profile.secondaryCategories,
        complianceNotes: parsed.complianceNotes || [
          'Service Area Business: Hide physical street address from public map pins.',
          'State License metadata attached for consumer trust.',
        ],
        suggestedPosts: parsed.suggestedPosts || [
          {
            type: 'offer',
            title: 'Licensed Panel Upgrade Special',
            body: 'Ensure home safety with 200A electrical service upgrades. Local licensed electricians.',
          },
        ],
        verificationGuideSteps: parsed.verificationGuideSteps || [
          'Owner logs into business Google account',
          'Select Service Area Business model',
          'Input private verification street address',
          'Submit video or postcard verification to Google',
        ],
        reviewStrategyNotes: parsed.reviewStrategyNotes || 'Send review link immediately upon electrical invoice settlement.',
        generatedAt: new Date().toISOString(),
      };
    } catch {
      return {
        profileId,
        companyName: profile.companyName,
        accountType: profile.accountType,
        optimizedName: profile.companyName,
        primaryCategory: profile.primaryCategory,
        secondaryCategories: profile.secondaryCategories,
        complianceNotes: [
          'Service Area Business: Private address kept hidden from public map pin.',
          'Primary category set to Electrician.',
        ],
        suggestedPosts: [
          {
            type: 'offer',
            title: 'Licensed Electrical Emergency Response',
            body: `24/7 Fast response electrical repairs in ${profile.privateCity} and surrounding areas.`,
          },
        ],
        verificationGuideSteps: [
          'Owner signs into official Google account',
          'Select Service Area Business model',
          'Input private street address for verification code',
          'Confirm owner verification status',
        ],
        reviewStrategyNotes: 'Automate post-service review collection.',
        generatedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Records exact human owner approval for profile plan with SHA-256 content hash.
   */
  approveProfilePlan(
    tenantId: string,
    profileId: string,
    approverId: string,
    approverRole: string,
    planPayload: any
  ): { approvalId: string; contentHash: string; approvedAt: string } {
    const db = getDatabase();
    const contentHash = approvalService.computeContentHash(planPayload);
    const approvalId = `gbp-appr-${Date.now()}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO gbp_content_approvals (
        id, tenant_id, gbp_profile_id, content_type, content_payload_json,
        content_hash, approver_id, approver_role, decision, dispatch_status, approved_at, created_at
      ) VALUES (?, ?, ?, 'verification_submission', ?, ?, ?, ?, 'approved', 'dispatched_manual', ?, ?)
    `).run(
      approvalId,
      tenantId,
      profileId,
      JSON.stringify(planPayload),
      contentHash,
      approverId,
      approverRole,
      now,
      now
    );

    db.prepare(`
      UPDATE gbp_profiles SET
        plan_approval_hash = ?,
        verification_state = 'plan_approved',
        updated_at = ?
      WHERE id = ? AND tenant_id = ?
    `).run(contentHash, now, profileId, tenantId);

    return {
      approvalId,
      contentHash,
      approvedAt: now,
    };
  }

  /**
   * Tracks verification status changes (e.g. video, postcard, verified_active).
   */
  updateVerificationStatus(
    tenantId: string,
    profileId: string,
    method: string,
    state: string,
    details?: any
  ): GBPProfile {
    const db = getDatabase();
    const now = new Date().toISOString();

    const verifiedAt = state === 'verified_active' ? now : null;
    const sentAt = state === 'verification_pending' ? now : null;

    db.prepare(`
      UPDATE gbp_profiles SET
        verification_method = ?,
        verification_state = ?,
        verification_code_sent_at = COALESCE(?, verification_code_sent_at),
        verified_at = COALESCE(?, verified_at),
        updated_at = ?
      WHERE id = ? AND tenant_id = ?
    `).run(method, state, sentAt, verifiedAt, now, profileId, tenantId);

    return this.getProfileById(tenantId, profileId)!;
  }
}
