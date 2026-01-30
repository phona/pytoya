## 1. Implementation

- [x] Make XLSX export schema-driven (remove invoice-only columns)
- [x] Expand export filters to match manifests list (DTO + CSV/XLSX services)
- [x] Add `GET /groups/:groupId/manifests/ids` endpoint with filter/sort parity
- [x] Update batch scope modal to use the ids endpoint (no full paging)
- [x] Update OCR “unprocessed” filtering to match only NULL
- [x] Add CSV export max manifest limit with actionable error
- [x] Add/adjust tests for XLSX headers, ids endpoint, and OCR filter semantics

## 2. Verification

- [x] Run `npm run test`
- [x] Run `npm run lint`
- [x] Run `npm run type-check`
