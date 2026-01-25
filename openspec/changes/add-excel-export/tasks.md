## 1. Spec + proposal
- [ ] 1.1 Add delta specs for `excel-export` and `web-app`
- [ ] 1.2 Validate change (`openspec validate add-excel-export --strict`)

## 2. Backend (implementation)
- [ ] 2.0 Confirm production dependency choice (`exceljs`) and get explicit approval before adding it
- [ ] 2.1 Add `GET /api/manifests/export/xlsx` filtered export endpoint
- [ ] 2.2 Add `POST /api/manifests/export/xlsx` selected export endpoint
- [ ] 2.3 Implement XLSX builder (streaming) for `Manifests` + `Items` (+ optional `Meta`)
- [ ] 2.4 Enforce ownership + export limits (fail fast with clear error)
- [ ] 2.5 Add tests for XLSX endpoints and safe-cell handling

## 3. Web (implementation)
- [ ] 3.1 Extend batch-scope export modal to support `CSV` and `Excel (.xlsx)`
- [ ] 3.2 Add web API client methods for XLSX export (GET/POST)
- [ ] 3.3 Add/adjust i18n keys for format labels and errors
- [ ] 3.4 Add tests for format switching + download behavior

## 4. Quality gates
- [ ] 4.1 Run `npm run test`
- [ ] 4.2 Run `npm run lint`
- [ ] 4.3 Run `npm run type-check`
