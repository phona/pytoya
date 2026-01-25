import { ConfigService } from '@nestjs/config';
import { ManifestExtractionProcessor } from './manifest-extraction.processor';
import { ExtractionService } from '../extraction.service';
import { ManifestsService } from '../../manifests/manifests.service';
import { ProgressPublisherService } from '../../websocket/progress-publisher.service';
import { PROCESS_MANIFEST_JOB } from '../../queue/queue.constants';
import { ManifestStatus } from '../../entities/manifest.entity';

describe('ManifestExtractionProcessor (workflow without BullMQ/Redis)', () => {
  const makeJob = (overrides: Partial<any> = {}) =>
    ({
      name: PROCESS_MANIFEST_JOB,
      id: 'job-1',
      data: { manifestId: 1 },
      attemptsMade: 0,
      updateProgress: jest.fn(),
      discard: jest.fn(),
      ...overrides,
    }) as any;

  it('updates job + emits completion on successful extraction', async () => {
    const extractionService = {
      runExtraction: jest.fn().mockImplementation(async (_manifestId: number, _options: any, onProgress: (n: number) => void) => {
        onProgress(25);
        return {
          textCost: 0.01,
          llmCost: 0.02,
          extractionCost: 0.03,
          currency: 'USD',
          textResult: { metadata: { extractorId: 'paddleocr', pagesProcessed: 2 } },
          extractionResult: { tokenUsage: { promptTokens: 10, completionTokens: 20 } },
        };
      }),
    } as unknown as jest.Mocked<ExtractionService>;

    const manifestsService = {
      getJobCancelRequest: jest.fn().mockResolvedValue({ requested: false }),
      updateJobProgressByQueueJobId: jest.fn(),
      updateJobCompleted: jest.fn(),
      updateStatus: jest.fn(),
      updateJobFailed: jest.fn(),
      markJobCanceled: jest.fn(),
    } as unknown as jest.Mocked<ManifestsService>;

    const progressPublisher = {
      publishJobUpdate: jest.fn(),
      publishManifestUpdate: jest.fn(),
    } as unknown as jest.Mocked<ProgressPublisherService>;

    const processor = new ManifestExtractionProcessor(
      extractionService,
      manifestsService,
      { get: jest.fn() } as unknown as ConfigService,
      progressPublisher,
    );

    const job = makeJob();
    await processor.process(job);

    expect(job.updateProgress).toHaveBeenCalled();
    expect(manifestsService.updateJobCompleted).toHaveBeenCalled();
    expect(progressPublisher.publishJobUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'completed', progress: 100 }),
    );
    expect(progressPublisher.publishManifestUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'completed', progress: 100 }),
    );
  });

  it('supports cancellation mid-run and marks job canceled', async () => {
    jest.useFakeTimers();

    try {
      const extractionService = {
        runExtraction: jest.fn().mockImplementation(async (_manifestId: number, _options: any, onProgress: (n: number) => void) => {
          onProgress(25);
          await new Promise((resolve) => setTimeout(resolve, 800));
          onProgress(50);
          return {};
        }),
      } as unknown as jest.Mocked<ExtractionService>;

      const manifestsService = {
        getJobCancelRequest: jest.fn().mockResolvedValue({ requested: true, reason: 'user requested' }),
        updateJobProgressByQueueJobId: jest.fn(),
        updateJobCompleted: jest.fn(),
        updateStatus: jest.fn(),
        updateJobFailed: jest.fn(),
        markJobCanceled: jest.fn(),
      } as unknown as jest.Mocked<ManifestsService>;

      const progressPublisher = {
        publishJobUpdate: jest.fn(),
        publishManifestUpdate: jest.fn(),
      } as unknown as jest.Mocked<ProgressPublisherService>;

      const processor = new ManifestExtractionProcessor(
        extractionService,
        manifestsService,
        { get: jest.fn() } as unknown as ConfigService,
        progressPublisher,
      );

      const job = makeJob();
      const promise = processor.process(job);
      const rejection = expect(promise).rejects.toThrow(/canceled/i);

      await jest.advanceTimersByTimeAsync(750);
      await Promise.resolve();
      await jest.advanceTimersByTimeAsync(60);
      await rejection;

      expect(job.discard).toHaveBeenCalled();
      expect(manifestsService.markJobCanceled).toHaveBeenCalled();
      expect(progressPublisher.publishJobUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'canceled' }),
      );
    } finally {
      jest.useRealTimers();
    }
  });

  it('marks job failed when extraction throws', async () => {
    const extractionService = {
      runExtraction: jest.fn().mockRejectedValue(new Error('LLM failed')),
    } as unknown as jest.Mocked<ExtractionService>;

    const manifestsService = {
      getJobCancelRequest: jest.fn().mockResolvedValue({ requested: false }),
      updateJobProgressByQueueJobId: jest.fn(),
      updateJobCompleted: jest.fn(),
      updateStatus: jest.fn(),
      updateJobFailed: jest.fn(),
      markJobCanceled: jest.fn(),
    } as unknown as jest.Mocked<ManifestsService>;

    const progressPublisher = {
      publishJobUpdate: jest.fn(),
      publishManifestUpdate: jest.fn(),
    } as unknown as jest.Mocked<ProgressPublisherService>;

    const processor = new ManifestExtractionProcessor(
      extractionService,
      manifestsService,
      { get: jest.fn() } as unknown as ConfigService,
      progressPublisher,
    );

    const job = makeJob();

    await expect(processor.process(job)).rejects.toThrow('LLM failed');

    expect(manifestsService.updateStatus).toHaveBeenCalledWith(
      1,
      ManifestStatus.FAILED,
    );
    expect(manifestsService.updateJobFailed).toHaveBeenCalled();
    expect(progressPublisher.publishJobUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'failed' }),
    );
  });
});
