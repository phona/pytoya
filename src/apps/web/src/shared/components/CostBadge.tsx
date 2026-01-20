import { Badge } from '@/shared/components/ui/badge';

type CostBadgeProps = {
  label: string;
  value?: number | null;
  currency?: string;
  helperText?: string;
  precision?: number;
};

const formatCurrency = (value: number, currency?: string, precision = 4) => {
  if (currency) {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: precision,
      }).format(value);
    } catch {
      // fall back to simple formatting
    }
  }
  return `$${value.toFixed(precision)}`;
};

export function CostBadge({ label, value, currency, helperText, precision = 4 }: CostBadgeProps) {
  const hasValue = value !== null && value !== undefined;
  const displayValue = hasValue ? formatCurrency(Number(value), currency, precision) : '--';

  return (
    <div className="rounded-md border border-border bg-muted/40 px-3 py-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <Badge variant="outline" className="text-[10px]">
          {currency ?? 'USD'}
        </Badge>
      </div>
      <div className="mt-1 text-sm font-semibold text-foreground">{displayValue}</div>
      {helperText && (
        <div className="mt-1 text-[11px] text-muted-foreground">{helperText}</div>
      )}
    </div>
  );
}
