# Proposal: Refactor CSV Export to Be Schema-Driven

## Why

The current CSV export implementation is invoice-shaped (headers, filters, and field paths like `invoice.po_no`). This blocks reuse for other document types and violates the “schema-driven” platform direction.

### Root cause
CSV export behavior (columns + filters) is defined by code defaults instead of the project schema contract.

## What Changes
- Make CSV export column selection schema-driven:
  - Prefer schema `x-table-columns` as the export column list (WYSIWYG: table → CSV).
  - If `x-table-columns` is empty/absent, fall back to exporting `extractedData` as JSON in a single column (safe default).
- Remove invoice-only filtering parameters from the export implementation and align export filtering with dynamic extracted-data filters (`filter[dot.path]=...`).
- Keep manifest/system metadata columns (id, filename, status, createdAt, etc.) as stable export columns.

## Goals
- Export works for any schema without hardcoded invoice assumptions.
- Filtering semantics are consistent between manifest list and export.
- Minimal “magic”: schema config drives what gets exported.

## Non-Goals
- Perfect “explode arrays into per-item rows” for every schema (can be a follow-up).
- Adding new production dependencies without explicit confirmation.

## Architecture

```text
columns = schema.x-table-columns ?? []
base = [manifest metadata columns...]
dataCols = columns.length ? columns : ["extractedDataJson"]
```

## Risks
- Breaking users who relied on the old invoice CSV layout; mitigate by:
  - keeping a temporary legacy mode, or
  - providing a migration guide.

## Validation Plan
- Add/adjust tests for:
  - schema-driven column selection
  - export respects dynamic filters
- Run:
  - `npm run test`
  - `npm run lint`
  - `npm run type-check`

