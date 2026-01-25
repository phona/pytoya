## 1. Spec + proposal
- [x] 1.1 Update delta spec for `manifest-filtering` and `web-app`
- [x] 1.2 Validate change (`openspec validate refactor-manifest-filters-schema-driven --strict`)

## 2. Backend changes (implementation)
- [x] 2.1 Deprecate invoice-centric manifest filters (poNo/department/etc) in DTOs + query builders
- [x] 2.2 Ensure dynamic extracted-data filters cover all required use cases
- [x] 2.3 (Optional) Add legacy-param → `filter[...]` mapping with warnings for a transition window (skipped: no backward-compat required)
- [x] 2.4 Update/extend tests
- [x] 2.5 Run `npm run test`, `npm run lint`, `npm run type-check`

## 3. Web changes (implementation)
- [x] 3.1 Replace invoice-centric filter UI with schema-driven filter UI
- [x] 3.2 Update/extend tests
- [x] 3.3 Run `npm run test`, `npm run lint`, `npm run type-check`
