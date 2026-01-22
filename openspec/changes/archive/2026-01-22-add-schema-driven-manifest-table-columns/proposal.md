# Change: Add Schema-Driven Manifest Table Columns + Sorting

## Why

Today `ManifestTable` hardcodes a few invoice-specific fields (PO, invoice date, department). That creates two UX problems:

- The list page does not reflect the project's active JSON Schema (fields drift over time).
- Users cannot reliably sort/filter by the same fields they see on the audit form.

## What Changes

- Define a schema convention for choosing list columns:
  - Prefer an explicit root-level JSON Schema extension: `x-table-columns: string[]` (dot-paths like `invoice.po_no`)
  - Dot-paths read values from `manifest.extractedData` and support nested objects (e.g., `receipt.merchant.name`).
  - **Semantics**:
    - If `x-table-columns` is **absent**, the UI falls back to a safe default selection (required scalar leaf fields, capped to a small max)
    - If `x-table-columns` is present but **empty** (`[]`), the UI treats it as an explicit opt-out and shows **no schema-driven columns**
    - If `x-table-columns` is **non-empty**, the UI shows exactly those columns in the configured order
- Render those schema-driven fields as dynamic columns in the manifests list table.
- Allow sorting by those dynamic columns via `sortBy=<fieldPath>` (backend already supports this).
- Improve filtering UX by aligning dynamic field filters with visible columns (column header filters), while keeping non-column filters (status, quality, cost, etc.) in the Advanced filters panel.
- Reduce table clutter by keeping a minimal set of system columns visible by default; additional metadata remains available in the card view and audit view.
- Add a `Columns` dropdown (table view) so users can show/hide schema columns (and optional system columns like Status) without editing the schema; Filename + Actions stay pinned.
- Make the table’s primary navigation explicit: clicking the Filename navigates to the audit/detail view (row clicks remain non-navigational).
- Consolidate row actions into a single `⋮` menu (no separate View button); keep only high-signal actions like Preview OCR, Run validation, and Extract / Re-extract.

## Impact

- Affected specs: `web-app`, `json-schema-extraction`
- Affected code (expected): `src/apps/web/src/shared/components/manifests/ManifestTable.tsx`, `src/apps/web/src/routes/dashboard/ManifestsPage.tsx`, `src/apps/web/src/shared/utils/schema.ts`
- Dependencies: none (no new production dependencies)
- Breaking changes: none intended (fallback selection when schema has no list config)

## Non-Goals (v1)

- Displaying array fields (`items[]`) as table columns (summary tables for arrays are out of scope)
- Range filters for dynamic numeric/date fields (initially use text matching)
- Per-user column customization / saved layouts (can be proposed later)
