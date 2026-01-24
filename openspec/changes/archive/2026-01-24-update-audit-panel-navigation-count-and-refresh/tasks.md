## 1. Implementation
- [x] Define an `AuditNavigationContext` (scope + filters + sort + page + pageSize + totals)
- [x] Persist/restore context (route state + session storage best-effort)
- [x] Update Manifests list navigation to populate context
- [x] Add ManifestsPage `Audit` action menu (filtered/selected/all)
- [x] Update audit page to load context and keep refresh-safe fallback
- [x] Render `X of N` + scope label in audit panel header
- [x] Add **Refresh results** button (refetch/invalidate scope queries)
- [x] Extend next/prev to support crossing page boundaries within scope (no full-id prefetch)
- [x] Update/extend unit/integration tests for new behavior
- [x] Run `npm run test`, `npm run lint`, `npm run type-check`

## 2. Docs
- [x] Update `docs/WEB_APP.md` if user-visible behavior changes need documenting
