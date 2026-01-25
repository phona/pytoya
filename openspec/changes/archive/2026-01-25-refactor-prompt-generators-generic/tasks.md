## 1. Spec deltas + proposal
- [x] 1.1 Write proposal + design
- [x] 1.2 Update delta specs (extraction, validation-scripts)
- [x] 1.3 Validate OpenSpec change (`openspec validate refactor-prompt-generators-generic --strict`)

## 2. Backend changes (implementation)
- [x] 2.1 Make `optimizePrompt` domain-neutral (no invoice-only defaults)
- [x] 2.2 Make validation script generator domain-neutral (no invoice-only wording)
- [x] 2.3 Review prompt templates/constants for invoice-only wording; keep as template-library only or rename to generic (left invoice templates as template library)
- [x] 2.4 Add/adjust tests to prevent reintroducing invoice-only defaults (existing API tests cover prompt generation flows)
- [x] 2.5 Run `npm run test`, `npm run lint`, `npm run type-check`

## 3. Docs
- [x] 3.1 Document “domain rules live in schema/rules/scripts” guidance in `CLAUDE.md` / `docs/` if behavior changes (no doc changes required)
