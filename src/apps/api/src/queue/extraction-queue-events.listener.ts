import { InjectQueue, OnQueueEvent, QueueEventsListener, QueueEventsHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Job, Queue } from 'bullmq';
import { Repository } from 'typeorm';

import { JobEntity } from '../entities/job.entity';
import { ManifestEntity, ManifestStatus } from '../entities/manifest.entity';
import { ProgressPublisherService } from '../websocket/progress-publisher.service';
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
    private readonly progressPublisher: ProgressPublisherService,
    @InjectRepository(JobEntity)
    private readonly jobRepository: Repository<JobEntity>,
    @InjectRepository(ManifestEntity)
    private readonly manifestRepository: Repository<ManifestEntity>,
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

  @OnQueueEvent('progress')
  async onProgress(args: { jobId: string; data?: unknown }) {
    await this.emitJobStatus(args.jobId, 'processing');
  }

  @OnQueueEvent('delayed')
  async onDelayed(args: { jobId: string }) {
    await this.emitJobStatus(args.jobId, 'delayed');
  }

  @OnQueueEvent('completed')
  async onCompleted(args: { jobId: string }) {
    await this.emitCompletion(args.jobId);
  }

  @OnQueueEvent('failed')
  async onFailed(args: { jobId: string; failedReason: string }) {
    const normalized = (args.failedReason ?? '').trim().toLowerCase();
    const isCanceled = normalized.startsWith('canceled');
    await this.emitJobStatus(args.jobId, isCanceled ? 'canceled' : 'failed', args.failedReason);
  }

  @OnQueueEvent('removed')
  async onRemoved(args: { jobId: string }) {
    await this.emitJobStatus(args.jobId, 'canceled', 'Removed from queue');
  }

  private async resolveJobContext(
    jobId: string,
  ): Promise<
    | { manifestId: number; kind: 'extraction' | 'ocr'; progress: number; queueJob?: Job | null }
    | null
  > {
    const queueJob = await this.extractionQueue.getJob(jobId);
    if (queueJob) {
      const manifestId = (queueJob.data as JobData | undefined)?.manifestId;
      if (typeof manifestId !== 'number') {
        return null;
      }
      return {
        manifestId,
        kind: resolveJobKind(queueJob),
        progress: normalizeProgress(queueJob.progress),
        queueJob,
      };
    }

    const jobRecord = await this.jobRepository.findOne({
      where: { queueJobId: jobId },
    });

    if (!jobRecord) {
      return null;
    }

    return {
      manifestId: jobRecord.manifestId,
      kind: jobRecord.kind === 'ocr' ? 'ocr' : 'extraction',
      progress: normalizeProgress(jobRecord.progress),
      queueJob: null,
    };
  }

  private async emitJobStatus(jobId: string, status: string, error?: string) {
    const context = await this.resolveJobContext(jobId);
    if (!context) {
      this.logger.debug(`Queue event for job ${jobId} but job context not found`);
      return;
    }

    this.progressPublisher.publishJobUpdate({
      jobId: String(jobId),
      manifestId: context.manifestId,
      kind: context.kind,
      progress: context.progress,
      status,
      error,
    });

    if (status === 'active' && context.kind === 'extraction') {
      this.progressPublisher.publishManifestUpdate({
        manifestId: context.manifestId,
        status: 'processing',
        progress: context.progress,
      });
    }

    if ((status === 'failed' || status === 'canceled') && context.kind === 'extraction') {
      this.progressPublisher.publishManifestUpdate({
        manifestId: context.manifestId,
        status: ManifestStatus.FAILED,
        progress: context.progress,
        error,
      });
    }
  }

  private async emitCompletion(jobId: string) {
    const context = await this.resolveJobContext(jobId);
    if (!context) {
      this.logger.debug(`Queue completed event for job ${jobId} but job context not found`);
      return;
    }

    const jobRecord = await this.jobRepository.findOne({ where: { queueJobId: jobId } });
    const costBreakdown = jobRecord
      ? {
          text: typeof jobRecord.ocrActualCost === 'number' ? jobRecord.ocrActualCost : 0,
          llm: typeof jobRecord.llmActualCost === 'number' ? jobRecord.llmActualCost : 0,
          total: typeof jobRecord.actualCost === 'number' ? jobRecord.actualCost : null,
          currency: jobRecord.costCurrency ?? null,
        }
      : undefined;

    const manifest = await this.manifestRepository.findOne({
      where: { id: context.manifestId },
    });

    this.progressPublisher.publishJobUpdate({
      jobId: String(jobId),
      manifestId: context.manifestId,
      kind: context.kind,
      progress: 100,
      status: 'completed',
      cost: jobRecord?.actualCost ?? null,
      currency: jobRecord?.costCurrency ?? null,
      costBreakdown,
      extractorId: manifest?.textExtractorId ?? null,
    });

    if (context.kind === 'extraction') {
      this.progressPublisher.publishManifestUpdate({
        manifestId: context.manifestId,
        status: ManifestStatus.COMPLETED,
        progress: 100,
        cost: manifest?.extractionCost ?? null,
        currency: manifest?.extractionCostCurrency ?? null,
        costBreakdown,
        extractorId: manifest?.textExtractorId ?? null,
      });
    }
  }
}
