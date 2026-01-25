import { InternalServerErrorException, Logger } from '@nestjs/common';
import { ExtractionService } from './extraction.service';
import { ManifestStatus } from '../entities/manifest.entity';

describe('ExtractionService', () => {
  let logSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined as any);
    errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined as any);
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

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
      {} as any,
      llmService as any,
      {} as any,
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
      buildExtractionPrompt: jest.fn().mockReturnValue({ systemContext: '', userInput: 'prompt' }),
      buildReExtractPrompt: jest.fn().mockReturnValue({ systemContext: '', userInput: 'prompt' }),
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
      getCurrency: jest.fn().mockReturnValue('USD'),
    };
    const configService = { get: jest.fn().mockReturnValue(undefined) };
    const fileSystem = {
      readFile: jest.fn().mockResolvedValue(Buffer.from('pdf')),
      getFileStats: jest.fn().mockResolvedValue({ isFile: true, size: 100 }),
    };
    const manifestsService = {
      updateJobPromptSnapshot: jest.fn(),
      updateJobAssistantResponse: jest.fn(),
    };

    const service = new ExtractionService(
      manifestRepository as any,
      {} as any,
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
      manifestsService as any,
    );

    const result = await service.runExtraction(1);

    expect(textExtractorService.extract).toHaveBeenCalledWith(
      'extractor-1',
      expect.objectContaining({ fileType: 'pdf', originalFilename: 'test.pdf' }),
    );
    expect(result.textCost).toBe(0.05);
    expect(result.llmCost).toBe(0.15);
    expect(result.extractionCost).toBeCloseTo(0.2, 8);
    expect(result.currency).toBe('USD');
    expect(manifestRepository.save).toHaveBeenCalled();
  });

  it('uses latest schema and rules on subsequent extractions', async () => {
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
        content: '{"items":[],"_extraction_info":{"confidence":0.9}}',
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      }),
      providerSupportsStructuredOutput: jest.fn().mockReturnValue(true),
    };

    const promptBuilderService = {
      buildExtractionPrompt: jest.fn().mockReturnValue({ systemContext: '', userInput: 'prompt' }),
      buildReExtractPrompt: jest.fn().mockReturnValue({ systemContext: '', userInput: 'prompt' }),
    };

    const promptsService = {
      getSystemPrompt: jest.fn().mockReturnValue('system'),
      getReExtractSystemPrompt: jest.fn().mockReturnValue('system'),
    };

    const schemaRulesService = {
      findBySchema: jest
        .fn()
        .mockResolvedValueOnce([{ id: 'rule-v1', enabled: true }])
        .mockResolvedValueOnce([{ id: 'rule-v2', enabled: true }]),
    };

    const schemasService = {
      findOne: jest
        .fn()
        .mockResolvedValueOnce({
          id: 'schema-1',
          jsonSchema: { version: 1 },
          requiredFields: ['items'],
          systemPromptTemplate: null,
        })
        .mockResolvedValueOnce({
          id: 'schema-1',
          jsonSchema: { version: 2 },
          requiredFields: ['items'],
          systemPromptTemplate: null,
        }),
      validateWithRequiredFields: jest.fn().mockReturnValue({ valid: true, errors: [] }),
    };

    const modelPricingService = {
      calculateLlmCost: jest.fn().mockReturnValue(0.15),
      getCurrency: jest.fn().mockReturnValue('USD'),
    };

    const configService = { get: jest.fn().mockReturnValue(undefined) };
    const fileSystem = {
      readFile: jest.fn().mockResolvedValue(Buffer.from('pdf')),
      getFileStats: jest.fn().mockResolvedValue({ isFile: true, size: 100 }),
    };

    const manifestsService = {
      updateJobPromptSnapshot: jest.fn(),
      updateJobAssistantResponse: jest.fn(),
    };

    const service = new ExtractionService(
      manifestRepository as any,
      {} as any,
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
      manifestsService as any,
    );

    await service.runExtraction(1);
    await service.runExtraction(1);

    expect(promptBuilderService.buildExtractionPrompt).toHaveBeenCalledTimes(2);
    expect(promptBuilderService.buildExtractionPrompt.mock.calls[0]?.[1]).toMatchObject({
      id: 'schema-1',
      jsonSchema: { version: 1 },
    });
    expect(promptBuilderService.buildExtractionPrompt.mock.calls[0]?.[2]).toMatchObject([
      { id: 'rule-v1', enabled: true },
    ]);
    expect(promptBuilderService.buildExtractionPrompt.mock.calls[1]?.[1]).toMatchObject({
      id: 'schema-1',
      jsonSchema: { version: 2 },
    });
    expect(promptBuilderService.buildExtractionPrompt.mock.calls[1]?.[2]).toMatchObject([
      { id: 'rule-v2', enabled: true },
    ]);
  });

  it('does not treat missing text currency as mixed when LLM currency exists', async () => {
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
          llm: { inputPrice: 2, outputPrice: 4, currency: 'CNY' },
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
          metadata: { textCost: 0.05, processingTimeMs: 12 },
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
      buildExtractionPrompt: jest.fn().mockReturnValue({ systemContext: '', userInput: 'prompt' }),
      buildReExtractPrompt: jest.fn().mockReturnValue({ systemContext: '', userInput: 'prompt' }),
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
      getCurrency: jest.fn().mockReturnValue('CNY'),
    };
    const configService = { get: jest.fn().mockReturnValue(undefined) };
    const fileSystem = {
      readFile: jest.fn().mockResolvedValue(Buffer.from('pdf')),
      getFileStats: jest.fn().mockResolvedValue({ isFile: true, size: 100 }),
    };
    const manifestsService = {
      updateJobPromptSnapshot: jest.fn(),
      updateJobAssistantResponse: jest.fn(),
    };

    const service = new ExtractionService(
      manifestRepository as any,
      {} as any,
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
      manifestsService as any,
    );

    const result = await service.runExtraction(1);

    expect(result.currency).toBe('CNY');
    expect(result.extractionCost).toBeCloseTo(0.2, 8);
  });

  it('estimates token usage when the provider omits usage', async () => {
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
      }),
      providerSupportsStructuredOutput: jest.fn().mockReturnValue(true),
    };
    const promptBuilderService = {
      buildExtractionPrompt: jest.fn().mockReturnValue({ systemContext: '', userInput: 'prompt' }),
      buildReExtractPrompt: jest.fn().mockReturnValue({ systemContext: '', userInput: 'prompt' }),
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
      getCurrency: jest.fn().mockReturnValue('USD'),
    };
    const configService = { get: jest.fn().mockReturnValue(undefined) };
    const fileSystem = {
      readFile: jest.fn().mockResolvedValue(Buffer.from('pdf')),
      getFileStats: jest.fn().mockResolvedValue({ isFile: true, size: 100 }),
    };
    const manifestsService = {
      updateJobPromptSnapshot: jest.fn(),
      updateJobAssistantResponse: jest.fn(),
    };

    const service = new ExtractionService(
      manifestRepository as any,
      {} as any,
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
      manifestsService as any,
    );

    const result = await service.runExtraction(1);

    expect(result.llmCost).toBe(0.15);
    const [promptTokens, completionTokens] = (modelPricingService.calculateLlmCost as jest.Mock).mock.calls[0];
    expect(promptTokens).toBeGreaterThan(0);
    expect(completionTokens).toBeGreaterThan(0);
  });

  it('reuses cached OCR result and does not re-run text extractor', async () => {
    const manifestRepository = {
      findOne: jest.fn().mockResolvedValue({
        id: 1,
        storagePath: '/tmp/test.pdf',
        originalFilename: 'test.pdf',
        fileType: 'pdf',
        status: ManifestStatus.PENDING,
        extractedData: null,
        textExtractorId: 'extractor-1',
        ocrQualityScore: 90,
        ocrResult: {
          document: { type: 'invoice', language: ['zh'], pages: 1 },
          pages: [
            { pageNumber: 1, text: 'hello world', markdown: 'hello world', confidence: 0.9, layout: { elements: [], tables: [] } },
          ],
          metadata: { processedAt: '2025-01-01T00:00:00.000Z', processingTimeMs: 1000 },
        },
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

    const extractorRepository = {
      findOne: jest.fn().mockResolvedValue({
        id: 'extractor-1',
        config: {
          pricing: { mode: 'page', currency: 'USD', pricePerPage: 0.02 },
        },
      }),
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
    const textExtractorService = { extract: jest.fn() };
    const llmService = {
      createChatCompletion: jest.fn().mockResolvedValue({
        content: '{"items":[{"name":"item"}],"_extraction_info":{"confidence":0.9}}',
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      }),
      providerSupportsStructuredOutput: jest.fn().mockReturnValue(true),
    };
    const promptBuilderService = {
      buildExtractionPrompt: jest.fn().mockReturnValue({ systemContext: '', userInput: 'prompt' }),
      buildReExtractPrompt: jest.fn().mockReturnValue({ systemContext: '', userInput: 'prompt' }),
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
      getCurrency: jest.fn().mockReturnValue('USD'),
    };
    const configService = { get: jest.fn().mockReturnValue(undefined) };
    const fileSystem = {
      readFile: jest.fn(),
      getFileStats: jest.fn().mockResolvedValue({ isFile: true, size: 100 }),
    };
    const manifestsService = {
      updateJobPromptSnapshot: jest.fn(),
      updateJobAssistantResponse: jest.fn(),
    };

    const service = new ExtractionService(
      manifestRepository as any,
      extractorRepository as any,
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
      manifestsService as any,
    );

    const result = await service.runExtraction(1);

    expect(textExtractorService.extract).not.toHaveBeenCalled();
    expect(fileSystem.readFile).not.toHaveBeenCalled();
    expect(result.textCost).toBeCloseTo(0, 8);
    expect(result.textResult?.metadata.estimated).toBe(true);
    expect(result.textResult?.metadata.textCost).toBeCloseTo(0.02, 8);
  });

  it('logs stage failure when text extraction fails', async () => {
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
      extract: jest.fn().mockRejectedValue(new Error('OCR down')),
    };
    const llmService = {
      createChatCompletion: jest.fn(),
      providerSupportsStructuredOutput: jest.fn().mockReturnValue(true),
    };
    const promptBuilderService = {} as any;
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
    };
    const modelPricingService = {
      calculateLlmCost: jest.fn(),
      getCurrency: jest.fn().mockReturnValue('USD'),
    };
    const configService = { get: jest.fn().mockReturnValue(undefined) };
    const fileSystem = {
      readFile: jest.fn().mockResolvedValue(Buffer.from('pdf')),
      getFileStats: jest.fn().mockResolvedValue({ isFile: true, size: 100 }),
    };
    const manifestsService = {} as any;

    const service = new ExtractionService(
      manifestRepository as any,
      {} as any,
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
      manifestsService as any,
    );

    await expect(service.runExtraction(1)).rejects.toThrow('OCR down');

    const stageErrorCall = errorSpy.mock.calls.find(
      (call) => typeof call[0] === 'string' && call[0].includes('stage=TEXT_EXTRACTING'),
    );
    expect(stageErrorCall).toBeDefined();
    expect(stageErrorCall?.[0]).toContain('manifestId=1');
  });
});
