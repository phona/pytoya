## 1. Spec deltas + docs
- [ ] 1.1 Add delta spec for `kubernetes` (base path + Ingress routing)
- [ ] 1.2 Add delta spec for `web-app` (router + redirects under base path)
- [ ] 1.3 Modify delta spec for `backend-standards` (uploads path under `/api/uploads`)
- [ ] 1.4 Validate OpenSpec change (`openspec validate add-subpath-deployment --strict`)

## 2. Helm (Traefik Ingress)
- [ ] 2.1 Add `global.basePath` Helm value (default empty)
- [ ] 2.2 Derive Ingress paths from base path (`/pytoya`, `/pytoya/api`)
- [ ] 2.3 Document required build args for web (`VITE_API_URL`, `VITE_BASE_PATH`)

## 3. API (NestJS)
- [ ] 3.1 Add `server.basePath` config and validation (default empty)
- [ ] 3.2 Apply base path to REST prefix (`<basePath>/api`)
- [ ] 3.3 Move uploads mount to `<basePath>/api/uploads`
- [ ] 3.4 Scope Socket.IO transport path to `<basePath>/api/socket.io`
- [ ] 3.5 Update any compatibility middleware / exclusions

## 4. Web (Vite + React Router)
- [ ] 4.1 Add router basename from `VITE_BASE_PATH`
- [ ] 4.2 Set Vite `base` from `VITE_BASE_PATH` for correct asset URLs
- [ ] 4.3 Make `/login` redirects base-path aware
- [ ] 4.4 Update API client base URL to `/pytoya/api` in base-path deployments
- [ ] 4.5 Update websocket client to pass `path=<basePath>/api/socket.io`

## 5. Verification
- [ ] 5.1 Run repo scripts (`npm run test`, `npm run lint`, `npm run type-check`)
- [ ] 5.2 Add/adjust focused tests for base-path routing (web redirects + router)
- [ ] 5.3 Smoke test Kubernetes Ingress routes (`/pytoya/*`, `/pytoya/api/*`)
- [ ] 5.4 Dev K8s validation: build + push images to `registry.dev.lan` with base path build args (`VITE_API_URL=/pytoya/api`, `VITE_BASE_PATH=/pytoya`)
- [ ] 5.5 Dev K8s validation: deploy into `pytoya` namespace via local `kubectl` context + Helm, then verify `/pytoya/` and `/pytoya/api/health`
