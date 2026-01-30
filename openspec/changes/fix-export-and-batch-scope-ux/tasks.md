## 1. Implementation

- [ ] Make XLSX export schema-driven (remove invoice-only columns)
- [ ] Expand export filters to match manifests list (DTO + CSV/XLSX services)
- [ ] Add `GET /groups/:groupId/manifests/ids` endpoint with filter/sort parity
- [ ] Update batch scope modal to use the ids endpoint (no full paging)
- [ ] Update OCR “unprocessed” filtering to match only NULL
- [ ] Add CSV export max manifest limit with actionable error
- [ ] Add/adjust tests for XLSX headers, ids endpoint, and OCR filter semantics

## 2. Verification

- [ ] Run `npm run test`
- [ ] Run `npm run lint`
- [ ] Run `npm run type-check`
