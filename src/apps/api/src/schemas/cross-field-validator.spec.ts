import { validateCrossFieldRules, CrossFieldRule } from './cross-field-validator';

describe('validateCrossFieldRules', () => {
  const makeRule = (overrides: Partial<CrossFieldRule> & Pick<CrossFieldRule, 'expression' | 'errorMessage'>): CrossFieldRule => ({
    id: '1',
    name: 'test-rule',
    severity: 'error',
    enabled: true,
    ...overrides,
  });

  it('returns no issues when all rules pass', () => {
    const data = { totalAmount: 300, items: [{ amount: 100 }, { amount: 200 }] };
    const rules = [makeRule({ expression: 'sum(items[].amount) == totalAmount', errorMessage: 'Sum mismatch' })];
    expect(validateCrossFieldRules(data, rules)).toEqual([]);
  });

  it('returns issue when sum does not match', () => {
    const data = { totalAmount: 999, items: [{ amount: 100 }, { amount: 200 }] };
    const rules = [makeRule({ expression: 'sum(items[].amount) == totalAmount', errorMessage: 'Sum mismatch' })];
    const issues = validateCrossFieldRules(data, rules);
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toBe('Sum mismatch');
    expect(issues[0].severity).toBe('error');
  });

  it('supports basic field comparison', () => {
    const data = { a: 10, b: 10 };
    const rules = [makeRule({ expression: 'a == b', errorMessage: 'a must equal b' })];
    expect(validateCrossFieldRules(data, rules)).toEqual([]);
  });

  it('supports != operator', () => {
    const data = { a: 10, b: 10 };
    const rules = [makeRule({ expression: 'a != b', errorMessage: 'a must differ from b' })];
    const issues = validateCrossFieldRules(data, rules);
    expect(issues).toHaveLength(1);
  });

  it('supports > and < operators', () => {
    const data = { price: 50, minPrice: 10 };
    expect(validateCrossFieldRules(data, [
      makeRule({ expression: 'price > minPrice', errorMessage: 'too low' }),
    ])).toEqual([]);
    expect(validateCrossFieldRules(data, [
      makeRule({ expression: 'price < minPrice', errorMessage: 'too high' }),
    ])).toHaveLength(1);
  });

  it('supports >= and <= operators', () => {
    const data = { a: 10, b: 10 };
    expect(validateCrossFieldRules(data, [
      makeRule({ expression: 'a >= b', errorMessage: 'fail' }),
    ])).toEqual([]);
    expect(validateCrossFieldRules(data, [
      makeRule({ expression: 'a <= b', errorMessage: 'fail' }),
    ])).toEqual([]);
  });

  it('supports arithmetic expressions', () => {
    const data = { quantity: 5, unitPrice: 20, lineTotal: 100 };
    const rules = [makeRule({
      expression: 'lineTotal == quantity * unitPrice',
      errorMessage: 'Line total mismatch',
    })];
    expect(validateCrossFieldRules(data, rules)).toEqual([]);
  });

  it('supports dot-notation field paths', () => {
    const data = { invoice: { total: 100 }, computed: { sum: 100 } };
    const rules = [makeRule({
      expression: 'invoice.total == computed.sum',
      errorMessage: 'Mismatch',
    })];
    expect(validateCrossFieldRules(data, rules)).toEqual([]);
  });

  it('supports numeric literal comparison', () => {
    const data = { quantity: 5 };
    expect(validateCrossFieldRules(data, [
      makeRule({ expression: 'quantity > 0', errorMessage: 'Must be positive' }),
    ])).toEqual([]);
    expect(validateCrossFieldRules(data, [
      makeRule({ expression: 'quantity > 10', errorMessage: 'Must be > 10' }),
    ])).toHaveLength(1);
  });

  it('supports null comparison', () => {
    const data = { name: 'test' };
    expect(validateCrossFieldRules(data, [
      makeRule({ expression: 'name != null', errorMessage: 'Must not be null' }),
    ])).toEqual([]);
  });

  it('skips disabled rules', () => {
    const data = { a: 1, b: 2 };
    const rules = [makeRule({ expression: 'a == b', errorMessage: 'fail', enabled: false })];
    expect(validateCrossFieldRules(data, rules)).toEqual([]);
  });

  it('skips evaluation when referenced data is missing', () => {
    const data = { a: 10 };
    const rules = [makeRule({ expression: 'a == nonExistentField', errorMessage: 'fail' })];
    // Should not fail — undefined fields result in skipping
    expect(validateCrossFieldRules(data, rules)).toEqual([]);
  });

  it('handles empty rules array', () => {
    expect(validateCrossFieldRules({ a: 1 }, [])).toEqual([]);
  });

  it('handles empty data', () => {
    const rules = [makeRule({ expression: 'a == 1', errorMessage: 'fail' })];
    expect(validateCrossFieldRules({}, rules)).toEqual([]);
  });

  it('preserves severity from rule', () => {
    const data = { a: 1, b: 2 };
    const rules = [makeRule({ expression: 'a == b', errorMessage: 'warn', severity: 'warning' })];
    const issues = validateCrossFieldRules(data, rules);
    expect(issues[0].severity).toBe('warning');
  });

  it('handles multiple rules with mixed results', () => {
    const data = { a: 10, b: 20, c: 30 };
    const rules = [
      makeRule({ id: '1', expression: 'a > 0', errorMessage: 'a positive' }),
      makeRule({ id: '2', expression: 'a == b', errorMessage: 'a equals b' }),
      makeRule({ id: '3', expression: 'c > a', errorMessage: 'c > a' }),
    ];
    const issues = validateCrossFieldRules(data, rules);
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toBe('a equals b');
  });

  it('handles sum with empty array', () => {
    const data = { totalAmount: 0, items: [] };
    const rules = [makeRule({ expression: 'sum(items[].amount) == totalAmount', errorMessage: 'fail' })];
    expect(validateCrossFieldRules(data, rules)).toEqual([]);
  });
});
