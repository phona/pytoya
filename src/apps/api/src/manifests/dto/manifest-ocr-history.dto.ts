import { JobEntity, JobStatus } from '../../entities/job.entity';

export type ManifestOcrRunStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'canceled';

export class ManifestOcrHistoryEntryDto {
  jobId!: number;
  queueJobId!: string | null;
  status!: ManifestOcrRunStatus;

  attemptCount!: number;
  error!: string | null;
  cancelReason!: string | null;
  cancelRequestedAt!: Date | null;
  canceledAt!: Date | null;

  createdAt!: Date;
  startedAt!: Date | null;
  completedAt!: Date | null;
  durationMs!: number | null;

  static fromEntity(job: JobEntity): ManifestOcrHistoryEntryDto {
    const status = this.resolveStatus(job);
    const startedAt = job.startedAt ?? null;
    const completedAt = job.completedAt ?? null;

    const durationMs =
      startedAt && completedAt
        ? Math.max(0, completedAt.getTime() - startedAt.getTime())
        : null;

    return {
      jobId: job.id,
      queueJobId: job.queueJobId ?? null,
      status,
      attemptCount: job.attemptCount ?? 0,
      error: job.error ?? null,
      cancelReason: job.cancelReason ?? null,
      cancelRequestedAt: job.cancelRequestedAt ?? null,
      canceledAt: job.canceledAt ?? null,
      createdAt: job.createdAt,
      startedAt,
      completedAt,
      durationMs,
    };
  }

  private static resolveStatus(job: JobEntity): ManifestOcrRunStatus {
    if (job.canceledAt) {
      return 'canceled';
    }

    switch (job.status) {
      case JobStatus.PENDING:
        return 'pending';
      case JobStatus.PROCESSING:
      case JobStatus.RUNNING:
        return 'running';
      case JobStatus.COMPLETED:
        return 'completed';
      case JobStatus.FAILED:
      default:
        return 'failed';
    }
  }
}

