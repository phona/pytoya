import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ParseIntPipe } from '@nestjs/common/pipes';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ManifestsController } from './manifests.controller';
import { ManifestsService } from './manifests.service';
import { CostEstimateService } from './cost-estimate.service';
import { CsvExportService } from './csv-export.service';
import { QueueService } from '../queue/queue.service';
import { StorageService } from '../storage/storage.service';
import { WebSocketService } from '../websocket/websocket.service';
import { ModelEntity } from '../entities/model.entity';
import { ConfigService } from '@nestjs/config';
import { ManifestEntity, FileType, ManifestStatus } from '../entities/manifest.entity';
import { UserEntity, UserRole } from '../entities/user.entity';
import { OcrResultDto } from './dto/ocr-result.dto';

/**
 * Integration tests for OCR result preview and cost estimation endpoints.
 *
 * These tests verify the new endpoints added for selective extraction:
 * - GET /manifests/:id/ocr - Retrieve cached OCR result
 * - POST /manifests/:id/ocr - Trigger OCR processing with force option
 * - GET /manifests/cost-estimate - Calculate cost for extraction
 * - POST /manifests/:id/re-extract-field - Preview field re-extraction
 */
describe('ManifestsController - OCR and Cost Endpoints Integration', () => {
  let controller: ManifestsController;
  let manifestsService: jest.Mocked<ManifestsService>;
  let costEstimateService: jest.Mocked<CostEstimateService>;
  let csvExportService: jest.Mocked<CsvExportService>;
  let queueService: jest.Mocked<QueueService>;
  let storageService: jest.Mocked<StorageService>;
  let webSocketService: jest.Mocked<WebSocketService>;
  let manifestRepository: jest.Mocked<Repository<ManifestEntity>>;

  // Mock user
  const mockUser: UserEntity = {
    id: 1,
    username: 'testuser',
    password: 'hash',
    role: UserRole.USER,
    failedLoginAttempts: 0,
    lockedUntil: null,
    lastLoginAt: null,
    lastFailedLoginAt: null,
    projects: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    toJSON() {
      return {
        id: this.id,
        username: this.username,
        role: this.role,
      };
    },
  };

  // Mock manifest
  const createMockManifest = (overrides?: Partial<ManifestEntity>): ManifestEntity => ({
    id: 1,
    filename: 'test.pdf',
    originalFilename: 'test.pdf',
    storagePath: '/uploads/test.pdf',
    fileSize: 1024,
    fileType: FileType.PDF,
    status: ManifestStatus.PENDING,
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
    extractionCost: null,
    textExtractorId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    group: {
      id: 1,
      name: 'Test Group',
      projectId: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      project: null as any,
      manifests: [],
    },
    jobs: [],
    manifestItems: [],
    extractionHistory: [],
    textExtractor: null,
    ...overrides,
  });

  const createMockOcrResult = (): OcrResultDto => ({
    document: {
      type: 'invoice',
      language: ['zh'],
      pages: 2,
    },
    pages: [
      {
        pageNumber: 1,
        text: 'Invoice #001\nPO: 1234567\nDate: 2024-01-15',
        markdown: '# Invoice\n\n**PO:** 1234567\n**Date:** 2024-01-15',
        confidence: 0.92,
        layout: {
          elements: [
            { type: 'text', confidence: 0.95, position: { x: 0, y: 0, width: 100, height: 20 }, content: 'Invoice' },
          ],
          tables: [],
        },
      },
      {
        pageNumber: 2,
        text: 'Item 1: $100\nItem 2: $200',
        markdown: '# Items\n\nItem 1: $100\nItem 2: $200',
        confidence: 0.88,
        layout: {
          elements: [],
          tables: [
            { rows: 3, columns: 2, headers: [], data: [], confidence: 0.85 },
          ],
        },
      },
    ],
    metadata: {
      processedAt: '2024-01-15T10:30:00Z',
      modelVersion: 'PaddleOCR-VL',
      processingTimeMs: 1500,
    },
  });

  beforeEach(async () => {
    // Create mock services
    manifestsService = {
      findOne: jest.fn(),
      findManyByIds: jest.fn(),
      processOcrForManifest: jest.fn(),
      buildOcrContextPreview: jest.fn(),
    } as unknown as jest.Mocked<ManifestsService>;

    costEstimateService = {
      estimateCost: jest.fn(),
      estimateFieldCost: jest.fn(),
    } as unknown as jest.Mocked<CostEstimateService>;

    csvExportService = {
      exportCsv: jest.fn(),
      exportCsvByManifestIds: jest.fn(),
    } as unknown as jest.Mocked<CsvExportService>;

    queueService = {
      addExtractionJob: jest.fn(),
    } as unknown as jest.Mocked<QueueService>;

    storageService = {
      fileExists: jest.fn(),
    } as unknown as jest.Mocked<StorageService>;

    webSocketService = {
      emitOcrUpdate: jest.fn(),
    } as unknown as jest.Mocked<WebSocketService>;

    manifestRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
    } as unknown as jest.Mocked<Repository<ManifestEntity>>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ManifestsController],
      providers: [
        { provide: CsvExportService, useValue: csvExportService },
        { provide: ManifestsService, useValue: manifestsService },
        { provide: CostEstimateService, useValue: costEstimateService },
        { provide: QueueService, useValue: queueService },
        { provide: StorageService, useValue: storageService },
        { provide: WebSocketService, useValue: webSocketService },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue(true) } },
        { provide: getRepositoryToken(ManifestEntity), useValue: manifestRepository },
        { provide: getRepositoryToken(ModelEntity), useValue: {} },
      ],
    }).compile();

    controller = module.get<ManifestsController>(ManifestsController);
  });

  describe('GET /manifests/:id/ocr', () => {
    it('should return OCR result for manifest with cached OCR', async () => {
      const ocrResult = createMockOcrResult();
      const manifest = createMockManifest({
        ocrResult: ocrResult as unknown as ManifestEntity['ocrResult'],
        ocrProcessedAt: new Date('2024-01-15T10:30:00Z'),
        ocrQualityScore: 90,
      });

      manifestsService.findOne.mockResolvedValue(manifest);

      const result = await controller.getOcrResult(mockUser, 1);

      expect(result).toEqual({
        manifestId: 1,
        ocrResult,
        hasOcr: true,
        ocrProcessedAt: new Date('2024-01-15T10:30:00Z'),
        qualityScore: 90,
      });
      expect(manifestsService.findOne).toHaveBeenCalledWith(mockUser, 1);
    });

    it('should return null OCR result for manifest without OCR', async () => {
      const manifest = createMockManifest({ ocrResult: null });
      manifestsService.findOne.mockResolvedValue(manifest);

      const result = await controller.getOcrResult(mockUser, 1);

      expect(result).toEqual({
        manifestId: 1,
        ocrResult: null,
        hasOcr: false,
        ocrProcessedAt: null,
        qualityScore: null,
      });
    });

    it('should throw NotFoundException when manifest not found', async () => {
      manifestsService.findOne.mockRejectedValue(new NotFoundException('Manifest not found'));

      await expect(controller.getOcrResult(mockUser, 999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('POST /manifests/:id/ocr', () => {
    it('should trigger OCR processing with force=true', async () => {
      const ocrResult = createMockOcrResult();
      const manifest = createMockManifest({
        ocrResult: ocrResult as unknown as ManifestEntity['ocrResult'],
        ocrProcessedAt: new Date(),
        ocrQualityScore: 85,
      });

      manifestsService.findOne.mockResolvedValue(manifest);
      manifestsService.processOcrForManifest.mockResolvedValue(ocrResult);

      const result = await controller.triggerOcr(mockUser, 1, 'true');

      expect(result.ocrResult).toBe(ocrResult);
      expect(manifestsService.processOcrForManifest).toHaveBeenCalledWith(manifest, {
        force: true,
        textExtractorId: undefined,
      });
    });

    it('should trigger OCR processing without force when OCR does not exist', async () => {
      const ocrResult = createMockOcrResult();
      const manifest = createMockManifest({ ocrResult: null });

      manifestsService.findOne.mockResolvedValue(manifest);
      manifestsService.processOcrForManifest.mockResolvedValue(ocrResult);

      const result = await controller.triggerOcr(mockUser, 1);

      expect(result.ocrResult).toBe(ocrResult);
      expect(manifestsService.processOcrForManifest).toHaveBeenCalledWith(manifest, {
        force: false,
        textExtractorId: undefined,
      });
    });

    it('should return cached OCR when force=false and OCR exists', async () => {
      const ocrResult = createMockOcrResult();
      const manifest = createMockManifest({
        ocrResult: ocrResult as unknown as ManifestEntity['ocrResult'],
        ocrProcessedAt: new Date(),
        ocrQualityScore: 90,
      });

      manifestsService.findOne.mockResolvedValue(manifest);
      manifestsService.processOcrForManifest.mockResolvedValue(ocrResult);

      const result = await controller.triggerOcr(mockUser, 1, 'false');

      expect(manifestsService.processOcrForManifest).toHaveBeenCalledWith(manifest, {
        force: false,
        textExtractorId: undefined,
      });
    });

    it('should handle parsing boolean force parameter', async () => {
      const manifest = createMockManifest({ ocrResult: null });
      manifestsService.findOne.mockResolvedValue(manifest);
      manifestsService.processOcrForManifest.mockResolvedValue(createMockOcrResult());

      await controller.triggerOcr(mockUser, 1, 'true');
      expect(manifestsService.processOcrForManifest).toHaveBeenCalledWith(manifest, {
        force: true,
        textExtractorId: undefined,
      });

      await controller.triggerOcr(mockUser, 1, 'false');
      expect(manifestsService.processOcrForManifest).toHaveBeenCalledWith(manifest, {
        force: false,
        textExtractorId: undefined,
      });

      await controller.triggerOcr(mockUser, 1);
      expect(manifestsService.processOcrForManifest).toHaveBeenCalledWith(manifest, {
        force: false,
        textExtractorId: undefined,
      });
    });
  });

  describe('GET /manifests/cost-estimate', () => {
    const mockCostEstimate = {
      manifestCount: 2,
      estimatedTokensMin: 1000,
      estimatedTokensMax: 1500,
      estimatedCostMin: 0.02,
      estimatedCostMax: 0.03,
      estimatedTextCost: 0.005,
      estimatedLlmCostMin: 0.015,
      estimatedLlmCostMax: 0.025,
      currency: 'USD',
    };

    it('should return cost estimate for provided manifest IDs', async () => {
      const manifests = [
        createMockManifest({ id: 1 }),
        createMockManifest({ id: 2 }),
      ];

      manifestsService.findManyByIds.mockResolvedValue(manifests);
      costEstimateService.estimateCost.mockResolvedValue(mockCostEstimate);

      const result = await controller.getCostEstimate(mockUser, '1,2', 'llm-model-1', 'extractor-1');

      expect(result).toEqual(mockCostEstimate);
      expect(manifestsService.findManyByIds).toHaveBeenCalledWith(mockUser, [1, 2]);
      expect(costEstimateService.estimateCost).toHaveBeenCalledWith({
        manifests,
        llmModelId: 'llm-model-1',
        textExtractorId: 'extractor-1',
      });
    });

    it('should handle empty manifest IDs', async () => {
      manifestsService.findManyByIds.mockResolvedValue([]);
      costEstimateService.estimateCost.mockResolvedValue(mockCostEstimate);

      const result = await controller.getCostEstimate(mockUser, '', 'llm-model-1');

      expect(result).toEqual(mockCostEstimate);
      expect(manifestsService.findManyByIds).toHaveBeenCalledWith(mockUser, []);
      expect(costEstimateService.estimateCost).toHaveBeenCalledWith({
        manifests: [],
        llmModelId: 'llm-model-1',
        textExtractorId: undefined,
      });
    });

    it('should handle missing model IDs by using defaults', async () => {
      const manifests = [createMockManifest()];
      manifestsService.findManyByIds.mockResolvedValue(manifests);
      costEstimateService.estimateCost.mockResolvedValue(mockCostEstimate);

      await controller.getCostEstimate(mockUser, '1');

      expect(costEstimateService.estimateCost).toHaveBeenCalledWith({
        manifests,
        llmModelId: undefined,
        textExtractorId: undefined,
      });
    });

    it('should propagate BadRequestException from cost service', async () => {
      const manifests = [createMockManifest()];
      manifestsService.findManyByIds.mockResolvedValue(manifests);
      costEstimateService.estimateCost.mockRejectedValue(
        new BadRequestException('LLM model is required'),
      );

      await expect(
        controller.getCostEstimate(mockUser, '1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('POST /manifests/:id/re-extract-field', () => {
    const mockOcrPreview = {
      fieldName: 'invoice.po_no',
      snippet: 'Invoice #001\nPO: 1234567\nDate: 2024-01-15',
      context: 'Full OCR context here...',
    };

    const mockCostEstimate = {
      cost: 0.005,
      currency: 'USD',
      tokens: 150,
    };

    it('should return OCR preview and cost estimate for field re-extraction', async () => {
      const manifest = createMockManifest({
        ocrResult: createMockOcrResult() as unknown as ManifestEntity['ocrResult'],
      });

      manifestsService.findOne.mockResolvedValue(manifest);
      manifestsService.buildOcrContextPreview.mockReturnValue(mockOcrPreview);
      costEstimateService.estimateFieldCost.mockResolvedValue(mockCostEstimate);
      queueService.addExtractionJob.mockResolvedValue('job-123');

      const result = await controller.reExtractField(mockUser, 1, {
        fieldName: 'invoice.po_no',
        llmModelId: 'llm-model-1',
        previewOnly: false,
      });

      expect(result).toEqual({
        fieldName: 'invoice.po_no',
        ocrPreview: mockOcrPreview,
        estimatedCost: mockCostEstimate.cost,
        currency: mockCostEstimate.currency,
        jobId: 'job-123',
      });
      expect(manifestsService.buildOcrContextPreview).toHaveBeenCalledWith(manifest, 'invoice.po_no');
      expect(costEstimateService.estimateFieldCost).toHaveBeenCalledWith({
        manifest,
        fieldName: 'invoice.po_no',
        snippet: mockOcrPreview.snippet,
        llmModelId: 'llm-model-1',
      });
      expect(queueService.addExtractionJob).toHaveBeenCalled();
    });

    it('should trigger OCR if not present when re-extracting field', async () => {
      const manifest = createMockManifest({ ocrResult: null });
      const ocrResult = createMockOcrResult();

      manifestsService.findOne.mockResolvedValue(manifest);
      manifestsService.processOcrForManifest.mockResolvedValue(ocrResult);
      manifestsService.buildOcrContextPreview.mockReturnValue(mockOcrPreview);
      costEstimateService.estimateFieldCost.mockResolvedValue(mockCostEstimate);
      queueService.addExtractionJob.mockResolvedValue('job-123');

      const result = await controller.reExtractField(mockUser, 1, {
        fieldName: 'invoice.po_no',
        previewOnly: false,
      });

      expect(manifestsService.processOcrForManifest).toHaveBeenCalledWith(manifest);
      expect(result.jobId).toBe('job-123');
    });

    it('should only return preview when previewOnly is true', async () => {
      const manifest = createMockManifest({
        ocrResult: createMockOcrResult() as unknown as ManifestEntity['ocrResult'],
      });

      manifestsService.findOne.mockResolvedValue(manifest);
      manifestsService.buildOcrContextPreview.mockReturnValue(mockOcrPreview);
      costEstimateService.estimateFieldCost.mockResolvedValue(mockCostEstimate);

      const result = await controller.reExtractField(mockUser, 1, {
        fieldName: 'invoice.po_no',
        llmModelId: 'llm-model-1',
        previewOnly: true,
      });

      expect(result).toEqual({
        fieldName: 'invoice.po_no',
        ocrPreview: mockOcrPreview,
        estimatedCost: mockCostEstimate.cost,
        currency: mockCostEstimate.currency,
      });
      expect(queueService.addExtractionJob).not.toHaveBeenCalled();
    });
  });

  describe('POST /manifests/extract-bulk', () => {
    const mockEstimate = {
      manifestCount: 2,
      estimatedTokensMin: 1000,
      estimatedTokensMax: 1500,
      estimatedCostMin: 0.02,
      estimatedCostMax: 0.03,
      estimatedTextCost: 0.005,
      estimatedLlmCostMin: 0.015,
      estimatedLlmCostMax: 0.025,
      currency: 'USD',
    };

    it('returns cost estimate without queuing when dryRun is true', async () => {
      const manifestWithOcr = createMockManifest({
        id: 1,
        ocrResult: createMockOcrResult() as unknown as ManifestEntity['ocrResult'],
      });
      const manifestWithoutOcr = createMockManifest({ id: 2, ocrResult: null });

      manifestsService.findManyByIds.mockResolvedValue([
        manifestWithOcr,
        manifestWithoutOcr,
      ]);
      manifestsService.processOcrForManifest.mockResolvedValue(createMockOcrResult());
      costEstimateService.estimateCost.mockResolvedValue(mockEstimate);

      const result = await controller.extractBulk(mockUser, {
        manifestIds: [1, 2],
        llmModelId: 'llm-model-1',
        textExtractorId: 'extractor-1',
        dryRun: true,
      });

      expect(result).toEqual({
        manifestCount: 2,
        estimatedCost: { min: 0.02, max: 0.03 },
        currency: 'USD',
      });
      expect(manifestsService.processOcrForManifest).toHaveBeenCalledWith(
        manifestWithoutOcr,
      );
      expect(queueService.addExtractionJob).not.toHaveBeenCalled();
    });

    it('queues extraction jobs when dryRun is false', async () => {
      const manifests = [
        createMockManifest({
          id: 1,
          ocrResult: createMockOcrResult() as unknown as ManifestEntity['ocrResult'],
        }),
        createMockManifest({ id: 2, ocrResult: createMockOcrResult() as unknown as ManifestEntity['ocrResult'] }),
      ];

      manifestsService.findManyByIds.mockResolvedValue(manifests);
      costEstimateService.estimateCost.mockResolvedValue(mockEstimate);
      queueService.addExtractionJob.mockResolvedValueOnce('job-1').mockResolvedValueOnce('job-2');

      const result = await controller.extractBulk(mockUser, {
        manifestIds: [1, 2],
        llmModelId: 'llm-model-1',
      });

      expect(queueService.addExtractionJob).toHaveBeenCalledTimes(2);
      expect(result.manifestCount).toBe(2);
      expect(result.jobIds).toEqual(['job-1', 'job-2']);
      expect(result.estimatedCost).toEqual({ min: 0.02, max: 0.03 });
    });
  });

  describe('POST /manifests/:id/re-extract', () => {
    it('should queue re-extraction job for entire manifest', async () => {
      const manifest = createMockManifest();
      manifestsService.findOne.mockResolvedValue(manifest);
      queueService.addExtractionJob.mockResolvedValue('job-456');

      const result = await controller.reExtract(mockUser, 1, {
        fieldName: 'invoice.po_no',
        llmModelId: 'llm-model-1',
        promptId: 1,
      });

      expect(result).toEqual({ jobId: 'job-456' });
      expect(queueService.addExtractionJob).toHaveBeenCalledWith(
        1,
        'llm-model-1',
        1,
        'invoice.po_no',
      );
    });
  });
});
