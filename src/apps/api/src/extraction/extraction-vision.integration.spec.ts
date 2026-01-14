import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ExtractionService } from './extraction.service';
import { PdfToImageService } from '../pdf-to-image/pdf-to-image.service';
import { LlmService } from '../llm/llm.service';
import { OcrService } from '../ocr/ocr.service';
import { PromptsService } from '../prompts/prompts.service';
import { SchemasService } from '../schemas/schemas.service';
import { IFileAccessService } from '../file-access/file-access.service';
import { ManifestEntity, FileType } from '../entities/manifest.entity';
import { ProviderEntity, ProviderType } from '../entities/provider.entity';
import { SchemaEntity } from '../entities/schema.entity';
import { PromptEntity, PromptType } from '../entities/prompt.entity';
import { ExtractionStrategy, ExtractionStatus } from './extraction.types';

/**
 * Integration tests for vision-based extraction strategies.
 *
 * These tests verify the end-to-end behavior of different extraction strategies:
 * - VISION_ONLY: Direct image extraction without OCR
 * - VISION_FIRST: Vision with OCR as context
 * - TWO_STAGE: Combined vision and OCR
 * - OCR_FIRST: Traditional OCR-only extraction (default)
 *
 * Tests use dependency injection via overrideProvider() following project testing conventions.
 */
describe('ExtractionService - Vision Strategies Integration', () => {
  let service: ExtractionService;
  let pdfToImageService: jest.Mocked<PdfToImageService>;
  let llmService: jest.Mocked<LlmService>;
  let ocrService: jest.Mocked<OcrService>;
  let promptsService: jest.Mocked<PromptsService>;
  let schemasService: jest.Mocked<SchemasService>;
  let fileSystem: jest.Mocked<IFileAccessService>;
  let manifestRepository: jest.Mocked<Repository<ManifestEntity>>;
  let providerRepository: jest.Mocked<Repository<ProviderEntity>>;
  let schemaRepository: jest.Mocked<Repository<SchemaEntity>>;

  // Mock data
  const mockProvider: ProviderEntity = {
    id: 1,
    name: 'OpenAI GPT-4o',
    type: ProviderType.OPENAI,
    baseUrl: 'https://api.openai.com/v1',
    apiKey: 'test-key',
    modelName: 'gpt-4o',
    temperature: 0.1,
    maxTokens: 2000,
    isDefault: true,
    supportsVision: true,
    supportsStructuredOutput: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as ProviderEntity;

  const mockSchema: SchemaEntity = {
    id: 1,
    name: 'Invoice Schema',
    jsonSchema: {
      type: 'object',
      properties: {
        department: {
          type: 'object',
          properties: {
            code: { type: 'string' },
            name: { type: 'string' },
          },
        },
        invoice: {
          type: 'object',
          properties: {
            po_no: { type: 'string' },
            invoice_date: { type: 'string' },
            invoice_no: { type: 'string' },
          },
        },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              quantity: { type: 'number' },
              unit: { type: 'string' },
              price: { type: 'number' },
            },
          },
        },
      },
    },
    requiredFields: [], // Empty to bypass validation in tests
    projectId: 1,
    isTemplate: false,
    extractionStrategy: ExtractionStrategy.VISION_ONLY,
    description: 'Test schema',
    project: {} as any,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as SchemaEntity;

  const mockManifest: ManifestEntity = {
    id: 1,
    filename: 'test-manifest.pdf',
    originalFilename: 'invoice.pdf',
    storagePath: '/uploads/test.pdf',
    fileSize: 1024000,
    fileType: FileType.PDF,
    status: 'pending' as any,
    groupId: 1,
    extractedData: null,
    confidence: null,
    purchaseOrder: null,
    invoiceDate: null,
    department: null,
    humanVerified: false,
    group: {
      id: 1,
      name: 'Test Group',
      project: {
        id: 1,
        name: 'Test Project',
        defaultSchemaId: 1,
        defaultProviderId: null,
        defaultPromptId: null,
      } as any,
    } as any,
    jobs: [],
    manifestItems: [],
    extractionHistory: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Valid extraction response matching required fields
  const validExtractionResponse = {
    department: { code: 'IT', name: 'IT Department' },
    invoice: {
      po_no: 'PO123456',
      invoice_date: '2024-01-15',
      invoice_no: 'INV-001',
    },
    items: [
      { name: 'Item 1', quantity: 10, unit: 'EA', price: 100 },
      { name: 'Item 2', quantity: 5, unit: 'KG', price: 50 },
    ],
    _extraction_info: {
      confidence: 0.95,
      model: 'gpt-4o',
      timestamp: new Date().toISOString(),
    },
  };

  beforeEach(async () => {
    // Create mock file system service
    fileSystem = {
      readFile: jest.fn().mockResolvedValue(Buffer.from('fake-pdf-content')),
      getFileStats: jest.fn().mockResolvedValue({
        size: 1024000,
        isFile: true,
        isDirectory: false,
      }),
      fileExists: jest.fn().mockReturnValue(true),
      ensureDirectory: jest.fn(),
      writeFile: jest.fn(),
      moveFile: jest.fn(),
      deleteFile: jest.fn(),
    } as unknown as jest.Mocked<IFileAccessService>;

    // Create mock services
    pdfToImageService = {
      convertPdfToImages: jest.fn(),
      convertPdfPageToImage: jest.fn(),
      getPageCount: jest.fn(),
      pagesToDataUrls: jest.fn(),
      savePagesToDisk: jest.fn(),
    } as unknown as jest.Mocked<PdfToImageService>;

    llmService = {
      createChatCompletion: jest.fn().mockResolvedValue({
        content: JSON.stringify(validExtractionResponse),
        model: 'gpt-4o',
        usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
        rawResponse: {},
      }),
      providerSupportsVision: jest.fn().mockReturnValue(true),
      providerSupportsStructuredOutput: jest.fn().mockReturnValue(true),
      createVisionMessage: jest.fn().mockReturnValue({ role: 'user', content: [] }),
      createVisionMessageFromBuffers: jest.fn().mockReturnValue({ role: 'user', content: [] }),
    } as unknown as jest.Mocked<LlmService>;

    ocrService = {
      processPdf: jest.fn().mockResolvedValue({
        raw_text: 'Sample OCR text',
        markdown: '# Sample Document\n\nDepartment: IT\nPO: PO123456',
        layout: null,
      }),
    } as unknown as jest.Mocked<OcrService>;

    promptsService = {
      getSystemPrompt: jest.fn().mockReturnValue('Extract data from this document'),
      getReExtractSystemPrompt: jest.fn().mockReturnValue('Re-extract missing data'),
      buildExtractionPrompt: jest.fn().mockReturnValue('Please extract data'),
      buildReExtractPrompt: jest.fn().mockReturnValue('Please re-extract'),
    } as unknown as jest.Mocked<PromptsService>;

    schemasService = {
      findOne: jest.fn().mockResolvedValue(mockSchema),
      validate: jest.fn().mockReturnValue({ valid: true }),
      validateWithRequiredFields: jest.fn().mockReturnValue({
        valid: true,
        errors: undefined,
      }),
    } as unknown as jest.Mocked<SchemasService>;

    const configService = {
      get: jest.fn().mockReturnValue('3'),
    } as unknown as jest.Mocked<ConfigService>;

    // Create mock repositories
    manifestRepository = {
      findOne: jest.fn().mockResolvedValue(mockManifest),
      save: jest.fn(),
    } as unknown as jest.Mocked<Repository<ManifestEntity>>;

    providerRepository = {
      findOne: jest.fn().mockResolvedValue(mockProvider),
    } as unknown as jest.Mocked<Repository<ProviderEntity>>;

    schemaRepository = {
      findOne: jest.fn().mockResolvedValue(mockSchema),
    } as unknown as jest.Mocked<Repository<SchemaEntity>>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExtractionService,
        { provide: getRepositoryToken(ManifestEntity), useValue: manifestRepository },
        { provide: getRepositoryToken(ProviderEntity), useValue: providerRepository },
        { provide: getRepositoryToken(PromptEntity), useValue: {} },
        { provide: PdfToImageService, useValue: pdfToImageService },
        { provide: LlmService, useValue: llmService },
        { provide: OcrService, useValue: ocrService },
        { provide: PromptsService, useValue: promptsService },
        { provide: SchemasService, useValue: schemasService },
        { provide: ConfigService, useValue: configService },
        { provide: 'IFileAccessService', useValue: fileSystem },
      ],
    }).compile();

    service = module.get<ExtractionService>(ExtractionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('VISION_ONLY strategy', () => {
    it('should convert PDF to images and extract using vision only', async () => {
      // Arrange: Mock PDF-to-image conversion
      const convertedPages = [
        {
          pageNumber: 1,
          buffer: Buffer.from('fake-image-page-1'),
          mimeType: 'image/png',
        },
      ];
      pdfToImageService.convertPdfToImages.mockResolvedValue(convertedPages);

      // Set schema to VISION_ONLY strategy
      const schemaWithVisionOnly = { ...mockSchema, extractionStrategy: ExtractionStrategy.VISION_ONLY };
      (schemasService.findOne as jest.Mock).mockResolvedValue(schemaWithVisionOnly);

      // Act: Run extraction
      const result = await service.runExtraction(1, {
        provider: mockProvider,
      });

      // Assert: Verify PDF was converted to images
      expect(pdfToImageService.convertPdfToImages).toHaveBeenCalledWith('/uploads/test.pdf');

      // Assert: Verify extraction succeeded with correct strategy
      expect(result.status).toBe(ExtractionStatus.COMPLETED);
      expect(result.strategy).toBe(ExtractionStrategy.VISION_ONLY);
      expect(result.convertedPages).toEqual(convertedPages);

      // Assert: OCR should not be called for VISION_ONLY
      expect(ocrService.processPdf).not.toHaveBeenCalled();
    });

    it('should handle image files directly with VISION_ONLY', async () => {
      // Arrange: Mock manifest as image file
      const imageManifest = { ...mockManifest, fileType: FileType.IMAGE, originalFilename: 'invoice.png' };
      (manifestRepository.findOne as jest.Mock).mockResolvedValue(imageManifest);

      // Mock the file system to return image data for reading
      fileSystem.readFile.mockResolvedValue(Buffer.from('fake-image-data'));

      // Set schema to VISION_ONLY strategy
      const schemaWithVisionOnly = { ...mockSchema, extractionStrategy: ExtractionStrategy.VISION_ONLY };
      (schemasService.findOne as jest.Mock).mockResolvedValue(schemaWithVisionOnly);

      // Act: Run extraction
      const result = await service.runExtraction(1, {
        provider: mockProvider,
      });

      // Assert: Verify no PDF conversion was attempted (it's already an image)
      expect(pdfToImageService.convertPdfToImages).not.toHaveBeenCalled();

      // Assert: Verify image file was read
      expect(fileSystem.readFile).toHaveBeenCalledWith('/uploads/test.pdf');

      // Assert: Verify extraction succeeded
      expect(result.status).toBe(ExtractionStatus.COMPLETED);
      expect(result.strategy).toBe(ExtractionStrategy.VISION_ONLY);
    });

    it('should fallback to OCR_FIRST when provider does not support vision', async () => {
      // Arrange: Mock provider without vision support
      const nonVisionProvider = { ...mockProvider, supportsVision: false };
      (llmService.providerSupportsVision as jest.Mock).mockReturnValue(false);

      // Set schema to VISION_ONLY strategy
      const schemaWithVisionOnly = { ...mockSchema, extractionStrategy: ExtractionStrategy.VISION_ONLY };
      (schemasService.findOne as jest.Mock).mockResolvedValue(schemaWithVisionOnly);

      // Act: Run extraction
      const result = await service.runExtraction(1, {
        provider: nonVisionProvider,
      });

      // Assert: Verify strategy was changed to OCR_FIRST due to provider limitations
      expect(result.strategy).toBe(ExtractionStrategy.OCR_FIRST);

      // Assert: OCR should be called for fallback
      expect(ocrService.processPdf).toHaveBeenCalled();
    });
  });

  describe('VISION_FIRST strategy', () => {
    it('should use vision with OCR as fallback context', async () => {
      // Arrange: Mock PDF-to-image conversion
      const convertedPages = [
        {
          pageNumber: 1,
          buffer: Buffer.from('fake-image-page-1'),
          mimeType: 'image/png',
        },
      ];
      pdfToImageService.convertPdfToImages.mockResolvedValue(convertedPages);

      // Set schema to VISION_FIRST strategy
      const schemaWithVisionFirst = { ...mockSchema, extractionStrategy: ExtractionStrategy.VISION_FIRST };
      (schemasService.findOne as jest.Mock).mockResolvedValue(schemaWithVisionFirst);

      // Act: Run extraction
      const result = await service.runExtraction(1, {
        provider: mockProvider,
      });

      // Assert: Verify both OCR and vision were used
      expect(ocrService.processPdf).toHaveBeenCalled();
      expect(pdfToImageService.convertPdfToImages).toHaveBeenCalled();

      // Assert: Verify extraction succeeded
      expect(result.status).toBe(ExtractionStatus.COMPLETED);
      expect(result.strategy).toBe(ExtractionStrategy.VISION_FIRST);
    });
  });

  describe('TWO_STAGE strategy', () => {
    it('should combine vision and OCR for extraction', async () => {
      // Arrange: Mock PDF-to-image conversion
      const convertedPages = [
        {
          pageNumber: 1,
          buffer: Buffer.from('fake-image-page-1'),
          mimeType: 'image/png',
        },
      ];
      pdfToImageService.convertPdfToImages.mockResolvedValue(convertedPages);

      // Set schema to TWO_STAGE strategy
      const schemaWithTwoStage = { ...mockSchema, extractionStrategy: ExtractionStrategy.TWO_STAGE };
      (schemasService.findOne as jest.Mock).mockResolvedValue(schemaWithTwoStage);

      // Act: Run extraction
      const result = await service.runExtraction(1, {
        provider: mockProvider,
      });

      // Assert: Verify both OCR and vision were used
      expect(ocrService.processPdf).toHaveBeenCalled();
      expect(pdfToImageService.convertPdfToImages).toHaveBeenCalled();

      // Assert: Verify extraction succeeded
      expect(result.status).toBe(ExtractionStatus.COMPLETED);
      expect(result.strategy).toBe(ExtractionStrategy.TWO_STAGE);
    });
  });

  describe('OCR_FIRST strategy (default)', () => {
    it('should use only OCR for extraction', async () => {
      // Arrange: Set schema to OCR_FIRST strategy
      const schemaWithOcrFirst = { ...mockSchema, extractionStrategy: ExtractionStrategy.OCR_FIRST };
      (schemasService.findOne as jest.Mock).mockResolvedValue(schemaWithOcrFirst);

      // Act: Run extraction
      const result = await service.runExtraction(1, {
        provider: mockProvider,
      });

      // Assert: Verify only OCR was used
      expect(ocrService.processPdf).toHaveBeenCalled();
      expect(pdfToImageService.convertPdfToImages).not.toHaveBeenCalled();

      // Assert: Verify extraction succeeded
      expect(result.status).toBe(ExtractionStatus.COMPLETED);
      expect(result.strategy).toBe(ExtractionStrategy.OCR_FIRST);
    });
  });

  describe('Strategy auto-selection', () => {
    it('should auto-select VISION_ONLY for image files when provider supports vision', async () => {
      // Arrange: Mock manifest as image file with no explicit strategy
      const imageManifest = { ...mockManifest, fileType: FileType.IMAGE, originalFilename: 'invoice.png' };
      (manifestRepository.findOne as jest.Mock).mockResolvedValue(imageManifest);

      const schemaWithoutStrategy = { ...mockSchema, extractionStrategy: undefined as any };
      (schemasService.findOne as jest.Mock).mockResolvedValue(schemaWithoutStrategy);

      // Act: Run extraction
      const result = await service.runExtraction(1, {
        provider: mockProvider,
      });

      // Assert: Verify strategy was auto-selected to VISION_ONLY for image files
      expect(result.strategy).toBe(ExtractionStrategy.VISION_ONLY);
    });

    it('should default to OCR_FIRST for PDF files when no strategy specified', async () => {
      // Arrange: Schema without explicit strategy
      const schemaWithoutStrategy = { ...mockSchema, extractionStrategy: undefined as any };
      (schemasService.findOne as jest.Mock).mockResolvedValue(schemaWithoutStrategy);

      // Act: Run extraction
      const result = await service.runExtraction(1, {
        provider: mockProvider,
      });

      // Assert: Verify default strategy is OCR_FIRST for PDFs
      expect(result.strategy).toBe(ExtractionStrategy.OCR_FIRST);
    });
  });

  describe('Error handling', () => {
    it('should handle PDF-to-image conversion errors', async () => {
      // Arrange: Mock PDF conversion failure
      pdfToImageService.convertPdfToImages.mockRejectedValue(new Error('Conversion failed'));

      const schemaWithVisionOnly = { ...mockSchema, extractionStrategy: ExtractionStrategy.VISION_ONLY };
      (schemasService.findOne as jest.Mock).mockResolvedValue(schemaWithVisionOnly);

      // Act & Assert: Run extraction should fail
      await expect(
        service.runExtraction(1, { provider: mockProvider }),
      ).rejects.toThrow('Conversion failed');
    });

    it('should handle LLM errors gracefully', async () => {
      // Arrange: Mock PDF-to-image conversion success
      const convertedPages = [
        {
          pageNumber: 1,
          buffer: Buffer.from('fake-image-page-1'),
          mimeType: 'image/png',
        },
      ];
      pdfToImageService.convertPdfToImages.mockResolvedValue(convertedPages);

      // Mock LLM failure
      (llmService.createChatCompletion as jest.Mock).mockRejectedValue(
        new Error('LLM API error'),
      );

      const schemaWithVisionOnly = { ...mockSchema, extractionStrategy: ExtractionStrategy.VISION_ONLY };
      (schemasService.findOne as jest.Mock).mockResolvedValue(schemaWithVisionOnly);

      // Act & Assert: Run extraction should fail
      await expect(
        service.runExtraction(1, { provider: mockProvider }),
      ).rejects.toThrow();
    });

    it('should not silently fall back to OCR when VISION_ONLY extraction fails', async () => {
      // Arrange: Mock PDF-to-image conversion success
      const convertedPages = [
        {
          pageNumber: 1,
          buffer: Buffer.from('fake-image-page-1'),
          mimeType: 'image/png',
        },
      ];
      pdfToImageService.convertPdfToImages.mockResolvedValue(convertedPages);

      // Mock LLM failure (vision extraction fails)
      (llmService.createChatCompletion as jest.Mock).mockRejectedValue(
        new Error('Vision model failed to extract data'),
      );

      const schemaWithVisionOnly = { ...mockSchema, extractionStrategy: ExtractionStrategy.VISION_ONLY };
      (schemasService.findOne as jest.Mock).mockResolvedValue(schemaWithVisionOnly);

      // Act & Assert: Run extraction should fail explicitly
      await expect(
        service.runExtraction(1, { provider: mockProvider }),
      ).rejects.toThrow('Vision model failed to extract data');

      // Assert: OCR should NOT have been called (no silent fallback)
      expect(ocrService.processPdf).not.toHaveBeenCalled();
    });

    it('should use OCR fallback context in VISION_FIRST when vision provides incomplete data', async () => {
      // Arrange: Mock PDF-to-image conversion success
      const convertedPages = [
        {
          pageNumber: 1,
          buffer: Buffer.from('fake-image-page-1'),
          mimeType: 'image/png',
        },
      ];
      pdfToImageService.convertPdfToImages.mockResolvedValue(convertedPages);

      // Mock OCR to provide fallback context
      ocrService.processPdf.mockResolvedValue({
        raw_text: 'Invoice Number: INV-001\nDate: 2024-01-15\nAmount: $1000',
        markdown: '# Invoice\n\n**Number:** INV-001\n**Date:** 2024-01-15\n**Amount:** $1000',
        layout: null,
      } as any);

      // Mock LLM to return incomplete data, requiring OCR context
      (llmService.createChatCompletion as jest.Mock).mockResolvedValue({
        content: JSON.stringify({
          department: { code: 'IT', name: 'IT Department' },
          invoice: { po_no: 'PO123456', invoice_date: '2024-01-15', invoice_no: 'INV-001' },
          items: [
            { name: 'Item 1', quantity: 10, unit: 'EA', price: 100 },
          ],
          _extraction_info: {
            confidence: 0.75,
            model: 'gpt-4o',
            timestamp: new Date().toISOString(),
          },
        }),
        model: 'gpt-4o',
        usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
        rawResponse: {},
      });

      const schemaWithVisionFirst = { ...mockSchema, extractionStrategy: ExtractionStrategy.VISION_FIRST };
      (schemasService.findOne as jest.Mock).mockResolvedValue(schemaWithVisionFirst);

      // Act: Run extraction
      const result = await service.runExtraction(1, {
        provider: mockProvider,
      });

      // Assert: Verify both OCR and vision were used
      expect(ocrService.processPdf).toHaveBeenCalled();
      expect(pdfToImageService.convertPdfToImages).toHaveBeenCalled();
      expect(result.status).toBe(ExtractionStatus.COMPLETED);
      expect(result.strategy).toBe(ExtractionStrategy.VISION_FIRST);
    });
  });
});
