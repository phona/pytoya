# Change: Add Dynamic Manifest Filtering

## Why

Current manifest filtering is hardcoded to invoice-specific fields (PO number, department, invoice date). This prevents filtering by other document types like credit cards (`credit_card.id_number`) or receipts (`receipt.merchant`). Users need the ability to filter and sort manifests by ANY extracted data field, regardless of document schema.

Additionally, the `GET /groups/:groupId/manifests` endpoint returns ALL manifests without server-side filtering, causing performance issues with large groups and inefficient client-side processing.

## What Changes

- Add server-side filtering by extracted data JSONB fields using dot-notation paths
- Add server-side sorting by extracted data JSONB fields
- Add pagination support to the manifests list endpoint
- Introduce SQL-safe field path validation to prevent injection
- Update frontend to use server-side filtering instead of client-side

### Breaking Changes

None - new query parameters are optional. Existing clients continue to work.

## Impact

- **Affected specs**:
  - `manifest-upload` (MODIFY: List manifests scenario to support filters/sort/pagination)
  - New spec: `manifest-filtering` (ADD)
- **Affected code**:
  - `src/apps/api/src/manifests/manifests.controller.ts:90-100`
  - `src/apps/api/src/manifests/manifests.service.ts:67-76`
  - `src/apps/api/src/manifests/dto/manifest-filters.dto.ts` (replace with dynamic version)
  - `src/apps/web/src/shared/components/manifests/ManifestList.tsx` (remove client-side filter/sort)
  - `src/apps/web/src/shared/components/manifests/ManifestFilters.tsx` (extend for dynamic fields)
