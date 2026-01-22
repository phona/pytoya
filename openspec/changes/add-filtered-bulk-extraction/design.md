# Design: Filtered Bulk Extraction + User-Choice Confirmation

## Goals

- Provide a single, safe “Extract…” entry point in:
  - manifests list (selected vs filtered)
  - audit panel (current manifest)
- Always explain what will happen and require explicit confirmation for multi-manifest runs.
- Keep performance acceptable for large filtered sets (avoid fetching IDs across pages on the client).

## API Design (Recommended)

### Endpoint

`POST /groups/:groupId/manifests/extract-filtered`

### Request (body)

```json
{
  "filters": {
    "status": "pending",
    "poNo": "0000",
    "department": "ENG",
    "dateFrom": "2026-01-01",
    "dateTo": "2026-01-31",
    "humanVerified": false,
    "confidenceMin": 0.8,
    "ocrQualityMin": 70,
    "extractionStatus": "not_extracted",
    "costMax": 1.0,
    "textExtractorId": "uuid",
    "extractorType": "paddleocr-vl",
    "dynamicFilters": [{ "field": "invoice.po_no", "value": "0000" }],
    "sort": { "field": "filename", "order": "asc" }
  },
  "behavior": {
    "includeCompleted": false,
    "includeProcessing": false
  },
  "llmModelId": "model-id",
  "textExtractorId": "extractor-id",
  "promptId": 123,
  "dryRun": true
}
```

Notes:
- “filters” mirrors the web list query params; the server applies the same semantics as `GET /groups/:groupId/manifests`.
- “behavior” is applied server-side to prevent accidental re-processing.

### Response

Dry run:
```json
{
  "manifestCount": 2431,
  "estimatedCost": { "min": 12.3, "max": 18.9 },
  "currency": "USD"
}
```

Run:
```json
{
  "jobId": "batch_...",
  "jobIds": ["123", "124"],
  "manifestCount": 2431,
  "estimatedCost": { "min": 12.3, "max": 18.9 },
  "currency": "USD"
}
```

### Safety Constraints

- Server SHOULD enforce a maximum `manifestCount` per request (e.g. 5,000) and return a clear error asking users to refine filters.
- UI MUST show the filtered count and require confirmation.
- Defaults:
  - `includeCompleted=false` (skip completed/done unless user opts into re-extract)
  - `includeProcessing=false` (skip processing unless user explicitly forces it)

## Web UX Design

### List “Extract…” Modal

The modal is the “notice + choice” surface:
- Scope: Selected vs All matching current filters
- Behavior:
  - completed: skip (default) vs re-extract
  - processing: skip (default) vs force include
- Estimate block: count + cost range + currency
- Clear notice text about side effects and where to monitor progress (Jobs panel)

### Audit “Extract…” Button

Minimal v1:
- Single action: Extract this manifest (uses existing single-manifest extract endpoint).

## Alternative (Not Recommended)

Client-only “filtered extraction”:
- Web loops through `GET /groups/:groupId/manifests?page=...&pageSize=200` to collect IDs, then calls `POST /manifests/extract-bulk`.
- This increases load and may be slow for large datasets; also makes “skip completed/processing” harder without fetching status for every row.
