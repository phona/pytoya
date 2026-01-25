## 1. Spec + proposal
- [ ] 1.1 Update delta spec for `manifest-filtering` and `web-app`
- [ ] 1.2 Validate change (`openspec validate refactor-manifest-filters-schema-driven --strict`)

## 2. Backend changes (implementation)
- [ ] 2.1 Deprecate invoice-centric manifest filters (poNo/department/etc) in DTOs + query builders
- [ ] 2.2 Ensure dynamic extracted-data filters cover all required use cases
- [ ] 2.3 (Optional) Add legacy-param → `filter[...]` mapping with warnings for a transition window
- [ ] 2.4 Update/extend tests
- [ ] 2.5 Run `npm run test`, `npm run lint`, `npm run type-check`

## 3. Web changes (implementation)
- [ ] 3.1 Replace invoice-centric filter UI with schema-driven filter UI
- [ ] 3.2 Update/extend tests
- [ ] 3.3 Run `npm run test`, `npm run lint`, `npm run type-check`

