import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

import { ManifestStatus } from '../../entities/manifest.entity';
import { ManifestsService } from '../../manifests/manifests.service';
import {
  EXTRACTION_QUEUE,
  PROCESS_MANIFEST_JOB,
} from '../../queue/queue.constants';
import { ExtractionService } from '../extraction.service';

type ManifestExtractionJob = {
  manifestId: number;
  providerId?: number;
  promptId?: number;
};

@Processor(EXTRACTION_QUEUE)
export class ManifestExtractionProcessor extends WorkerHost {
  private readonly logger = new Logger(ManifestExtractionProcessor.name);

  constructor(
    private readonly extractionService: ExtractionService,
    private readonly manifestsService: ManifestsService,
  ) {
    super();
  }

  async process(job: Job<ManifestExtractionJob>) {
    if (job.name !== PROCESS_MANIFEST_JOB) {
      this.logger.warn(`Unhandled job name ${job.name}`);
      return;
    }
    const { manifestId, providerId, promptId } = job.data;
    this.logger.log(
      `Starting extraction job ${job.id} for manifest ${manifestId}`,
    );

    const reportProgress = (progress: number) => {
      void job.updateProgress(progress);
      void this.manifestsService.updateJobProgress(
        manifestId,
        progress,
      );
    };

    try {
      reportProgress(10);
      const result = await this.extractionService.runExtraction(
        manifestId,
        {
          providerId,
          promptId,
        },
        reportProgress,
      );
      reportProgress(100);
      await this.manifestsService.updateJobCompleted(
        String(job.id),
        result,
        job.attemptsMade,
      );
      this.logger.log(
        `Completed extraction job ${job.id} for manifest ${manifestId}`,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Extraction job ${job.id} failed: ${this.formatError(error)}`,
      );
      await this.manifestsService.updateStatus(
        manifestId,
        ManifestStatus.FAILED,
      );
      await this.manifestsService.updateJobFailed(
        String(job.id),
        error,
        job.attemptsMade,
      );
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
