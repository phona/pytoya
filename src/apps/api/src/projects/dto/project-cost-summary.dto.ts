export class ProjectCostSummaryDto {
  projectId!: number;
  totalExtractionCost!: number | null;
  currency?: string | null;
  totalsByCurrency?: Array<{ currency: string; totalExtractionCost: number }>;
  costByExtractor!: Array<{
    extractorId: string | null;
    extractorName: string | null;
    currency: string;
    totalCost: number;
    extractionCount: number;
    averageCost: number;
  }>;
  costOverTime!: Array<{
    date: string;
    currency: string;
    extractionCost: number;
  }>;
  dateRange?: {
    from: string;
    to: string;
  };
}
