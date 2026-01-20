export class ProjectCostSummaryDto {
  projectId!: number;
  totalExtractionCost!: number;
  costByExtractor!: Array<{
    extractorId: string | null;
    extractorName: string | null;
    totalCost: number;
    extractionCount: number;
    averageCost: number;
  }>;
  costOverTime!: Array<{
    date: string;
    extractionCost: number;
  }>;
  dateRange?: {
    from: string;
    to: string;
  };
}
