## 1. Spec + proposal
- [x] 1.1 Validate change (`openspec validate refactor-extraction-validation-schema-driven --strict`)

## 2. Backend refactor (implementation)
- [x] 2.1 Remove runtime invoice defaults for required fields (no `DEFAULT_REQUIRED_FIELDS` fallback)
- [x] 2.2 Ensure “required field” behavior derives only from JSON Schema / schema-derived required paths
- [x] 2.3 Remove any special-case “items must exist” validation from core extraction
- [x] 2.4 Update/extend tests for non-invoice schemas + empty-required schemas (existing API tests cover empty-required paths)
- [x] 2.5 Run `npm run test`, `npm run lint`, `npm run type-check`

## 3. Docs
- [x] 3.1 Document behavior change and migration guidance in `CLAUDE.md` / `docs/` if needed (already aligns: required derived from JSON Schema)
