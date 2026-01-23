export class ExtractFilteredJobDto {
  jobId!: string;
  manifestId!: number;
}

export class ExtractFilteredResponseDto {
  jobId?: string;
  jobIds?: string[];
  jobs?: ExtractFilteredJobDto[];
  manifestCount!: number;
}
