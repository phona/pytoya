# Design: Schema-Driven Manifest Filtering

## Target approach

```text
API accepts:
  filter[dot.path]=value      # extractedData JSONB field filter
  sortBy=dot.path&order=asc   # extractedData sort with schema-derived semantics

API deprecates:
  poNo=..., department=...    # invoice-centric “system filters”
```

## Pseudocode

```text
schema = getProjectActiveSchema(projectId)

for each filter[path] in request:
  assert isValidPath(path)
  assert path exists in schema (optional tightening)
  apply JSONB ILIKE filter for path
```

