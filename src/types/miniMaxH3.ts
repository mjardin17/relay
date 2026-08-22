/**
 * MiniMax H3 Video Generation & Commercial Factory Types
 * Official Model: MiniMax-H3
 * Official Guidance: https://github.com/MiniMax-AI/MiniMax-H3
 * Official API Docs: https://platform.minimax.io/docs/api-reference/video-generation-v2-create
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

/**
 * Honest Connection States for MiniMax H3 Connector:
 * - DISCONNECTED / DRY_RUN: No API key configured
 * - CONFIGURED_UNVERIFIED: Key present in env/settings but unprobed
 * - CONNECTED_VERIFIED: Real authenticated probe returned successful 200 with status_code 0
 * - AUTH_FAILED: Official API returned 401 Unauthorized
 * - INSUFFICIENT_BALANCE: Official API returned 402 Payment Required
 */
export type MiniMaxConnectionState =
  | 'DISCONNECTED'
  | 'CONFIGURED_UNVERIFIED'
  | 'CONNECTED_VERIFIED'
  | 'AUTH_FAILED'
  | 'INSUFFICIENT_BALANCE'
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
  | 'RUNNING'
  | 'SUCCESS'
  | 'FAILED'
  | 'CANCELLED'
  | 'TIMEOUT'
  | 'UNKNOWN';

export type VideoResolution = '768p' | '768P' | '2K';

export type VideoAspectRatio =
  | 'adaptive'
  | '21:9'
  | '16:9'
  | '4:3'
  | '1:1'
  | '3:4'
  | '9:16';

export type MiniMaxRatio =
  | '16:9'
  | '9:16'
  | '1:1'
  | '4:3'
  | '3:4'
  | '21:9';

export type MiniMaxContentRole =
  | 'first_frame'
  | 'last_frame'
  | 'reference_image'
  | 'reference_video'
  | 'reference_audio';

export type MiniMaxTextContent = {
  type: 'text';
  text: string;
};

export type MiniMaxImageContent = {
  type: 'image_url';
  image_url: {
    url: string;
  };
  role: 'first_frame' | 'last_frame' | 'reference_image';
};

export type MiniMaxVideoContent = {
  type: 'video_url';
  video_url: {
    url: string;
  };
  role: 'reference_video';
};

export type MiniMaxAudioContent = {
  type: 'audio_url';
  audio_url: {
    url: string;
  };
  role: 'reference_audio';
};

export type MiniMaxContentItem =
  | MiniMaxTextContent
  | MiniMaxImageContent
  | MiniMaxVideoContent
  | MiniMaxAudioContent;

export interface MiniMaxContentObject {
  type?: 'text' | 'image_url' | 'video_url' | 'audio_url';
  role?: string;
  text?: string;
  url?: string;
  file_id?: string;
  image_url?: { url: string };
  video_url?: { url: string };
  audio_url?: { url: string };
}

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
  baseRate768pPerSec: number;        // $0.08 / output second
  baseRate2KPerSec: number;           // $0.13 / output second
  regen768pTo2KPerSec: number;        // $0.05 / output second
  freeImageReferencesCount: number;   // First 5 images free
  extraImageReferenceCost: number;     // $0.04 per additional image
  audioReferenceCost: number;          // $0.00 (free)
  referenceVideoRate768pPerSec: number; // $0.08 / sec of ref video for 768P output
  referenceVideoRate2KPerSec: number;   // $0.13 / sec of ref video for 2K output
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
  requestHash: string;
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
  retryCount: number;
  idempotencyKey: string;
  auditRef: string;
  submittedAt: string;
  completedAt?: string;
  updatedAt?: string;
}

/**
 * Official MiniMax Video Generation API v2 Schemas
 */
export interface MiniMaxApiBaseResp {
  status_code: number;
  status_msg: string;
}

export interface MiniMaxCreateTaskRequest {
  model: 'MiniMax-H3';
  content: MiniMaxContentItem[];
  ratio: MiniMaxRatio;
  resolution: '768P' | '2K';
  duration: number; // 4 - 15 integer
}

export interface MiniMaxCreateTaskResponse {
  task_id: string;
  base_resp?: MiniMaxApiBaseResp;
}

export interface MiniMaxTaskContent {
  url?: string;
  file_id?: string;
}

export interface MiniMaxTaskError {
  code?: number | string;
  message?: string;
}

export interface MiniMaxTaskUsage {
  duration?: number;
  resolution?: string;
  cost?: number;
}

export interface MiniMaxTaskObject {
  id: string;
  status:
    | 'queued'
    | 'running'
    | 'succeeded'
    | 'failed'
    | 'cancelled'
    | 'Preparing'
    | 'Queueing'
    | 'Processing'
    | 'Success'
    | 'Fail'
    | 'Cancel'
    | string;
  content?: MiniMaxTaskContent;
  error?: MiniMaxTaskError;
  usage?: MiniMaxTaskUsage;
}

export interface MiniMaxQueryTaskResponse {
  task?: MiniMaxTaskObject;
  task_id?: string;
  status?: string;
  file_id?: string;
  content?: MiniMaxTaskContent;
  error_msg?: string;
  base_resp?: MiniMaxApiBaseResp;
}

export interface MiniMaxListTasksResponse {
  items?: Array<{
    id?: string;
    task_id?: string;
    status?: string;
    created_at?: number | string;
    content?: MiniMaxTaskContent;
  }>;
  total?: number;
  tasks?: Array<{
    task_id: string;
    status: string;
    created_at?: number | string;
    file_id?: string;
  }>;
  base_resp?: MiniMaxApiBaseResp;
}
