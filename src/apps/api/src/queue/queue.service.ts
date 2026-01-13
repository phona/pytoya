import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Job, Queue } from 'bullmq';
import { Repository } from 'typeorm';

import { JobEntity } from '../entities/job.entity';
import { ManifestsService } from '../manifests/manifests.service';
import { JobNotFoundException } from './exceptions/job-not-found.exception';
import { QueueProcessingException } from './exceptions/queue-processing.exception';
import { EXTRACTION_QUEUE, PROCESS_MANIFEST_JOB } from './queue.constants';
import { JobHistoryDto } from './dto/job-history.dto';
import { JobResponseDto } from './dto/job-response.dto';

type ExtractionJobData = {
  manifestId: number;
  providerId?: number;
  promptId?: number;
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
    providerId?: number,
    promptId?: number,
  ): Promise<string> {
    try {
      const job = await this.extractionQueue.add(
        PROCESS_MANIFEST_JOB,
        { manifestId, providerId, promptId },
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
        providerId,
        promptId,
      );
      this.logger.log(
        `Queued extraction job ${job.id} for manifest ${manifestId}`,
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
      id: job.id,
      manifestId: job.manifestId,
      status: job.status,
      providerId: job.providerId,
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

  private formatError(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }
}
