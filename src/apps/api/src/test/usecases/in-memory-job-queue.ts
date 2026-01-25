import type {
  CancelJobRequest,
  CancelJobResult,
  ExtractionJobRequest,
  JobQueuePort,
  OcrRefreshJobRequest,
} from '../../ports/job-queue.port';

type Job =
  | { kind: 'extraction'; request: ExtractionJobRequest }
  | { kind: 'ocr-refresh'; request: OcrRefreshJobRequest };

export class InMemoryJobQueue implements JobQueuePort {
  private readonly jobs: Job[] = [];

  async enqueueExtractionJob(request: ExtractionJobRequest): Promise<string> {
    this.jobs.push({ kind: 'extraction', request });
    return `job_${this.jobs.length}`;
  }

  async enqueueOcrRefreshJob(request: OcrRefreshJobRequest): Promise<string> {
    this.jobs.push({ kind: 'ocr-refresh', request });
    return `job_${this.jobs.length}`;
  }

  async requestCancelJob(_request: CancelJobRequest): Promise<CancelJobResult> {
    return { canceled: true, removedFromQueue: false, state: 'active' };
  }

  getEnqueued(): Job[] {
    return [...this.jobs];
  }

  clear() {
    this.jobs.length = 0;
  }
}
