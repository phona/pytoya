import { apiClient } from './client';

export type DashboardMetrics = {
  thisMonth: {
    total: number | null;
    ocr: number | null;
    llm: number | null;
    documentCount: number;
    currency: string | null;
    totalsByCurrency?: Array<{
      currency: string;
      documentCount: number;
      total: number;
      ocr: number;
      llm: number;
    }>;
  };
  lastMonth: {
    total: number | null;
    documentCount: number;
    currency: string | null;
    totalsByCurrency?: Array<{
      currency: string;
      documentCount: number;
      total: number;
      ocr: number;
      llm: number;
    }>;
  };
};

export type CostDashboardTotalsByCurrency = {
  currency: string;
  documentCount: number;
  totalCost: number;
  textCost: number;
  llmCost: number;
  pagesProcessed: number;
  llmInputTokens: number;
  llmOutputTokens: number;
};

export type CostDashboardCostOverTime = {
  date: string; // YYYY-MM-DD
  currency: string;
  documentCount: number;
  totalCost: number;
  textCost: number;
  llmCost: number;
  pagesProcessed: number;
  llmInputTokens: number;
  llmOutputTokens: number;
};

export type CostDashboardLlmByModel = {
  llmModelId: string | null;
  llmModelName: string | null;
  currency: string;
  documentCount: number;
  llmCost: number;
  llmInputTokens: number;
  llmOutputTokens: number;
  costPer1kTotalTokens: number;
};

export type CostDashboardTextByExtractor = {
  extractorId: string | null;
  extractorName: string | null;
  currency: string;
  documentCount: number;
  textCost: number;
  pagesProcessed: number;
  costPerPage: number;
};

export type CostDashboardMetrics = {
  dateRange?: { from: string; to: string };
  totalsByCurrency: CostDashboardTotalsByCurrency[];
  costOverTime: CostDashboardCostOverTime[];
  llmByModel: CostDashboardLlmByModel[];
  textByExtractor: CostDashboardTextByExtractor[];
};

export const metricsApi = {
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const response = await apiClient.get<DashboardMetrics>('/metrics/dashboard');
    return response.data;
  },

  async getCostDashboardMetrics(params?: { from?: string; to?: string }): Promise<CostDashboardMetrics> {
    const response = await apiClient.get<CostDashboardMetrics>('/metrics/cost-dashboard', { params });
    return response.data;
  },
};
