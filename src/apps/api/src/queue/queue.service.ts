import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Job, Queue } from 'bullmq';
import { Repository } from 'typeorm';

import { JobEntity } from '../entities/job.entity';
import { ManifestsService } from '../manifests/manifests.service';
import { UserEntity } from '../entities/user.entity';
import { JobNotFoundException } from './exceptions/job-not-found.exception';
import { QueueProcessingException } from './exceptions/queue-processing.exception';
import { EXTRACTION_QUEUE, PROCESS_MANIFEST_JOB } from './queue.constants';
import { JobHistoryDto } from './dto/job-history.dto';
import { JobResponseDto } from './dto/job-response.dto';

type ExtractionJobData = {
  manifestId: number;
  llmModelId?: string;
  promptId?: number;
  fieldName?: string;
  customPrompt?: string;
  textContextSnippet?: string;
};

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    @InjectQueue(EXTRACTION_QUEUE)
    private readonly extractionQueue: Queue,
    private readonly manifestsService: ManifestsService,
    @InjectRepository(JobEntity)
    private readonly jobRepository: Repository<JobEntity>,
  ) {}

  async addExtractionJob(
    manifestId: number,
    llmModelId?: string,
    promptId?: number,
    fieldName?: string,
    customPrompt?: string,
    textContextSnippet?: string,
    estimatedCost?: number,
  ): Promise<string> {
    try {
      const job = await this.extractionQueue.add(
        PROCESS_MANIFEST_JOB,
        { manifestId, llmModelId, promptId, fieldName, customPrompt, textContextSnippet },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: { count: 100 },
          removeOnFail: { count: 500 },
        },
      );

      await this.manifestsService.createJob(
        manifestId,
        String(job.id),
        llmModelId,
        promptId,
        estimatedCost,
      );
      this.logger.log(
        `Queued extraction job ${job.id} for manifest ${manifestId}${
          fieldName ? ` (field: ${fieldName})` : ''
        }`,
      );
      return String(job.id);
    } catch (error) {
      this.logger.error(
        `Failed to queue extraction job: ${this.formatError(error)}`,
      );
      throw new QueueProcessingException(
        'Failed to queue extraction job',
      );
    }
  }

  async getJob(jobId: string): Promise<JobResponseDto> {
    const job = await this.getQueueJob(jobId);
    const state = await job.getState();
    return {
      jobId: String(job.id),
      manifestId: job.data.manifestId,
      status: state,
      progress: this.normalizeProgress(job.progress),
      data: job.data,
      result: job.returnvalue ?? undefined,
    };
  }

  async getJobState(jobId: string): Promise<{
    jobId: string;
    state: string;
    progress: number;
  }> {
    const job = await this.getQueueJob(jobId);
    const state = await job.getState();
    return {
      jobId: String(job.id),
      state,
      progress: this.normalizeProgress(job.progress),
    };
  }

  async removeJob(jobId: string): Promise<void> {
    const job = await this.getQueueJob(jobId);
    await job.remove();
    this.logger.log(`Removed extraction job ${jobId}`);
  }

  async requestCancelJob(
    user: UserEntity,
    jobId: string,
    reason?: string,
  ): Promise<{
    canceled: boolean;
    removedFromQueue: boolean;
    state: string;
  }> {
    const jobRecord = await this.jobRepository.findOne({
      where: { queueJobId: jobId },
    });

    if (!jobRecord) {
      throw new JobNotFoundException(jobId);
    }

    await this.manifestsService.findOne(user, jobRecord.manifestId);

    if (jobRecord.completedAt) {
      throw new BadRequestException('Job already finished');
    }

    await this.manifestsService.requestJobCancel(jobId, reason);

    const queueJob = await this.extractionQueue.getJob(jobId);
    if (!queueJob) {
      throw new BadRequestException('Job is not in queue (already finished)');
    }

    const state = String(await queueJob.getState());

    if (state === 'waiting' || state === 'delayed' || state === 'paused') {
      await queueJob.remove();
      await this.manifestsService.markJobCanceled(jobId, reason);
      this.logger.log(`Canceled queued extraction job ${jobId}`);
      return { canceled: true, removedFromQueue: true, state };
    }

    this.logger.log(`Cancel requested for extraction job ${jobId} (state: ${state})`);
    return { canceled: true, removedFromQueue: false, state };
  }

  async getQueueStats(): Promise<{
    active: number;
    waiting: number;
    delayed: number;
    paused: number;
    completed: number;
    failed: number;
    isPaused: boolean;
  }> {
    const counts = await this.extractionQueue.getJobCounts(
      'active',
      'waiting',
      'delayed',
      'paused',
      'completed',
      'failed',
    );

    return {
      active: counts.active ?? 0,
      waiting: counts.waiting ?? 0,
      delayed: counts.delayed ?? 0,
      paused: counts.paused ?? 0,
      completed: counts.completed ?? 0,
      failed: counts.failed ?? 0,
      isPaused: await this.extractionQueue.isPaused(),
    };
  }

  async pauseQueue(): Promise<{ paused: boolean }> {
    await this.extractionQueue.pause();
    return { paused: await this.extractionQueue.isPaused() };
  }

  async resumeQueue(): Promise<{ paused: boolean }> {
    await this.extractionQueue.resume();
    return { paused: await this.extractionQueue.isPaused() };
  }

  async getJobHistory(
    manifestId?: number,
    limit = 50,
  ): Promise<JobHistoryDto[]> {
    const take = Math.min(Math.max(limit, 1), 200);
    const where = manifestId ? { manifestId } : {};
    const jobs = await this.jobRepository.find({
      where,
      order: { createdAt: 'DESC' },
      take,
    });

    return jobs.map((job) => ({
      estimatedCost: this.normalizeDecimal(job.estimatedCost),
      actualCost: this.normalizeDecimal(job.actualCost),
      id: job.id,
      manifestId: job.manifestId,
      status: job.status,
      llmModelId: job.llmModelId,
      promptId: job.promptId,
      queueJobId: job.queueJobId,
      progress: job.progress,
      error: job.error,
      attemptCount: job.attemptCount,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      createdAt: job.createdAt,
    }));
  }

  private async getQueueJob(jobId: string): Promise<Job<ExtractionJobData>> {
    const job = await this.extractionQueue.getJob(jobId);
    if (!job) {
      throw new JobNotFoundException(jobId);
    }
    return job;
  }

  private normalizeProgress(progress: unknown): number {
    if (typeof progress === 'number') {
      return progress;
    }
    return 0;
  }

  private normalizeDecimal(value: number | string | null | undefined): number | null {
    if (value === null || value === undefined) {
      return null;
    }
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : null;
    }
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private formatError(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }
}
