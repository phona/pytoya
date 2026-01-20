import type { ProjectCostSummary as ProjectCostSummaryType } from '@/api/projects';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Separator } from '@/shared/components/ui/separator';

type ProjectCostSummaryProps = {
  summary?: ProjectCostSummaryType;
};

const formatCurrency = (value: number) => {
  return `$${value.toFixed(4)}`;
};

export function ProjectCostSummary({ summary }: ProjectCostSummaryProps) {
  if (!summary) {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-muted-foreground">
          No cost data available for this project yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Project Cost Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <div className="text-xs text-muted-foreground">Total Extraction Cost</div>
            <div className="text-xl font-semibold">{formatCurrency(summary.totalExtractionCost)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Date Range</div>
            <div className="text-sm text-muted-foreground">
              {summary.dateRange
                ? `${summary.dateRange.from} → ${summary.dateRange.to}`
                : 'All time'}
            </div>
          </div>
        </div>

        <Separator />

        <div>
          <div className="text-sm font-medium">Cost by Extractor</div>
          {summary.costByExtractor.length === 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">No extractor activity yet.</p>
          ) : (
            <div className="mt-2 space-y-2">
              {summary.costByExtractor.map((item) => (
                <div key={`${item.extractorId ?? 'unknown'}`} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    {item.extractorName ?? 'Unknown extractor'}
                  </span>
                  <span className="font-medium">
                    {formatCurrency(item.totalCost)} ({item.extractionCount})
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <Separator />

        <div>
          <div className="text-sm font-medium">Cost Over Time</div>
          {summary.costOverTime.length === 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">No cost history yet.</p>
          ) : (
            <div className="mt-2 space-y-2">
              {summary.costOverTime.slice(-10).map((entry) => (
                <div key={entry.date} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{entry.date}</span>
                  <span className="font-medium">{formatCurrency(entry.extractionCost)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
