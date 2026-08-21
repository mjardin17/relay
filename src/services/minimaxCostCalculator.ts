import {
  MiniMaxPricingConfig,
  MiniMaxCostEstimate,
  VideoResolution
} from '../types/miniMaxH3';

export const OFFICIAL_MINIMAX_PRICING: MiniMaxPricingConfig = {
  pricingLastVerifiedDate: '2026-08-20',
  baseRate768pPerSec: 0.08,
  baseRate2KPerSec: 0.13,
  regen768pTo2KPerSec: 0.05,
  freeImageReferencesCount: 5,
  extraImageReferenceCost: 0.01,
  audioReferenceCost: 0.00,
  referenceVideoRatePerSec: 0.08,
  officialPricingSource: 'MiniMax Official API Pricing Schedule (Model: MiniMax-H3)'
};

export class MiniMaxCostCalculator {
  /**
   * Calculates detailed cost estimate for MiniMax H3 generation.
   * Recalculates dynamically whenever user alters duration, resolution, or reference files.
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
    const resolution = params.resolution || '768p';
    const numImages = Math.max(0, params.imageReferencesCount || 0);
    const numVideos = Math.max(0, params.videoReferencesCount || 0);
    const refVideoDuration = Math.max(0, params.videoReferencesTotalDurationSeconds || (numVideos * 5));
    const numAudio = Math.max(0, params.audioReferencesCount || 0);

    // Base generation cost
    let baseRate = resolution === '2K' ? config.baseRate2KPerSec : config.baseRate768pPerSec;
    if (params.isRegenerationFrom768p && resolution === '2K') {
      baseRate = config.regen768pTo2KPerSec;
    }
    const baseCost = Number((duration * baseRate).toFixed(4));

    // Image reference cost (first 5 free)
    const chargeableImages = Math.max(0, numImages - config.freeImageReferencesCount);
    const imageReferencesCost = Number((chargeableImages * config.extraImageReferenceCost).toFixed(4));

    // Video reference input cost
    const videoReferencesCost = Number((refVideoDuration * config.referenceVideoRatePerSec).toFixed(4));

    // Audio reference cost (free)
    const audioReferencesCost = 0.00;

    const totalEstimatedCostUsd = Number(
      (baseCost + imageReferencesCost + videoReferencesCost + audioReferencesCost).toFixed(4)
    );

    const breakdown = [
      `Base Video (${duration}s @ ${resolution}): $${baseCost.toFixed(2)} ($${baseRate.toFixed(2)}/s)`,
      numImages > 0
        ? `Image References (${numImages} total, ${Math.min(numImages, 5)} free, ${chargeableImages} billable): $${imageReferencesCost.toFixed(2)}`
        : 'Image References: 0 ($0.00)',
      numVideos > 0
        ? `Video References (${numVideos} files, ~${refVideoDuration}s total): $${videoReferencesCost.toFixed(2)}`
        : 'Video References: 0 ($0.00)',
      numAudio > 0
        ? `Audio References (${numAudio} files): $0.00 (Official Free Tier)`
        : 'Audio References: 0 ($0.00)',
      `Total Estimated: $${totalEstimatedCostUsd.toFixed(2)} USD (Pricing verified: ${config.pricingLastVerifiedDate})`
    ].join(' | ');

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
      costBreakdownSummary: breakdown
    };
  }

  public static getPricingConfig(): MiniMaxPricingConfig {
    return { ...OFFICIAL_MINIMAX_PRICING };
  }
}
