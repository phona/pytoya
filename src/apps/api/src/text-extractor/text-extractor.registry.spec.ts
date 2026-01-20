import { TextExtractorRegistry } from './text-extractor.registry';

describe('TextExtractorRegistry', () => {
  let registry: TextExtractorRegistry;

  beforeEach(() => {
    registry = new TextExtractorRegistry();
    registry.onModuleInit();
  });

  it('registers default extractors on module init', () => {
    const ids = registry.list().map((metadata) => metadata.id);
    expect(ids).toEqual(expect.arrayContaining(['paddleocr', 'vision-llm', 'tesseract']));
  });

  it('returns invalid when extractor type is unknown', () => {
    const result = registry.validateConfig('unknown', {});
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('validates required params for known extractor types', () => {
    const result = registry.validateConfig('vision-llm', {});
    expect(result.valid).toBe(false);
    expect(result.errors.join(' ')).toContain('Missing required parameter');
  });

  it('allows pricing config alongside known params', () => {
    const result = registry.validateConfig('vision-llm', {
      apiKey: 'sk-test',
      model: 'gpt-4o',
      pricing: {
        mode: 'token',
        currency: 'USD',
        inputPricePerMillionTokens: 1,
        outputPricePerMillionTokens: 2,
      },
    });
    expect(result.valid).toBe(true);
  });
});
