# Design: bulk-extractor-cost-summaries

## Endpoint

`GET /api/extractors/cost-summaries`

Returns:
```
ExtractorCostSummaryDto[]
```

Rules:
- Must be computed in one grouped query (avoid per-extractor DB loops).
- Must not aggregate across currencies incorrectly (consistent with existing cost summary behavior).

## UI usage

`ExtractorsPage`:
- fetch extractors list
- fetch cost summaries list
- join in-memory by `extractorId`

