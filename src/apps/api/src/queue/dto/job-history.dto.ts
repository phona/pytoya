import { JobStatus } from '../../entities/job.entity';

export class JobHistoryDto {
  id!: number;
  manifestId!: number;
  manifestFilename!: string | null;
  manifestOriginalFilename!: string | null;
  kind!: string;
  status!: JobStatus;
  llmModelId!: string | null;
  promptId!: number | null;
  queueJobId!: string | null;
  progress!: number;
  estimatedCost!: number | null;
  actualCost!: number | null;
  currency!: string | null;
  error!: string | null;
  attemptCount!: number;
  startedAt!: Date | null;
  completedAt!: Date | null;
  createdAt!: Date;
}
