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
import { ExtractManifestsUseCase } from '../usecases/extract-manifests.usecase';
import { UpdateManifestUseCase } from '../usecases/update-manifest.usecase';
import { UploadManifestsUseCase } from '../usecases/upload-manifests.usecase';
import { AllExceptionsFilter } from '../common/filters/all-exceptions.filter';
import { XlsxExportService } from './xlsx-export.service';
import { Readable } from 'stream';

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

  const uploadManifestsUseCase = {
    uploadSingle: jest.fn(),
    uploadBatch: jest.fn(),
  };

  const extractManifestsUseCase = {
    extractSingle: jest.fn(),
    extractBulk: jest.fn(),
    extractFiltered: jest.fn(),
    reExtract: jest.fn(),
    reExtractField: jest.fn(),
  };

  const updateManifestUseCase = {
    update: jest.fn(),
  };

  const xlsxExportService = {
    exportXlsx: jest.fn(),
    exportXlsxByManifestIds: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ManifestsController],
      providers: [
        { provide: ManifestsService, useValue: manifestsService },
        { provide: CsvExportService, useValue: {} },
        { provide: XlsxExportService, useValue: xlsxExportService },
        { provide: QueueService, useValue: queueService },
        { provide: StorageService, useValue: {} },
        { provide: ConfigService, useValue: { get: () => undefined } },
        { provide: UploadManifestsUseCase, useValue: uploadManifestsUseCase },
        { provide: ExtractManifestsUseCase, useValue: extractManifestsUseCase },
        { provide: UpdateManifestUseCase, useValue: updateManifestUseCase },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new AllExceptionsFilter());
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
    uploadManifestsUseCase.uploadSingle.mockResolvedValue({
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

  it('delegates extract endpoint to ExtractManifestsUseCase', async () => {
    const controller = app.get(ManifestsController);
    extractManifestsUseCase.extractSingle.mockResolvedValue({ jobId: 'job-123' });

    const result = await controller.extract({ id: 1 } as any, 1, { promptId: 2 } as any);

    expect(extractManifestsUseCase.extractSingle).toHaveBeenCalledWith(
      { id: 1 },
      1,
      { promptId: 2 },
    );
    expect(result).toEqual({ jobId: 'job-123' });
  });

  it('maps use-case errors to API error envelope', async () => {
    extractManifestsUseCase.extractSingle.mockRejectedValue(new Error('boom'));

    const response = await request(app.getHttpServer())
      .post('/manifests/1/extract')
      .set('x-request-id', 'req-1')
      .send({})
      .expect(500);

    expect(response.body).toMatchObject({
      error: {
        requestId: 'req-1',
      },
    });
    expect(typeof response.body.error.code).toBe('string');
    expect(typeof response.body.error.message).toBe('string');
  });

  it('streams filtered XLSX export', async () => {
    xlsxExportService.exportXlsx.mockResolvedValue({
      filename: 'test.xlsx',
      contentType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      stream: Readable.from([Buffer.from('xlsx')]),
    });

    const response = await request(app.getHttpServer())
      .get('/manifests/export/xlsx')
      .buffer(true)
      .parse((res, callback) => {
        const chunks: Buffer[] = [];
        res.on('data', (c) => chunks.push(Buffer.from(c)));
        res.on('end', () => callback(null, Buffer.concat(chunks)));
      })
      .expect(200);

    expect(response.headers['content-type']).toContain(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    expect(response.headers['content-disposition']).toContain('test.xlsx');
    expect(response.body.toString('utf-8')).toBe('xlsx');
  });

  it('streams selected XLSX export', async () => {
    xlsxExportService.exportXlsxByManifestIds.mockResolvedValue({
      filename: 'selected.xlsx',
      contentType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      stream: Readable.from([Buffer.from('xlsx-selected')]),
    });

    const response = await request(app.getHttpServer())
      .post('/manifests/export/xlsx')
      .send({ manifestIds: [1, 2] })
      .buffer(true)
      .parse((res, callback) => {
        const chunks: Buffer[] = [];
        res.on('data', (c) => chunks.push(Buffer.from(c)));
        res.on('end', () => callback(null, Buffer.concat(chunks)));
      })
      .expect(201);

    expect(response.headers['content-disposition']).toContain('selected.xlsx');
    expect(response.body.toString('utf-8')).toBe('xlsx-selected');
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
