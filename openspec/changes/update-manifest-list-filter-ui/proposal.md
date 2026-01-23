# Change: Update manifest list filter UI (column headers) + expand system columns

## Why

The Manifests list currently exposes filtering in two places: a page-level **Filters** dialog and per-column filter controls. This splits the user’s mental model (“where do I filter?”) and creates duplicated ways to apply the same schema-field filters.

At the same time, several high-signal manifest attributes (e.g., confidence, verified, cost) exist in the backend response but are not available as table columns, so users cannot sort/filter/scan by them in the list view.

## Root Cause

- Filter UX is split:
  - Page-level dialog (`Filters`) edits `filters.*`
  - Schema column header filter popovers edit `filters.dynamicFilters`
- The “system columns” set in the manifest list table is intentionally minimal (Filename, Status, Actions), and the Columns menu only exposes `status` as a togglable system column.

Evidence in repo:
- Filters button + dialog on manifests page:
  - `src/apps/web/src/routes/dashboard/ManifestsPage.tsx:214`
- Schema-column header filter dropdowns exist:
  - `src/apps/web/src/shared/components/manifests/ManifestTable.tsx:151`
- Backend already returns additional system fields:
  - `src/apps/api/src/manifests/dto/manifest-response.dto.ts:7`

## What Changes

- Remove the page-level **Filters** button and dialog from the Manifests page.
- Make filtering accessible via table UI only:
  - Schema-driven field filters remain in schema column headers.
  - Add missing “system” columns and (where applicable) column-header filters.
- Keep the table schema-driven for extracted fields:
  - Schema-driven columns remain derived from the project JSON Schema (`x-table-columns` when present, otherwise fallback selection).
  - This change does not “fix” or hardcode schema-driven columns.
- Expand “system columns” (non-schema manifest attributes) supported by the manifest list table and Columns dropdown:
  - **Default visible** (minimal summary): Filename, Status, Actions
  - **Default hidden** (opt-in): Confidence, Verified, Invoice Date, Department, Purchase Order, Cost, OCR Quality, OCR Processed At, Extractor, File Size, File Type, Created, Updated, ID
  - **Not exposed** (internal-only): storagePath, groupId

## Non-Goals

- Changing backend filtering semantics or adding new query parameters.
- Adding new production dependencies.
- Redesigning the manifest audit page.

## Architecture Touchpoints (current → proposed)

```text
Current:
  [Filters button] -> [Dialog filters editor] -> filters.*
  [Schema column header filter] -> filters.dynamicFilters

Proposed:
  [System column header filters] -> filters.*
  [Schema column header filters] -> filters.dynamicFilters
  (no page-level Filters dialog)
```

```mermaid
flowchart LR
  MT[ManifestTable] -->|header filter events| MP[ManifestsPage filter state]
  MP -->|query params| API[GET /groups/:groupId/manifests]
```

## Implementation Sketch (pseudocode)

```text
remove Filters button + dialog

add system columns:
  confidence, humanVerified, invoiceDate, department, ...

for each system column with supported backend filter param:
  add header filter control that updates filters.<field>

schema column header filters:
  keep mapping to filters.dynamicFilters (filter[fieldPath]=value)

keep Columns dropdown:
  add system columns as toggles
  default hidden columns are unchecked initially
```

## Impact

- Affected specs: `web-app`
- Affected code (expected):
  - `src/apps/web/src/routes/dashboard/ManifestsPage.tsx`
  - `src/apps/web/src/shared/components/manifests/ManifestList.tsx`
  - `src/apps/web/src/shared/components/manifests/ManifestTable.tsx`
  - `src/apps/web/src/shared/components/manifests/ManifestFilters.tsx` (likely removed or repurposed)
  - Related `*.test.tsx` files for the manifests page/table

## Breaking Changes

- UI behavior: the page-level **Filters** dialog is removed.
- Any filters that are not represented by a system column or schema column header must be either:
  - migrated to a new “system” column/header filter, or
  - explicitly declared out of scope for this change.

## Risks / Trade-offs

- Risk of feature loss if some dialog-only filters are not migrated.
- Table header UX can get crowded if too many system columns are visible by default (mitigated by default-hidden columns).

## Acceptance Criteria

- Manifests page has no page-level **Filters** button/dialog.
- System columns listed above exist and are toggleable via Columns dropdown with the stated default visibility.
- Filtering works via:
  - schema column header dropdowns (`filter[fieldPath]=...`)
  - system column header controls (e.g., `status`, `humanVerified`, `confidenceMin/Max`, etc.)
- `npm run test`, `npm run lint`, `npm run type-check` pass.
- `openspec validate update-manifest-list-filter-ui --strict` passes.

## Open Questions

- Should card view remain, be removed, or be restricted when filters are header-based?
  - Restricted: only show cards that match the current filters.
- Do we want status filter single-select or multi-select in the header?
  - multi-select
