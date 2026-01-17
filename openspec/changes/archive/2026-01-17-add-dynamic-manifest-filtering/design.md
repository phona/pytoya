# Design: Dynamic Manifest Filtering

## Context

Manifests store extracted data as JSONB in `extractedData` column. The structure varies by document type (invoice, credit_card, receipt, etc.) as defined by JSON Schema. Current filtering is hardcoded to invoice fields, requiring code changes for each new document type.

### Constraints

- PostgreSQL JSONB operators for querying: `->` (object), `->>` (text), `@>` (contains)
- SQL injection risk with dynamic field paths in raw queries
- TypeORM QueryBuilder for safe parameterized queries
- Frontend uses React Query for server state

## Goals / Non-Goals

### Goals
- Enable filtering by ANY extracted data field without code changes
- Support dot-notation field paths (e.g., `invoice.po_no`, `credit_card.id_number`)
- Server-side filtering for performance
- SQL-safe field path validation
- Pagination support for large datasets

### Non-Goals
- Full-text search within JSONB values (use ILIKE for partial match)
- Complex nested array filtering (first iteration: simple dot-notation only)
- Aggregation queries (count, group by extracted fields)

## Decisions

### Decision 1: Query Parameter Format

**Choice**: `filter[fieldPath]=value&sortBy=fieldPath&order=asc&page=1&pageSize=25`

**Alternatives considered**:
- JSON body: Overkill for GET requests, not cacheable
- GraphQL: Too complex, adds new dependency
- Dedicated filter endpoint: Unnecessary REST violation

**Rationale**: Follows REST conventions, cacheable, works with URL encoding.

### Decision 2: JSONB Query Building

**Choice**: Convert dot-notation to PostgreSQL JSONB operators

```
invoice.po_no        → extractedData -> 'invoice' ->> 'po_no'
credit_card.id_number → extractedData -> 'credit_card' ->> 'id_number'
```

**Alternatives considered**:
- `jsonb_path_query`: More powerful but complex syntax
- Client-side filtering: Slow, defeats pagination

**Rationale**: Simple, uses standard operators, works with TypeORM.

### Decision 3: Field Path Validation

**Choice**: Regex allowlist `/^[a-zA-Z_][a-zA-Z0-9_.]*$/`

**Alternatives considered**:
- JSON Schema validation: Too slow per-request
- No validation: SQL injection risk

**Rationale**: Fast, simple, prevents injection while allowing useful paths.

### Decision 4: Sort Implementation

**Choice**: PostgreSQL `ORDER BY` with CAST for type inference

```
ORDER BY (extractedData -> 'invoice' ->> 'po_num')::numeric ASC
```

**Alternatives considered**:
- Client-side sort: Defeats pagination
- Computed columns: Requires schema migration per field

**Rationale**: Works with any field, maintains pagination consistency.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| SQL injection via field paths | Regex validation + parameterized queries |
| Performance on large JSONB | Add GIN index on `extractedData` if needed |
| Type casting errors | Catch and log, fall back to text sort |
| Breaking existing filters | Keep old parameters, add new ones alongside |

## Migration Plan

### Phase 1: Backend (no breaking changes)
1. Add new DTO alongside existing `ManifestFiltersDto`
2. Add new service method with filter/sort support
3. Keep existing endpoint unchanged
4. Add tests

### Phase 2: Frontend
1. Update API client to use new parameters
2. Remove client-side filter/sort logic
3. Update UI components
4. Add tests

### Phase 3: Cleanup
1. Deprecate old hardcoded filters
2. Remove client-side filtering code
3. Update documentation

### Rollback
If issues arise:
1. Frontend: Revert to client-side filtering
2. Backend: Keep old endpoint, disable new parameters
3. No data migration needed (read-only feature)

## Open Questions

- [ ] Should we support operator suffixes like `field[gte]` for numeric comparisons?
- [ ] Should array indexing be supported (e.g., `items[0].name`)?
- [ ] Should we add a schema-based field autocomplete in the UI?
