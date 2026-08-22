import crypto from 'node:crypto';
import {
  MiniMaxModelId,
  MiniMaxConnectionState,
  MiniMaxJobStatus,
  VideoResolution,
  VideoAspectRatio,
  MiniMaxGenerationMode,
  MiniMaxCreateTaskRequest,
  MiniMaxCreateTaskResponse,
  MiniMaxQueryTaskResponse,
  MiniMaxListTasksResponse,
  MiniMaxContentObject,
  MiniMaxContentRole
} from '../types/miniMaxH3';
import { MiniMaxPromptBuilder } from './minimaxPromptBuilder';

export type HttpTransport = (url: string, init?: RequestInit) => Promise<Response>;

export interface MiniMaxClientOptions {
  apiKey?: string;
  baseUrl?: string;
  transport?: HttpTransport;
  defaultTimeoutMs?: number;
  pollingIntervalMs?: number;
  maxPollingDeadlineMs?: number;
}

export interface VerificationProbeOutcome {
  success: boolean;
  state: MiniMaxConnectionState;
  statusCode: number;
  message: string;
  latencyMs: number;
  fingerprint: string;
}

export interface PollingProgressCallback {
  (status: MiniMaxJobStatus, rawResp: MiniMaxQueryTaskResponse, attempt: number): void;
}

export class MiniMaxH3Client {
  public static readonly DEFAULT_BASE_URL = 'https://api.minimax.io';
  public static readonly MODEL: MiniMaxModelId = 'MiniMax-H3';

  private apiKey: string | null;
  private baseUrl: string;
  private transport: HttpTransport;
  private defaultTimeoutMs: number;
  private pollingIntervalMs: number;
  private maxPollingDeadlineMs: number;

  constructor(options?: MiniMaxClientOptions) {
    this.apiKey = options?.apiKey ?? process.env.MINIMAX_API_KEY ?? null;
    this.baseUrl = (options?.baseUrl ?? MiniMaxH3Client.DEFAULT_BASE_URL).replace(/\/+$/, '');
    this.transport = options?.transport ?? (fetch as HttpTransport);
    this.defaultTimeoutMs = options?.defaultTimeoutMs ?? 15000;
    this.pollingIntervalMs = options?.pollingIntervalMs ?? 2500;
    this.maxPollingDeadlineMs = options?.maxPollingDeadlineMs ?? 300000; // 5 minutes max
  }

  public setApiKey(key: string | null): void {
    this.apiKey = key;
  }

  public getApiKey(): string | null {
    return this.apiKey;
  }

  public getMaskedKeyFingerprint(): string {
    if (!this.apiKey) return 'NO_KEY_CONFIGURED';
    const hash = crypto.createHash('sha256').update(this.apiKey).digest('hex');
    return `sha256:${hash.substring(0, 12)}...`;
  }

  /**
   * Performs an authenticated, non-generation query to verify credentials:
   * GET https://api.minimax.io/v2/query/video_generation?page_num=1&page_size=1
   * Only a genuine 200 response with status_code === 0 produces CONNECTED_VERIFIED.
   */
  public async verifyCredentials(overrideKey?: string): Promise<VerificationProbeOutcome> {
    const key = overrideKey ?? this.apiKey ?? process.env.MINIMAX_API_KEY ?? null;
    const start = Date.now();

    if (!key || !key.trim()) {
      return {
        success: false,
        state: 'DISCONNECTED',
        statusCode: 0,
        message: 'No MINIMAX_API_KEY configured. System operates in DISCONNECTED / DRY_RUN mode.',
        latencyMs: Date.now() - start,
        fingerprint: 'NONE'
      };
    }

    const fingerprint = `sha256:${crypto.createHash('sha256').update(key).digest('hex').substring(0, 12)}`;
    const probeUrl = `${this.baseUrl}/v2/query/video_generation?page_num=1&page_size=1`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.defaultTimeoutMs);

      const res = await this.transport(probeUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${key}`,
          Accept: 'application/json'
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const latencyMs = Date.now() - start;

      if (res.status === 401) {
        return {
          success: false,
          state: 'AUTH_FAILED',
          statusCode: 401,
          message: 'Official MiniMax authentication failed (HTTP 401 Unauthorized). Key is invalid or expired.',
          latencyMs,
          fingerprint
        };
      }

      if (res.status === 402) {
        return {
          success: false,
          state: 'INSUFFICIENT_BALANCE',
          statusCode: 402,
          message: 'Official MiniMax account has insufficient balance or active billing hold (HTTP 402).',
          latencyMs,
          fingerprint
        };
      }

      if (!res.ok) {
        return {
          success: false,
          state: 'CONFIGURED_UNVERIFIED',
          statusCode: res.status,
          message: `Official MiniMax verification returned non-OK status HTTP ${res.status}: ${res.statusText}`,
          latencyMs,
          fingerprint
        };
      }

      const body = (await res.json()) as MiniMaxListTasksResponse;

      if (body.base_resp && body.base_resp.status_code !== 0) {
        const code = body.base_resp.status_code;
        if (code === 1004 || code === 2013) {
          return {
            success: false,
            state: 'AUTH_FAILED',
            statusCode: 401,
            message: `MiniMax authentication error: ${body.base_resp.status_msg} (code ${code})`,
            latencyMs,
            fingerprint
          };
        }
        if (code === 1008) {
          return {
            success: false,
            state: 'INSUFFICIENT_BALANCE',
            statusCode: 402,
            message: `MiniMax balance error: ${body.base_resp.status_msg} (code ${code})`,
            latencyMs,
            fingerprint
          };
        }
        return {
          success: false,
          state: 'CONFIGURED_UNVERIFIED',
          statusCode: res.status,
          message: `MiniMax query error: ${body.base_resp.status_msg} (code ${code})`,
          latencyMs,
          fingerprint
        };
      }

      return {
        success: true,
        state: 'CONNECTED_VERIFIED',
        statusCode: 200,
        message: 'MiniMax H3 Official API key authenticated successfully via list-tasks probe.',
        latencyMs,
        fingerprint
      };
    } catch (err: any) {
      return {
        success: false,
        state: 'CONFIGURED_UNVERIFIED',
        statusCode: 0,
        message: `Network or probe error while contacting MiniMax API: ${err.message || err}`,
        latencyMs: Date.now() - start,
        fingerprint
      };
    }
  }

  /**
   * Submits a truthful video generation request:
   * POST https://api.minimax.io/v2/video_generation
   */
  public async submitVideoGeneration(params: {
    prompt: string;
    durationSeconds: number;
    resolution: VideoResolution;
    aspectRatio: VideoAspectRatio;
    mode: MiniMaxGenerationMode;
    content?: MiniMaxContentObject[];
    firstFrameUrl?: string;
    lastFrameUrl?: string;
    referenceImages?: string[];
    referenceVideos?: string[];
    referenceAudio?: string[];
  }): Promise<{
    taskId: string;
    requestHash: string;
    rawResponse: MiniMaxCreateTaskResponse;
  }> {
    const key = this.apiKey ?? process.env.MINIMAX_API_KEY ?? null;
    if (!key) {
      throw new Error('MINIMAX_API_KEY_REQUIRED: Official API key is missing. Cannot submit paid generation job.');
    }

    // Validation
    const officialRes = MiniMaxPromptBuilder.mapResolutionToApi(params.resolution);
    const duration = Math.max(4, Math.min(15, Math.round(params.durationSeconds || 6)));
    const aspectRatio = MiniMaxPromptBuilder.OFFICIAL_RATIOS.includes(params.aspectRatio)
      ? params.aspectRatio
      : '16:9';

    // Mutual exclusion check
    const hasFirstOrLast = Boolean(params.firstFrameUrl || params.lastFrameUrl);
    const hasRefs = Boolean(
      (params.referenceImages && params.referenceImages.length > 0) ||
      (params.referenceVideos && params.referenceVideos.length > 0) ||
      (params.referenceAudio && params.referenceAudio.length > 0)
    );

    if (hasFirstOrLast && hasRefs) {
      throw new Error('MUTUAL_EXCLUSION_VIOLATION: First/last-frame continuity cannot be combined with reference media in a single MiniMax H3 request.');
    }

    // Build content objects array
    const contentObjects: MiniMaxContentObject[] = params.content ? [...params.content] : [];

    if (contentObjects.length === 0) {
      contentObjects.push({ role: 'text', text: params.prompt });

      if (params.firstFrameUrl) {
        contentObjects.push({ role: 'first_frame', url: params.firstFrameUrl });
      }
      if (params.lastFrameUrl) {
        contentObjects.push({ role: 'last_frame', url: params.lastFrameUrl });
      }
      for (const imgUrl of params.referenceImages || []) {
        contentObjects.push({ role: 'reference_image', url: imgUrl });
      }
      for (const vidUrl of params.referenceVideos || []) {
        contentObjects.push({ role: 'reference_video', url: vidUrl });
      }
      for (const audUrl of params.referenceAudio || []) {
        contentObjects.push({ role: 'reference_audio', url: audUrl });
      }
    }

    const payload: MiniMaxCreateTaskRequest = {
      model: MiniMaxH3Client.MODEL,
      prompt: params.prompt,
      duration,
      resolution: officialRes,
      aspect_ratio: aspectRatio,
      content: contentObjects,
      first_frame_image: params.firstFrameUrl,
      last_frame_image: params.lastFrameUrl,
      reference_images: params.referenceImages,
      reference_videos: params.referenceVideos,
      reference_audio: params.referenceAudio
    };

    const requestHash = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
    const endpoint = `${this.baseUrl}/v2/video_generation`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.defaultTimeoutMs);

    let res: Response;
    try {
      res = await this.transport(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (res.status === 401) {
      throw new Error('MINIMAX_AUTH_ERROR_401: Unauthorized request. The configured MINIMAX_API_KEY was rejected.');
    }
    if (res.status === 402) {
      throw new Error('MINIMAX_BALANCE_ERROR_402: Insufficient balance on MiniMax account.');
    }
    if (res.status === 400 || res.status === 422) {
      const errText = await res.text();
      throw new Error(`MINIMAX_INVALID_REQUEST_${res.status}: ${errText}`);
    }
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`MINIMAX_HTTP_ERROR_${res.status}: ${errText}`);
    }

    const respData = (await res.json()) as MiniMaxCreateTaskResponse;

    if (respData.base_resp && respData.base_resp.status_code !== 0) {
      throw new Error(`MINIMAX_API_ERROR_${respData.base_resp.status_code}: ${respData.base_resp.status_msg}`);
    }

    if (!respData.task_id) {
      throw new Error('MINIMAX_MALFORMED_RESPONSE: MiniMax did not return a valid task_id.');
    }

    return {
      taskId: respData.task_id,
      requestHash,
      rawResponse: respData
    };
  }

  /**
   * Queries the status of an existing task:
   * GET https://api.minimax.io/v2/query/video_generation/{task_id}
   */
  public async queryTaskStatus(taskId: string): Promise<{
    taskId: string;
    status: MiniMaxJobStatus;
    outputUrl?: string;
    fileId?: string;
    errorMessage?: string;
    rawResponse: MiniMaxQueryTaskResponse;
  }> {
    const key = this.apiKey ?? process.env.MINIMAX_API_KEY ?? null;
    if (!key) {
      throw new Error('MINIMAX_API_KEY_REQUIRED: Cannot query MiniMax task without an API key.');
    }

    const endpoint = `${this.baseUrl}/v2/query/video_generation/${encodeURIComponent(taskId)}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.defaultTimeoutMs);

    let res: Response;
    try {
      res = await this.transport(endpoint, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${key}`,
          Accept: 'application/json'
        },
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (res.status === 401) {
      throw new Error('MINIMAX_AUTH_ERROR_401: Unauthorized query request.');
    }
    if (res.status === 402) {
      throw new Error('MINIMAX_BALANCE_ERROR_402: Account balance required.');
    }
    if (res.status === 400 || res.status === 404 || res.status === 422) {
      const errText = await res.text();
      throw new Error(`MINIMAX_TASK_QUERY_ERROR_${res.status}: ${errText}`);
    }
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`MINIMAX_HTTP_ERROR_${res.status}: ${errText}`);
    }

    const respData = (await res.json()) as MiniMaxQueryTaskResponse;

    if (respData.base_resp && respData.base_resp.status_code !== 0) {
      throw new Error(`MINIMAX_QUERY_ERROR_${respData.base_resp.status_code}: ${respData.base_resp.status_msg}`);
    }

    const mappedStatus = this.mapApiStatus(respData.status);
    const outputUrl = respData.content?.url;
    const fileId = respData.file_id || respData.content?.file_id;

    return {
      taskId: respData.task_id || taskId,
      status: mappedStatus,
      outputUrl,
      fileId,
      errorMessage: respData.error_msg,
      rawResponse: respData
    };
  }

  /**
   * Polls asynchronously until generation completes, fails, or times out.
   * Uses exponential backoff with jitter on 429/5xx, and fails fast without retry on 400/401/402/422.
   */
  public async pollTaskUntilCompletion(
    taskId: string,
    onProgress?: PollingProgressCallback
  ): Promise<{
    taskId: string;
    status: MiniMaxJobStatus;
    outputUrl?: string;
    fileId?: string;
    rawResponse?: MiniMaxQueryTaskResponse;
    attempts: number;
    durationMs: number;
  }> {
    const startTime = Date.now();
    let attempt = 0;
    let currentInterval = this.pollingIntervalMs;

    while (true) {
      attempt++;
      const elapsed = Date.now() - startTime;

      if (elapsed > this.maxPollingDeadlineMs) {
        return {
          taskId,
          status: 'TIMEOUT',
          attempts: attempt,
          durationMs: elapsed
        };
      }

      try {
        const queryResult = await this.queryTaskStatus(taskId);

        if (onProgress) {
          onProgress(queryResult.status, queryResult.rawResponse, attempt);
        }

        if (queryResult.status === 'SUCCESS') {
          return {
            taskId,
            status: 'SUCCESS',
            outputUrl: queryResult.outputUrl,
            fileId: queryResult.fileId,
            rawResponse: queryResult.rawResponse,
            attempts: attempt,
            durationMs: Date.now() - startTime
          };
        }

        if (queryResult.status === 'FAILED') {
          return {
            taskId,
            status: 'FAILED',
            rawResponse: queryResult.rawResponse,
            attempts: attempt,
            durationMs: Date.now() - startTime
          };
        }

        if (queryResult.status === 'CANCELLED') {
          return {
            taskId,
            status: 'CANCELLED',
            rawResponse: queryResult.rawResponse,
            attempts: attempt,
            durationMs: Date.now() - startTime
          };
        }

        // Still queued or running - wait for next interval
        await this.sleep(currentInterval);
      } catch (err: any) {
        const errMsg = err.message || String(err);

        // Fail fast immediately on non-retryable errors
        if (
          errMsg.includes('400') ||
          errMsg.includes('401') ||
          errMsg.includes('402') ||
          errMsg.includes('404') ||
          errMsg.includes('422') ||
          errMsg.includes('AUTH_ERROR') ||
          errMsg.includes('BALANCE_ERROR')
        ) {
          throw err;
        }

        // Exponential backoff with jitter on 429 or 5xx / network errors
        const jitter = Math.floor(Math.random() * 500);
        currentInterval = Math.min(30000, Math.floor(currentInterval * 1.5) + jitter);
        await this.sleep(currentInterval);
      }
    }
  }

  /**
   * Safely downloads or streams an output MP4 to verify artifact integrity.
   */
  public async downloadVideoArtifact(videoUrl: string): Promise<{
    buffer: Buffer;
    contentType: string;
    sizeBytes: number;
  }> {
    if (!videoUrl || !videoUrl.startsWith('http')) {
      throw new Error('INVALID_VIDEO_URL: Cannot download artifact from empty or invalid URL.');
    }

    const res = await this.transport(videoUrl, {
      method: 'GET'
    });

    if (!res.ok) {
      throw new Error(`DOWNLOAD_FAILED_HTTP_${res.status}: Failed to fetch video artifact from ${videoUrl}`);
    }

    const arrayBuf = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);
    const contentType = res.headers.get('content-type') || 'video/mp4';

    return {
      buffer,
      contentType,
      sizeBytes: buffer.length
    };
  }

  private mapApiStatus(statusString: string): MiniMaxJobStatus {
    const s = (statusString || '').toLowerCase();
    if (s === 'preparing' || s === 'queueing' || s === 'queued' || s === 'submitted') {
      return 'QUEUED';
    }
    if (s === 'processing' || s === 'running') {
      return 'RUNNING';
    }
    if (s === 'success' || s === 'succeeded' || s === 'completed') {
      return 'SUCCESS';
    }
    if (s === 'fail' || s === 'failed') {
      return 'FAILED';
    }
    if (s === 'cancel' || s === 'cancelled') {
      return 'CANCELLED';
    }
    return 'PROCESSING';
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
