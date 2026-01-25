import { ProgressPublisherService } from './progress-publisher.service';
import { WebSocketService } from './websocket.service';

describe('ProgressPublisherService', () => {
  it('keeps job progress monotonic across updates', () => {
    const webSocketService = {
      emitJobUpdate: jest.fn(),
      emitManifestUpdate: jest.fn(),
    } as unknown as jest.Mocked<WebSocketService>;

    const publisher = new ProgressPublisherService(webSocketService);

    publisher.publishJobUpdate({
      jobId: 'job-1',
      manifestId: 1,
      kind: 'extraction',
      progress: 25,
      status: 'processing',
    });

    publisher.publishJobUpdate({
      jobId: 'job-1',
      manifestId: 1,
      kind: 'extraction',
      progress: 0,
      status: 'active',
    });

    expect(webSocketService.emitJobUpdate).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ jobId: 'job-1', progress: 25 }),
    );
    expect(webSocketService.emitJobUpdate).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ jobId: 'job-1', progress: 25 }),
    );
  });

  it('clears job progress state when terminal', () => {
    const webSocketService = {
      emitJobUpdate: jest.fn(),
      emitManifestUpdate: jest.fn(),
    } as unknown as jest.Mocked<WebSocketService>;

    const publisher = new ProgressPublisherService(webSocketService);

    publisher.publishJobUpdate({
      jobId: 'job-1',
      manifestId: 1,
      kind: 'extraction',
      progress: 50,
      status: 'processing',
    });

    publisher.publishJobUpdate({
      jobId: 'job-1',
      manifestId: 1,
      kind: 'extraction',
      progress: 100,
      status: 'completed',
    });

    publisher.publishJobUpdate({
      jobId: 'job-1',
      manifestId: 1,
      kind: 'extraction',
      progress: 0,
      status: 'active',
    });

    expect(webSocketService.emitJobUpdate).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ progress: 0 }),
    );
  });
});

