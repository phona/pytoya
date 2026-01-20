export class ExtractorCostSummaryDto {
  extractorId!: string;
  extractorName!: string;
  totalExtractions!: number;
  totalCost!: number;
  averageCostPerExtraction!: number;
  currency?: string;
  costBreakdown!: {
    byDate: Array<{ date: string; count: number; cost: number }>;
    byProject: Array<{ projectId: number; projectName: string; count: number; cost: number }>;
  };
}
