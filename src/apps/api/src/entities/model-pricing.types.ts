export type ModelPricingCurrency = 'USD' | string;

export type OcrModelPricing = {
  pricePerPage: number;
  currency: ModelPricingCurrency;
  minimumCharge?: number;
};

export type LlmModelPricing = {
  inputPrice: number;
  outputPrice: number;
  currency: ModelPricingCurrency;
  minimumCharge?: number;
};

export type ModelPricing = {
  ocr?: OcrModelPricing;
  llm?: LlmModelPricing;
  effectiveDate: Date | string;
};

export type ModelPricingHistoryEntry = ModelPricing & {
  endDate?: Date | string;
};
