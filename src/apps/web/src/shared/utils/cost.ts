export function formatCostAmount(value: number, precision = 4): string {
  const safe = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: precision,
  }).format(safe);
}

export function formatCurrencyCode(currency?: string | null): string {
  const code = currency && currency.trim() ? currency.trim() : 'unknown';
  return code;
}

export function formatCostWithCurrency(
  value: number,
  currency?: string | null,
  precision = 4,
): string {
  return `${formatCostAmount(value, precision)} ${formatCurrencyCode(currency)}`;
}
