export interface CrossFieldRule {
  id: string;
  name: string;
  expression: string;
  errorMessage: string;
  severity: 'error' | 'warning';
  enabled: boolean;
}

export interface CrossFieldValidationIssue {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

/**
 * Validates cross-field rules against extracted data using safe expression evaluation.
 * Supports: sum(array[].field), field comparisons, basic arithmetic.
 */
export function validateCrossFieldRules(
  data: Record<string, unknown>,
  rules: CrossFieldRule[],
): CrossFieldValidationIssue[] {
  const issues: CrossFieldValidationIssue[] = [];

  for (const rule of rules) {
    if (!rule.enabled) continue;

    try {
      const result = evaluateExpression(rule.expression, data);
      if (result === false) {
        issues.push({
          field: rule.name,
          message: rule.errorMessage,
          severity: rule.severity,
        });
      }
    } catch {
      // Skip rules that can't be evaluated (e.g. missing data)
    }
  }

  return issues;
}

/**
 * Safely evaluate a cross-field expression.
 * Supported syntax:
 * - sum(items[].amount) == totalAmount
 * - fieldA == fieldB * fieldC
 * - fieldA > 0
 * - fieldA != null
 */
function evaluateExpression(expression: string, data: Record<string, unknown>): boolean {
  // Parse comparison operator
  const operators = ['==', '!=', '>=', '<=', '>', '<'];
  let operator = '';
  let leftExpr = '';
  let rightExpr = '';

  for (const op of operators) {
    const idx = expression.indexOf(op);
    if (idx !== -1) {
      operator = op;
      leftExpr = expression.substring(0, idx).trim();
      rightExpr = expression.substring(idx + op.length).trim();
      break;
    }
  }

  if (!operator) {
    return false;
  }

  const leftVal = resolveValue(leftExpr, data);
  const rightVal = resolveValue(rightExpr, data);

  if (leftVal === undefined || rightVal === undefined) {
    return true; // Skip if data is missing
  }

  switch (operator) {
    case '==': return leftVal === rightVal;
    case '!=': return leftVal !== rightVal;
    case '>': return Number(leftVal) > Number(rightVal);
    case '<': return Number(leftVal) < Number(rightVal);
    case '>=': return Number(leftVal) >= Number(rightVal);
    case '<=': return Number(leftVal) <= Number(rightVal);
    default: return false;
  }
}

/**
 * Resolve a value expression from data.
 * Supports: field paths, sum(array[].field), numeric literals, null, arithmetic (a * b, a + b)
 */
function resolveValue(expr: string, data: Record<string, unknown>): unknown {
  const trimmed = expr.trim();

  // null literal
  if (trimmed === 'null') return null;

  // Numeric literal
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);

  // String literal (quoted)
  if (/^["'].*["']$/.test(trimmed)) return trimmed.slice(1, -1);

  // sum(array[].field)
  const sumMatch = trimmed.match(/^sum\((.+)\)$/);
  if (sumMatch) {
    const values = resolveArrayPath(sumMatch[1], data);
    return values.reduce((acc: number, v) => acc + (Number(v) || 0), 0);
  }

  // Arithmetic: a * b, a + b, a - b, a / b
  for (const arithOp of ['*', '+', '-', '/']) {
    // Don't split on negative numbers
    const arithIdx = trimmed.indexOf(` ${arithOp} `);
    if (arithIdx !== -1) {
      const a = resolveValue(trimmed.substring(0, arithIdx), data);
      const b = resolveValue(trimmed.substring(arithIdx + 3), data);
      const na = Number(a);
      const nb = Number(b);
      if (isNaN(na) || isNaN(nb)) return undefined;
      switch (arithOp) {
        case '*': return na * nb;
        case '+': return na + nb;
        case '-': return na - nb;
        case '/': return nb !== 0 ? na / nb : undefined;
      }
    }
  }

  // Simple field path (dot notation)
  return resolveFieldPath(trimmed, data);
}

function resolveFieldPath(path: string, data: Record<string, unknown>): unknown {
  const parts = path.split('.');
  let current: unknown = data;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

/**
 * Resolve array[].field paths, returning an array of values.
 * E.g. "items[].amount" -> [100, 200, 300]
 */
function resolveArrayPath(path: string, data: Record<string, unknown>): unknown[] {
  const bracketIdx = path.indexOf('[].');
  if (bracketIdx === -1) {
    // No array notation, try to resolve as regular path
    const val = resolveFieldPath(path, data);
    return Array.isArray(val) ? val : val !== undefined ? [val] : [];
  }

  const arrayPath = path.substring(0, bracketIdx);
  const fieldPath = path.substring(bracketIdx + 3);

  const arr = resolveFieldPath(arrayPath, data);
  if (!Array.isArray(arr)) {
    return [];
  }

  return arr
    .map((item) => {
      if (item === null || item === undefined || typeof item !== 'object') {
        return undefined;
      }
      return resolveFieldPath(fieldPath, item as Record<string, unknown>);
    })
    .filter((v) => v !== undefined);
}
