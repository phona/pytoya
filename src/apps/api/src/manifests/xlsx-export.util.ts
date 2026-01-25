import type { CellValue } from 'exceljs';

const FORMULA_PREFIXES = ['=', '+', '-', '@'] as const;

export function sanitizeXlsxText(value: string): string {
  if (!value) return value;
  if (FORMULA_PREFIXES.includes(value[0] as (typeof FORMULA_PREFIXES)[number])) {
    return `'${value}`;
  }
  return value;
}

export function toXlsxCellValue(value: unknown): CellValue {
  if (value === null || value === undefined) return '';

  if (typeof value === 'string') return sanitizeXlsxText(value);
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : sanitizeXlsxText(String(value));
  }
  if (typeof value === 'boolean') return value;
  if (value instanceof Date) return value;

  try {
    return sanitizeXlsxText(JSON.stringify(value));
  } catch {
    return sanitizeXlsxText(String(value));
  }
}

