## 1. Spec + proposal
- [x] 1.1 Validate change (`openspec validate refactor-ocr-document-metadata-generic --strict`)

## 2. Backend changes (implementation)
- [x] 2.1 Replace invoice default for `ocrResult.document.type` with neutral default (e.g., `unknown`/`null`)
- [x] 2.2 Ensure no core runtime logic branches on `document.type`
- [x] 2.3 Update/extend tests that asserted `"invoice"`
- [x] 2.4 Run `npm run test`, `npm run lint`, `npm run type-check`
