# Change: Export Scripts (exportRows)

## Why
CSV/XLSX export currently serializes `manifest.extractedData` directly with schema-driven columns.
There is no project-scoped “normalization layer”, so exported data can differ from what users expect after they configure rules and scripts.

Users need a consistent, scriptable way to normalize export output, with the same “edit + test” workflow as Validation Scripts.

## What Changes
- Add **Export Scripts** per project (create/edit/delete, enable/disable, priority ordering).
- Export scripts MUST define `function exportRows(extractedData, ctx)` and return `Row[]`.
- Provide a **test panel** to run a script against input JSON and preview rows + logs + errors.
- Apply enabled export scripts to **all** exports:
  - CSV export (filtered + selected/bulk)
  - Excel export (filtered + selected)
- If an export script fails (throws or returns invalid shape), the export MUST fail with a user-visible error.

## Impact
- Affected specs:
  - ADDED: `export-scripts`
  - MODIFIED: `csv-export`, `excel-export`
- Affected code (planned):
  - API: new export-scripts module/entity/executor; integrate into CSV/XLSX export services
  - Web: new Project Settings page + form similar to Validation Scripts
  - Shared: DTO/type re-exports for web
- Dependencies:
  - No new production dependencies expected for v1 (reuse Node VM sandbox pattern).

