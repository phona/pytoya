## Context

Exports today are “schema columns over raw extractedData”.
Users want exports to be normalized consistently per project, using a workflow that feels like Validation Scripts (edit + test + run in sandbox).

## Goals / Non-Goals

Goals:
- Let users normalize export output with a project-scoped script.
- Support “flatten extractedData to many rows” (e.g. `items[]` → 1 row per item).
- Apply scripts to **all** CSV/XLSX exports.
- Keep behavior unchanged when no export scripts are enabled.
- Fail the export if any enabled export script fails.

Non-Goals (v1):
- Support arbitrary network/file access from scripts.
- Support array-path selectors like `items[].sku` in `x-table-columns` (scripts can flatten to non-array keys instead).
- Provide a multi-sheet “script-defined workbook layout” beyond the existing export format.

## Root Cause

There is no shared normalization stage in the export pipeline.
The export code reads `manifest.extractedData` and serializes it as-is.

```
extractedData  --->  export (CSV/XLSX)
   (raw)              (no normalize step)
```

## Decision: Single Entry Function `exportRows`

We use a single required function to keep the user mental model simple:

```
function exportRows(extractedData, ctx) => Row[]
```

- The system provides `ctx` (format, schemaColumns, manifest metadata, and helper utils).
- The script returns an array of row objects.
- The system merges required metadata columns and writes CSV/XLSX.

### Why not multiple hooks?
A single function is easier to author and easier to validate.
Users can do normalization + flattening + per-row tweaks in one place.

## Execution Flow

ASCII:
```
Manifest.extractedData
  -> exportRows() in sandbox
  -> rows[]
  -> write CSV/XLSX (always)
```

Mermaid:
```mermaid
flowchart LR
  A[Manifest.extractedData] --> B[exportRows() sandbox]
  B --> C[Row[]]
  C --> D[CSV/XLSX writer]
```

## Row Semantics

Each returned row is a `Record<string, unknown>` that MUST be JSON-serializable.
Rows SHOULD be “flat” for spreadsheet friendliness.

Example (flatten `items[]`):

Pseudocode:
```text
common = { invoice_no, invoice_date }
rows = items.map((item,i) => ({
  ...common,
  manifest_item_index: i,
  sku: item.sku,
  qty: item.qty,
}))
return rows
```

Important rule (avoid cartesian products):
```
If there are multiple arrays, pick ONE to explode.
Other arrays should be summarized into a single cell (JSON/string) or exported elsewhere.
```

## Column Mapping (CSV/XLSX)

To keep compatibility and minimize surprises:
- Metadata columns remain stable (project_name, group_name, manifest_id, ...).
- Extracted-data columns use `x-table-columns` ordering.
- For each `columnName` in `x-table-columns`, value resolution is:

```
1) if row has direct key "columnName" => use it
2) else treat "columnName" as dot-path into the row object (no array selectors)
3) else empty
```

This allows scripts to output either:
- flat keys that match configured columns, or
- nested objects addressed by dot paths.

## Failure Semantics

Export scripts are “hard requirements” for export correctness:
- If any enabled export script throws, export fails.
- If `exportRows()` returns a non-array, or array entries are not objects, export fails.

Error messages should identify:
- script name/id
- sanitized stack snippet with line numbers (similar to Validation Scripts test panel)

## Sandbox Security

Export scripts MUST run in a restricted VM sandbox (same approach as Validation Scripts):
- no file system, no network, no process env
- no `require()` / `import` / `eval`
- timeout (default 5 seconds)
- bounded input size (max JSON length)
- optional log capture for test endpoint

## Guardrails

To avoid runaway exports:
- cap max rows per manifest (configurable; default TBD)
- cap max row JSON size (configurable; default TBD)

