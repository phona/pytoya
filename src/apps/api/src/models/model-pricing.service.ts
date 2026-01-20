import { Injectable } from '@nestjs/common';
import { ModelPricing } from '../entities/model-pricing.types';

@Injectable()
export class ModelPricingService {
  calculateOcrCost(pages: number, pricing?: ModelPricing): number {
    const ocrPricing = pricing?.ocr;
    if (!ocrPricing || pages <= 0) {
      return 0;
    }
    const cost = pages * ocrPricing.pricePerPage;
    return ocrPricing.minimumCharge
      ? Math.max(cost, ocrPricing.minimumCharge)
      : cost;
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
    const safeInput = Math.max(0, inputTokens);
    const safeOutput = Math.max(0, outputTokens);
    const inputCost = (safeInput / 1_000_000) * llmPricing.inputPrice;
    const outputCost = (safeOutput / 1_000_000) * llmPricing.outputPrice;
    const total = inputCost + outputCost;
    return llmPricing.minimumCharge
      ? Math.max(total, llmPricing.minimumCharge)
      : total;
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

  getCurrency(pricing?: ModelPricing): string {
    return pricing?.ocr?.currency ?? pricing?.llm?.currency ?? 'USD';
  }
}
