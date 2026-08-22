import { describe, it } from 'node:test';
import assert from 'node:assert';
import { MiniMaxCostCalculator, OFFICIAL_MINIMAX_PRICING } from '../services/minimaxCostCalculator';
import { MiniMaxPromptBuilder } from '../services/minimaxPromptBuilder';
import { MiniMaxH3Client, HttpTransport } from '../services/minimaxH3Client';
import { MiniMaxH3CreativeProvider } from '../services/providers/miniMaxH3CreativeProvider';
import { CommercialFactoryService } from '../services/commercialFactoryService';

function mockJsonResponse(data: any, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

describe('MiniMax H3 & Commercial Factory Integration Suite', () => {

  // =========================================================================
  // 1. Pricing Engine & Official Pay-As-You-Go Math
  // =========================================================================
  describe('1. MiniMax Cost Calculator & Pricing Integrity', () => {
    it('calculates exact 768p base rate ($0.08/sec) for a 6-second shot', () => {
      const estimate = MiniMaxCostCalculator.calculateEstimate({
        durationSeconds: 6,
        resolution: '768p'
      });

      assert.strictEqual(estimate.estimatedDurationSeconds, 6);
      assert.strictEqual(estimate.resolution, '768p');
      assert.strictEqual(estimate.baseCost, 0.48); // 6 * 0.08
      assert.strictEqual(estimate.totalEstimatedCostUsd, 0.48);
      assert.strictEqual(estimate.requiresHumanApproval, true);
    });

    it('calculates exact 2K base rate ($0.13/sec) for a 10-second shot', () => {
      const estimate = MiniMaxCostCalculator.calculateEstimate({
        durationSeconds: 10,
        resolution: '2K'
      });

      assert.strictEqual(estimate.baseCost, 1.30); // 10 * 0.13
      assert.strictEqual(estimate.totalEstimatedCostUsd, 1.30);
    });

    it('includes reference image, video, and audio reference calculations correctly', () => {
      // 6 images (first 5 free, 1 billable @ $0.04)
      // 1 video of 5s @ $0.08/s = $0.40
      // Audio = $0.00
      const estimate = MiniMaxCostCalculator.calculateEstimate({
        durationSeconds: 6,
        resolution: '768p',
        imageReferencesCount: 6,
        videoReferencesCount: 1,
        videoReferencesTotalDurationSeconds: 5,
        audioReferencesCount: 1
      });

      // Base: 6 * $0.08 = $0.48
      // Image: $0.04
      // Video: $0.40
      // Audio: $0.00
      // Total: 0.48 + 0.04 + 0.40 = 0.92
      assert.strictEqual(estimate.baseCost, 0.48);
      assert.strictEqual(estimate.imageReferencesCost, 0.04);
      assert.strictEqual(estimate.videoReferencesCost, 0.40);
      assert.strictEqual(estimate.audioReferencesCost, 0.00);
      assert.strictEqual(estimate.totalEstimatedCostUsd, 0.92);
    });

    it('applies regeneration rate ($0.05/sec) when upgrading 768p draft to 2K final', () => {
      const estimate = MiniMaxCostCalculator.calculateEstimate({
        durationSeconds: 6,
        resolution: '2K',
        isRegenerationFrom768p: true
      });

      // 6s * $0.05/s = $0.30
      assert.strictEqual(estimate.baseCost, 0.30);
      assert.strictEqual(estimate.totalEstimatedCostUsd, 0.30);
    });
  });

  // =========================================================================
  // 2. Prompt Builder & Mutual Exclusion Validation
  // =========================================================================
  describe('2. MiniMax Prompt Builder & Strict API Constraints', () => {
    it('composes structured prompts with camera, subject, action, lighting, and audio direction', () => {
      const structure = MiniMaxPromptBuilder.buildTenantPreset('tenant_reis_electric', 'Panel Installation');
      structure.actionAndPerformance = 'Master electrician tests switch and verifies circuit voltage.';
      const composed = MiniMaxPromptBuilder.composePrompt(structure);

      assert.ok(composed.includes('Reis Electric'));
      assert.ok(composed.includes('Master electrician'));
      assert.ok(composed.length > 50);
      assert.ok(composed.length <= 2000);
    });

    it('rejects prompts longer than 2000 characters', () => {
      const longPrompt = 'A'.repeat(2005);
      const validation = MiniMaxPromptBuilder.validate({
        prompt: longPrompt,
        durationSeconds: 6,
        resolution: '768p',
        aspectRatio: '16:9',
        mode: 'TEXT_TO_VIDEO'
      });

      assert.strictEqual(validation.valid, false);
      assert.ok(validation.issues.some(e => e.message.includes('2000')));
    });

    it('enforces strict mutual exclusion between frame inputs and reference assets', () => {
      // Sending firstFrameUrl together with reference image must fail validation per official MiniMax rules
      const validation = MiniMaxPromptBuilder.validate({
        prompt: 'A cinematic panning shot.',
        durationSeconds: 6,
        resolution: '768p',
        aspectRatio: '16:9',
        mode: 'IMAGE_TO_VIDEO',
        firstFrameUrl: 'https://images.example.com/first_frame.jpg',
        references: [
          {
            id: 'ref_1',
            tenantId: 'tenant_1',
            category: 'character_face',
            name: 'Actor Portrait',
            mediaType: 'image',
            url: 'https://images.example.com/actor.jpg',
            mimeType: 'image/jpeg',
            fileSizeBytes: 1000,
            ownershipVerified: true,
            ownershipDeclaration: 'Owned',
            bindingRole: 'Actor',
            tags: [],
            createdAt: new Date().toISOString()
          }
        ]
      });

      assert.strictEqual(validation.valid, false);
      assert.ok(validation.issues.some(e => e.message.includes('Mutual Exclusion') || e.message.includes('cannot be combined')));
    });

    it('validates supported aspect ratios', () => {
      const validAspects = ['16:9', '9:16', '1:1', '4:3', '3:4', '21:9'];
      for (const ratio of validAspects) {
        const v = MiniMaxPromptBuilder.validate({
          prompt: 'Clean shot',
          durationSeconds: 6,
          resolution: '768p',
          aspectRatio: ratio as any,
          mode: 'TEXT_TO_VIDEO'
        });
        assert.strictEqual(v.valid, true, `Aspect ratio ${ratio} must be valid`);
      }

      const invalid = MiniMaxPromptBuilder.validate({
        prompt: 'Clean shot',
        durationSeconds: 6,
        resolution: '768p',
        aspectRatio: '5:4' as any,
        mode: 'TEXT_TO_VIDEO'
      });
      assert.strictEqual(invalid.valid, false);
    });
  });

  // =========================================================================
  // 3. MiniMax H3 API Client with Mock HTTP Transport (No Paid Live Calls)
  // =========================================================================
  describe('3. MiniMax H3 API Client with Injected HTTP Transport', () => {
    it('verifies credentials against non-generation query probe (HTTP 200 -> CONNECTED_VERIFIED)', async () => {
      const mockTransport: HttpTransport = async (url, options) => {
        assert.ok(url.includes('/v2/query/video_generation'));
        assert.strictEqual(options?.method, 'GET');
        const headers = options?.headers as Record<string, string>;
        assert.strictEqual(headers['Authorization'], 'Bearer valid_test_key_12345');

        return mockJsonResponse({
          base_resp: { status_code: 0, status_msg: 'success' },
          tasks: []
        }, 200);
      };

      const client = new MiniMaxH3Client({
        apiKey: 'valid_test_key_12345',
        transport: mockTransport
      });

      const probe = await client.verifyCredentials();
      assert.strictEqual(probe.success, true);
      assert.strictEqual(probe.state, 'CONNECTED_VERIFIED');
      assert.strictEqual(probe.statusCode, 200);
      assert.ok(probe.fingerprint.startsWith('sha256:'));
    });

    it('fails verification on HTTP 401 unauthorized (never trusts key length alone)', async () => {
      const mockTransport: HttpTransport = async () => {
        return mockJsonResponse({
          base_resp: { status_code: 1004, status_msg: 'Invalid API Key' }
        }, 401);
      };

      const client = new MiniMaxH3Client({
        apiKey: 'some_fake_key_that_is_long_enough_to_fool_bad_checks_12345',
        transport: mockTransport
      });

      const probe = await client.verifyCredentials();
      assert.strictEqual(probe.success, false);
      assert.strictEqual(probe.state, 'AUTH_FAILED');
      assert.strictEqual(probe.statusCode, 401);
    });

    it('fails verification on HTTP 402 / balance exhausted', async () => {
      const mockTransport: HttpTransport = async () => {
        return mockJsonResponse({
          base_resp: { status_code: 1008, status_msg: 'Insufficient account balance' }
        }, 402);
      };

      const client = new MiniMaxH3Client({
        apiKey: 'unfunded_key_12345',
        transport: mockTransport
      });

      const probe = await client.verifyCredentials();
      assert.strictEqual(probe.success, false);
      assert.strictEqual(probe.state, 'INSUFFICIENT_BALANCE');
      assert.strictEqual(probe.statusCode, 402);
    });

    it('submits video generation using official V2 discriminated content contract', async () => {
      let submittedBody: any = null;

      const mockTransport: HttpTransport = async (url, options) => {
        if (url.includes('/v2/video_generation')) {
          submittedBody = JSON.parse(options?.body as string);
          return mockJsonResponse({
            base_resp: { status_code: 0, status_msg: 'success' },
            task_id: 'minimax_task_987654321'
          }, 200);
        }
        throw new Error(`Unexpected URL: ${url}`);
      };

      const client = new MiniMaxH3Client({
        apiKey: 'valid_test_key_12345',
        transport: mockTransport
      });

      const result = await client.submitVideoGeneration({
        prompt: 'A hero commercial shot of an electrical distribution hub.',
        durationSeconds: 6,
        resolution: '768p',
        aspectRatio: '16:9',
        mode: 'TEXT_TO_VIDEO',
        referenceImages: ['https://images.example.com/ref1.jpg']
      });

      assert.strictEqual(result.taskId, 'minimax_task_987654321');
      assert.ok(result.requestHash);
      assert.strictEqual(submittedBody.model, 'MiniMax-H3');
      assert.strictEqual(submittedBody.duration, 6);
      assert.strictEqual(submittedBody.resolution, '768P');
      assert.strictEqual(submittedBody.ratio, '16:9');
      assert.ok(Array.isArray(submittedBody.content));
      assert.strictEqual(submittedBody.content[0].type, 'text');
      assert.strictEqual(submittedBody.content[0].text, 'A hero commercial shot of an electrical distribution hub.');
      assert.strictEqual(submittedBody.content[1].type, 'image_url');
      assert.strictEqual(submittedBody.content[1].image_url.url, 'https://images.example.com/ref1.jpg');
    });

    it('queries task status and maps official statuses (Preparing/Processing/Success/Fail)', async () => {
      const mockTransport: HttpTransport = async (url) => {
        if (url.includes('task_processing')) {
          return mockJsonResponse({
            base_resp: { status_code: 0, status_msg: 'success' },
            status: 'Processing'
          }, 200);
        }
        if (url.includes('task_success')) {
          return mockJsonResponse({
            base_resp: { status_code: 0, status_msg: 'success' },
            status: 'Success',
            file_id: 'file_12345',
            content: {
              url: 'https://cdn.minimax.io/artifacts/video_12345.mp4'
            }
          }, 200);
        }
        throw new Error(`Unknown task ID in url: ${url}`);
      };

      const client = new MiniMaxH3Client({
        apiKey: 'valid_test_key',
        transport: mockTransport
      });

      const procResult = await client.queryTaskStatus('task_processing');
      assert.strictEqual(procResult.status, 'RUNNING');

      const succResult = await client.queryTaskStatus('task_success');
      assert.strictEqual(succResult.status, 'SUCCESS');
      assert.strictEqual(succResult.fileId, 'file_12345');
      assert.strictEqual(succResult.outputUrl, 'https://cdn.minimax.io/artifacts/video_12345.mp4');
    });
  });

  // =========================================================================
  // 4. Creative Provider Router & Manual Trial Truthfulness
  // =========================================================================
  describe('4. MiniMax H3 Creative Provider & Truthful Availability', () => {
    it('reports truthful manual trial availability with zero claimed automated API units', async () => {
      const provider = new MiniMaxH3CreativeProvider();
      const quota = await provider.checkFreeQuota();

      // Must never claim infinite free units or automated free execution
      assert.strictEqual(quota.freeUnitsRemaining, 0);
      assert.strictEqual(quota.isPaidOnly, true);
      assert.ok(quota.costWarning?.includes('Manual browser handoff causes no Relay API charge'));
    });

    it('creates a manual trial package with clear disclaimers and structured prompts', () => {
      const provider = new MiniMaxH3CreativeProvider();
      const pkg = provider.createManualTrialPackage({
        tenantId: 'tenant_reis_electric',
        sceneTitle: 'Safety Inspection',
        durationSeconds: 6,
        resolution: '768p'
      });

      assert.ok(pkg.packageId.startsWith('pkg_trial_'));
      assert.strictEqual(pkg.targetDurationSeconds, 6);
      assert.strictEqual(pkg.targetResolution, '768p');
      assert.ok(pkg.disclaimers.some(d => d.includes('Manual browser handoff causes no Relay API charge')));
      assert.ok(pkg.disclaimers.some(d => d.includes('Relay never submits payments')));
    });
  });

  // =========================================================================
  // 5. Commercial Factory Service & SQLite Persistence
  // =========================================================================
  describe('5. Commercial Factory Service & SQLite Persistence', () => {
    const mockTransport: HttpTransport = async (url) => {
      if (url.includes('task_persisted_test_123')) {
        return mockJsonResponse({
          base_resp: { status_code: 0, status_msg: 'success' },
          status: 'Success',
          content: {
            url: 'https://cdn.minimax.io/output/persisted_test.mp4'
          }
        }, 200);
      }
      if (url.includes('/v2/video_generation')) {
        return mockJsonResponse({
          base_resp: { status_code: 0, status_msg: 'success' },
          task_id: 'task_persisted_test_123'
        }, 200);
      }
      if (url.includes('/v2/query/video_generation')) {
        return mockJsonResponse({
          base_resp: { status_code: 0, status_msg: 'success' },
          tasks: []
        }, 200);
      }
      throw new Error(`Unhandled URL: ${url}`);
    };

    it('persists commercial projects in SQLite database', () => {
      const service = CommercialFactoryService.getInstance({ transport: mockTransport });
      const project = service.createProject({
        tenantId: 'tenant_jardins_outpost',
        title: 'Atelier Workshop Story — 15s Spot',
        commercialType: '15s_Spot',
        brandVoice: 'Craftsmanship, technical clarity, elegant workshop aesthetic.',
        targetAudience: 'Engineers, builders, and software designers.',
        conceptBrief: 'Showcasing the precision mechanical tools and digital interfaces at Jardin\'s Outpost.'
      });

      assert.ok(project.id.startsWith('proj_'));
      assert.strictEqual(project.shots.length, 3);

      // Verify persistence in SQLite
      const fetched = service.getProject(project.id);
      assert.ok(fetched);
      assert.strictEqual(fetched?.title, 'Atelier Workshop Story — 15s Spot');
      assert.strictEqual(fetched?.shots.length, 3);
    });

    it('persists reference assets and retrieves them by tenant', () => {
      const service = CommercialFactoryService.getInstance({ transport: mockTransport });
      const asset = service.registerReferenceAsset({
        tenantId: 'tenant_jardins_outpost',
        category: 'tool_specimen',
        name: 'Precision Digital Caliper',
        mediaType: 'image',
        url: 'https://images.example.com/caliper.jpg',
        ownershipDeclaration: 'Inventor photography.',
        bindingRole: 'Hero Measurement Tool'
      });

      assert.ok(asset.id.startsWith('asset_'));

      const assets = service.listReferenceAssets('tenant_jardins_outpost');
      const found = assets.find(a => a.id === asset.id);
      assert.ok(found);
      assert.strictEqual(found?.name, 'Precision Digital Caliper');
    });

    it('submits API job with human approval and persists job in SQLite', async () => {
      const service = CommercialFactoryService.getInstance({ transport: mockTransport });
      service.setApiKey('test_valid_key_for_submission');
      await service.getProvider().verifyApiKey('test_valid_key_for_submission');

      const project = service.createProject({
        tenantId: 'tenant_reis_electric',
        title: 'Panel Commercial Test',
        commercialType: '15s_Spot',
        brandVoice: 'Authoritative',
        targetAudience: 'Homeowners',
        conceptBrief: 'Panel replacement'
      });

      const shotId = project.shots[0].shotId;

      // Unapproved submission must throw
      await assert.rejects(
        () => service.submitApiJob({
          projectId: project.id,
          shotId,
          humanApproved: false,
          approvedBy: 'operator'
        }),
        /SUBMISSION_BLOCKED/
      );

      const testIdemKey = `idem_test_panel_shot_${Date.now()}_${Math.random().toString(36).slice(2)}`;

      // Approved submission must succeed
      const job = await service.submitApiJob({
        projectId: project.id,
        shotId,
        idempotencyKey: testIdemKey,
        humanApproved: true,
        approvedBy: 'joshua_jardin'
      });

      assert.ok(job.id.startsWith('job_minimax_'));
      assert.strictEqual(job.externalTaskId, 'task_persisted_test_123');
      assert.strictEqual(job.status, 'QUEUED');
      assert.strictEqual(job.actualCostIncurredUsd, 0); // Incurred cost in initial job record starts at 0

      // Verify DB storage
      const storedJob = service.getJob(job.id);
      assert.ok(storedJob);
      assert.strictEqual(storedJob?.externalTaskId, 'task_persisted_test_123');
      assert.strictEqual(storedJob?.humanApproved, true);

      // Idempotency: Duplicate submission with same key must return existing job
      const duplicateJob = await service.submitApiJob({
        projectId: project.id,
        shotId,
        idempotencyKey: testIdemKey,
        humanApproved: true,
        approvedBy: 'joshua_jardin'
      });
      assert.strictEqual(duplicateJob.id, job.id);

      // Sync job status from API mock
      const syncedJob = await service.syncJobStatus(job.id);
      assert.strictEqual(syncedJob.status, 'SUCCESS');
      assert.ok(syncedJob.outputVideoUrl?.includes('persisted_test.mp4'));
      assert.ok(syncedJob.actualCostIncurredUsd > 0); // Actual cost set upon completion

      // Verify shot status updated to COMPLETED
      const updatedProject = service.getProject(project.id);
      const updatedShot = updatedProject?.shots.find(s => s.shotId === shotId);
      assert.strictEqual(updatedShot?.status, 'COMPLETED');
      assert.ok(updatedShot?.generatedVideoUrl?.includes('persisted_test.mp4'));

      // Tenant isolation: querying another tenant must not leak this job
      const otherTenantJobs = service.listJobs('tenant_other_unrelated');
      assert.strictEqual(otherTenantJobs.length, 0);

      const thisTenantJobs = service.listJobs('tenant_reis_electric');
      assert.ok(thisTenantJobs.some(j => j.id === job.id));
    });
  });
});
