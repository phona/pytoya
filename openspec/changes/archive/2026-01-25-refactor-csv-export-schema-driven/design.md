# Design: Schema-Driven CSV Export

## Column strategy

1) Always include stable manifest metadata columns (id, filename, status, createdAt, etc.).
2) Use schema column configuration for extracted data:
   - `x-table-columns` (ordered) is the primary source.
   - If none, export `extractedData` as JSON in one column.

## Pseudocode

```text
schema = getProjectActiveSchema(projectId)
paths = schema.jsonSchema["x-table-columns"] ?? []

manifests = queryManifests(filters, filter[...])

rows =
  for manifest in manifests:
    row = baseMetadata(manifest)
    if paths.length == 0:
      row["extracted_data_json"] = JSON.stringify(manifest.extractedData ?? {})
    else:
      for path in paths:
        row[path] = toCsvCell(resolveDotPath(manifest.extractedData, path))

return csv(rows)
```

## Notes
- For complex values (objects/arrays), `toCsvCell` should stringify to JSON to avoid schema-specific flattening rules.

