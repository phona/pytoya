# Change: Validation Scripts for Data Integrity

## Why
After extraction completes, humans need to verify data integrity. Current system only checks field existence. Users need configurable scripts to:
1. Validate business rules (e.g., tax calculations: `unit_price_ex_tax × 1.13 ≈ unit_price_inc_tax`)
2. Cross-field validation (e.g., `start_date ≤ end_date`)
3. Highlight suspicious data for human review
4. Batch validate multiple manifests at once

## What Changes

### Add
- **ValidationScriptEntity** - Store validation scripts per project
- **Validation CRUD APIs** - Create, read, update, delete validation scripts
- **Validation execution endpoint** - Run scripts on extracted data
- **Validation results UI** - Display issues in manifest review panel
- **Script templates** - Pre-built validation templates (tax check, totals, etc.)

### Modify
- `ManifestEntity` - Add `validationResults` field (JSONB) to cache results
- `ManifestsService` - Add `runValidation()` method
- Extraction UI - Show validation issues in review panel

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Validation Workflow                          │
├─────────────────────────────────────────────────────────────────┤
│  1. Extraction completes (status = COMPLETED)                   │
│  2. Human clicks "Run Validation" button                        │
│  3. System executes project's enabled validation scripts        │
│  4. Results cached in ManifestEntity.validationResults         │
│  5. UI displays issues grouped by severity                      │
│  6. Human decides: re-extract or edit manually                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                  ValidationScriptEntity                         │
├─────────────────────────────────────────────────────────────────┤
│  id: number                                                     │
│  name: string                                                   │
│  projectId: number                                              │
│  script: string              # JavaScript validation function   │
│  severity: 'warning' | 'error'                                 │
│  enabled: boolean                                               │
│  createdAt / updatedAt                                         │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│              Script Function Signature                         │
├─────────────────────────────────────────────────────────────────┤
│  function validate(extractedData): ValidationIssue[]            │
│                                                                 │
│  type ValidationIssue = {                                       │
│    field: string;         # Dot-notation path (e.g., "items[0]")│
│    message: string;       # Human-readable error description    │
│    severity: 'warning' | 'error';                              │
│    actual?: unknown;      # Actual value for debugging          │
│    expected?: unknown;    # Expected value for debugging        │
│  }                                                             │
└─────────────────────────────────────────────────────────────────┘
```

## Example Validation Scripts

### Tax Calculation Check
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
        expected: expected
      });
    }
  }
  return issues;
}
```

### Invoice Totals Check
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
      message: `Sum mismatch: items total ${calculatedTotal}, invoice total ${statedTotal}`,
      severity: 'error',
      actual: statedTotal,
      expected: calculatedTotal
    });
  }

  return issues;
}
```

## Security Considerations

- Scripts run in isolated VM context (no file system, network access)
- Timeout per script (5 seconds max)
- Memory limits (10MB max)
- Only project owner can create/edit scripts
- Admin-only script templates (global scripts)

## Impact
- **New feature:** No breaking changes
- **Affected code:** `manifests/` module, new `validation/` module
- **New dependencies:** `vm2` or isolated-vm for secure script execution
