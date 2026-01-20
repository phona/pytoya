import { InternalServerErrorException } from '@nestjs/common';
import { ExtractionService } from './extraction.service';
import { ManifestStatus } from '../entities/manifest.entity';

describe('ExtractionService', () => {
  const buildService = (llmServiceOverrides?: { createChatCompletion?: jest.Mock }) => {
    const llmService = {
      createChatCompletion: jest.fn(),
      ...llmServiceOverrides,
    };

    return new ExtractionService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      llmService as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );
  };

  it('returns optimized prompt text', async () => {
    const service = buildService({
      createChatCompletion: jest.fn().mockResolvedValue({ content: ' Optimized ' }),
    });

    const result = await service.optimizePrompt('test description');

    expect(result.prompt).toBe('Optimized');
  });

  it('throws a friendly error when LLM fails', async () => {
    const service = buildService({
      createChatCompletion: jest.fn().mockRejectedValue(new Error('LLM down')),
    });

    await expect(service.optimizePrompt('test description')).rejects.toThrow(
      InternalServerErrorException,
    );
  });

  it('runs extraction with text extractor and aggregates costs', async () => {
    const manifestRepository = {
      findOne: jest.fn().mockResolvedValue({
        id: 1,
        storagePath: '/tmp/test.pdf',
        originalFilename: 'test.pdf',
        fileType: 'pdf',
        status: ManifestStatus.PENDING,
        extractedData: null,
        group: {
          project: {
            id: 1,
            llmModelId: 'model-1',
            defaultSchemaId: 'schema-1',
            textExtractorId: 'extractor-1',
          },
        },
      }),
      save: jest.fn().mockResolvedValue(undefined),
    };

    const modelRepository = {
      findOne: jest.fn().mockResolvedValue({
        id: 'model-1',
        adapterType: 'openai',
        parameters: {
          baseUrl: 'https://api.openai.com/v1',
          apiKey: 'sk-test',
          modelName: 'gpt-4o',
        },
        pricing: {
          effectiveDate: new Date().toISOString(),
          llm: { inputPrice: 2, outputPrice: 4, currency: 'USD' },
        },
      }),
    };

    const promptRepository = { findOne: jest.fn().mockResolvedValue(null) };
    const textExtractorService = {
      extract: jest.fn().mockResolvedValue({
        extractor: { id: 'extractor-1' },
        result: {
          text: 'extracted text',
          markdown: 'extracted text',
          metadata: { textCost: 0.05, currency: 'USD', processingTimeMs: 12 },
        },
      }),
    };
    const llmService = {
      createChatCompletion: jest.fn().mockResolvedValue({
        content: '{"items":[{"name":"item"}],"_extraction_info":{"confidence":0.9}}',
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      }),
      providerSupportsStructuredOutput: jest.fn().mockReturnValue(true),
    };
    const promptBuilderService = {
      buildExtractionPrompt: jest.fn().mockReturnValue('prompt'),
      buildReExtractPrompt: jest.fn().mockReturnValue('prompt'),
    };
    const promptsService = {
      getSystemPrompt: jest.fn().mockReturnValue('system'),
      getReExtractSystemPrompt: jest.fn().mockReturnValue('system'),
    };
    const schemaRulesService = { findBySchema: jest.fn().mockResolvedValue([]) };
    const schemasService = {
      findOne: jest.fn().mockResolvedValue({
        id: 'schema-1',
        jsonSchema: {},
        requiredFields: ['items'],
        systemPromptTemplate: null,
      }),
      validateWithRequiredFields: jest.fn().mockReturnValue({ valid: true, errors: [] }),
    };
    const modelPricingService = {
      calculateLlmCost: jest.fn().mockReturnValue(0.15),
    };
    const configService = { get: jest.fn().mockReturnValue(undefined) };
    const fileSystem = {
      readFile: jest.fn().mockResolvedValue(Buffer.from('pdf')),
      getFileStats: jest.fn().mockResolvedValue({ isFile: true, size: 100 }),
    };

    const service = new ExtractionService(
      manifestRepository as any,
      modelRepository as any,
      promptRepository as any,
      textExtractorService as any,
      llmService as any,
      promptBuilderService as any,
      promptsService as any,
      schemaRulesService as any,
      schemasService as any,
      modelPricingService as any,
      configService as any,
      fileSystem as any,
    );

    const result = await service.runExtraction(1);

    expect(textExtractorService.extract).toHaveBeenCalledWith(
      'extractor-1',
      expect.objectContaining({ fileType: 'pdf', originalFilename: 'test.pdf' }),
    );
    expect(result.textCost).toBe(0.05);
    expect(result.llmCost).toBe(0.15);
    expect(result.extractionCost).toBeCloseTo(0.2, 8);
    expect(manifestRepository.save).toHaveBeenCalled();
  });
});
