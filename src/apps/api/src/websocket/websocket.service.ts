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
  }) {
    this.manifestGateway.emitJobUpdate(data);
  }

  emitManifestUpdate(data: {
    manifestId: number;
    status: string;
    progress: number;
    error?: string;
  }) {
    this.manifestGateway.emitManifestUpdate(data);
  }

  getSubscriberCount(manifestId: number): number {
    return this.manifestGateway.getSubscriberCount(manifestId);
  }
}
