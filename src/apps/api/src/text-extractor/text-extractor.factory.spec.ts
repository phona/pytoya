import { ConfigService } from '@nestjs/config';

import { BaseTextExtractor } from './base-text-extractor';
import { TextExtractorFactory } from './text-extractor.factory';
import { TextExtractorRegistry } from './text-extractor.registry';
import type { ExtractorMetadata, TextExtractionInput, TextExtractionResult, TextExtractorConfig } from './types/extractor.types';
import { PRICING_SCHEMA } from './types/pricing-schema';

class TestExtractor extends BaseTextExtractor<TextExtractorConfig> {
  static metadata: ExtractorMetadata = {
    id: 'test',
    name: 'Test Extractor',
    description: 'Test-only extractor',
    version: '1.0.0',
    category: 'ocr',
    supportedFormats: ['image'],
    paramsSchema: {
      requiredParam: {
        type: 'string',
        required: true,
        label: 'Required Param',
      },
    },
    pricingSchema: PRICING_SCHEMA,
  };

  constructor(config: TextExtractorConfig, _deps?: Record<string, unknown>) {
    super(config);
  }

  async extract(_input: TextExtractionInput): Promise<TextExtractionResult> {
    return {
      text: '',
      markdown: '',
      metadata: {
        extractorId: TestExtractor.metadata.id,
        processingTimeMs: 0,
        textCost: 0,
        currency: 'USD',
      },
    };
  }
}

describe('TextExtractorFactory', () => {
  const buildFactory = () => {
    const registry = new TextExtractorRegistry();
    registry.register(TestExtractor);
    const configService = { get: jest.fn() } as unknown as ConfigService;
    const llmService = { createChatCompletion: jest.fn() };
    return { factory: new TextExtractorFactory(registry, configService, llmService as any), registry };
  };

  it('creates and caches extractor instances by cache key', () => {
    const { factory } = buildFactory();
    const config = {
      requiredParam: 'value',
      pricing: { mode: 'none' as const, currency: 'USD' },
    } as TextExtractorConfig;

    const first = factory.createInstance('test', config, 'cache-key');
    const second = factory.createInstance(
      'test',
      { pricing: { currency: 'USD', mode: 'none' as const }, requiredParam: 'value' } as TextExtractorConfig,
      'cache-key',
    );
    const third = factory.createInstance(
      'test',
      { requiredParam: 'other', pricing: { mode: 'none' as const, currency: 'USD' } } as TextExtractorConfig,
      'cache-key',
    );

    expect(first).toBe(second);
    expect(first).not.toBe(third);
  });

  it('throws for unknown extractor types', () => {
    const { factory } = buildFactory();
    expect(() => factory.createInstance('unknown', { requiredParam: 'value' } as any)).toThrow(
      'Unknown extractor type',
    );
  });
});
