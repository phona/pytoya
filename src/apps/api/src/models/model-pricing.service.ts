import { Injectable } from '@nestjs/common';
import { ModelPricing } from '../entities/model-pricing.types';
import {
  applyMinimumCharge,
  calculateTokenCostNano,
  multiplyNanoAmounts,
  nanoToNumber,
  numberToNano,
} from '../common/cost/nano';

@Injectable()
export class ModelPricingService {
  calculateOcrCost(pages: number, pricing?: ModelPricing): number {
    const ocrPricing = pricing?.ocr;
    if (!ocrPricing || pages <= 0) {
      return 0;
    }
    const pagesNano = numberToNano(Math.max(0, pages));
    const priceNano = numberToNano(ocrPricing.pricePerPage);
    const rawCostNano = multiplyNanoAmounts(pagesNano, priceNano);
    const costNano = applyMinimumCharge(
      rawCostNano,
      numberToNano(ocrPricing.minimumCharge),
    );
    return nanoToNumber(costNano);
  }

  calculateLlmCost(
    inputTokens: number,
    outputTokens: number,
    pricing?: ModelPricing,
  ): number {
    const llmPricing = pricing?.llm;
    if (!llmPricing) {
      return 0;
    }
    const rawCostNano = calculateTokenCostNano(
      inputTokens,
      outputTokens,
      llmPricing.inputPrice,
      llmPricing.outputPrice,
    );
    const costNano = applyMinimumCharge(
      rawCostNano,
      numberToNano(llmPricing.minimumCharge),
    );
    return nanoToNumber(costNano);
  }

  calculateTotalExtractionCost(
    pages: number,
    inputTokens: number,
    outputTokens: number,
    ocrPricing?: ModelPricing,
    llmPricing?: ModelPricing,
  ): number {
    return (
      this.calculateOcrCost(pages, ocrPricing) +
      this.calculateLlmCost(inputTokens, outputTokens, llmPricing)
    );
  }

  getCurrency(pricing?: ModelPricing): string | undefined {
    return pricing?.ocr?.currency ?? pricing?.llm?.currency ?? undefined;
  }
}
