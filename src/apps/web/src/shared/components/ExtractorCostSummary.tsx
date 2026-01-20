import type { ExtractorCostSummary as ExtractorCostSummaryType } from '@/api/extractors';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Separator } from '@/shared/components/ui/separator';

type ExtractorCostSummaryProps = {
  summary?: ExtractorCostSummaryType;
};

const formatCurrency = (value: number, currency?: string) => {
  const code = currency ?? 'USD';
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: code }).format(value);
  } catch {
    return `$${value.toFixed(4)}`;
  }
};

export function ExtractorCostSummary({ summary }: ExtractorCostSummaryProps) {
  if (!summary) {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-muted-foreground">
          No cost data available for this extractor yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Extractor Cost Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <div className="text-xs text-muted-foreground">Total Extractions</div>
            <div className="text-lg font-semibold">{summary.totalExtractions}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Total Spend</div>
            <div className="text-lg font-semibold">
              {formatCurrency(summary.totalCost, summary.currency)}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Average Cost</div>
            <div className="text-lg font-semibold">
              {formatCurrency(summary.averageCostPerExtraction, summary.currency)}
            </div>
          </div>
        </div>

        <Separator />

        <div>
          <div className="text-sm font-medium">Top Projects</div>
          {summary.costBreakdown.byProject.length === 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">No project activity yet.</p>
          ) : (
            <div className="mt-2 space-y-2">
              {summary.costBreakdown.byProject.slice(0, 5).map((project) => (
                <div key={project.projectId} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{project.projectName}</span>
                  <span className="font-medium">
                    {formatCurrency(project.cost, summary.currency)} ({project.count})
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
