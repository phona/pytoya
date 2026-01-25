import { sanitizeXlsxText, toXlsxCellValue } from './xlsx-export.util';

describe('xlsx-export.util', () => {
  it('escapes formula-like prefixes to avoid injection', () => {
    expect(sanitizeXlsxText('=1+1')).toBe("'=1+1");
    expect(sanitizeXlsxText('+SUM(A1:A2)')).toBe("'+SUM(A1:A2)");
    expect(sanitizeXlsxText('-10')).toBe("'-10");
    expect(sanitizeXlsxText('@cmd')).toBe("'@cmd");
  });

  it('leaves normal text as-is', () => {
    expect(sanitizeXlsxText('hello')).toBe('hello');
    expect(sanitizeXlsxText('  =not-formula')).toBe('  =not-formula');
  });

  it('converts unknown values to safe cell values', () => {
    expect(toXlsxCellValue(null)).toBe('');
    expect(toXlsxCellValue(undefined)).toBe('');
    expect(toXlsxCellValue('=x')).toBe("'=x");
    expect(toXlsxCellValue(123)).toBe(123);
    expect(toXlsxCellValue(true)).toBe(true);
    expect(String(toXlsxCellValue({ a: 1 }))).toContain('"a":1');
  });
});

