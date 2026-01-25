import { Injectable } from '@nestjs/common';

import { QueueService } from '../queue/queue.service';
import type {
  CancelJobRequest,
  CancelJobResult,
  ExtractionJobRequest,
  JobQueuePort,
  OcrRefreshJobRequest,
} from './job-queue.port';

@Injectable()
export class QueueServiceJobQueueAdapter implements JobQueuePort {
  constructor(private readonly queueService: QueueService) {}

  async enqueueExtractionJob(request: ExtractionJobRequest): Promise<string> {
    return this.queueService.addExtractionJob(
      request.manifestId,
      request.llmModelId,
      request.promptId,
      request.fieldName,
      request.customPrompt,
      request.textContextSnippet,
    );
  }

  async enqueueOcrRefreshJob(request: OcrRefreshJobRequest): Promise<string> {
    return this.queueService.addOcrRefreshJob(
      request.manifestId,
      request.textExtractorId,
    );
  }

  async requestCancelJob(request: CancelJobRequest): Promise<CancelJobResult> {
    return this.queueService.requestCancelJob(
      request.user,
      request.jobId,
      request.reason,
    );
  }
}
