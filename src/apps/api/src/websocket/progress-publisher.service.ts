import { Injectable } from '@nestjs/common';

import { WebSocketService } from './websocket.service';

type JobUpdatePayload = {
  jobId: string;
  manifestId: number;
  kind?: 'extraction' | 'ocr';
  progress: number;
  status: string;
  error?: string;
  cost?: number | null;
  currency?: string | null;
  costBreakdown?: { text: number; llm: number; total: number | null; currency?: string | null };
  extractorId?: string | null;
  textMarkdownSoFar?: string;
  textPagesProcessed?: number;
  textPagesTotal?: number;
};

type ManifestUpdatePayload = {
  manifestId: number;
  status: string;
  progress: number;
  error?: string;
  cost?: number | null;
  currency?: string | null;
  costBreakdown?: { text: number; llm: number; total: number | null; currency?: string | null };
  extractorId?: string | null;
};

@Injectable()
export class ProgressPublisherService {
  private readonly lastProgressByJobId = new Map<string, number>();

  constructor(private readonly webSocketService: WebSocketService) {}

  publishJobUpdate(payload: JobUpdatePayload): void {
    const normalizedProgress = this.normalizeProgress(payload.progress);
    const previous = this.lastProgressByJobId.get(payload.jobId) ?? 0;
    const monotonic = Math.max(previous, normalizedProgress);

    this.lastProgressByJobId.set(payload.jobId, monotonic);

    this.webSocketService.emitJobUpdate({
      ...payload,
      progress: monotonic,
    });

    const status = payload.status.toLowerCase();
    if (status === 'completed' || status === 'failed' || status === 'canceled') {
      this.lastProgressByJobId.delete(payload.jobId);
    }
  }

  publishManifestUpdate(payload: ManifestUpdatePayload): void {
    this.webSocketService.emitManifestUpdate({
      ...payload,
      progress: this.normalizeProgress(payload.progress),
    });
  }

  private normalizeProgress(progress: unknown): number {
    if (typeof progress !== 'number' || Number.isNaN(progress)) {
      return 0;
    }
    if (progress < 0) return 0;
    if (progress > 100) return 100;
    return Math.round(progress);
  }
}

