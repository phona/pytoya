import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { WebSocketJwtGuard } from './websocket-jwt.guard';

interface ManifestUpdatePayload {
  manifestId: number;
  status: string;
  progress: number;
  error?: string;
  cost?: number | null;
  currency?: string | null;
  costBreakdown?: { text: number; llm: number; total: number | null; currency?: string | null };
  extractorId?: string | null;
}

interface JobUpdatePayload {
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
}

interface OcrUpdatePayload {
  manifestId: number;
  hasOcr: boolean;
  qualityScore?: number | null;
  processedAt?: Date | null;
}

@WebSocketGateway({
  namespace: '/manifests',
})
export class ManifestGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ManifestGateway.name);
  private readonly manifestSubscriptions = new Map<number, Set<string>>();

  async handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    // Clean up subscriptions
    for (const [manifestId, subscribers] of this.manifestSubscriptions.entries()) {
      subscribers.delete(client.id);
      if (subscribers.size === 0) {
        this.manifestSubscriptions.delete(manifestId);
      }
    }
  }

  @UseGuards(WebSocketJwtGuard)
  @SubscribeMessage('subscribe-manifest')
  handleSubscribeManifest(
    @MessageBody() data: { manifestId: number },
    @ConnectedSocket() client: Socket,
  ) {
    const { manifestId } = data;
    this.logger.log(`Client ${client.id} subscribing to manifest ${manifestId}`);

    if (!this.manifestSubscriptions.has(manifestId)) {
      this.manifestSubscriptions.set(manifestId, new Set());
    }
    const subscribers = this.manifestSubscriptions.get(manifestId);
    if (subscribers) {
      subscribers.add(client.id);
    }

    // Join room for this manifest
    client.join(`manifest:${manifestId}`);

    return { event: 'subscribed', data: { manifestId } };
  }

  @UseGuards(WebSocketJwtGuard)
  @SubscribeMessage('unsubscribe-manifest')
  handleUnsubscribeManifest(
    @MessageBody() data: { manifestId: number },
    @ConnectedSocket() client: Socket,
  ) {
    const { manifestId } = data;
    this.logger.log(`Client ${client.id} unsubscribing from manifest ${manifestId}`);

    const subscribers = this.manifestSubscriptions.get(manifestId);
    if (subscribers) {
      subscribers.delete(client.id);
      if (subscribers.size === 0) {
        this.manifestSubscriptions.delete(manifestId);
      }
    }

    // Leave room for this manifest
    client.leave(`manifest:${manifestId}`);

    return { event: 'unsubscribed', data: { manifestId } };
  }

  /**
   * Called by BullMQ processor to broadcast job progress updates
   */
  emitJobUpdate(payload: JobUpdatePayload) {
    const { jobId, manifestId, kind, progress, status, error, cost, currency, costBreakdown, extractorId } = payload;
    this.logger.debug(`Emitting job update for manifest ${manifestId}: ${progress}%`);

    this.server.to(`manifest:${manifestId}`).emit('job-update', {
      jobId,
      manifestId,
      kind,
      progress,
      status,
      error,
      cost,
      currency,
      costBreakdown,
      extractorId,
    });
  }

  /**
   * Called when manifest status changes
   */
  emitManifestUpdate(payload: ManifestUpdatePayload) {
    const { manifestId, status, progress, error, cost, currency, costBreakdown, extractorId } = payload;
    this.logger.debug(`Emitting manifest update for manifest ${manifestId}: ${status}`);

    this.server.to(`manifest:${manifestId}`).emit('manifest-update', {
      manifestId,
      status,
      progress,
      error,
      cost,
      currency,
      costBreakdown,
      extractorId,
    });
  }

  /**
   * Called when OCR processing completes
   */
  emitOcrUpdate(payload: OcrUpdatePayload) {
    const { manifestId, hasOcr, qualityScore, processedAt } = payload;
    this.logger.debug(`Emitting OCR update for manifest ${manifestId}`);

    this.server.to(`manifest:${manifestId}`).emit('ocr-update', {
      manifestId,
      hasOcr,
      qualityScore,
      processedAt,
    });
  }

  /**
   * Get subscription count for a manifest
   */
  getSubscriberCount(manifestId: number): number {
    return this.manifestSubscriptions.get(manifestId)?.size || 0;
  }
}
