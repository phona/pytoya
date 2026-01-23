export class ExtractorCostSummaryDto {
  extractorId!: string;
  extractorName!: string;
  totalExtractions!: number;
  totalCost!: number | null;
  averageCostPerExtraction!: number | null;
  currency?: string | null;
  totalsByCurrency?: Array<{
    currency: string;
    totalCost: number;
    totalExtractions: number;
    averageCostPerExtraction: number;
  }>;
  costBreakdown!: {
    byDate: Array<{ date: string; currency: string; count: number; cost: number }>;
    byProject: Array<{ projectId: number; projectName: string; currency: string; count: number; cost: number }>;
  };
}
