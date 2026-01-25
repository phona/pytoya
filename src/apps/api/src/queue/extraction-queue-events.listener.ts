import { InjectQueue, OnQueueEvent, QueueEventsListener, QueueEventsHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';

import { WebSocketService } from '../websocket/websocket.service';
import { EXTRACTION_QUEUE, PROCESS_MANIFEST_JOB, REFRESH_OCR_JOB } from './queue.constants';

type JobData = { manifestId?: number };

const normalizeProgress = (progress: unknown): number => {
  if (typeof progress !== 'number' || Number.isNaN(progress)) {
    return 0;
  }
  if (progress < 0) return 0;
  if (progress > 100) return 100;
  return progress;
};

const resolveJobKind = (job: Job): 'extraction' | 'ocr' => {
  if (job.name === REFRESH_OCR_JOB) {
    return 'ocr';
  }
  if (job.name === PROCESS_MANIFEST_JOB) {
    return 'extraction';
  }
  return 'extraction';
};

@QueueEventsListener(EXTRACTION_QUEUE)
export class ExtractionQueueEventsListener extends QueueEventsHost {
  private readonly logger = new Logger(ExtractionQueueEventsListener.name);

  constructor(
    @InjectQueue(EXTRACTION_QUEUE)
    private readonly extractionQueue: Queue,
    private readonly webSocketService: WebSocketService,
  ) {
    super();
  }

  @OnQueueEvent('added')
  async onAdded(args: { jobId: string; name: string }) {
    await this.emitJobStatus(args.jobId, 'waiting');
  }

  @OnQueueEvent('waiting')
  async onWaiting(args: { jobId: string }) {
    await this.emitJobStatus(args.jobId, 'waiting');
  }

  @OnQueueEvent('active')
  async onActive(args: { jobId: string }) {
    await this.emitJobStatus(args.jobId, 'active');
  }

  @OnQueueEvent('delayed')
  async onDelayed(args: { jobId: string }) {
    await this.emitJobStatus(args.jobId, 'delayed');
  }

  @OnQueueEvent('failed')
  async onFailed(args: { jobId: string; failedReason: string }) {
    await this.emitJobStatus(args.jobId, 'failed', args.failedReason);
  }

  @OnQueueEvent('removed')
  async onRemoved(args: { jobId: string }) {
    await this.emitJobStatus(args.jobId, 'canceled', 'Removed from queue');
  }

  private async emitJobStatus(jobId: string, status: string, error?: string) {
    const job = await this.extractionQueue.getJob(jobId);
    if (!job) {
      this.logger.debug(`Queue event for job ${jobId} but job not found`);
      return;
    }

    const manifestId = (job.data as JobData | undefined)?.manifestId;
    if (typeof manifestId !== 'number') {
      this.logger.debug(`Queue event for job ${jobId} but manifestId missing`);
      return;
    }

    const kind = resolveJobKind(job);

    this.webSocketService.emitJobUpdate({
      jobId: String(jobId),
      manifestId,
      kind,
      progress: normalizeProgress(job.progress),
      status,
      error,
    });

    if (status === 'active' && kind === 'extraction') {
      this.webSocketService.emitManifestUpdate({
        manifestId,
        status: 'processing',
        progress: normalizeProgress(job.progress),
      });
    }
  }
}
