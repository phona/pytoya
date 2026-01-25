## 1. Spec deltas + proposal
- [ ] 1.1 Write proposal + design
- [ ] 1.2 Update delta specs (extraction, validation-scripts)
- [ ] 1.3 Validate OpenSpec change (`openspec validate refactor-prompt-generators-generic --strict`)

## 2. Backend changes (implementation)
- [ ] 2.1 Make `optimizePrompt` domain-neutral (no invoice-only defaults)
- [ ] 2.2 Make validation script generator domain-neutral (no invoice-only wording)
- [ ] 2.3 Review prompt templates/constants for invoice-only wording; keep as template-library only or rename to generic
- [ ] 2.4 Add/adjust tests to prevent reintroducing invoice-only defaults
- [ ] 2.5 Run `npm run test`, `npm run lint`, `npm run type-check`

## 3. Docs
- [ ] 3.1 Document “domain rules live in schema/rules/scripts” guidance in `CLAUDE.md` / `docs/` if behavior changes

