# Export Scripts

Export Scripts normalize export output for **CSV** and **Excel (.xlsx)** exports.

## Script contract

Your script must define:

- `function exportRows(extractedData, ctx)`

It must return:

- `Row[]` where each `Row` is a plain JSON-serializable object.

## Multiple scripts

Enabled scripts run in deterministic order (`priority DESC`, then `id ASC`).
The rows returned from one script become the input rows for the next script (pipeline).

## Context (`ctx`)

`ctx` includes:
- `format`: `'csv' | 'xlsx'`
- `schemaColumns`: the current `x-table-columns` list (may be empty)
- `project`: `{ id, name? }`
- `manifest`: metadata like `id`, `groupName`, `createdAt`, `originalFilename`, etc.
- `utils`: small helpers like `trimToNull`, `normalizeWhitespace`, `toNumberOrNull`, and dot-path `get/set`

## Safety

Scripts run in a restricted VM sandbox:
- no filesystem/network/process env access
- timeout enforced (default 5 seconds)

