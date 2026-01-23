export class CostDashboardTotalsByCurrencyDto {
  currency!: string;
  documentCount!: number;
  totalCost!: number;
  textCost!: number;
  llmCost!: number;
  pagesProcessed!: number;
  llmInputTokens!: number;
  llmOutputTokens!: number;
}

export class CostDashboardCostOverTimeDto {
  date!: string; // YYYY-MM-DD
  currency!: string;
  documentCount!: number;
  totalCost!: number;
  textCost!: number;
  llmCost!: number;
  pagesProcessed!: number;
  llmInputTokens!: number;
  llmOutputTokens!: number;
}

export class CostDashboardLlmByModelDto {
  llmModelId!: string | null;
  llmModelName!: string | null;
  currency!: string;
  documentCount!: number;
  llmCost!: number;
  llmInputTokens!: number;
  llmOutputTokens!: number;
  costPer1kTotalTokens!: number;
}

export class CostDashboardTextByExtractorDto {
  extractorId!: string | null;
  extractorName!: string | null;
  currency!: string;
  documentCount!: number;
  textCost!: number;
  pagesProcessed!: number;
  costPerPage!: number;
}

export class CostDashboardDto {
  dateRange?: { from: string; to: string };
  totalsByCurrency!: CostDashboardTotalsByCurrencyDto[];
  costOverTime!: CostDashboardCostOverTimeDto[];
  llmByModel!: CostDashboardLlmByModelDto[];
  textByExtractor!: CostDashboardTextByExtractorDto[];
}

