## 1. Implementation

- [ ] 1.1 Confirm each candidate is unused via repo search (`rg`)
- [ ] 1.2 Remove unused pages:
  - `src/apps/web/src/routes/dashboard/SchemaDetailPage.tsx`
  - `src/apps/web/src/routes/dashboard/ValidationScriptsPage.tsx`
- [ ] 1.3 Remove unused components:
  - `src/apps/web/src/shared/components/Placeholder.tsx`
  - `src/apps/web/src/shared/components/manifests/CostLogModal.tsx`
- [ ] 1.4 Remove test-only components and their tests:
  - `src/apps/web/src/shared/components/manifests/ExtractionCostTracker.tsx`
  - `src/apps/web/src/shared/components/manifests/ExtractionProgressView.tsx`
  - `src/apps/web/src/shared/components/manifests/QuickOcrPeek.tsx`
  - `src/apps/web/src/shared/components/manifests/SchemaTestMode.tsx`
- [ ] 1.5 Update/resolve OpenSpec references in active changes (if they become stale)

## 2. Validation

- [ ] 2.1 Run `npm run test`
- [ ] 2.2 Run `npm run lint`
- [ ] 2.3 Run `npm run type-check`
- [ ] 2.4 Run `openspec validate remove-unused-web-pages-components --strict`

## 3. Documentation

- [ ] 3.1 Update `docs/` / `CLAUDE.md` if they mention removed pages/components

