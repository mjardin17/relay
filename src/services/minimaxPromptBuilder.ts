import {
  MiniMaxPromptStructure,
  MiniMaxReferenceAsset,
  MiniMaxGenerationMode,
  VideoResolution,
  VideoAspectRatio
} from '../types/miniMaxH3';

export interface ValidationIssue {
  field: string;
  level: 'ERROR' | 'WARNING';
  message: string;
}

export interface PromptValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  characterCount: number;
  maxCharacters: number;
  totalReferenceFiles: number;
  imageCount: number;
  videoCount: number;
  audioCount: number;
}

export class MiniMaxPromptBuilder {
  public static readonly MAX_PROMPT_CHARS = 2000;
  public static readonly MAX_IMAGES = 9;
  public static readonly MAX_VIDEOS = 3;
  public static readonly MAX_AUDIO = 3;
  public static readonly MAX_TOTAL_FILES = 12;

  /**
   * Composes a structured MiniMax H3 prompt following official GitHub guidance:
   * Subject & Identity, Action & Performance, Environment, Camera, Lighting, Style, Timing, Audio, and Reference Bindings.
   */
  public static composePrompt(structure: MiniMaxPromptStructure): string {
    const sections: string[] = [];

    // 1. Core Visual Narrative & Subject
    if (structure.subjectAndIdentity) {
      sections.push(`[Subject & Identity] ${structure.subjectAndIdentity.trim()}`);
    }

    // 2. Action, Performance & Dynamic Motion
    if (structure.actionAndPerformance) {
      sections.push(`[Action & Motion] ${structure.actionAndPerformance.trim()}`);
    }

    // 3. Environment & Setting
    if (structure.environmentAndSetting) {
      sections.push(`[Environment] ${structure.environmentAndSetting.trim()}`);
    }

    // 4. Cinematography: Camera Movement, Framing & Lens
    const cameraParts: string[] = [];
    if (structure.cameraMovement) cameraParts.push(`Motion: ${structure.cameraMovement.trim()}`);
    if (structure.framingAndLens) cameraParts.push(`Framing/Lens: ${structure.framingAndLens.trim()}`);
    if (cameraParts.length > 0) {
      sections.push(`[Camera & Lens] ${cameraParts.join('; ')}`);
    }

    // 5. Lighting & Visual Style
    const styleParts: string[] = [];
    if (structure.lightingAndAtmosphere) styleParts.push(`Lighting: ${structure.lightingAndAtmosphere.trim()}`);
    if (structure.visualStyle) styleParts.push(`Aesthetic: ${structure.visualStyle.trim()}`);
    if (styleParts.length > 0) {
      sections.push(`[Lighting & Style] ${styleParts.join('; ')}`);
    }

    // 6. Timing & Pacing
    if (structure.timingAndPacing) {
      sections.push(`[Timing] ${structure.timingAndPacing.trim()}`);
    }

    // 7. Native Audio Elements (Synchronized Stereo)
    const audioParts: string[] = [];
    if (structure.dialogue) audioParts.push(`Dialogue: "${structure.dialogue.trim()}"`);
    if (structure.voiceDirection) audioParts.push(`Voice: ${structure.voiceDirection.trim()}`);
    if (structure.soundEffects) audioParts.push(`SFX: ${structure.soundEffects.trim()}`);
    if (structure.ambience) audioParts.push(`Ambience: ${structure.ambience.trim()}`);
    if (structure.musicDirection) audioParts.push(`Music: ${structure.musicDirection.trim()}`);
    if (audioParts.length > 0) {
      sections.push(`[Audio Direction] ${audioParts.join(' | ')}`);
    }

    // 8. Reference File Bindings & Identity Locks
    if (structure.referenceFileBindings && structure.referenceFileBindings.length > 0) {
      sections.push(`[Reference Bindings] ${structure.referenceFileBindings.join('; ')}`);
    }

    // 9. Invariants (Must remain unchanged across shots)
    if (structure.invariantElements && structure.invariantElements.length > 0) {
      sections.push(`[Invariants - Do Not Alter] ${structure.invariantElements.join('; ')}`);
    }

    // 10. Brand & Product Accuracy Notes
    if (structure.brandAccuracyNotes && structure.brandAccuracyNotes.length > 0) {
      sections.push(`[Brand Fidelity] ${structure.brandAccuracyNotes.join('; ')}`);
    }

    // 11. Negative Constraints
    if (structure.negativeConstraints && structure.negativeConstraints.length > 0) {
      sections.push(`[Avoid / Negative Constraints] ${structure.negativeConstraints.join(', ')}`);
    }

    return sections.join('\n\n');
  }

  /**
   * Validates duration, resolution, aspect ratio, prompt length, and reference file limits.
   */
  public static validate(params: {
    prompt: string;
    durationSeconds: number;
    resolution: VideoResolution;
    aspectRatio: VideoAspectRatio;
    mode: MiniMaxGenerationMode;
    references?: MiniMaxReferenceAsset[];
  }): PromptValidationResult {
    const issues: ValidationIssue[] = [];
    const prompt = params.prompt || '';
    const charCount = prompt.length;

    // 1. Prompt Length
    if (!prompt.trim()) {
      issues.push({
        field: 'prompt',
        level: 'ERROR',
        message: 'Prompt cannot be empty.'
      });
    } else if (charCount > this.MAX_PROMPT_CHARS) {
      issues.push({
        field: 'prompt',
        level: 'ERROR',
        message: `Prompt exceeds official limit of ${this.MAX_PROMPT_CHARS} characters (currently ${charCount} chars).`
      });
    }

    // 2. Duration limits (4 - 15 seconds)
    if (params.durationSeconds < 4 || params.durationSeconds > 15) {
      issues.push({
        field: 'durationSeconds',
        level: 'ERROR',
        message: `MiniMax H3 supports output duration from 4 to 15 seconds (requested: ${params.durationSeconds}s). Longer commercials must be split into scene shots.`
      });
    }

    // 3. Resolution
    if (params.resolution !== '768p' && params.resolution !== '2K') {
      issues.push({
        field: 'resolution',
        level: 'ERROR',
        message: `Unsupported resolution '${params.resolution}'. Only '768p' and '2K' are officially supported.`
      });
    }

    // 4. Reference file counts & limits
    const refs = params.references || [];
    const imageCount = refs.filter(r => r.mediaType === 'image').length;
    const videoCount = refs.filter(r => r.mediaType === 'video').length;
    const audioCount = refs.filter(r => r.mediaType === 'audio').length;
    const totalFiles = refs.length;

    if (imageCount > this.MAX_IMAGES) {
      issues.push({
        field: 'references.images',
        level: 'ERROR',
        message: `Exceeds maximum of ${this.MAX_IMAGES} reference images (selected: ${imageCount}).`
      });
    }

    if (videoCount > this.MAX_VIDEOS) {
      issues.push({
        field: 'references.videos',
        level: 'ERROR',
        message: `Exceeds maximum of ${this.MAX_VIDEOS} reference videos (selected: ${videoCount}).`
      });
    }

    if (audioCount > this.MAX_AUDIO) {
      issues.push({
        field: 'references.audio',
        level: 'ERROR',
        message: `Exceeds maximum of ${this.MAX_AUDIO} reference audio files (selected: ${audioCount}).`
      });
    }

    if (totalFiles > this.MAX_TOTAL_FILES) {
      issues.push({
        field: 'references.total',
        level: 'ERROR',
        message: `Exceeds maximum of ${this.MAX_TOTAL_FILES} total reference files (selected: ${totalFiles}).`
      });
    }

    // 5. Mode specific checks
    if (params.mode === 'IMAGE_TO_VIDEO' && imageCount === 0) {
      issues.push({
        field: 'mode',
        level: 'ERROR',
        message: 'IMAGE_TO_VIDEO mode requires at least one first-frame or subject image reference.'
      });
    }

    if (params.mode === 'FIRST_LAST_FRAME_VIDEO' && imageCount < 2) {
      issues.push({
        field: 'mode',
        level: 'ERROR',
        message: 'FIRST_LAST_FRAME_VIDEO mode requires both a first-frame and a last-frame image reference.'
      });
    }

    // 6. Check ownership verification
    const unverified = refs.filter(r => !r.ownershipVerified);
    if (unverified.length > 0) {
      issues.push({
        field: 'ownership',
        level: 'WARNING',
        message: `${unverified.length} reference asset(s) have unconfirmed ownership declarations. User ownership confirmation is recommended before generation.`
      });
    }

    const hasErrors = issues.some(i => i.level === 'ERROR');

    return {
      valid: !hasErrors,
      issues,
      characterCount: charCount,
      maxCharacters: this.MAX_PROMPT_CHARS,
      totalReferenceFiles: totalFiles,
      imageCount,
      videoCount,
      audioCount
    };
  }

  /**
   * Helper to build prompt templates for specific Relay tenants
   */
  public static buildTenantPreset(tenantId: string, shotTitle: string): MiniMaxPromptStructure {
    switch (tenantId) {
      case 'tenant_reis_electric':
      case 'tenant_ma_fresh_launch':
        return {
          subjectAndIdentity: 'Lead Master Electrician wearing high-visibility clean navy workwear with embroidered "Reis Electric" chest patch, safety goggles, and tool belt.',
          actionAndPerformance: 'Carefully inspecting a state-of-the-art residential electrical distribution panel, testing a circuit breaker with an insulated multimeter tool, then turning to camera with a reassuring, professional smile.',
          environmentAndSetting: 'Immaculate, brightly lit modern home mechanical room with clean copper conduit pipe runs and organized wire management.',
          cameraMovement: 'Cinematic slow push-in tracking shot starting at medium shot and resolving into a confident medium close-up.',
          framingAndLens: '50mm anamorphic prime lens, shallow depth of field, crisp focus on tool tips and multimeter digital display.',
          lightingAndAtmosphere: 'High-contrast studio lighting with warm tungsten highlights on copper pipes and clean neutral 5600K key light.',
          visualStyle: 'Premium 4K broadcast commercial cinematography, clean photorealism, professional grade trade commercial.',
          timingAndPacing: 'Steady 6-second pacing with smooth motion ramp.',
          dialogue: 'Safe, certified electrical systems built to outlast the home.',
          voiceDirection: 'Warm, authoritative, trustworthy New England baritone.',
          soundEffects: 'Solid mechanical circuit breaker click, subtle multimeter electronic beep, ambient tool rattle.',
          ambience: 'Gentle low home HVAC hum, crisp acoustic room tone.',
          musicDirection: 'Subtle uplifting acoustic guitar with warm ambient strings.',
          invariantElements: ['Reis Electric logo patch', 'Navy blue uniform', 'Clean copper conduit aesthetic'],
          negativeConstraints: ['No sparks', 'no chaotic wiring', 'no distorted hands or floating tools', 'no cartoonish lighting']
        };

      case 'tenant_jardins_outpost':
        return {
          subjectAndIdentity: 'Digital workshop creator and systems engineer seated at a solid walnut workbench with prototype hardware modules and clean code displays.',
          actionAndPerformance: 'Activating a custom aluminum control switch on the console; holographic telemetry visualizer hums to life on screen as the creator smiles thoughtfully.',
          environmentAndSetting: 'Jardin\'s Outpost inventor studio at dusk, surrounded by brass calipers, vintage analog dials, clean glass screens, and rich amber workshop lighting.',
          cameraMovement: 'Subtle orbiting camera tracking from side profile to three-quarter heroic framing.',
          framingAndLens: '35mm cine lens, f/1.8 aperture, soft anamorphic lens flare from background filament bulbs.',
          lightingAndAtmosphere: 'Deep warm near-black aesthetic with copper rust and emerald green ambient rim lights.',
          visualStyle: 'High-craft cinematic realism, tactile industrial luxury, timeless inventor atelier.',
          timingAndPacing: 'Deliberate 8-second pacing with rhythmic mechanical visual beat.',
          dialogue: 'Built from real problems. Turned into real products.',
          voiceDirection: 'Thoughtful, calm, inventor baritone voiceover.',
          soundEffects: 'Heavy tactile switch click, subtle electronic harmonic chime, gentle desk tap.',
          ambience: 'Quiet evening workshop tone with subtle warm transformer purr.',
          musicDirection: 'Atmospheric analog synth swell layered over gentle orchestral chords.',
          invariantElements: ['Walnut workbench', 'Copper rust color scheme', 'Clean minimalist workspace'],
          negativeConstraints: ['No messy cluttered junk', 'no generic neon lasers', 'no plastic toy aesthetics']
        };

      case 'tenant_bosslister':
        return {
          subjectAndIdentity: 'High-end vintage designer handbag on a rotating minimalist matte-slate pedestal.',
          actionAndPerformance: 'Smooth 360-degree rotation showing pristine stitching, authentic brass hardware engravings, and flawless leather texture.',
          environmentAndSetting: 'High-end luxury commercial studio with soft velvet background and subtle edge reflections.',
          cameraMovement: 'Slow continuous macro orbital dolly with precision focus racking from logo buckle to leather grain.',
          framingAndLens: '85mm macro lens, ultra-shallow depth of field, laser-sharp focus.',
          lightingAndAtmosphere: 'Softbox diffused top lighting with razor-sharp specular rim light accents.',
          visualStyle: 'Ultra-luxury commercial product film, 4K HDR fidelity.',
          timingAndPacing: 'Silky smooth 6-second rotation.',
          soundEffects: 'Gentle luxury zipper slide, soft metallic clasp snap.',
          musicDirection: 'Sophisticated modern lo-fi house beat with muted jazz bass.',
          negativeConstraints: ['No scratches', 'no warped geometry', 'no fuzzy compression artifacts']
        };

      case 'tenant_storyforge':
        return {
          subjectAndIdentity: 'Animated mythic character standing at the precipice of a floating stone citadel.',
          actionAndPerformance: 'Lifting an ancient runic compass toward the twin moons as constellations illuminate in the night sky.',
          environmentAndSetting: 'Epic fantasy sky realm with aurora borealis ribbons and floating obsidian arches.',
          cameraMovement: 'Sweeping dynamic crane shot ascending from low hero angle to wide panoramic vista.',
          framingAndLens: '24mm ultra-wide cine lens, expansive IMAX perspective.',
          lightingAndAtmosphere: 'Bioluminescent cyan and violet starlight with warm torchlight on the character.',
          visualStyle: 'Stylized cinematic CGI, Pixar-meets-Studio-Ghibli visual depth.',
          timingAndPacing: 'Dramatic 10-second epic sweep.',
          soundEffects: 'Runic hum activation, rushing high-altitude wind, mystical celestial resonance.',
          musicDirection: 'Sweeping orchestral fantasy theme with French horns and harp.',
          negativeConstraints: ['No frame stutter', 'no muddy color grading', 'no flickering textures']
        };

      default:
        return {
          subjectAndIdentity: 'Brand ambassador demonstrating product in a pristine modern setting.',
          actionAndPerformance: 'Engaging smoothly with product, showcasing core features with natural confidence.',
          environmentAndSetting: 'Modern architectural space with expansive glass and natural sunlight.',
          cameraMovement: 'Smooth dolly tracking shot at eye level.',
          framingAndLens: '35mm prime lens with natural perspective.',
          lightingAndAtmosphere: 'Soft natural daylight with subtle fill light.',
          visualStyle: 'Crisp contemporary commercial look.',
          timingAndPacing: 'Balanced 6-second flow.',
          dialogue: 'Experience the next generation of capability.',
          voiceDirection: 'Clear, modern, friendly commercial voiceover.',
          soundEffects: 'Subtle clean interaction clicks.',
          musicDirection: 'Upbeat modern ambient score.',
          negativeConstraints: ['No jitter', 'no artificial warping']
        };
    }
  }
}
