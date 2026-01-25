## 1. Spec deltas + docs
- [x] 1.1 Add delta spec for `kubernetes` (base path + Ingress routing)
- [x] 1.2 Add delta spec for `web-app` (router + redirects under base path)
- [x] 1.3 Modify delta spec for `backend-standards` (uploads path under `/api/uploads`)
- [x] 1.4 Validate OpenSpec change (`openspec validate add-subpath-deployment --strict`)

## 2. Helm (Traefik Ingress)
- [x] 2.1 Add `global.basePath` Helm value (default empty)
- [x] 2.2 Derive Ingress paths from base path (`/pytoya`, `/pytoya/api`)
- [x] 2.3 Document required build args for web (`VITE_API_URL`, `VITE_BASE_PATH`)

## 3. API (NestJS)
- [x] 3.1 Add `server.basePath` config and validation (default empty)
- [x] 3.2 Apply base path to REST prefix (`<basePath>/api`)
- [x] 3.3 Move uploads mount to `<basePath>/api/uploads`
- [x] 3.4 Scope Socket.IO transport path to `<basePath>/api/socket.io`
- [x] 3.5 Update any compatibility middleware / exclusions

## 4. Web (Vite + React Router)
- [x] 4.1 Add router basename from `VITE_BASE_PATH`
- [x] 4.2 Set Vite `base` from `VITE_BASE_PATH` for correct asset URLs
- [x] 4.3 Make `/login` redirects base-path aware
- [x] 4.4 Update API client base URL to `/pytoya/api` in base-path deployments
- [x] 4.5 Update websocket client to pass `path=<basePath>/api/socket.io`

## 5. Verification
- [x] 5.1 Run repo scripts (`npm run test`, `npm run lint`, `npm run type-check`)
- [x] 5.2 Add/adjust focused tests for base-path routing (web redirects + router)
- [x] 5.3 Ensure Helm templates render for base path (root + `/pytoya`)
- [x] 5.4 Document manual smoke steps for `/pytoya/*` and `/pytoya/api/*`
