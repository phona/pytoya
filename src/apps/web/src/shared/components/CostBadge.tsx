import { Badge } from '@/shared/components/ui/badge';
import { formatCostAmount, formatCurrencyCode } from '@/shared/utils/cost';

type CostBadgeProps = {
  label: string;
  value?: number | null;
  currency?: string;
  helperText?: string;
  precision?: number;
};

export function CostBadge({ label, value, currency, helperText, precision = 4 }: CostBadgeProps) {
  const hasValue = value !== null && value !== undefined;
  const displayValue = hasValue ? formatCostAmount(Number(value), precision) : '--';
  const code = formatCurrencyCode(currency);

  return (
    <div className="rounded-md border border-border bg-muted/40 px-3 py-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <Badge variant="outline" className="text-[10px]">
          {code}
        </Badge>
      </div>
      <div className="mt-1 text-sm font-semibold text-foreground">{displayValue}</div>
      {helperText && (
        <div className="mt-1 text-[11px] text-muted-foreground">{helperText}</div>
      )}
    </div>
  );
}
