## 1. Spec + proposal
- [ ] 1.1 Update delta spec for `csv-export`
- [ ] 1.2 Validate change (`openspec validate refactor-csv-export-schema-driven --strict`)

## 2. Backend changes (implementation)
- [ ] 2.1 Replace invoice CSV headers with schema-driven column selection
- [ ] 2.2 Align export filtering with dynamic extracted-data filters (`filter[...]`)
- [ ] 2.3 Keep stable manifest metadata columns in export
- [ ] 2.4 Update/extend tests and fixtures
- [ ] 2.5 Run `npm run test`, `npm run lint`, `npm run type-check`

## 3. Web changes (implementation)
- [ ] 3.1 Ensure UI uses schema-driven export behavior (no invoice-only assumptions)
- [ ] 3.2 Run `npm run test`, `npm run lint`, `npm run type-check`

