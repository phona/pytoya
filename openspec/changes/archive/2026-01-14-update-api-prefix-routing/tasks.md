## 1. Spec and contract updates
- [x] 1.1 Add delta specs for `/api` routing + endpoints
- [x] 1.2 Validate OpenSpec change (`openspec validate update-api-prefix-routing --strict`)

## 2. Backend (NestJS) routing
- [x] 2.1 Mount canonical `/api` prefix for REST endpoints
- [x] 2.2 Add compatibility for legacy non-`/api` paths (exclude `/uploads` and WS paths)
- [x] 2.3 Add missing REST endpoints expected by web/docs:
  - [x] `POST /api/groups/:groupId/manifests` (alias of existing upload)
  - [x] `POST /api/manifests/:id/extract` (enqueue extraction job)
  - [x] `POST /api/manifests/:id/re-extract` (enqueue re-extraction with `fieldName`)
  - [x] `POST /api/manifests/export/csv` (export selected via body `{ manifestIds: number[] }`)

## 3. Frontend (Next.js) configuration alignment
- [x] 3.1 Normalize `NEXT_PUBLIC_API_URL` to a base ending with `/api`
- [x] 3.2 Derive WS base URL by stripping `/api` (or use `NEXT_PUBLIC_WS_URL`)
- [x] 3.3 Use the same token source for HTTP and WS (Zustand auth store)

## 4. Tests and tooling gates
- [x] 4.1 Make `next lint` non-interactive by adding explicit ESLint config
- [x] 4.2 Fix web unit tests that currently fail due to syntax/ambiguous queries
- [x] 4.3 Ensure `npm run test`, `npm run lint`, `npm run type-check` pass for modified TS/TSX
  - Lint warning: `src/apps/web/components/manifests/ManifestList.tsx` useMemo deps include `filters` and `sort`.
