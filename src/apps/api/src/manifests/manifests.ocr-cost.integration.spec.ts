import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ParseIntPipe } from '@nestjs/common/pipes';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ManifestsController } from './manifests.controller';
import { ManifestsService } from './manifests.service';
import { CsvExportService } from './csv-export.service';
import { QueueService } from '../queue/queue.service';
import { GroupsService } from '../groups/groups.service';
import { StorageService } from '../storage/storage.service';
import { WebSocketService } from '../websocket/websocket.service';
import { ModelEntity } from '../entities/model.entity';
import { ManifestEntity, FileType, ManifestStatus } from '../entities/manifest.entity';
import { UserEntity, UserRole } from '../entities/user.entity';
import { OcrResultDto } from './dto/ocr-result.dto';
import { ManifestOcrHistoryEntryDto } from './dto/manifest-ocr-history.dto';

/**
 * Integration tests for OCR result preview endpoints.
 *
 * These tests verify the new endpoints added for selective extraction:
 * - GET /manifests/:id/ocr - Retrieve cached OCR result
 * - POST /manifests/:id/re-extract-field - Preview field re-extraction
 */
describe('ManifestsController - OCR Endpoints Integration', () => {
  let controller: ManifestsController;
  let manifestsService: jest.Mocked<ManifestsService>;
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
  const createMockManifest = (overrides: Partial<ManifestEntity> = {}): ManifestEntity => ({
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
    contentSha256: overrides.contentSha256 ?? null,
    textCost: overrides.textCost ?? null,
    llmCost: overrides.llmCost ?? null,
    extractionCostCurrency: overrides.extractionCostCurrency ?? null,
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
      findForFilteredExtraction: jest.fn(),
      setTextExtractorForManifests: jest.fn(),
      processOcrForManifest: jest.fn(),
      buildOcrContextPreview: jest.fn(),
      listOcrHistory: jest.fn(),
    } as unknown as jest.Mocked<ManifestsService>;

    csvExportService = {
      exportCsv: jest.fn(),
      exportCsvByManifestIds: jest.fn(),
    } as unknown as jest.Mocked<CsvExportService>;

    queueService = {
      addExtractionJob: jest.fn(),
      addOcrRefreshJob: jest.fn(),
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
        { provide: QueueService, useValue: queueService },
        {
          provide: GroupsService,
          useValue: {
            findOne: jest.fn().mockResolvedValue({ project: {} }),
          },
        },
        { provide: StorageService, useValue: storageService },
        { provide: WebSocketService, useValue: webSocketService },
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

  describe('POST /manifests/:id/ocr/refresh', () => {
    it('forces OCR rebuild and returns updated OCR result', async () => {
      const ocrResult = createMockOcrResult();
      const manifest = createMockManifest({ ocrResult: null });

      manifestsService.findOne.mockResolvedValue(manifest);
      manifestsService.processOcrForManifest.mockResolvedValue(ocrResult);

      const result = await controller.refreshOcrResult(mockUser, 1, {});

      expect(manifestsService.processOcrForManifest).toHaveBeenCalledWith(manifest, {
        force: true,
        textExtractorId: undefined,
      });
      expect(result).toEqual({
        manifestId: 1,
        ocrResult,
        hasOcr: true,
        ocrProcessedAt: null,
        qualityScore: null,
      });
    });
  });

  describe('POST /manifests/:id/re-extract-field', () => {
    const mockOcrPreview = {
      fieldName: 'invoice.po_no',
      snippet: 'Invoice #001\nPO: 1234567\nDate: 2024-01-15',
      context: 'Full OCR context here...',
    };

    it('should return OCR preview for field re-extraction', async () => {
      const manifest = createMockManifest({
        ocrResult: createMockOcrResult() as unknown as ManifestEntity['ocrResult'],
      });

      manifestsService.findOne.mockResolvedValue(manifest);
      manifestsService.buildOcrContextPreview.mockReturnValue(mockOcrPreview);
      queueService.addExtractionJob.mockResolvedValue('job-123');

      const result = await controller.reExtractField(mockUser, 1, {
        fieldName: 'invoice.po_no',
        llmModelId: 'llm-model-1',
        previewOnly: false,
      });

      expect(result).toEqual({
        fieldName: 'invoice.po_no',
        ocrPreview: mockOcrPreview,
        jobId: 'job-123',
      });
      expect(manifestsService.buildOcrContextPreview).toHaveBeenCalledWith(manifest, 'invoice.po_no');
      expect(queueService.addExtractionJob).toHaveBeenCalled();
    });

    it('rejects re-extract preview when OCR is not present', async () => {
      const manifest = createMockManifest({ ocrResult: null });

      manifestsService.findOne.mockResolvedValue(manifest);
      await expect(
        controller.reExtractField(mockUser, 1, {
          fieldName: 'invoice.po_no',
          previewOnly: false,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should only return preview when previewOnly is true', async () => {
      const manifest = createMockManifest({
        ocrResult: createMockOcrResult() as unknown as ManifestEntity['ocrResult'],
      });

      manifestsService.findOne.mockResolvedValue(manifest);
      manifestsService.buildOcrContextPreview.mockReturnValue(mockOcrPreview);

      const result = await controller.reExtractField(mockUser, 1, {
        fieldName: 'invoice.po_no',
        llmModelId: 'llm-model-1',
        previewOnly: true,
      });

      expect(result).toEqual({
        fieldName: 'invoice.po_no',
        ocrPreview: mockOcrPreview,
      });
      expect(queueService.addExtractionJob).not.toHaveBeenCalled();
    });
  });

  describe('POST /manifests/extract-bulk', () => {
    it('queues extraction jobs', async () => {
      const manifests = [
        createMockManifest({
          id: 1,
          ocrResult: createMockOcrResult() as unknown as ManifestEntity['ocrResult'],
        }),
        createMockManifest({ id: 2, ocrResult: createMockOcrResult() as unknown as ManifestEntity['ocrResult'] }),
      ];

      manifestsService.findManyByIds.mockResolvedValue(manifests);
      queueService.addExtractionJob.mockResolvedValueOnce('job-1').mockResolvedValueOnce('job-2');

      const result = await controller.extractBulk(mockUser, {
        manifestIds: [1, 2],
        llmModelId: 'llm-model-1',
      });

      expect(queueService.addExtractionJob).toHaveBeenCalledTimes(2);
      expect(result.manifestCount).toBe(2);
      expect(result.jobIds).toEqual(['job-1', 'job-2']);
    });
  });

  describe('POST /groups/:groupId/manifests/extract-filtered', () => {
    it('queues jobs and returns job-to-manifest mapping', async () => {
      const manifests = [
        createMockManifest({
          id: 11,
          ocrResult: createMockOcrResult() as unknown as ManifestEntity['ocrResult'],
        }),
        createMockManifest({
          id: 22,
          ocrResult: createMockOcrResult() as unknown as ManifestEntity['ocrResult'],
        }),
      ];

      manifestsService.findForFilteredExtraction.mockResolvedValue(manifests);
      queueService.addExtractionJob
        .mockResolvedValueOnce('job-11')
        .mockResolvedValueOnce('job-22');

      const result = await controller.extractFiltered(mockUser, 1, {
        filters: {},
        llmModelId: 'llm-model-1',
      });

      expect(queueService.addExtractionJob).toHaveBeenCalledTimes(2);
      expect(result.manifestCount).toBe(2);
      expect(result.jobIds).toEqual(['job-11', 'job-22']);
      expect(result.jobs).toEqual([
        { jobId: 'job-11', manifestId: 11 },
        { jobId: 'job-22', manifestId: 22 },
      ]);
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

  describe('POST /manifests/:id/ocr/refresh-job', () => {
    it('should enqueue OCR refresh job and return jobId', async () => {
      const manifest = createMockManifest();
      manifestsService.findOne.mockResolvedValue(manifest);
      queueService.addOcrRefreshJob.mockResolvedValue('job-123');

      const result = await controller.queueOcrRefreshJob(mockUser, 1, { textExtractorId: 'extractor-1' });

      expect(result).toEqual({ jobId: 'job-123' });
      expect(manifestsService.findOne).toHaveBeenCalledWith(mockUser, 1);
      expect(queueService.addOcrRefreshJob).toHaveBeenCalledWith(1, 'extractor-1');
    });

    it('should throw NotFoundException when manifest does not exist', async () => {
      manifestsService.findOne.mockRejectedValue(new NotFoundException());

      await expect(controller.queueOcrRefreshJob(mockUser, 999, {})).rejects.toBeInstanceOf(NotFoundException);
      expect(queueService.addOcrRefreshJob).not.toHaveBeenCalled();
    });
  });

  describe('GET /manifests/:id/ocr-history', () => {
    it('should return OCR history entries', async () => {
      const manifest = createMockManifest();
      manifestsService.findOne.mockResolvedValue(manifest);

      const now = new Date('2026-01-23T00:00:00.000Z');
      const entries: ManifestOcrHistoryEntryDto[] = [
        {
          jobId: 1,
          queueJobId: 'job-1',
          status: 'completed',
          attemptCount: 1,
          error: null,
          cancelReason: null,
          cancelRequestedAt: null,
          canceledAt: null,
          createdAt: now,
          startedAt: now,
          completedAt: now,
          durationMs: 0,
        },
      ];
      manifestsService.listOcrHistory.mockResolvedValue(entries);

      const result = await controller.getOcrHistory(mockUser, 1, '50');

      expect(result).toEqual(entries);
      expect(manifestsService.listOcrHistory).toHaveBeenCalledWith(mockUser, 1, { limit: 50 });
    });
  });
});
