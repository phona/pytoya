## 1. Implementation

- [x] 1.1 Confirm `/prompts` is not linked from UI (search for links, buttons, redirects)
- [x] 1.2 Remove `prompts` route + import from `src/apps/web/src/app/router.tsx`
- [x] 1.3 Remove `src/apps/web/src/routes/dashboard/PromptsPage.tsx`
- [x] 1.4 Remove `src/apps/web/src/routes/dashboard/PromptsPage.test.tsx`
- [x] 1.5 Remove unused prompt client modules:
  - `src/apps/web/src/api/prompts.ts`
  - `src/apps/web/src/api/prompts.test.ts`
  - `src/apps/web/src/shared/hooks/use-prompts.ts`
- [x] 1.6 Update/remove router assertions referencing prompts route:
  - `src/apps/web/src/app/router.test.tsx`
- [x] 1.7 Remove prompts MSW handlers if no longer used:
  - `src/apps/web/src/tests/mocks/handlers.ts`

## 2. Validation

- [x] 2.1 Run `npm run test`
- [x] 2.2 Run `npm run lint`
- [x] 2.3 Run `npm run type-check`
- [x] 2.4 Run `openspec validate remove-prompts-page --strict`

## 3. Documentation

- [x] 3.1 Update `docs/` / `CLAUDE.md` if they mention `/prompts` or `PromptsPage`

