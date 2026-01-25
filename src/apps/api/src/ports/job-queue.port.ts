import type { UserEntity } from '../entities/user.entity';

export type ExtractionJobRequest = {
  manifestId: number;
  llmModelId?: string;
  promptId?: number;
  fieldName?: string;
  customPrompt?: string;
  textContextSnippet?: string;
};

export type OcrRefreshJobRequest = {
  manifestId: number;
  textExtractorId?: string;
};

export type CancelJobRequest = {
  user: UserEntity;
  jobId: string;
  reason?: string;
};

export type CancelJobResult = {
  canceled: boolean;
  removedFromQueue: boolean;
  state: string;
};

export interface JobQueuePort {
  enqueueExtractionJob(request: ExtractionJobRequest): Promise<string>;
  enqueueOcrRefreshJob(request: OcrRefreshJobRequest): Promise<string>;
  requestCancelJob(request: CancelJobRequest): Promise<CancelJobResult>;
}

export const JOB_QUEUE_PORT = 'JOB_QUEUE_PORT';
