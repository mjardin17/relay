/**
 * MiniMax H3 Video Generation & Commercial Factory Types
 * Official Model: MiniMax-H3
 * Official Guidance: https://github.com/MiniMax-AI/MiniMax-H3
 */

export type MiniMaxModelId = 'MiniMax-H3';

export type MiniMaxGenerationMode =
  | 'TEXT_TO_VIDEO'
  | 'IMAGE_TO_VIDEO'
  | 'LAST_FRAME_VIDEO'
  | 'FIRST_LAST_FRAME_VIDEO'
  | 'MULTIMODAL_REFERENCE'
  | 'VIDEO_EDITING';

export type MiniMaxConnectorMode =
  | 'MANUAL_TRIAL'
  | 'OFFICIAL_API';

export type MiniMaxConnectionState =
  | 'MANUAL_TRIAL_AVAILABLE'
  | 'API_NOT_CONFIGURED'
  | 'API_CONFIGURED'
  | 'AUTHENTICATION_VERIFIED'
  | 'GENERATION_APPROVED'
  | 'GENERATION_RUNNING'
  | 'GENERATION_SUCCEEDED'
  | 'GENERATION_FAILED';

export type MiniMaxJobStatus =
  | 'QUEUED'
  | 'PROCESSING'
  | 'SUCCESS'
  | 'FAILED'
  | 'CANCELLED'
  | 'TIMEOUT'
  | 'UNKNOWN';

export type VideoResolution = '768p' | '2K';
export type VideoAspectRatio = '16:9' | '9:16' | '1:1' | 'adaptive';

export type ReferenceAssetCategory =
  | 'character_face'
  | 'character_turnaround'
  | 'wardrobe'
  | 'product_photo'
  | 'brand_logo'
  | 'location_environment'
  | 'first_frame'
  | 'last_frame'
  | 'camera_motion_ref'
  | 'style_reference'
  | 'voice_sample'
  | 'music_track'
  | 'sound_effect';

export interface MiniMaxReferenceAsset {
  id: string;
  tenantId: string;
  category: ReferenceAssetCategory;
  name: string;
  mediaType: 'image' | 'video' | 'audio';
  url: string;
  mimeType: string;
  fileSizeBytes: number;
  durationSeconds?: number;
  dimensions?: {
    width: number;
    height: number;
  };
  ownershipVerified: boolean;
  ownershipDeclaration: string;
  bindingRole: string; // e.g. "Lead Electrician - John", "Product Hero - Portable Battery"
  tags: string[];
  createdAt: string;
}

export interface MiniMaxPromptStructure {
  subjectAndIdentity: string;
  actionAndPerformance: string;
  environmentAndSetting: string;
  cameraMovement: string;
  framingAndLens: string;
  lightingAndAtmosphere: string;
  visualStyle: string;
  timingAndPacing: string;
  dialogue?: string;
  voiceDirection?: string;
  soundEffects?: string;
  ambience?: string;
  musicDirection?: string;
  referenceFileBindings?: string[];
  invariantElements?: string[];
  negativeConstraints?: string[];
  brandAccuracyNotes?: string[];
}

export interface MiniMaxPricingConfig {
  pricingLastVerifiedDate: string;
  baseRate768pPerSec: number;     // $0.08
  baseRate2KPerSec: number;        // $0.13
  regen768pTo2KPerSec: number;     // $0.05
  freeImageReferencesCount: number; // First 5 images free
  extraImageReferenceCost: number;  // $0.01 per additional image
  audioReferenceCost: number;       // $0.00 (free)
  referenceVideoRatePerSec: number; // $0.08 / sec of ref video
  officialPricingSource: string;
}

export interface MiniMaxCostEstimate {
  estimatedDurationSeconds: number;
  resolution: VideoResolution;
  baseCost: number;
  imageReferencesCount: number;
  imageReferencesCost: number;
  videoReferencesCount: number;
  videoReferencesCost: number;
  audioReferencesCount: number;
  audioReferencesCost: number;
  totalEstimatedCostUsd: number;
  isEstimate: boolean;
  pricingLastVerified: string;
  requiresHumanApproval: boolean;
  humanApproved: boolean;
  approvedBy?: string;
  approvedAt?: string;
  costBreakdownSummary: string;
}

export interface MiniMaxManualTrialPackage {
  packageId: string;
  tenantId: string;
  sceneTitle: string;
  generationMode: MiniMaxGenerationMode;
  targetDurationSeconds: number;
  targetResolution: VideoResolution;
  targetAspectRatio: VideoAspectRatio;
  optimizedPrompt: string;
  structuredPrompt: MiniMaxPromptStructure;
  referenceUploadChecklist: Array<{
    order: number;
    category: ReferenceAssetCategory;
    assetName: string;
    assetType: 'image' | 'video' | 'audio';
    assetUrl: string;
    instructions: string;
  }>;
  officialTrialUrl: string; // https://hailuoai.video/
  officialGithubDocsUrl: string; // https://github.com/MiniMax-AI/MiniMax-H3
  disclaimers: string[];
  createdAt: string;
}

export interface CommercialContinuityManifest {
  manifestId: string;
  tenantId: string;
  brandName: string;
  leadCharacterIdentity: string;
  characterWardrobe: string;
  brandPaletteTokens: string[];
  productAppearance: string;
  keyEnvironment: string;
  lightingTone: string;
  audioVoiceIdentity: string;
  soundscapeStyle: string;
  lockedAssets: Array<{
    role: string;
    assetId: string;
    assetUrl: string;
  }>;
  notes: string;
}

export interface CommercialSceneShot {
  shotId: string;
  sceneNumber: number;
  shotNumber: number;
  title: string;
  storyboardDescription: string;
  durationSeconds: number; // 4 - 15 seconds
  resolution: VideoResolution;
  aspectRatio: VideoAspectRatio;
  mode: MiniMaxGenerationMode;
  promptStructure: MiniMaxPromptStructure;
  composedPrompt: string;
  firstFrameAssetId?: string;
  lastFrameAssetId?: string;
  selectedReferenceAssetIds: string[];
  status: 'DRAFT' | 'TRIAL_READY' | 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'IMPORTED' | 'FAILED';
  generatedVideoUrl?: string;
  importedVideoUrl?: string;
  trialPackage?: MiniMaxManualTrialPackage;
  costEstimate: MiniMaxCostEstimate;
  jobId?: string;
  lastAuditRef?: string;
}

export interface CommercialFactoryProject {
  id: string;
  tenantId: string;
  title: string;
  commercialType: '30s_Commercial' | '15s_Spot' | '60s_BrandStory' | 'Social_Reel' | 'Product_Showcase';
  totalDurationSeconds: number;
  brandVoice: string;
  targetAudience: string;
  conceptBrief: string;
  continuityManifest: CommercialContinuityManifest;
  shots: CommercialSceneShot[];
  selectedProvider: 'MINIMAX_H3' | 'RELAY_NATIVE' | 'GOOGLE_AI_STUDIO' | 'LOVABLE';
  connectorMode: MiniMaxConnectorMode;
  overallStatus: 'PLANNING' | 'IN_PRODUCTION' | 'ASSEMBLED' | 'APPROVED' | 'PUBLISHED';
  assembledVideoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MiniMaxGenerationJobRecord {
  id: string;
  tenantId: string;
  projectId?: string;
  shotId?: string;
  model: MiniMaxModelId;
  generationMode: MiniMaxGenerationMode;
  connectorMode: MiniMaxConnectorMode;
  status: MiniMaxJobStatus;
  externalTaskId?: string;
  prompt: string;
  durationSeconds: number;
  resolution: VideoResolution;
  aspectRatio: VideoAspectRatio;
  referenceAssetCount: number;
  costEstimateUsd: number;
  actualCostIncurredUsd: number;
  humanApproved: boolean;
  approvedBy?: string;
  outputVideoUrl?: string;
  temporaryProviderUrl?: string;
  errorMessage?: string;
  idempotencyKey: string;
  auditRef: string;
  submittedAt: string;
  completedAt?: string;
}
