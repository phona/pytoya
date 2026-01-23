## 1. Specs
- [x] 1.1 Add spec delta for invalid script handling (return issue)
- [x] 1.2 Run `openspec validate fix-validation-script-error-issues --strict`

## 2. API
- [x] 2.1 Convert per-script execution failures into `ValidationIssue` entries
- [x] 2.2 Add/adjust tests to cover script failure → issue behavior

## 3. Verification
- [x] 3.1 Run `npm run test`
- [x] 3.2 Run `npm run lint`
- [x] 3.3 Run `npm run type-check`
