## 1. Spec + proposal
- [x] 1.1 Add delta specs for `excel-export` and `web-app`
- [x] 1.2 Validate change (`openspec validate add-excel-export --strict`)

## 2. Backend (implementation)
- [x] 2.0 Confirm production dependency choice (`exceljs`) and get explicit approval before adding it
- [x] 2.1 Add `GET /api/manifests/export/xlsx` filtered export endpoint
- [x] 2.2 Add `POST /api/manifests/export/xlsx` selected export endpoint
- [x] 2.3 Implement XLSX builder (streaming) for `Manifests` + `Items` (+ optional `Meta`)
- [x] 2.4 Enforce ownership + export limits (fail fast with clear error)
- [x] 2.5 Add tests for XLSX endpoints and safe-cell handling

## 3. Web (implementation)
- [x] 3.1 Extend batch-scope export modal to support `CSV` and `Excel (.xlsx)`
- [x] 3.2 Add web API client methods for XLSX export (GET/POST)
- [x] 3.3 Add/adjust i18n keys for format labels and errors
- [x] 3.4 Add tests for format switching + download behavior

## 4. Quality gates
- [x] 4.1 Run `npm run test`
- [x] 4.2 Run `npm run lint`
- [x] 4.3 Run `npm run type-check`
