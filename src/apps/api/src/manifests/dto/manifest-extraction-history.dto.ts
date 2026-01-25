import { JobEntity, JobStatus } from '../../entities/job.entity';

export type ManifestExtractionRunStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'canceled';

export class ManifestExtractionHistoryEntryDto {
  jobId!: number;
  queueJobId!: string | null;
  status!: ManifestExtractionRunStatus;

  schemaId!: number | null;
  schemaVersion!: string | null;

  llmModelId!: string | null;
  llmModelName!: string | null;
  promptId!: number | null;
  promptName!: string | null;
  fieldName!: string | null;

  estimatedCost!: number | null;
  actualCost!: number | null;
  textEstimatedCost!: number | null;
  textActualCost!: number | null;
  llmEstimatedCost!: number | null;
  llmActualCost!: number | null;
  currency!: string | null;

  llmInputTokens!: number | null;
  llmOutputTokens!: number | null;
  pagesProcessed!: number | null;

  attemptCount!: number;
  error!: string | null;
  cancelReason!: string | null;
  cancelRequestedAt!: Date | null;
  canceledAt!: Date | null;

  createdAt!: Date;
  startedAt!: Date | null;
  completedAt!: Date | null;
  durationMs!: number | null;

  static fromEntity(
    job: JobEntity,
    lookups: { llmModelName?: string | null; promptName?: string | null } = {},
  ): ManifestExtractionHistoryEntryDto {
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
      schemaId: job.schemaId ?? null,
      schemaVersion: job.schemaVersion ?? null,
      llmModelId: job.llmModelId ?? null,
      llmModelName: lookups.llmModelName ?? null,
      promptId: job.promptId ?? null,
      promptName: lookups.promptName ?? null,
      fieldName: job.fieldName ?? null,
      estimatedCost: this.parseNullableDecimal(job.estimatedCost),
      actualCost: this.parseNullableDecimal(job.actualCost),
      textEstimatedCost: this.parseNullableDecimal(job.ocrEstimatedCost),
      textActualCost: this.parseNullableDecimal(job.ocrActualCost),
      llmEstimatedCost: this.parseNullableDecimal(job.llmEstimatedCost),
      llmActualCost: this.parseNullableDecimal(job.llmActualCost),
      currency: job.costCurrency ?? null,
      llmInputTokens: job.llmInputTokens ?? null,
      llmOutputTokens: job.llmOutputTokens ?? null,
      pagesProcessed: job.pagesProcessed ?? null,
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

  private static resolveStatus(job: JobEntity): ManifestExtractionRunStatus {
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

  private static parseNullableDecimal(value: unknown): number | null {
    if (value === null || value === undefined) {
      return null;
    }
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : null;
    }
    if (typeof value === 'string') {
      if (!value.trim()) {
        return null;
      }
      const parsed = Number.parseFloat(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }
}
