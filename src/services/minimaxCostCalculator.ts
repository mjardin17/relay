import {
  MiniMaxPricingConfig,
  MiniMaxCostEstimate,
  VideoResolution
} from '../types/miniMaxH3';

export const OFFICIAL_MINIMAX_PRICING: MiniMaxPricingConfig = {
  pricingLastVerifiedDate: '2026-08-21',
  baseRate768pPerSec: 0.08,             // $0.08/output second for 768P
  baseRate2KPerSec: 0.13,                // $0.13/output second for 2K
  regen768pTo2KPerSec: 0.05,             // $0.05/output second for regeneration
  freeImageReferencesCount: 5,           // First 5 images free
  extraImageReferenceCost: 0.04,         // $0.04 per additional image
  audioReferenceCost: 0.00,              // Free
  referenceVideoRate768pPerSec: 0.08,    // $0.08/sec of ref video for 768P output
  referenceVideoRate2KPerSec: 0.13,      // $0.13/sec of ref video for 2K output
  officialPricingSource: 'MiniMax Official Pay-As-You-Go Pricing Guide (https://platform.minimax.io/docs/guides/pricing-paygo)'
};

export class MiniMaxCostCalculator {
  /**
   * Calculates detailed cost estimate for MiniMax H3 generation.
   * Transparently accounts for:
   * - Output video duration & resolution ($0.08/s for 768P, $0.13/s for 2K)
   * - Reference images: first 5 free, $0.04 per additional image
   * - Reference video input: $0.08/s for 768P output, $0.13/s for 2K output
   * - Audio references: free
   * - Regeneration from 768P to 2K: $0.05/output second
   */
  public static calculateEstimate(params: {
    durationSeconds: number;
    resolution: VideoResolution;
    imageReferencesCount?: number;
    videoReferencesCount?: number;
    videoReferencesTotalDurationSeconds?: number;
    audioReferencesCount?: number;
    isRegenerationFrom768p?: boolean;
    humanApproved?: boolean;
    approvedBy?: string;
  }): MiniMaxCostEstimate {
    const config = OFFICIAL_MINIMAX_PRICING;
    const duration = Math.max(4, Math.min(15, Math.round(params.durationSeconds || 5)));
    const is2K = params.resolution === '2K';
    const resolution: VideoResolution = is2K ? '2K' : '768p';
    const numImages = Math.max(0, params.imageReferencesCount || 0);
    const numVideos = Math.max(0, params.videoReferencesCount || 0);
    const refVideoDuration = Math.max(0, params.videoReferencesTotalDurationSeconds ?? (numVideos * 5));
    const numAudio = Math.max(0, params.audioReferencesCount || 0);

    // Base generation cost
    let baseRate = is2K ? config.baseRate2KPerSec : config.baseRate768pPerSec;
    let extraImgCost = config.extraImageReferenceCost;
    let videoRefRate = is2K ? config.referenceVideoRate2KPerSec : config.referenceVideoRate768pPerSec;

    if (params.isRegenerationFrom768p && is2K) {
      baseRate = config.regen768pTo2KPerSec; // $0.05 / output sec
      extraImgCost = 0.025;                   // $0.025 per additional image after 5
      videoRefRate = 0.05;                    // $0.05 per sec of reference video
    }
    const baseCost = Number((duration * baseRate).toFixed(4));

    // Image reference cost (first 5 free)
    const chargeableImages = Math.max(0, numImages - config.freeImageReferencesCount);
    const imageReferencesCost = Number((chargeableImages * extraImgCost).toFixed(4));

    // Video reference input cost
    const videoReferencesCost = Number((refVideoDuration * videoRefRate).toFixed(4));

    // Audio reference cost (free)
    const audioReferencesCost = 0.00;

    const totalEstimatedCostUsd = Number(
      (baseCost + imageReferencesCost + videoReferencesCost + audioReferencesCost).toFixed(4)
    );

    const breakdownParts = [
      `Base Output (${duration}s @ ${resolution === '2K' ? '2K' : '768P'}${params.isRegenerationFrom768p ? ' Regen' : ''}): $${baseCost.toFixed(2)} ($${baseRate.toFixed(2)}/s)`,
      numImages > 0
        ? `Image References (${numImages} total, ${Math.min(numImages, config.freeImageReferencesCount)} free, ${chargeableImages} billable @ $${config.extraImageReferenceCost.toFixed(2)}/ea): $${imageReferencesCost.toFixed(2)}`
        : 'Image References: 0 ($0.00)',
      numVideos > 0
        ? `Video References (${numVideos} files, ~${refVideoDuration}s input @ $${videoRefRate.toFixed(2)}/s): $${videoReferencesCost.toFixed(2)}`
        : 'Video References: 0 ($0.00)',
      numAudio > 0
        ? `Audio References (${numAudio} files): $0.00 (Official Free Tier)`
        : 'Audio References: 0 ($0.00)',
      `Total Estimated: $${totalEstimatedCostUsd.toFixed(2)} USD (Pricing verified: ${config.pricingLastVerifiedDate})`
    ];

    return {
      estimatedDurationSeconds: duration,
      resolution,
      baseCost,
      imageReferencesCount: numImages,
      imageReferencesCost,
      videoReferencesCount: numVideos,
      videoReferencesCost,
      audioReferencesCount: numAudio,
      audioReferencesCost,
      totalEstimatedCostUsd,
      isEstimate: true,
      pricingLastVerified: config.pricingLastVerifiedDate,
      requiresHumanApproval: true,
      humanApproved: params.humanApproved || false,
      approvedBy: params.approvedBy,
      approvedAt: params.humanApproved ? new Date().toISOString() : undefined,
      costBreakdownSummary: breakdownParts.join(' | ')
    };
  }

  /**
   * Calculates actual incurred cost from completed task usage evidence or reconciled parameters.
   */
  public static calculateActualCost(params: {
    resolution: VideoResolution;
    usage?: {
      output_duration?: number;
      duration?: number;
      reference_images?: number;
      reference_video_duration?: number;
      reference_audio_duration?: number;
      cost?: number;
    };
    fallbackDurationSeconds?: number;
    fallbackImageCount?: number;
    fallbackVideoDurationSeconds?: number;
    isRegenerationFrom768p?: boolean;
  }): number {
    if (params.usage && typeof params.usage.cost === 'number') {
      return Number(params.usage.cost.toFixed(4));
    }
    const config = OFFICIAL_MINIMAX_PRICING;
    const is2K = params.resolution === '2K';
    const duration = params.usage?.output_duration ?? params.usage?.duration ?? params.fallbackDurationSeconds ?? 5;
    const imageCount = params.usage?.reference_images ?? params.fallbackImageCount ?? 0;
    const videoDuration = params.usage?.reference_video_duration ?? params.fallbackVideoDurationSeconds ?? 0;

    let baseRate = is2K ? config.baseRate2KPerSec : config.baseRate768pPerSec;
    let extraImgCost = config.extraImageReferenceCost;
    let videoRefRate = is2K ? config.referenceVideoRate2KPerSec : config.referenceVideoRate768pPerSec;

    if (params.isRegenerationFrom768p && is2K) {
      baseRate = config.regen768pTo2KPerSec;
      extraImgCost = 0.025;
      videoRefRate = 0.05;
    }

    const baseCost = duration * baseRate;
    const chargeableImages = Math.max(0, imageCount - config.freeImageReferencesCount);
    const imageCost = chargeableImages * extraImgCost;
    const videoCost = videoDuration * videoRefRate;

    return Number((baseCost + imageCost + videoCost).toFixed(4));
  }

  public static getPricingConfig(): MiniMaxPricingConfig {
    return { ...OFFICIAL_MINIMAX_PRICING };
  }
}
