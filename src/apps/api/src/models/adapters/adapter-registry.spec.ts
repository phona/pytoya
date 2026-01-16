import { adapterRegistry, AdapterRegistry } from './adapter-registry';
import { OpenaiAdapterSchema } from './openai.adapter';
import { PaddlexAdapterSchema } from './paddlex.adapter';

describe('AdapterRegistry', () => {
  it('returns schemas by type', () => {
    const schema = adapterRegistry.getSchema('openai');
    expect(schema?.name).toBe('OpenAI-Compatible');
  });

  it('lists adapters by category', () => {
    const registry = new AdapterRegistry([PaddlexAdapterSchema, OpenaiAdapterSchema]);
    const ocrAdapters = registry.getAdaptersByCategory('ocr');
    const llmAdapters = registry.getAdaptersByCategory('llm');
    expect(ocrAdapters.map((item) => item.type)).toEqual(['paddlex']);
    expect(llmAdapters.map((item) => item.type)).toEqual(['openai']);
  });

  it('validates required parameters', () => {
    const result = adapterRegistry.validateParameters('openai', {
      baseUrl: 'https://api.openai.com/v1',
    });
    expect(result.valid).toBe(false);
    expect(result.errors.join(' ')).toContain('Missing required parameter');
  });

  it('accepts valid parameters', () => {
    const result = adapterRegistry.validateParameters('openai', {
      baseUrl: 'https://api.openai.com/v1',
      apiKey: 'test-key',
      modelName: 'gpt-4o',
      temperature: 0.7,
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects unknown parameters', () => {
    const result = adapterRegistry.validateParameters('paddlex', {
      baseUrl: 'http://localhost:8080',
      unknown: 'value',
    });
    expect(result.valid).toBe(false);
    expect(result.errors.join(' ')).toContain('Unknown parameter');
  });
});
