import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { metricsApi, type CostDashboardMetrics } from '@/api/metrics';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Separator } from '@/shared/components/ui/separator';
import { formatCostWithCurrency } from '@/shared/utils/cost';

type CostDashboardWidgetProps = {
  mode: 'llm' | 'text';
};

const toNumber = (value: unknown): number => {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const toInt = (value: unknown): number => {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? Math.trunc(value) : 0;
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const formatInt = (value: number): string =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.max(0, value));

const defaultDateRange = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    from: start.toISOString().slice(0, 10),
    to: now.toISOString().slice(0, 10),
  };
};

export function CostDashboardWidget({ mode }: CostDashboardWidgetProps) {
  const [dateRange, setDateRange] = useState<{ from?: string; to?: string }>(defaultDateRange);

  const query = useQuery({
    queryKey: ['cost-dashboard', mode, dateRange.from ?? null, dateRange.to ?? null],
    queryFn: () => metricsApi.getCostDashboardMetrics({ from: dateRange.from, to: dateRange.to }),
  });

  const data: CostDashboardMetrics | undefined = query.data ?? undefined;

  const totals = useMemo(() => {
    const rows = data?.totalsByCurrency ?? [];
    return rows.map((row) => {
      const currency = row.currency;
      const llmCost = toNumber(row.llmCost);
      const textCost = toNumber(row.textCost);
      const llmInputTokens = toInt(row.llmInputTokens);
      const llmOutputTokens = toInt(row.llmOutputTokens);
      const pagesProcessed = toInt(row.pagesProcessed);
      const cost = mode === 'llm' ? llmCost : textCost;

      const denominator = mode === 'llm' ? llmInputTokens + llmOutputTokens : pagesProcessed;
      const rate =
        denominator > 0
          ? mode === 'llm'
            ? (cost * 1000) / denominator
            : cost / denominator
          : 0;

      return {
        currency,
        cost,
        llmInputTokens,
        llmOutputTokens,
        pagesProcessed,
        rate,
      };
    });
  }, [data?.totalsByCurrency, mode]);

  const title = mode === 'llm' ? 'LLM Cost & Tokens' : 'Text Cost & Pages';

  return (
    <Card>
      <CardHeader className="gap-3 md:flex-row md:items-center md:justify-between md:space-y-0">
        <CardTitle className="text-base">{title}</CardTitle>
        <div className="flex items-center gap-2 text-sm">
          <Input
            type="date"
            value={dateRange.from ?? ''}
            onChange={(event) => setDateRange((prev) => ({ ...prev, from: event.target.value || undefined }))}
            aria-label="From date"
          />
          <span className="text-muted-foreground">to</span>
          <Input
            type="date"
            value={dateRange.to ?? ''}
            onChange={(event) => setDateRange((prev) => ({ ...prev, to: event.target.value || undefined }))}
            aria-label="To date"
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {query.isLoading ? (
          <div className="text-sm text-muted-foreground">Loading cost metrics…</div>
        ) : query.isError ? (
          <div className="text-sm text-destructive">Failed to load cost metrics.</div>
        ) : totals.length === 0 ? (
          <div className="text-sm text-muted-foreground">No cost data for this date range.</div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              {totals.map((row) => {
                const costLine = formatCostWithCurrency(row.cost, row.currency, 4);
                const usageLine =
                  mode === 'llm'
                    ? `${formatInt(row.llmInputTokens)} in / ${formatInt(row.llmOutputTokens)} out`
                    : `${formatInt(row.pagesProcessed)} pages`;
                const rateLine =
                  mode === 'llm'
                    ? `${formatCostWithCurrency(row.rate, row.currency, 6)} per 1k tokens`
                    : `${formatCostWithCurrency(row.rate, row.currency, 6)} per page`;

                return (
                  <div key={row.currency} className="rounded-md border border-border p-4">
                    <div className="text-xs text-muted-foreground">Total</div>
                    <div className="text-lg font-semibold">{costLine}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{usageLine}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{rateLine}</div>
                  </div>
                );
              })}
            </div>

            <Separator />

            <div>
              <div className="text-sm font-medium">{mode === 'llm' ? 'Top Models' : 'Top Extractors'}</div>
              {mode === 'llm' ? (
                data?.llmByModel?.length ? (
                  <div className="mt-2 space-y-2">
                    {data.llmByModel.slice(0, 5).map((item) => {
                      const name = item.llmModelName ?? item.llmModelId ?? 'Unknown model';
                      return (
                        <div key={`${item.llmModelId ?? 'unknown'}-${item.currency}`} className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">{name}</span>
                          <span className="font-medium">{formatCostWithCurrency(toNumber(item.llmCost), item.currency, 4)}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-muted-foreground">No breakdown data available.</p>
                )
              ) : data?.textByExtractor?.length ? (
                <div className="mt-2 space-y-2">
                  {data.textByExtractor.slice(0, 5).map((item) => {
                    const name = item.extractorName ?? item.extractorId ?? 'Unknown extractor';
                    return (
                      <div key={`${item.extractorId ?? 'unknown'}-${item.currency}`} className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{name}</span>
                        <span className="font-medium">{formatCostWithCurrency(toNumber(item.textCost), item.currency, 4)}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">No breakdown data available.</p>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
