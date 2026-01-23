# Design: Manifests list filter UI + system columns

## Goals

- Single filtering surface in the list view (column headers), no page-level Filters dialog.
- Make high-signal manifest attributes available as system columns (toggleable, default hidden when noisy).
 - Keep schema-driven columns schema-driven (from JSON Schema `x-table-columns` / fallback selection).

## Data Model

The backend response already contains:
- `status`, `confidence`, `humanVerified`, `purchaseOrder`, `invoiceDate`, `department`
- `ocrQualityScore`, `ocrProcessedAt`, `extractionCost`, `textExtractorId`
- `fileSize`, `fileType`, `createdAt`, `updatedAt`, `id`

Reference: `src/apps/api/src/manifests/dto/manifest-response.dto.ts:7`.

## Filter Param Mapping

```text
System columns:
  Status            -> status=<value>
  Verified          -> humanVerified=true|false
  Confidence        -> confidenceMin=<0..1>, confidenceMax=<0..1>
  Invoice Date      -> dateFrom=YYYY-MM-DD, dateTo=YYYY-MM-DD
  Department        -> department=<value>
  Purchase Order    -> poNo=<value>
  OCR Quality       -> ocrQualityMin=<0..100>, ocrQualityMax=<0..100>
  Cost              -> costMin=<number>, costMax=<number>
  Extractor         -> textExtractorId=<uuid>
  Extractor Type    -> extractorType=<id>

Schema columns:
  fieldPath filter  -> filter[<dotPath>]=<value>
```

## UX Layout (ASCII)

```text
Header row (per column):
  [Filename] [Status v] ... [Actions]
           schema columns also have: [Label] + [filter icon]
```

## Architecture (Mermaid)

```mermaid
flowchart LR
  User --> MT[ManifestTable column headers]
  MT --> MP[ManifestsPage state]
  MP --> UM[useManifests()]
  UM --> API[GET /groups/:groupId/manifests]
  API --> UM
```

## Edge Cases / Notes

- Default-hidden columns MUST still be sortable/filterable once enabled.
- Columns dropdown SHOULD prevent hiding a column that is the active sort field.
- If a column has an active filter, the Columns dropdown SHOULD prevent hiding it (to avoid “invisible filter” confusion).
