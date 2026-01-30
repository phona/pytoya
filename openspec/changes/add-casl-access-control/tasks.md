## 1. Implementation

- [x] Add `@casl/ability` dependency (prod) after approval
- [x] Add `AbilityFactory` for current user
- [x] Add `PoliciesGuard` + `@CheckPolicies()` decorator
- [x] Add subject typings + action constants
- [x] Apply policies to controllers:
  - [x] `schemas` (admin-only or project-scoped by design)
  - [x] `extractors` (admin-only + mask secret config)
  - [x] `queue` / `jobs` (admin-only, or scoped where appropriate)
  - [x] `validation` list endpoints (project/owner-scoped)
- [x] Add/adjust tests for authorization (positive + negative)
- [x] Update docs: `docs/SECURITY.md` and `CLAUDE.md` if public utilities/contracts change

## 2. Verification

- [x] Run `npm run test`
- [x] Run `npm run lint`
- [x] Run `npm run type-check`
