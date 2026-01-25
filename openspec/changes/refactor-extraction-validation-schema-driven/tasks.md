## 1. Spec + proposal
- [ ] 1.1 Validate change (`openspec validate refactor-extraction-validation-schema-driven --strict`)

## 2. Backend refactor (implementation)
- [ ] 2.1 Remove runtime invoice defaults for required fields (no `DEFAULT_REQUIRED_FIELDS` fallback)
- [ ] 2.2 Ensure “required field” behavior derives only from JSON Schema / schema-derived required paths
- [ ] 2.3 Remove any special-case “items must exist” validation from core extraction
- [ ] 2.4 Update/extend tests for non-invoice schemas + empty-required schemas
- [ ] 2.5 Run `npm run test`, `npm run lint`, `npm run type-check`

## 3. Docs
- [ ] 3.1 Document behavior change and migration guidance in `CLAUDE.md` / `docs/` if needed

