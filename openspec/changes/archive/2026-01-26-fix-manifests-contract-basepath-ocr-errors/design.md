## Context

The system is deployed both at root (`/`) and under a subpath (e.g. `/pytoya`).
The API and web currently have a few “special cases” that leak infrastructure details into application code:

- API returns different shapes for the same endpoint based on “has filters”.
- Web uses hard redirects with `window.location.href` and builds `next_url` from `window.location.pathname`.
- Some web fetches bypass the configured API base and assume `/api/...`.
- OCR failures throw raw `Error`, losing stable error codes.

## Goals / Non-Goals

- Goals:
  - Make `GET /groups/:groupId/manifests` a stable, single-shape response.
  - Ensure subpath deployments do not double-prefix navigation.
  - Normalize OCR failures into typed Nest exceptions with stable error codes.
- Non-goals:
  - Redesign extraction workflow or job queue architecture.
  - Introduce new dependencies or replace Axios/Socket.IO.

## Architecture (target)

```mermaid
flowchart LR
  Web[React/Vite] -->|HTTP (Axios + fetch streaming)| API[NestJS]
  Web -->|Socket.IO| API
  API --> DB[(Postgres)]
  API --> Redis[(Redis)]
  API --> OCR[PaddleOCR-VL service]
  API --> LLM[OpenAI-compatible LLM]
```

## Key Decisions

### 1) Stable list response envelope

**Decision**: always return `{ data, meta }` from the manifest list endpoint.

**Reason**: clients should not branch on response shape.

Pseudocode:
```text
GET /groups/:groupId/manifests
  result = manifestsService.findByGroup(...)
  return { data: mapDto(result.data), meta: result.meta }
```

### 2) Subpath-safe `next_url`

**Decision**: hard redirects compute `next_url` as a router-relative path (no base path prefix).

Pseudocode:
```text
base = VITE_BASE_PATH
pathname = window.location.pathname
routerPath = stripBasePath(base, pathname)  // '/projects/1' not '/pytoya/projects/1'
next_url = routerPath + window.location.search
redirect to joinBasePath(base, '/login') + '?next_url=' + encode(next_url)
```

### 3) OCR exception normalization

**Decision**: map Paddle OCR failures to typed Nest exceptions with stable `ERROR_CODES` payloads.

Pseudocode:
```text
try post to OCR service with timeout
catch timeout -> throw OcrTimeoutException({ code, message })
catch other -> throw OcrServiceException({ code, message })
```

