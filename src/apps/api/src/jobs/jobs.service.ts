import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Job, Queue } from 'bullmq';
import { Repository } from 'typeorm';

import { ManifestEntity } from '../entities/manifest.entity';
import { JobNotFoundException } from '../queue/exceptions/job-not-found.exception';
import { EXTRACTION_QUEUE } from '../queue/queue.constants';
import { JobsFilterDto } from './dto/jobs-filter.dto';

type ExtractionJobData = {
  manifestId: number;
  llmModelId?: string;
  promptId?: number;
};

type QueueJobType =
  | 'active'
  | 'waiting'
  | 'delayed'
  | 'paused'
  | 'completed'
  | 'failed';

type JobSummary = {
  id: string;
  status: string;
  progress: number;
  data: ExtractionJobData;
  result?: unknown;
};

@Injectable()
export class JobsService {
  constructor(
    @InjectQueue(EXTRACTION_QUEUE)
    private readonly extractionQueue: Queue,
    @InjectRepository(ManifestEntity)
    private readonly manifestRepository: Repository<ManifestEntity>,
  ) {}

  async getJobById(id: string): Promise<JobSummary> {
    const job = await this.getQueueJob(id);
    return this.toJobSummary(job);
  }

  async listJobs(filters: JobsFilterDto) {
    const limit = this.normalizeLimit(filters.limit);
    const offset = this.normalizeOffset(filters.offset);
    const jobTypes = this.resolveJobTypes(filters.status);
    const jobs = await this.extractionQueue.getJobs(
      jobTypes,
      offset,
      offset + limit - 1,
    );

    const filteredJobs =
      filters.projectId !== undefined
        ? await this.filterByProjectId(jobs, filters.projectId)
        : jobs;

    const items = await Promise.all(
      filteredJobs.map((job) => this.toJobSummary(job)),
    );

    const total =
      filters.projectId === undefined
        ? await this.sumJobCounts(jobTypes)
        : items.length;

    return {
      items,
      limit,
      offset,
      total,
    };
  }

  async getJobStats() {
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

  private async getQueueJob(id: string): Promise<Job<ExtractionJobData>> {
    const job = await this.extractionQueue.getJob(id);
    if (!job) {
      throw new JobNotFoundException(id);
    }
    return job;
  }

  private async toJobSummary(job: Job<ExtractionJobData>): Promise<JobSummary> {
    const status = await job.getState();
    return {
      id: String(job.id),
      status,
      progress: this.normalizeProgress(job.progress),
      data: job.data,
      result: job.returnvalue ?? undefined,
    };
  }

  private normalizeLimit(limit?: number): number {
    const resolved = limit ?? 25;
    if (resolved < 1) {
      return 1;
    }
    return Math.min(resolved, 200);
  }

  private normalizeOffset(offset?: number): number {
    const resolved = offset ?? 0;
    return resolved < 0 ? 0 : resolved;
  }

  private normalizeProgress(progress: unknown): number {
    if (typeof progress === 'number') {
      return progress;
    }
    return 0;
  }

  private resolveJobTypes(status?: string): QueueJobType[] {
    const normalized = status?.toLowerCase();
    const mapping: Record<string, QueueJobType> = {
      queued: 'waiting',
      pending: 'waiting',
      waiting: 'waiting',
      processing: 'active',
      running: 'active',
      active: 'active',
      completed: 'completed',
      failed: 'failed',
      delayed: 'delayed',
      paused: 'paused',
    };

    if (normalized && mapping[normalized]) {
      return [mapping[normalized]];
    }

    return [
      'active',
      'waiting',
      'delayed',
      'paused',
      'completed',
      'failed',
    ];
  }

  private async filterByProjectId(
    jobs: Job<ExtractionJobData>[],
    projectId: number,
  ): Promise<Job<ExtractionJobData>[]> {
    const manifestIds = jobs
      .map((job) => job.data?.manifestId)
      .filter((manifestId): manifestId is number => manifestId !== undefined)
      .map((manifestId) => String(manifestId));

    if (manifestIds.length === 0) {
      return [];
    }

    const projectMap = await this.loadProjectIdByManifestIds(manifestIds);
    const target = String(projectId);

    return jobs.filter((job) => {
      const manifestId = job.data?.manifestId;
      if (manifestId === undefined) {
        return false;
      }
      const project = projectMap.get(String(manifestId));
      return project !== undefined && project === target;
    });
  }

  private async loadProjectIdByManifestIds(
    manifestIds: string[],
  ): Promise<Map<string, string>> {
    const rows = await this.manifestRepository
      .createQueryBuilder('manifest')
      .leftJoin('manifest.group', 'group')
      .select('manifest.id', 'manifest_id')
      .addSelect('group.project_id', 'project_id')
      .where('manifest.id IN (:...ids)', { ids: manifestIds })
      .getRawMany();

    const map = new Map<string, string>();
    for (const row of rows) {
      if (row.manifest_id && row.project_id) {
        map.set(String(row.manifest_id), String(row.project_id));
      }
    }
    return map;
  }

  private async sumJobCounts(jobTypes: QueueJobType[]): Promise<number> {
    const counts = await this.extractionQueue.getJobCounts(...jobTypes);
    return jobTypes.reduce((total, type) => {
      const count = (counts as Record<string, number>)[type];
      if (typeof count === 'number') {
        return total + count;
      }
      return total;
    }, 0);
  }
}
