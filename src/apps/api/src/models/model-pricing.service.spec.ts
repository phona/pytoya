import { Test, TestingModule } from '@nestjs/testing';
import { ModelPricingService } from './model-pricing.service';
import { ModelPricing } from '../entities/model-pricing.types';

describe('ModelPricingService', () => {
  let service: ModelPricingService;
  const effectiveDate = new Date('2025-01-01T00:00:00.000Z');

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ModelPricingService],
    }).compile();

    service = module.get<ModelPricingService>(ModelPricingService);
  });

  describe('calculateOcrCost', () => {
    const ocrPricing: ModelPricing = {
      ocr: {
        pricePerPage: 0.001,
        currency: 'USD',
      },
      effectiveDate,
    };

    const ocrPricingWithMin: ModelPricing = {
      ocr: {
        pricePerPage: 0.001,
        currency: 'USD',
        minimumCharge: 0.01,
      },
      effectiveDate,
    };

    it('returns 0 when no pricing is provided', () => {
      expect(service.calculateOcrCost(10)).toBe(0);
    });

    it('returns 0 for non-positive page count', () => {
      expect(service.calculateOcrCost(0, ocrPricing)).toBe(0);
      expect(service.calculateOcrCost(-5, ocrPricing)).toBe(0);
    });

    it('calculates cost correctly without minimum charge', () => {
      const result = service.calculateOcrCost(10, ocrPricing);
      expect(result).toBe(0.01); // 10 * 0.001 = 0.01
    });

    it('applies minimum charge when applicable', () => {
      const result = service.calculateOcrCost(5, ocrPricingWithMin);
      expect(result).toBe(0.01); // 5 * 0.001 = 0.005, but minimum is 0.01
    });

    it('does not apply minimum charge when cost exceeds minimum', () => {
      const result = service.calculateOcrCost(20, ocrPricingWithMin);
      expect(result).toBe(0.02); // 20 * 0.001 = 0.02, which is > 0.01 minimum
    });

    it('handles fractional page counts', () => {
      const result = service.calculateOcrCost(2.5, ocrPricing);
      expect(result).toBeCloseTo(0.0025, 4);
    });
  });

  describe('calculateLlmCost', () => {
    const llmPricing: ModelPricing = {
      llm: {
        inputPrice: 2.5, // $2.50 per 1M tokens
        outputPrice: 10.0, // $10.00 per 1M tokens
        currency: 'USD',
      },
      effectiveDate,
    };

    const llmPricingWithMin: ModelPricing = {
      llm: {
        inputPrice: 2.5,
        outputPrice: 10.0,
        currency: 'USD',
        minimumCharge: 0.05,
      },
      effectiveDate,
    };

    it('returns 0 when no pricing is provided', () => {
      expect(service.calculateLlmCost(1000, 500)).toBe(0);
    });

    it('returns 0 for zero tokens', () => {
      expect(service.calculateLlmCost(0, 0, llmPricing)).toBe(0);
    });

    it('handles negative token values', () => {
      const result = service.calculateLlmCost(-100, -50, llmPricing);
      expect(result).toBe(0);
    });

    it('calculates cost correctly for input and output tokens', () => {
      // 2400 input tokens: (2400 / 1M) * 2.5 = 0.006
      // 480 output tokens: (480 / 1M) * 10.0 = 0.0048
      // Total: 0.0108
      const result = service.calculateLlmCost(2400, 480, llmPricing);
      expect(result).toBeCloseTo(0.0108, 4);
    });

    it('applies minimum charge when applicable', () => {
      // Small usage that would be less than minimum
      const result = service.calculateLlmCost(1000, 100, llmPricingWithMin);
      expect(result).toBe(0.05); // Actual cost is ~0.0026, but minimum is 0.05
    });

    it('does not apply minimum charge when cost exceeds minimum', () => {
      const result = service.calculateLlmCost(50000, 10000, llmPricingWithMin);
      expect(result).toBeGreaterThan(0.05);
    });

    it('handles only input tokens', () => {
      const result = service.calculateLlmCost(10000, 0, llmPricing);
      expect(result).toBeCloseTo(0.025, 4); // (10000 / 1M) * 2.5
    });

    it('handles only output tokens', () => {
      const result = service.calculateLlmCost(0, 5000, llmPricing);
      expect(result).toBeCloseTo(0.05, 4); // (5000 / 1M) * 10.0
    });
  });

  describe('calculateTotalExtractionCost', () => {
    const ocrPricing: ModelPricing = {
      ocr: {
        pricePerPage: 0.001,
        currency: 'USD',
      },
      effectiveDate,
    };

    const llmPricing: ModelPricing = {
      llm: {
        inputPrice: 2.5,
        outputPrice: 10.0,
        currency: 'USD',
      },
      effectiveDate,
    };

    it('sums OCR and LLM costs', () => {
      const result = service.calculateTotalExtractionCost(
        10, // pages
        2400, // input tokens
        480, // output tokens
        ocrPricing,
        llmPricing,
      );
      // OCR: 10 * 0.001 = 0.01
      // LLM: (2400/1M)*2.5 + (480/1M)*10 = 0.006 + 0.0048 = 0.0108
      // Total: 0.0208
      expect(result).toBeCloseTo(0.0208, 4);
    });

    it('returns 0 when no pricing is provided', () => {
      const result = service.calculateTotalExtractionCost(10, 2400, 480);
      expect(result).toBe(0);
    });

    it('returns only OCR cost when only OCR pricing is provided', () => {
      const result = service.calculateTotalExtractionCost(
        10,
        2400,
        480,
        ocrPricing,
      );
      expect(result).toBe(0.01); // 10 * 0.001
    });

    it('returns only LLM cost when only LLM pricing is provided', () => {
      const result = service.calculateTotalExtractionCost(
        10,
        2400,
        480,
        undefined,
        llmPricing,
      );
      expect(result).toBeCloseTo(0.0108, 4);
    });
  });

  describe('getCurrency', () => {
    it('returns OCR currency when available', () => {
      const pricing: ModelPricing = {
        ocr: {
          pricePerPage: 0.001,
          currency: 'EUR',
        },
        llm: {
          inputPrice: 2.5,
          outputPrice: 10.0,
          currency: 'USD',
        },
        effectiveDate,
      };
      expect(service.getCurrency(pricing)).toBe('EUR');
    });

    it('returns LLM currency when OCR is not available', () => {
      const pricing: ModelPricing = {
        llm: {
          inputPrice: 2.5,
          outputPrice: 10.0,
          currency: 'GBP',
        },
        effectiveDate,
      };
      expect(service.getCurrency(pricing)).toBe('GBP');
    });

    it('returns USD as default when no pricing is provided', () => {
      expect(service.getCurrency()).toBe('USD');
    });

    it('returns USD as default when pricing has no currency', () => {
      const pricing: ModelPricing = {
        llm: {
          inputPrice: 2.5,
          outputPrice: 10.0,
        } as any,
        effectiveDate,
      };
      expect(service.getCurrency(pricing)).toBe('USD');
    });
  });
});
