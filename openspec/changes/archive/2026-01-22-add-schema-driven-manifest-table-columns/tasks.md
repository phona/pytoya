## 1. Specs
- [x] 1.1 Add OpenSpec deltas for schema-driven list columns + sorting
- [x] 1.2 Run `openspec validate add-schema-driven-manifest-table-columns --strict`

## 2. Web UI
- [x] 2.1 Resolve active project schema (default → fallback)
- [x] 2.2 Derive visible list columns from `x-table-columns` (absent → fallback, empty → none, non-empty → exact)
- [x] 2.3 Reduce manifest table to a minimal set of default system columns
- [x] 2.4 Render schema-driven columns in `ManifestTable` (remove hardcoded invoice fields)
- [x] 2.5 Support sorting by schema-driven fields (`sort.field = <dotPath>`)
- [x] 2.6 Add column-aligned filters for visible schema fields (debounced inputs)
- [x] 2.7 Keep non-column filters in an “Advanced filters” panel (or equivalent)
- [x] 2.8 Add Columns dropdown to show/hide schema columns
- [x] 2.9 Convert schema column filters to dropdown value picker
- [x] 2.10 Make row clicks non-navigational; navigate via Filename
- [x] 2.11 Consolidate Actions into `⋮` menu (remove View button)

## 3. Tests and Docs
- [x] 3.1 Update/add UI tests for dynamic columns and sorting
- [x] 3.2 Update docs in `docs/` if user-visible behavior changes
- [x] 3.3 Update/add UI tests for column visibility
- [x] 3.4 Update/add UI tests for filter dropdown
- [x] 3.5 Update tests/docs for Filename navigation + actions menu

## 4. Verification
- [x] 4.1 Run `npm run test`
- [x] 4.2 Run `npm run lint`
- [x] 4.3 Run `npm run type-check`
