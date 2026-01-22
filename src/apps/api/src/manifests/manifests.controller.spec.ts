import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ManifestsController } from './manifests.controller';
import { ManifestsService } from './manifests.service';
import { CsvExportService } from './csv-export.service';
import { CostEstimateService } from './cost-estimate.service';
import { QueueService } from '../queue/queue.service';
import { StorageService } from '../storage/storage.service';
import { ConfigService } from '@nestjs/config';

describe('ManifestsController', () => {
  let app: INestApplication;

  const manifestsService = {
    findItems: jest.fn(),
    listExtractionHistory: jest.fn(),
    getExtractionHistoryEntry: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ManifestsController],
      providers: [
        { provide: ManifestsService, useValue: manifestsService },
        { provide: CsvExportService, useValue: {} },
        { provide: CostEstimateService, useValue: {} },
        { provide: QueueService, useValue: {} },
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
