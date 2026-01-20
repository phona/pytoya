import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Separator } from '@/shared/components/ui/separator';

type CostBreakdownPanelProps = {
  textCost?: number | null;
  llmCost?: number | null;
  totalCost?: number | null;
  currency?: string;
  textLabel?: string;
  llmLabel?: string;
};

const formatCurrency = (value: number, currency?: string) => {
  const code = currency ?? 'USD';
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: code }).format(value);
  } catch {
    return `$${value.toFixed(4)}`;
  }
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
              ? formatCurrency(textCost, currency)
              : 'N/A'}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{llmLabel}</span>
          <span className="font-medium">
            {llmCost !== null && llmCost !== undefined
              ? formatCurrency(llmCost, currency)
              : 'N/A'}
          </span>
        </div>
        <Separator />
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Total</span>
          <span className="text-lg font-semibold">
            {totalCost !== null && totalCost !== undefined
              ? formatCurrency(totalCost, currency)
              : 'N/A'}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
