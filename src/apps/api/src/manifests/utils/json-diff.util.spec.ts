import { computeJsonDiff } from './json-diff.util';

describe('computeJsonDiff', () => {
  it('returns empty array for identical objects', () => {
    const obj = { a: 1, b: 'hello' };
    expect(computeJsonDiff(obj, obj)).toEqual([]);
  });

  it('returns empty array for two nulls', () => {
    expect(computeJsonDiff(null, null)).toEqual([]);
  });

  it('returns empty array for null vs empty object', () => {
    expect(computeJsonDiff(null, {})).toEqual([]);
  });

  it('detects primitive value change', () => {
    const before = { name: 'Alice' };
    const after = { name: 'Bob' };
    expect(computeJsonDiff(before, after)).toEqual([
      { path: 'name', before: 'Alice', after: 'Bob' },
    ]);
  });

  it('detects added field', () => {
    const before = { a: 1 };
    const after = { a: 1, b: 2 };
    expect(computeJsonDiff(before, after)).toEqual([
      { path: 'b', before: null, after: 2 },
    ]);
  });

  it('detects removed field', () => {
    const before = { a: 1, b: 2 };
    const after = { a: 1 };
    expect(computeJsonDiff(before, after)).toEqual([
      { path: 'b', before: 2, after: null },
    ]);
  });

  it('detects nested object changes', () => {
    const before = { invoice: { total: 100, tax: 10 } };
    const after = { invoice: { total: 200, tax: 10 } };
    expect(computeJsonDiff(before, after)).toEqual([
      { path: 'invoice.total', before: 100, after: 200 },
    ]);
  });

  it('detects array element changes by index', () => {
    const before = { items: [{ qty: 1 }, { qty: 2 }] };
    const after = { items: [{ qty: 1 }, { qty: 5 }] };
    expect(computeJsonDiff(before, after)).toEqual([
      { path: 'items.1.qty', before: 2, after: 5 },
    ]);
  });

  it('detects array length increase', () => {
    const before = { items: ['a'] };
    const after = { items: ['a', 'b'] };
    expect(computeJsonDiff(before, after)).toEqual([
      { path: 'items.1', before: null, after: 'b' },
    ]);
  });

  it('detects array length decrease', () => {
    const before = { items: ['a', 'b'] };
    const after = { items: ['a'] };
    expect(computeJsonDiff(before, after)).toEqual([
      { path: 'items.1', before: 'b', after: null },
    ]);
  });

  it('treats null and undefined as equivalent', () => {
    const before = { a: null };
    const after = { a: undefined } as unknown as Record<string, unknown>;
    expect(computeJsonDiff(before, after)).toEqual([]);
  });

  it('detects type change (number to string)', () => {
    const before = { value: 123 };
    const after = { value: '123' };
    expect(computeJsonDiff(before, after)).toEqual([
      { path: 'value', before: 123, after: '123' },
    ]);
  });

  it('handles deeply nested structure', () => {
    const before = { a: { b: { c: { d: 1 } } } };
    const after = { a: { b: { c: { d: 2 } } } };
    expect(computeJsonDiff(before, after)).toEqual([
      { path: 'a.b.c.d', before: 1, after: 2 },
    ]);
  });

  it('handles multiple changes', () => {
    const before = { name: 'A', qty: 1, price: 10 };
    const after = { name: 'B', qty: 1, price: 20 };
    const diffs = computeJsonDiff(before, after);
    expect(diffs).toHaveLength(2);
    expect(diffs).toContainEqual({ path: 'name', before: 'A', after: 'B' });
    expect(diffs).toContainEqual({ path: 'price', before: 10, after: 20 });
  });
});
