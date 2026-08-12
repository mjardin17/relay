export type GBPAccountType = 'storefront' | 'service_area';

export type GBPListingStatus = 'none' | 'found_duplicate' | 'claimed' | 'unclaimed';

export type GBPVerificationMethod = 'postcard' | 'phone' | 'video' | 'email' | 'manual_guided';

export type GBPVerificationState =
  | 'not_started'
  | 'info_validated'
  | 'duplicate_checked'
  | 'plan_approved'
  | 'verification_requested'
  | 'verification_pending'
  | 'verified_active'
  | 'suspended'
  | 'action_required';

export interface GBPBusinessIntake {
  companyName: string;
  accountType: GBPAccountType;
  primaryCategory: string;
  secondaryCategories: string[];
  publicPhone: string;
  websiteUrl: string;
  businessHours: {
    day: string;
    open: string;
    close: string;
    closed?: boolean;
  }[];
  serviceAreas: string[];
  servicesOffered: string[];
  description: string;
  photos: {
    type: 'logo' | 'cover' | 'work_sample' | 'team';
    url: string;
    caption: string;
  }[];
  licenseNumber?: string;
  licenseState?: string;
  
  // Private verification address (Strictly separated from public profile)
  privateStreetAddress: string;
  privateUnit?: string;
  privateCity: string;
  privateState: string;
  privateZip: string;
}

export interface GBPProfile extends GBPBusinessIntake {
  id: string;
  tenantId: string;
  clientId: string; // e.g. electrical company ID
  existingListingStatus: GBPListingStatus;
  googleLocationId?: string;
  googleAccountId?: string;
  verificationMethod: GBPVerificationMethod;
  verificationState: GBPVerificationState;
  verificationCodeSentAt?: string;
  verifiedAt?: string;
  planApprovalHash?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GBPProfilePlan {
  profileId: string;
  companyName: string;
  accountType: GBPAccountType;
  optimizedName: string;
  primaryCategory: string;
  secondaryCategories: string[];
  complianceNotes: string[];
  suggestedPosts: {
    type: 'offer' | 'update';
    title: string;
    body: string;
  }[];
  verificationGuideSteps: string[];
  reviewStrategyNotes: string;
  generatedAt: string;
}

export interface GBPOAuthToken {
  tenantId: string;
  clientId: string;
  googleUserEmail: string;
  googleUserId?: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt: string;
  scope: string;
  tokenType: string;
  createdAt: string;
  updatedAt: string;
}

export interface GBPApprovalRecord {
  id: string;
  tenantId: string;
  gbpProfileId: string;
  contentType: 'profile_update' | 'post' | 'review_reply' | 'verification_submission';
  contentPayload: any;
  contentHash: string; // SHA-256
  approverId: string;
  approverRole: string;
  decision: 'pending' | 'approved' | 'rejected';
  dispatchStatus: 'pending' | 'dispatched_manual' | 'dispatched_api' | 'tamper_blocked' | 'failed';
  dispatchedAt?: string;
  approvedAt?: string;
  createdAt: string;
}

export interface GBPPost {
  id: string;
  tenantId: string;
  gbpProfileId: string;
  postType: 'standard' | 'offer' | 'event';
  summary: string;
  callToAction?: {
    actionType: 'BOOK' | 'ORDER' | 'LEARN_MORE' | 'CALL';
    url?: string;
  };
  mediaUrl?: string;
  approvalId?: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'published_manual' | 'published_api';
  googlePostId?: string;
  publishedAt?: string;
  createdAt: string;
}

export interface GBPReview {
  id: string;
  tenantId: string;
  gbpProfileId: string;
  googleReviewId: string;
  reviewerName: string;
  starRating: number;
  comment: string;
  reviewDate: string;
  responseDraft?: string;
  responseApprovalId?: string;
  responseStatus: 'unanswered' | 'draft_generated' | 'pending_approval' | 'approved' | 'replied_manual' | 'replied_api';
  repliedAt?: string;
  createdAt: string;
}

export interface GBPConnectorStatus {
  isSimulation: boolean;
  mode: 'GUIDED_MANUAL' | 'LIVE_API';
  apiApproved: boolean;
  oauthConnected: boolean;
  googleAccountEmail?: string;
  notice: string;
  verificationReady: boolean;
}
