import { BadRequestException } from '@nestjs/common';
import { RuleGeneratorService } from './rule-generator.service';
import { ModelEntity } from '../entities/model.entity';
import { SchemaRuleOperator, SchemaRuleType } from '../entities/schema-rule.entity';

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

describe('RuleGeneratorService', () => {
  let service: RuleGeneratorService;
  let modelRepository: { findOne: jest.Mock };
  let llmService: { createChatCompletion: jest.Mock };

  beforeEach(() => {
    modelRepository = {
      findOne: jest.fn(),
    };
    llmService = {
      createChatCompletion: jest.fn(),
    };

    service = new RuleGeneratorService(
      modelRepository as any,
      llmService as any,
    );
  });

  it('normalizes generated rules', async () => {
    modelRepository.findOne.mockResolvedValue(buildModel());
    llmService.createChatCompletion.mockResolvedValue({
      content: JSON.stringify({
        rules: [
          {
            fieldPath: 'invoice.po_no',
            ruleType: 'verification',
            ruleOperator: 'pattern',
            ruleConfig: { regex: '^\\d{7}$' },
            priority: 8,
          },
          {
            ruleType: 'verification',
          },
        ],
      }),
    });

    const result = await service.generate(
      { jsonSchema: { type: 'object', properties: {} } },
      { description: 'Rules', modelId: 'llm-1' },
    );

    expect(result).toEqual([
      {
        fieldPath: 'invoice.po_no',
        ruleType: SchemaRuleType.VERIFICATION,
        ruleOperator: SchemaRuleOperator.PATTERN,
        ruleConfig: { regex: '^\\d{7}$' },
        errorMessage: undefined,
        priority: 8,
        enabled: undefined,
        description: undefined,
      },
    ]);
  });

  it('throws when model is missing', async () => {
    modelRepository.findOne.mockResolvedValue(null);

    await expect(
      service.generate(
        { jsonSchema: { type: 'object', properties: {} } },
        { description: 'Rules', modelId: 'missing' },
      ),
    ).rejects.toThrow(BadRequestException);
  });
});
