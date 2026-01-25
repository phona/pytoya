# Validation Scripts Guide

## Overview

Validation scripts allow you to verify data integrity after extraction. Scripts are written in JavaScript and run in an isolated VM context to check business rules, cross-field validation, and identify suspicious data for human review.

## How It Works

1. **Script Creation**: Create validation scripts in the UI or via API
2. **Execution**: Run scripts on completed extraction results
3. **Results**: View issues grouped by severity (error/warning)
4. **Action**: Re-extract or edit data manually based on findings

Scripts are scoped to a project and can be managed from the project detail page.

## Caching + Audit Provenance
Validation results are cached on the manifest (`manifest.validationResults`) and include provenance fields:
- `schemaId` / `schemaVersion`: which project schema contract was active when validation ran
- `validationScriptIds` / `validationScriptsVersion`: which scripts (and script content/version) produced the results

Cached validation results are automatically invalidated (cleared) when:
- the project’s active schema changes (new schema version), or
- validation scripts for the project change (create/update/delete/enable/disable).

## Script Function Signature

```javascript
function validate(extractedData): ValidationIssue[] {
  return [
    {
      field: string,      // Dot-notation path (e.g., "items[0].price")
      message: string,    // Human-readable error description
      severity: 'warning' | 'error',
      actual?: any,       // Actual value for debugging
      expected?: any,     // Expected value for debugging
    }
  ];
}
```

## Available Utilities

Scripts run in a restricted VM context with the following utilities:

- `Math`: All Math functions
- `Date`: Date constructor
- `Object.keys()`, `Object.values()`, `Object.entries()`, `Object.assign()`
- `Array.isArray()`, `Array.from()`
- `Number(value)`: Convert to number
- `Number.isFinite()`, `Number.isInteger()`, `Number.isNaN()`, `Number.parseFloat()`, `Number.parseInt()`

## Security Model

- **No file system access**: Scripts cannot read/write files
- **No network access**: Scripts cannot make HTTP requests
- **Timeout**: 5 seconds max execution time per script
- **Isolated context**: Scripts run in a separate VM context
- **Memory limits**: 10MB max memory usage

## Example Scripts

### 1. Tax Calculation Check

Validates that unit prices with tax match expected calculations:

```javascript
function validate(extractedData) {
  const issues = [];
  const taxRate = 0.13; // 13% VAT

  for (const [i, item] of (extractedData.items || []).entries()) {
    const exTax = item.unit_price_ex_tax || 0;
    const incTax = item.unit_price_inc_tax || 0;
    const expected = exTax * (1 + taxRate);
    const diff = Math.abs(expected - incTax);

    if (diff > 0.01) {
      issues.push({
        field: `items[${i}].unit_price_inc_tax`,
        message: `Tax mismatch: expected ${expected.toFixed(2)}, got ${incTax}`,
        severity: 'warning',
        actual: incTax,
        expected: expected,
      });
    }
  }
  return issues;
}
```

### 2. Invoice Totals Check

Verifies that the sum of line item totals matches the invoice total:

```javascript
function validate(extractedData) {
  const issues = [];
  const items = extractedData.items || [];

  const calculatedTotal = items.reduce((sum, item) =>
    sum + (item.total_amount_inc_tax || 0), 0
  );

  const statedTotal = extractedData.invoice?.total_amount_inc_tax || 0;
  const diff = Math.abs(calculatedTotal - statedTotal);

  if (diff > 0.05) {
    issues.push({
      field: 'invoice.total_amount_inc_tax',
      message: `Sum mismatch: items total ${calculatedTotal.toFixed(2)}, invoice total ${statedTotal.toFixed(2)}`,
      severity: 'error',
      actual: statedTotal,
      expected: calculatedTotal,
    });
  }

  return issues;
}
```

### 3. Required Fields Check

Ensures critical invoice fields are present and non-empty:

```javascript
function validate(extractedData) {
  const issues = [];
  const requiredFields = [
    'invoice.po_no',
    'invoice.invoice_date',
    'invoice.supplier_name',
    'department.code',
  ];

  for (const field of requiredFields) {
    const value = getNestedValue(extractedData, field);
    if (value === undefined || value === null || value === '') {
      issues.push({
        field: field,
        message: `Required field '${field}' is missing or empty`,
        severity: 'error',
      });
    }
  }

  return issues;
}

function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => {
    return current && typeof current === 'object' ? current[key] : undefined;
  }, obj);
}
```

### 4. Date Range Check

Validates that invoice date is within expected ranges:

```javascript
function validate(extractedData) {
  const issues = [];

  const invoiceDateStr = extractedData.invoice?.invoice_date;
  if (!invoiceDateStr) {
    return issues;
  }

  const invoiceDate = new Date(invoiceDateStr);
  const today = new Date();
  const oneYearAgo = new Date(today);
  oneYearAgo.setFullYear(today.getFullYear() - 1);

  if (isNaN(invoiceDate.getTime())) {
    issues.push({
      field: 'invoice.invoice_date',
      message: 'Invalid date format',
      severity: 'error',
      actual: invoiceDateStr,
    });
  } else if (invoiceDate > today) {
    issues.push({
      field: 'invoice.invoice_date',
      message: 'Invoice date is in the future',
      severity: 'warning',
      actual: invoiceDateStr,
      expected: 'Today or earlier',
    });
  } else if (invoiceDate < oneYearAgo) {
    issues.push({
      field: 'invoice.invoice_date',
      message: 'Invoice date is more than one year old',
      severity: 'warning',
      actual: invoiceDateStr,
    });
  }

  return issues;
}
```

## API Reference

### Scripts CRUD

```typescript
// List all scripts
GET /validation/scripts

// Get script by ID
GET /validation/scripts/:id

// List scripts by project
GET /validation/scripts/project/:projectId

// Get template scripts
GET /validation/scripts/templates

// Create script
POST /validation/scripts
Body: {
  name: string;
  projectId: number;
  script: string;
  severity?: 'warning' | 'error';
  enabled?: boolean;
  description?: string;
}

// Update script
POST /validation/scripts/:id
Body: Partial<CreateScriptDto>

// Delete script
DELETE /validation/scripts/:id
```

### Script Validation

```typescript
// Validate script syntax (without executing)
POST /validation/scripts/validate-syntax
Body: { script: string }
Response: { valid: boolean; error?: string }
```

### Script Testing (Debug Panel)

```typescript
// Test a script against provided extractedData and return issues + console output
POST /validation/scripts/test
Body: {
  script: string;
  extractedData: Record<string, unknown>;
  debug?: boolean; // when true, captures console.* logs
}
Response: {
  result: ValidationResult;
  debug?: { logs: Array<{ level: 'log' | 'info' | 'warn' | 'error' | 'debug'; message: string }> };
  runtimeError?: { message: string; stack?: string };
}
```

Notes:
- `console.log()` output is returned via `debug.logs` when `debug=true` (it is not just written to server logs).
- Runtime failures return a `runtimeError` with a sanitized stack snippet when available.

### Validation Execution

```typescript
// Run validation on a manifest
POST /validation/run
Body: {
  manifestId: number;
  scriptIds?: number[];  // Optional: run specific scripts
}
Response: ValidationResult

// Run validation on multiple manifests
POST /validation/batch
Body: {
  manifestIds: number[];
  scriptIds?: number[];
}
Response: Record<number, ValidationResult>
```

### Response Types

```typescript
interface ValidationResult {
  issues: ValidationIssue[];
  errorCount: number;
  warningCount: number;
  validatedAt: string;
}

interface ValidationIssue {
  field: string;
  message: string;
  severity: 'warning' | 'error';
  actual?: unknown;
  expected?: unknown;
}
```

## Tips for Writing Scripts

1. **Use array methods for iteration**: Use `entries()` for index access, `forEach()` or `filter()` for other operations

2. **Provide helpful messages**: Include actual and expected values to help with debugging

3. **Choose appropriate severity**: Use `error` for critical issues, `warning` for potential problems

4. **Handle missing data**: Always check for null/undefined before accessing nested properties

5. **Use dot notation for field paths**: This makes it easier to locate issues in the data

6. **Test incrementally**: Use the "Check Syntax" button before running on actual data

7. **Leverage optional chaining**: Use `?.` operator when accessing nested properties

8. **Return early for simple cases**: If a quick check fails, return the issue immediately
