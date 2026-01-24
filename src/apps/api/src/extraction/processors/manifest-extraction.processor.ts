import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

import { ManifestStatus } from '../../entities/manifest.entity';
import { ManifestsService } from '../../manifests/manifests.service';
import { WebSocketService } from '../../websocket/websocket.service';
import {
  EXTRACTION_QUEUE,
  PROCESS_MANIFEST_JOB,
  REFRESH_OCR_JOB,
} from '../../queue/queue.constants';
import { ExtractionService } from '../extraction.service';
import { TextExtractionProgressUpdate } from '../../text-extractor/types/extractor.types';

type ManifestExtractionJob = {
  manifestId: number;
  llmModelId?: string;
  promptId?: number;
  fieldName?: string;
  customPrompt?: string;
  textContextSnippet?: string;
};

type OcrRefreshJob = {
  manifestId: number;
  textExtractorId?: string;
};

@Processor(EXTRACTION_QUEUE)
export class ManifestExtractionProcessor extends WorkerHost {
  private readonly logger = new Logger(ManifestExtractionProcessor.name);

  constructor(
    private readonly extractionService: ExtractionService,
    private readonly manifestsService: ManifestsService,
    private readonly webSocketService: WebSocketService,
  ) {
    super();
  }

  async process(job: Job<ManifestExtractionJob | OcrRefreshJob>) {
    if (job.name === PROCESS_MANIFEST_JOB) {
      return this.processExtraction(job as Job<ManifestExtractionJob>);
    }
    if (job.name === REFRESH_OCR_JOB) {
      return this.processOcrRefresh(job as Job<OcrRefreshJob>);
    }
    this.logger.warn(`Unhandled job name ${job.name}`);
    return;
  }

  private async processExtraction(job: Job<ManifestExtractionJob>) {
    const { manifestId, llmModelId, promptId, fieldName, customPrompt, textContextSnippet } = job.data;
    this.logger.log(
      `Starting extraction job ${job.id} for manifest ${manifestId}`,
    );

    let cancelRequested = false;
    let cancelReason: string | undefined;
    let lastProgress = 0;
    const startCancelPolling = () => {
      const timer = setInterval(() => {
        void this.manifestsService
          .getJobCancelRequest(String(job.id))
          .then((result) => {
            cancelRequested = result.requested;
            cancelReason = result.reason;
          })
          .catch(() => {
            // Ignore polling errors; cancellation is best-effort.
          });
      }, 750);
      return () => clearInterval(timer);
    };

    const stopCancelPolling = startCancelPolling();

    const reportProgress = (progress: number) => {
      if (cancelRequested) {
        throw new JobCanceledError(cancelReason);
      }
      lastProgress = progress;
      void job.updateProgress(progress);
      void this.manifestsService.updateJobProgressByQueueJobId(String(job.id), progress);
      // Emit WebSocket progress update
      this.webSocketService.emitJobUpdate({
        jobId: String(job.id),
        manifestId,
        kind: 'extraction',
        progress,
        status: 'processing',
      });
    };

    const reportTextProgress = async (update: TextExtractionProgressUpdate) => {
      if (cancelRequested) {
        throw new JobCanceledError(cancelReason);
      }

      this.webSocketService.emitJobUpdate({
        jobId: String(job.id),
        manifestId,
        kind: 'extraction',
        progress: lastProgress,
        status: 'processing',
        textMarkdownSoFar: update.markdownSoFar,
        textPagesProcessed: update.pagesProcessed,
        textPagesTotal: update.pagesTotal,
      });
    };

    try {
      reportProgress(10);
      const result = await this.extractionService.runExtraction(
        manifestId,
        {
          llmModelId,
          queueJobId: String(job.id),
          promptId,
          fieldName,
          customPrompt,
          textContextSnippet,
          onTextProgress: reportTextProgress,
        },
        reportProgress,
      );
      reportProgress(100);
      const costBreakdown = {
        text: result.textCost ?? 0,
        llm: result.llmCost ?? 0,
        total: result.extractionCost ?? null,
        currency: result.currency ?? null,
      };
      await this.manifestsService.updateJobCompleted(
        String(job.id),
        result,
        job.attemptsMade,
        {
          total: costBreakdown.total,
          text: costBreakdown.text,
          llm: costBreakdown.llm,
          currency: costBreakdown.currency,
          pagesProcessed: result.textResult?.metadata.pagesProcessed,
          llmInputTokens: result.extractionResult?.tokenUsage?.promptTokens,
          llmOutputTokens: result.extractionResult?.tokenUsage?.completionTokens,
        },
      );
      // Emit WebSocket completion update
      this.webSocketService.emitJobUpdate({
        jobId: String(job.id),
        manifestId,
        kind: 'extraction',
        progress: 100,
        status: 'completed',
        cost: result.extractionCost,
        costBreakdown,
        extractorId: result.textResult?.metadata.extractorId ?? null,
        currency: result.currency ?? null,
      });
      this.webSocketService.emitManifestUpdate({
        manifestId,
        status: ManifestStatus.COMPLETED,
        progress: 100,
        cost: result.extractionCost,
        costBreakdown,
        extractorId: result.textResult?.metadata.extractorId ?? null,
        currency: result.currency ?? null,
      });
      this.logger.log(
        `Completed extraction job ${job.id} for manifest ${manifestId}`,
      );
      stopCancelPolling();
      return result;
    } catch (error) {
      stopCancelPolling();

      if (error instanceof JobCanceledError) {
        const message = error.message;
        this.logger.warn(`Extraction job ${job.id} canceled: ${message}`);

        await job.discard();
        await this.manifestsService.updateStatus(manifestId, ManifestStatus.FAILED);
        await this.manifestsService.markJobCanceled(String(job.id), error.reason, job.attemptsMade);

        this.webSocketService.emitJobUpdate({
          jobId: String(job.id),
          manifestId,
          kind: 'extraction',
          progress: lastProgress,
          status: 'canceled',
          error: message,
        });
        this.webSocketService.emitManifestUpdate({
          manifestId,
          status: ManifestStatus.FAILED,
          progress: lastProgress,
          error: message,
        });
        throw error;
      }

      const errorMessage = this.formatError(error);
      const line = [
        'event=fail',
        `jobId=${String(job.id)}`,
        `manifestId=${manifestId}`,
        `attemptsMade=${job.attemptsMade}`,
        `lastProgress=${lastProgress}`,
        `error=${JSON.stringify(errorMessage)}`,
      ].join(' ');
      if (error instanceof Error) {
        this.logger.error(line, error.stack);
      } else {
        this.logger.error(line);
      }
      await this.manifestsService.updateStatus(
        manifestId,
        ManifestStatus.FAILED,
      );
      await this.manifestsService.updateJobFailed(
        String(job.id),
        error,
        job.attemptsMade,
      );
      // Emit WebSocket error update
      this.webSocketService.emitJobUpdate({
        jobId: String(job.id),
        manifestId,
        kind: 'extraction',
        progress: 0,
        status: 'failed',
        error: errorMessage,
      });
      this.webSocketService.emitManifestUpdate({
        manifestId,
        status: ManifestStatus.FAILED,
        progress: 0,
        error: errorMessage,
      });
      throw error;
    }
  }

  private async processOcrRefresh(job: Job<OcrRefreshJob>) {
    const { manifestId, textExtractorId } = job.data;
    this.logger.log(`Starting OCR refresh job ${job.id} for manifest ${manifestId}`);

    let cancelRequested = false;
    let cancelReason: string | undefined;
    let lastProgress = 0;

    const startCancelPolling = () => {
      const timer = setInterval(() => {
        void this.manifestsService
          .getJobCancelRequest(String(job.id))
          .then((result) => {
            cancelRequested = result.requested;
            cancelReason = result.reason;
          })
          .catch(() => {
            // Ignore polling errors; cancellation is best-effort.
          });
      }, 750);
      return () => clearInterval(timer);
    };

    const stopCancelPolling = startCancelPolling();

    const reportProgress = (progress: number) => {
      if (cancelRequested) {
        throw new JobCanceledError(cancelReason);
      }
      lastProgress = progress;
      void job.updateProgress(progress);
      void this.manifestsService.updateJobProgressByQueueJobId(String(job.id), progress);
      this.webSocketService.emitJobUpdate({
        jobId: String(job.id),
        manifestId,
        kind: 'ocr',
        progress,
        status: 'processing',
      });
    };

    try {
      reportProgress(10);
      const manifest = await this.manifestsService.findByIdForJobProcessing(manifestId);
      reportProgress(35);

      await this.manifestsService.processOcrForManifest(manifest, {
        force: true,
        textExtractorId,
      });

      reportProgress(100);
      await this.manifestsService.updateJobCompleted(String(job.id), undefined, job.attemptsMade);

      this.webSocketService.emitJobUpdate({
        jobId: String(job.id),
        manifestId,
        kind: 'ocr',
        progress: 100,
        status: 'completed',
      });

      stopCancelPolling();
      return { ok: true };
    } catch (error) {
      stopCancelPolling();

      if (error instanceof JobCanceledError) {
        const message = error.message;
        this.logger.warn(`OCR refresh job ${job.id} canceled: ${message}`);

        await job.discard();
        await this.manifestsService.markJobCanceled(String(job.id), error.reason, job.attemptsMade);

        this.webSocketService.emitJobUpdate({
          jobId: String(job.id),
          manifestId,
          kind: 'ocr',
          progress: lastProgress,
          status: 'canceled',
          error: message,
        });
        throw error;
      }

      const errorMessage = this.formatError(error);
      const line = [
        'event=fail',
        `jobId=${String(job.id)}`,
        `manifestId=${manifestId}`,
        `attemptsMade=${job.attemptsMade}`,
        `lastProgress=${lastProgress}`,
        `error=${JSON.stringify(errorMessage)}`,
      ].join(' ');
      if (error instanceof Error) {
        this.logger.error(line, error.stack);
      } else {
        this.logger.error(line);
      }

      await this.manifestsService.updateJobFailed(String(job.id), error, job.attemptsMade);
      this.webSocketService.emitJobUpdate({
        jobId: String(job.id),
        manifestId,
        kind: 'ocr',
        progress: 0,
        status: 'failed',
        error: errorMessage,
      });
      throw error;
    }
  }

  private formatError(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }
}

class JobCanceledError extends Error {
  constructor(public readonly reason?: string) {
    super(reason ? `Canceled: ${reason}` : 'Canceled');
  }
}
