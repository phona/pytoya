import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Separator } from '@/shared/components/ui/separator';
import { formatCostWithCurrency } from '@/shared/utils/cost';

type CostBreakdownPanelProps = {
  textCost?: number | null;
  llmCost?: number | null;
  totalCost?: number | null;
  currency?: string;
  textLabel?: string;
  llmLabel?: string;
};

export function CostBreakdownPanel({
  textCost,
  llmCost,
  totalCost,
  currency,
  textLabel = 'Text Extraction',
  llmLabel = 'Structured LLM',
}: CostBreakdownPanelProps) {
  const hasAnyCost =
    textCost !== undefined ||
    llmCost !== undefined ||
    totalCost !== undefined;

  if (!hasAnyCost) {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-muted-foreground">
          No cost breakdown available for this manifest yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Cost Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{textLabel}</span>
          <span className="font-medium">
            {textCost !== null && textCost !== undefined
              ? formatCostWithCurrency(textCost, currency)
              : 'N/A'}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{llmLabel}</span>
          <span className="font-medium">
            {llmCost !== null && llmCost !== undefined
              ? formatCostWithCurrency(llmCost, currency)
              : 'N/A'}
          </span>
        </div>
        <Separator />
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Total</span>
          <span className="text-lg font-semibold">
            {totalCost !== null && totalCost !== undefined
              ? formatCostWithCurrency(totalCost, currency)
              : 'N/A'}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
