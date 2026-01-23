import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ManifestsController } from './manifests.controller';
import { ManifestsService } from './manifests.service';
import { CsvExportService } from './csv-export.service';
import { QueueService } from '../queue/queue.service';
import { StorageService } from '../storage/storage.service';
import { ConfigService } from '@nestjs/config';
import { GroupsService } from '../groups/groups.service';

describe('ManifestsController', () => {
  let app: INestApplication;

  const manifestsService = {
    findItems: jest.fn(),
    listExtractionHistory: jest.fn(),
    getExtractionHistoryEntry: jest.fn(),
    create: jest.fn(),
  };

  const queueService = {
    addExtractionJob: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ManifestsController],
      providers: [
        { provide: ManifestsService, useValue: manifestsService },
        { provide: CsvExportService, useValue: {} },
        { provide: QueueService, useValue: queueService },
        { provide: GroupsService, useValue: {} },
        { provide: StorageService, useValue: {} },
        { provide: ConfigService, useValue: { get: () => undefined } },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not enqueue extraction jobs on upload', async () => {
    const controller = app.get(ManifestsController);
    const now = new Date('2026-01-23T00:00:00.000Z');
    manifestsService.create.mockResolvedValue({
      isDuplicate: false,
      manifest: {
        id: 1,
        filename: 'test.pdf',
        originalFilename: 'test.pdf',
        storagePath: '/uploads/test.pdf',
        fileSize: 1024,
        fileType: 'pdf',
        status: 'pending',
        groupId: 1,
        extractedData: null,
        confidence: null,
        purchaseOrder: null,
        invoiceDate: null,
        department: null,
        humanVerified: false,
        validationResults: null,
        ocrResult: null,
        ocrProcessedAt: null,
        ocrQualityScore: null,
        textCost: null,
        llmCost: null,
        extractionCost: null,
        extractionCostCurrency: null,
        textExtractorId: null,
        createdAt: now,
        updatedAt: now,
      },
    });

    await controller.uploadSingle({ id: 1 } as any, 1, {} as any);

    expect(queueService.addExtractionJob).not.toHaveBeenCalled();
  });

  it('returns manifest items', async () => {
    manifestsService.findItems.mockResolvedValue([
      {
        id: 1,
        description: 'Item',
        quantity: 2,
        unitPrice: '10.5',
        totalPrice: '21',
        manifestId: 1,
      },
    ]);

    const response = await request(app.getHttpServer())
      .get('/manifests/1/items')
      .expect(200);

    expect(response.body).toEqual([
      {
        id: 1,
        description: 'Item',
        quantity: 2,
        unitPrice: 10.5,
        totalPrice: 21,
        manifestId: 1,
      },
    ]);
  });

  it('returns extraction history', async () => {
    manifestsService.listExtractionHistory.mockResolvedValue([
      {
        jobId: 10,
        queueJobId: 'q-10',
        status: 'completed',
        llmModelId: 'model-1',
        llmModelName: 'Test Model',
        promptId: 2,
        promptName: 'Prompt A',
        fieldName: null,
        estimatedCost: 0.1,
        actualCost: 0.08,
        textEstimatedCost: 0.02,
        textActualCost: 0.02,
        llmEstimatedCost: 0.08,
        llmActualCost: 0.06,
        llmInputTokens: 100,
        llmOutputTokens: 50,
        pagesProcessed: 1,
        attemptCount: 1,
        error: null,
        cancelReason: null,
        cancelRequestedAt: null,
        canceledAt: null,
        createdAt: new Date('2026-01-21T00:00:00.000Z'),
        startedAt: new Date('2026-01-21T00:00:01.000Z'),
        completedAt: new Date('2026-01-21T00:00:03.000Z'),
        durationMs: 2000,
      },
    ]);

    const response = await request(app.getHttpServer())
      .get('/manifests/1/extraction-history')
      .expect(200);

    expect(response.body).toEqual([
      {
        jobId: 10,
        queueJobId: 'q-10',
        status: 'completed',
        llmModelId: 'model-1',
        llmModelName: 'Test Model',
        promptId: 2,
        promptName: 'Prompt A',
        fieldName: null,
        estimatedCost: 0.1,
        actualCost: 0.08,
        textEstimatedCost: 0.02,
        textActualCost: 0.02,
        llmEstimatedCost: 0.08,
        llmActualCost: 0.06,
        llmInputTokens: 100,
        llmOutputTokens: 50,
        pagesProcessed: 1,
        attemptCount: 1,
        error: null,
        cancelReason: null,
        cancelRequestedAt: null,
        canceledAt: null,
        createdAt: '2026-01-21T00:00:00.000Z',
        startedAt: '2026-01-21T00:00:01.000Z',
        completedAt: '2026-01-21T00:00:03.000Z',
        durationMs: 2000,
      },
    ]);
  });

  it('returns extraction history entry details', async () => {
    manifestsService.getExtractionHistoryEntry.mockResolvedValue({
      jobId: 10,
      queueJobId: 'q-10',
      status: 'completed',
      llmModelId: 'model-1',
      llmModelName: 'Test Model',
      promptId: null,
      promptName: null,
      fieldName: null,
      estimatedCost: 0.1,
      actualCost: 0.08,
      textEstimatedCost: 0.02,
      textActualCost: 0.02,
      llmEstimatedCost: 0.08,
      llmActualCost: 0.06,
      llmInputTokens: 100,
      llmOutputTokens: 50,
      pagesProcessed: 1,
      attemptCount: 1,
      error: null,
      cancelReason: null,
      cancelRequestedAt: null,
      canceledAt: null,
      createdAt: new Date('2026-01-21T00:00:00.000Z'),
      startedAt: new Date('2026-01-21T00:00:01.000Z'),
      completedAt: new Date('2026-01-21T00:00:03.000Z'),
      durationMs: 2000,
      systemPrompt: 'sys',
      userPrompt: 'user',
      assistantResponse: '{\"ok\":true}',
      promptTemplateContent: null,
    });

    const response = await request(app.getHttpServer())
      .get('/manifests/1/extraction-history/10')
      .expect(200);

    expect(response.body.systemPrompt).toBe('sys');
    expect(response.body.userPrompt).toBe('user');
    expect(response.body.assistantResponse).toBe('{\"ok\":true}');
  });
});
