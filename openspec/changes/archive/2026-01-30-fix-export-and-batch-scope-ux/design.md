# Design: fix-export-and-batch-scope-ux

## 1) XLSX export columns

Rule: XLSX Manifests sheet MUST follow the project’s active schema columns (same source as CSV).

ASCII:
```
schema has x-table-columns?
  yes -> use them
  no  -> extractedDataJson
```

Notes:
- Keep `Items` sheet as-is.
- Keep spreadsheet-injection safety via `toXlsxCellValue()`.

## 2) Batch scope: ID-only fetch

Add an ID-only list endpoint to avoid large payload paging.

Response:
```
{ total: number, ids: number[] }
```

Behavior:
- Applies same filters/sort as the manifests list.
- Enforces max 5000 IDs (or tighter).

## 3) OCR “unprocessed” semantics

Interpretation:
- `ocrQualityScore IS NULL` => unprocessed
- `ocrQualityScore = 0..69` => poor (processed)

