import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ModelEntity } from '../entities/model.entity';
import { ManifestEntity } from '../entities/manifest.entity';
import { ModelPricingService } from '../models/model-pricing.service';
import { CostEstimateService } from './cost-estimate.service';
import { OcrResultDto } from './dto/ocr-result.dto';

describe('CostEstimateService', () => {
  let service: CostEstimateService;
  let modelRepository: jest.Mocked<Repository<ModelEntity>>;
  let modelPricingService: jest.Mocked<ModelPricingService>;

  const mockLlmModel: ModelEntity = {
    id: 'llm-model-1',
    name: 'GPT-4o',
    adapterType: 'openai',
    parameters: { baseUrl: 'https://api.openai.com/v1', apiKey: 'test', modelName: 'gpt-4o' },
    pricing: {
      llm: {
        inputPrice: 2.5,
        outputPrice: 10.0,
        currency: 'USD',
      },
      effectiveDate: new Date().toISOString(),
    },
    pricingHistory: [],
    description: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockOcrModel: ModelEntity = {
    id: 'ocr-model-1',
    name: 'PaddleOCR-VL',
    adapterType: 'paddlex',
    parameters: { baseUrl: 'http://localhost:8080' },
    pricing: {
      ocr: {
        pricePerPage: 0.001,
        currency: 'USD',
      },
      effectiveDate: new Date().toISOString(),
    },
    pricingHistory: [],
    description: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const createMockManifest = (overrides?: Partial<ManifestEntity>): ManifestEntity => ({
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
    extractionCost: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as ManifestEntity);

  const createMockOcrResult = (textLength: number, pages: number): OcrResultDto => ({
    document: {
      type: 'invoice',
      language: ['zh'],
      pages,
    },
    pages: Array.from({ length: pages }, (_, i) => ({
      pageNumber: i + 1,
      text: 'a'.repeat(Math.ceil(textLength / pages)),
      markdown: `# Page ${i + 1}`,
      confidence: 0.9,
      layout: {
        elements: [],
        tables: [],
      },
    })),
    metadata: {
      processedAt: new Date().toISOString(),
      modelVersion: 'PaddleOCR-VL',
      processingTimeMs: 1000,
    },
  });

  beforeEach(async () => {
    modelRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
    } as unknown as jest.Mocked<Repository<ModelEntity>>;

    modelPricingService = {
      calculateOcrCost: jest.fn(),
      calculateLlmCost: jest.fn(),
      calculateTotalExtractionCost: jest.fn(),
      getCurrency: jest.fn(),
    } as unknown as jest.Mocked<ModelPricingService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CostEstimateService,
        { provide: getRepositoryToken(ModelEntity), useValue: modelRepository },
        { provide: ModelPricingService, useValue: modelPricingService },
      ],
    }).compile();

    service = module.get<CostEstimateService>(CostEstimateService);

    // Set up default mock returns
    modelPricingService.calculateOcrCost.mockImplementation((pages: number) => pages * 0.001);
    modelPricingService.calculateLlmCost.mockImplementation((input: number, output: number) =>
      (input / 1_000_000) * 2.5 + (output / 1_000_000) * 10.0,
    );
    modelPricingService.getCurrency.mockReturnValue('USD');
  });

  describe('estimateCost', () => {
    it('throws BadRequestException when no manifests provided', async () => {
      await expect(service.estimateCost({ manifests: [] })).rejects.toThrow(
        new BadRequestException('No manifests provided for cost estimate'),
      );
    });

    it('throws BadRequestException when LLM model is not found', async () => {
      const manifests = [createMockManifest()];
      modelRepository.findOne.mockResolvedValue(null);

      await expect(
        service.estimateCost({ manifests, llmModelId: 'non-existent' }),
      ).rejects.toThrow(new BadRequestException('LLM model non-existent not found'));
    });

    it('calculates cost estimate for manifests with OCR results', async () => {
      const ocrResult = createMockOcrResult(4000, 3); // 4000 chars, 3 pages
      const manifests = [
        createMockManifest({ ocrResult: ocrResult as unknown as ManifestEntity['ocrResult'] }),
      ];

      modelRepository.findOne
        .mockResolvedValueOnce(mockLlmModel)
        .mockResolvedValueOnce(mockOcrModel);

      const result = await service.estimateCost({
        manifests,
        llmModelId: 'llm-model-1',
        ocrModelId: 'ocr-model-1',
      });

      expect(result.manifestCount).toBe(1);
      expect(result.estimatedTokensMin).toBeGreaterThan(0);
      expect(result.estimatedTokensMax).toBeGreaterThan(0);
      expect(result.estimatedOcrCost).toBe(0.003); // 3 pages * 0.001
      expect(result.currency).toBe('USD');
    });

    it('calculates cost estimate for manifests without OCR results', async () => {
      const manifests = [createMockManifest({ ocrResult: null })];

      modelRepository.findOne.mockResolvedValue(mockLlmModel);

      const result = await service.estimateCost({
        manifests,
        llmModelId: 'llm-model-1',
      });

      expect(result.manifestCount).toBe(1);
      expect(result.estimatedTokensMin).toBe(0);
      expect(result.estimatedTokensMax).toBe(0);
      expect(result.estimatedOcrCost).toBe(0);
    });

    it('calculates cost estimate for multiple manifests', async () => {
      const ocrResult1 = createMockOcrResult(2000, 2);
      const ocrResult2 = createMockOcrResult(3000, 3);
      const manifests = [
        createMockManifest({ ocrResult: ocrResult1 as unknown as ManifestEntity['ocrResult'] }),
        createMockManifest({ ocrResult: ocrResult2 as unknown as ManifestEntity['ocrResult'] }),
      ];

      modelRepository.findOne
        .mockResolvedValueOnce(mockLlmModel)
        .mockResolvedValueOnce(mockOcrModel);

      const result = await service.estimateCost({
        manifests,
        llmModelId: 'llm-model-1',
        ocrModelId: 'ocr-model-1',
      });

      expect(result.manifestCount).toBe(2);
      expect(result.estimatedOcrCost).toBe(0.005); // 5 pages * 0.001
      expect(result.estimatedTokensMin).toBeGreaterThan(0);
    });

    it('handles missing OCR model', async () => {
      const ocrResult = createMockOcrResult(2000, 2);
      const manifests = [
        createMockManifest({ ocrResult: ocrResult as unknown as ManifestEntity['ocrResult'] }),
      ];

      modelRepository.findOne.mockResolvedValue(mockLlmModel);

      const result = await service.estimateCost({
        manifests,
        llmModelId: 'llm-model-1',
      });

      expect(result.estimatedOcrCost).toBe(0);
      expect(modelRepository.findOne).toHaveBeenCalledTimes(1);
    });

    it('uses pricing service for currency detection', async () => {
      const manifests = [createMockManifest()];
      modelRepository.findOne.mockResolvedValue(mockLlmModel);
      modelPricingService.getCurrency.mockReturnValue('EUR');

      const result = await service.estimateCost({
        manifests,
        llmModelId: 'llm-model-1',
      });

      expect(result.currency).toBe('EUR');
      expect(modelPricingService.getCurrency).toHaveBeenCalled();
    });

    it('calculates min and max LLM costs with output token estimates', async () => {
      const ocrResult = createMockOcrResult(4000, 2);
      const manifests = [
        createMockManifest({ ocrResult: ocrResult as unknown as ManifestEntity['ocrResult'] }),
      ];

      modelRepository.findOne.mockResolvedValue(mockLlmModel);

      await service.estimateCost({
        manifests,
        llmModelId: 'llm-model-1',
      });

      // Verify that calculateLlmCost was called with different output estimates
      expect(modelPricingService.calculateLlmCost).toHaveBeenCalled();
    });
  });

  describe('estimateFieldCost', () => {
    it('throws BadRequestException when LLM model is not found', async () => {
      const manifest = createMockManifest();
      modelRepository.findOne.mockResolvedValue(null);

      await expect(
        service.estimateFieldCost({
          manifest,
          fieldName: 'invoice.po_no',
          snippet: 'Sample OCR text',
          llmModelId: 'non-existent',
        }),
      ).rejects.toThrow(new BadRequestException('LLM model non-existent not found'));
    });

    it('estimates cost based on snippet length', async () => {
      const manifest = createMockManifest();
      const snippet = 'a'.repeat(400); // 400 characters

      modelRepository.findOne.mockResolvedValue(mockLlmModel);

      const result = await service.estimateFieldCost({
        manifest,
        fieldName: 'invoice.po_no',
        snippet,
        llmModelId: 'llm-model-1',
      });

      expect(result.cost).toBeGreaterThan(0);
      expect(result.currency).toBe('USD');
      expect(result.tokens).toBe(Math.ceil(400 / 4)); // ~100 tokens
    });

    it('handles empty snippet', async () => {
      const manifest = createMockManifest();

      modelRepository.findOne.mockResolvedValue(mockLlmModel);

      const result = await service.estimateFieldCost({
        manifest,
        fieldName: 'invoice.po_no',
        snippet: '',
        llmModelId: 'llm-model-1',
      });

      expect(result.tokens).toBe(1); // Minimum 1 token
      expect(result.cost).toBeGreaterThan(0);
    });

    it('uses project LLM model when not specified', async () => {
      const manifest = createMockManifest({
        group: {
          id: 1,
          name: 'Test Group',
          projectId: 1,
          project: {
            id: 1,
            name: 'Test Project',
            llmModelId: 'project-llm-model',
            userId: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
            user: null,
            groups: [],
            schemas: [],
          },
          createdAt: new Date(),
          updatedAt: new Date(),
          user: null,
          manifests: [],
        } as any,
      });

      modelRepository.findOne.mockResolvedValue(mockLlmModel);

      const result = await service.estimateFieldCost({
        manifest,
        fieldName: 'invoice.po_no',
        snippet: 'test',
      });

      expect(result).toBeDefined();
      expect(modelRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'project-llm-model' },
      });
    });
  });

  describe('estimateTokensFromOcr', () => {
    it('returns zero for null OCR result', () => {
      const result = service.estimateTokensFromOcr(null);
      expect(result).toEqual({ min: 0, max: 0 });
    });

    it('estimates tokens from OCR result with pages', () => {
      const ocrResult: OcrResultDto = {
        document: {
          type: 'invoice',
          language: ['zh'],
          pages: 2,
        },
        pages: [
          {
            pageNumber: 1,
            text: 'a'.repeat(2000),
            markdown: '# Page 1',
            confidence: 0.9,
            layout: { elements: [], tables: [] },
          },
          {
            pageNumber: 2,
            text: 'a'.repeat(2000),
            markdown: '# Page 2',
            confidence: 0.85,
            layout: { elements: [], tables: [] },
          },
        ],
        metadata: {
          processedAt: new Date().toISOString(),
          modelVersion: 'PaddleOCR-VL',
          processingTimeMs: 1000,
        },
      };

      const result = service.estimateTokensFromOcr(ocrResult as unknown as ManifestEntity['ocrResult']);

      // 4000 chars / 4 = 1000 tokens, with variance ±20%
      expect(result.min).toBeCloseTo(800, 0); // 1000 * 0.8
      expect(result.max).toBeCloseTo(1200, 0); // 1000 * 1.2
    });

    it('handles OCR result with raw_text field', () => {
      const ocrResult = {
        raw_text: 'a'.repeat(1000),
      } as unknown as OcrResultDto & Record<string, unknown>;

      const result = service.estimateTokensFromOcr(ocrResult);

      // 1000 chars / 4 = 250 tokens
      expect(result.min).toBeCloseTo(200, 0);
      expect(result.max).toBeCloseTo(300, 0);
    });

    it('handles OCR result with markdown field', () => {
      const ocrResult = {
        markdown: '# Test\n\n' + 'a'.repeat(800),
      } as unknown as OcrResultDto & Record<string, unknown>;

      const result = service.estimateTokensFromOcr(ocrResult);

      expect(result.min).toBeGreaterThan(0);
      expect(result.max).toBeGreaterThanOrEqual(result.min);
    });

    it('returns zero for OCR result without text', () => {
      const ocrResult: OcrResultDto = {
        document: {
          type: 'invoice',
          language: [],
          pages: 1,
        },
        pages: [
          {
            pageNumber: 1,
            text: '',
            markdown: '',
            confidence: 0,
            layout: { elements: [], tables: [] },
          },
        ],
        metadata: {
          processedAt: new Date().toISOString(),
          modelVersion: 'PaddleOCR-VL',
          processingTimeMs: 1000,
        },
      };

      const result = service.estimateTokensFromOcr(ocrResult as unknown as ManifestEntity['ocrResult']);

      expect(result).toEqual({ min: 0, max: 0 });
    });
  });
});
