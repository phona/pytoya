import { Injectable } from '@nestjs/common';
import { ManifestGateway } from './websocket.gateway';

@Injectable()
export class WebSocketService {
  constructor(private readonly manifestGateway: ManifestGateway) {}

  emitJobUpdate(data: {
    jobId: string;
    manifestId: number;
    progress: number;
    status: string;
    error?: string;
    cost?: number | null;
    currency?: string | null;
    costBreakdown?: { text: number; llm: number; total: number | null; currency?: string | null };
    extractorId?: string | null;
  }) {
    this.manifestGateway.emitJobUpdate(data);
  }

  emitManifestUpdate(data: {
    manifestId: number;
    status: string;
    progress: number;
    error?: string;
    cost?: number | null;
    currency?: string | null;
    costBreakdown?: { text: number; llm: number; total: number | null; currency?: string | null };
    extractorId?: string | null;
  }) {
    this.manifestGateway.emitManifestUpdate(data);
  }

  emitOcrUpdate(data: {
    manifestId: number;
    hasOcr: boolean;
    qualityScore?: number | null;
    processedAt?: Date | null;
  }) {
    this.manifestGateway.emitOcrUpdate(data);
  }

  getSubscriberCount(manifestId: number): number {
    return this.manifestGateway.getSubscriberCount(manifestId);
  }
}
