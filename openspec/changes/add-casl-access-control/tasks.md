## 1. Implementation

- [ ] Add `@casl/ability` dependency (prod) after approval
- [ ] Add `AbilityFactory` for current user
- [ ] Add `PoliciesGuard` + `@CheckPolicies()` decorator
- [ ] Add subject typings + action constants
- [ ] Apply policies to controllers:
  - [ ] `schemas` (admin-only or project-scoped by design)
  - [ ] `extractors` (admin-only + mask secret config)
  - [ ] `queue` / `jobs` (admin-only, or scoped where appropriate)
  - [ ] `validation` list endpoints (project/owner-scoped)
- [ ] Add/adjust tests for authorization (positive + negative)
- [ ] Update docs: `docs/SECURITY.md` and `CLAUDE.md` if public utilities/contracts change

## 2. Verification

- [ ] Run `npm run test`
- [ ] Run `npm run lint`
- [ ] Run `npm run type-check`

