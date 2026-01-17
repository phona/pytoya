# Tasks

## 1. Backend Implementation

- [x] 1.1 Create `DynamicFieldFiltersDto` with validation for dot-notation field paths
- [x] 1.2 Create `buildJsonPathQuery()` helper to convert dot-notation to PostgreSQL JSONB operators
- [x] 1.3 Create `isValidJsonPath()` validator to prevent SQL injection (regex allowlist)
- [x] 1.4 Update `findByGroup()` in `manifests.service.ts` to accept filter/sort/pagination parameters
- [x] 1.5 Add `applyJsonbFilter()` method for dynamic WHERE clause building
- [x] 1.6 Add `applyJsonbSort()` method for dynamic ORDER BY with extracted fields
- [x] 1.7 Update `GET /groups/:groupId/manifests` endpoint to use new DTO
- [x] 1.8 Add pagination support (skip, take) to list endpoint
- [x] 1.9 Write unit tests for JSONB query builder
- [x] 1.10 Write integration tests for filtered/sorted queries

## 2. Frontend Implementation

- [x] 2.1 Update `useManifests` hook to pass filter/sort/pagination params to API
- [x] 2.2 Remove client-side filter/sort logic from `ManifestList.tsx`
- [x] 2.3 Extend `ManifestFilters.tsx` to support dynamic field input (autocomplete from schema)
- [x] 2.4 Update API client `manifestsApi.listManifests()` to accept filter options
- [x] 2.5 Update TypeScript types in `@pytoya/shared` for filter parameters
- [x] 2.6 Write component tests for dynamic filter input
- [x] 2.7 Update E2E tests for manifest filtering

## 3. Validation & Documentation

- [x] 3.1 Run `openspec validate add-dynamic-manifest-filtering --strict`
- [x] 3.2 Test with various document types (invoice, credit_card, receipt)
- [x] 3.3 Test SQL injection attempts on field paths
- [x] 3.4 Update CLAUDE.md with new filtering documentation
