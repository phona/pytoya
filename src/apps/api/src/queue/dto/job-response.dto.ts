export class JobResponseDto {
  jobId!: string;
  manifestId!: number;
  status!: string;
  progress!: number;
  data?: Record<string, unknown>;
  result?: unknown;
}
