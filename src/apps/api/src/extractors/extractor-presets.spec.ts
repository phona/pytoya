import { EXTRACTOR_PRESETS } from './extractor-presets';
import { TextExtractorRegistry } from '../text-extractor/text-extractor.registry';

describe('EXTRACTOR_PRESETS', () => {
  it('provides unique preset ids', () => {
    const ids = EXTRACTOR_PRESETS.map((preset) => preset.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('aligns preset extractor types with registry', () => {
    const registry = new TextExtractorRegistry();
    registry.onModuleInit();

    EXTRACTOR_PRESETS.forEach((preset) => {
      expect(registry.get(preset.extractorType)).toBeDefined();
    });
  });

  it('includes pricing configuration on presets', () => {
    EXTRACTOR_PRESETS.forEach((preset) => {
      const pricing = (preset.config as { pricing?: { currency?: string } }).pricing;
      expect(pricing?.currency).toBeDefined();
    });
  });
});
