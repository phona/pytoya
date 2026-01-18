import { BadRequestException } from '@nestjs/common';
import { SchemaGeneratorService } from './schema-generator.service';
import { LlmService } from '../llm/llm.service';
import { ModelEntity } from '../entities/model.entity';

const buildModel = (overrides?: Partial<ModelEntity>): ModelEntity => ({
  id: 'llm-1',
  name: 'OpenAI GPT-4o',
  adapterType: 'openai',
  description: null,
  parameters: {
    baseUrl: 'https://api.openai.com/v1',
    apiKey: 'test-key',
    modelName: 'gpt-4o',
    temperature: 0.1,
    maxTokens: 2000,
    supportsStructuredOutput: true,
  },
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
} as ModelEntity);

describe('SchemaGeneratorService', () => {
  let service: SchemaGeneratorService;
  let modelRepository: { findOne: jest.Mock };
  let llmService: { createChatCompletion: jest.Mock };

  beforeEach(() => {
    modelRepository = {
      findOne: jest.fn(),
    };
    llmService = {
      createChatCompletion: jest.fn(),
    };

    service = new SchemaGeneratorService(
      modelRepository as any,
      llmService as unknown as LlmService,
    );
  });

  it('generates a valid JSON schema', async () => {
    modelRepository.findOne.mockResolvedValue(buildModel());
    llmService.createChatCompletion.mockResolvedValue({
      content: JSON.stringify({
        type: 'object',
        properties: {
          invoice_number: { type: 'string' },
        },
      }),
    });

    const result = await service.generate({
      description: 'Invoice schema',
      modelId: 'llm-1',
      includeExtractionHints: true,
    });

    expect(result).toEqual({
      type: 'object',
      properties: {
        invoice_number: { type: 'string' },
      },
    });
    expect(llmService.createChatCompletion).toHaveBeenCalled();
  });

  it('rejects non-object schema output', async () => {
    modelRepository.findOne.mockResolvedValue(buildModel());
    llmService.createChatCompletion.mockResolvedValue({
      content: JSON.stringify(['not', 'object']),
    });

    await expect(
      service.generate({ description: 'Invoice schema', modelId: 'llm-1' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws when model is not found', async () => {
    modelRepository.findOne.mockResolvedValue(null);

    await expect(
      service.generate({ description: 'Invoice schema', modelId: 'missing' }),
    ).rejects.toThrow(BadRequestException);
  });
});
