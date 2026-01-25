# Change: Add Subpath Deployment (Base Path, e.g. `/pytoya`)

## Why

We want to deploy multiple apps behind the same Traefik gateway and avoid route collisions.
PyToYa should be able to run under a subpath (example: `/pytoya`) so we can expose:
- Web UI at `/pytoya/*`
- API at `/pytoya/api/*`

This makes it safe to host other apps on the same domain without rewriting or per-app hostnames.

## Root Cause

Today the system assumes root-mounted routes:
- Web router assumes `/` is the app root and some redirects are hardcoded to `/login`.
- API REST is globally prefixed with `/api`, but `/uploads` and `/socket.io` are mounted at the domain root.
- Helm defaults assume web at `/` and api at `/api`.

When a reverse proxy prefixes requests with `/pytoya`, these root assumptions break (refresh/deep links, redirects, static assets, uploads, and websocket connections).

## What Changes

### 1) Introduce a single configurable base path

Add a “base path” (example: `/pytoya`) that is used consistently by:
- Web router basename
- Web built asset base URL
- API global REST prefix
- API uploads mount path
- Socket.IO transport path

Default base path remains **empty** (root deploy) for local dev, with `/pytoya` as the recommended value for shared-gateway Kubernetes.

### 2) Keep gateway routing simple (2 rules)

All API-adjacent endpoints are kept under the API prefix so the Ingress only needs 2 path rules.

ASCII route map:
```
/pytoya/*                  -> web (SPA)
/pytoya/api/*              -> api (REST)
/pytoya/api/uploads/*      -> api (static uploads)
/pytoya/api/socket.io/*    -> api (Socket.IO transport; namespace still /manifests)
```

### 3) Helm (Traefik, Ingress kind)

Add Helm values to support base path deployments (example `global.basePath=/pytoya`) and render:
- web ingress path: `/pytoya`
- api ingress path: `/pytoya/api`

Example Ingress shape (illustrative):
```yaml
spec:
  ingressClassName: traefik
  rules:
  - http:
      paths:
      - path: /pytoya/api
        pathType: Prefix
        backend: { service: { name: <api>, port: { number: 3000 } } }
      - path: /pytoya
        pathType: Prefix
        backend: { service: { name: <web>, port: { number: 80 } } }
```

### 4) Web build-time configuration remains build-time

The web bundle reads `import.meta.env` at build time. For Kubernetes, the web image MUST be built with:
- `VITE_API_URL=/pytoya/api` (or equivalent)
- `VITE_BASE_PATH=/pytoya` (new; used for router + asset base)

## Architecture (mermaid)

```mermaid
flowchart LR
  U[Browser] -->|/pytoya/*| I[Ingress (Traefik)]
  U -->|/pytoya/api/*| I
  I --> WEB[Web Service]
  I --> API[API Service]
  U -->|WS path: /pytoya/api/socket.io| I
  I --> API
```

## Implementation Sketch (pseudocode)

```
BASE="/pytoya"  # configurable (default "")

web:
  vite.base = BASE + "/"
  router.basename = BASE
  redirects use BASE + "/login"
  apiBaseUrl = BASE + "/api"
  socketIoPath = BASE + "/api/socket.io"

api:
  app.setGlobalPrefix(trimSlashes(BASE) + "/api")
  app.use(BASE + "/api/uploads", staticUploadsWithAuth)
  socketIo.path = BASE + "/api/socket.io"
```

## Goals
- Deploy PyToYa under a subpath (e.g., `/pytoya`) behind Traefik Ingress.
- Use only 2 Ingress path rules (`/pytoya` and `/pytoya/api`).
- Keep local dev defaults working (root deploy).

## Non-Goals
- “Build once, deploy many” runtime web config injection (separate proposal if needed).
- Redesigning websocket scaling (Redis adapter / sticky sessions) beyond what is required for base-path routing.

## Risks / Notes
- Socket.IO with multiple API replicas: without a shared adapter, broadcasts may not reach clients connected to other pods. This exists today with `api.replicaCount > 1` and becomes more visible during Kubernetes deployments.

## Validation Plan
- `openspec validate add-subpath-deployment --strict`
- After implementation:
  - `npm run test`
  - `npm run lint`
  - `npm run type-check`
  - Manual smoke:
    - Load `/pytoya/` and refresh on a deep link (e.g., `/pytoya/projects`)
    - Call `/pytoya/api/health`
    - Verify uploads under `/pytoya/api/uploads/*`
    - Verify websocket connects via `/pytoya/api/socket.io`

## Open Questions
- Do we need temporary backward compatibility for `/api/*` and `/uploads/*` in Kubernetes, or is it acceptable to break those in base-path deployments?

