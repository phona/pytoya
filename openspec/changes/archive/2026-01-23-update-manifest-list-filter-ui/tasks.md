## 1. Implementation

- [x] 1.1 Inventory current dialog filters and map each to a system column/header control or explicitly de-scope
- [x] 1.2 Remove Filters button + dialog from `src/apps/web/src/routes/dashboard/ManifestsPage.tsx`
- [x] 1.3 Add missing system columns to `src/apps/web/src/shared/components/manifests/ManifestTable.tsx`
- [x] 1.4 Add system column header filter controls and wire to `filters.*` in `ManifestsPage`
- [x] 1.5 Expand Columns dropdown system section in `src/apps/web/src/shared/components/manifests/ManifestList.tsx` (include defaults + disabled rules)
- [x] 1.6 Update/cleanup `src/apps/web/src/shared/components/manifests/ManifestFilters.tsx` (remove or repurpose)
- [x] 1.7 Update/add tests for column-header filtering and column visibility defaults

## 2. Validation

- [x] 2.1 Run `npm run test`
- [x] 2.2 Run `npm run lint`
- [x] 2.3 Run `npm run type-check`
- [x] 2.4 Run `openspec validate update-manifest-list-filter-ui --strict`

## 3. Documentation

- [x] 3.1 Update `docs/WEB_APP.md` if it documents manifests filtering UX

