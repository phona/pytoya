import { JobStatus } from '../../entities/job.entity';

export class JobHistoryDto {
  id!: number;
  manifestId!: number;
  status!: JobStatus;
  llmModelId!: string | null;
  promptId!: number | null;
  queueJobId!: string | null;
  progress!: number;
  error!: string | null;
  attemptCount!: number;
  startedAt!: Date | null;
  completedAt!: Date | null;
  createdAt!: Date;
}
