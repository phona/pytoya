# Change: Fix Deployment Config Drift (Docker Compose + Helm + Vite Env)

## Why

The project has multiple “sources of truth” for runtime configuration (Docker Compose env vars, API `config.yaml`, Helm ConfigMap/Secret, and Vite env), and they are not aligned today. This causes:
- local `docker-compose up` to fail (Docker build context mismatch),
- Kubernetes deployments to fail fast on config validation (Helm `config.yaml` missing required sections),
- confusing web configuration (Helm sets `VITE_*` as container env vars, but the Vite bundle reads build-time `import.meta.env`),
- fragile YAML templating when secrets contain special characters (unquoted placeholders).

## Root Cause

We have drift between environment-specific wiring and the application’s actual config contracts:
- API config validation requires `queue.*` and `features.*`, but Helm’s `config.yaml` template omits them.
- Dockerfiles are written to build from the **repo root context**, while Docker Compose builds from **app subfolders**.
- Vite environment variables are **bundled at build time**, but Helm tries to set them **at runtime**.

## What Changes

### 1) Make Kubernetes config templates pass API validation
- Ensure Helm’s `config.yaml` includes all required keys (`queue`, `features`) with correct defaults.
- Align Helm defaults with `values.yaml` (e.g., rate limit default values).
- Make secret placeholder substitutions YAML-safe (quote placeholders where required).

### 2) Make `docker-compose up` reliably build + run
- Update Docker Compose build sections to use repo-root build context with app Dockerfile paths.
- Align Compose environment variable names with `src/apps/api/config.yaml` templating (e.g., `DB_NAME`, `SERVER_PORT`).
- Decide and document the PaddleOCR service expectation (run as separate service in compose vs external).

### 3) Clarify web runtime configuration strategy
**Decision (recommended): Option A (build-time Vite config).**

- Treat `VITE_API_URL` / `VITE_WS_URL` as **build-time only** inputs and build a web image per environment.
- Helm MUST NOT rely on runtime container env vars to change the Vite bundle’s API base URL.

Option B (runtime injection) is explicitly **out of scope** for this change and can be proposed later if “build once, deploy many” becomes a hard requirement.

## Goals
- `docker-compose up` works without manual edits.
- Helm renders an API `config.yaml` that passes config validation.
- One documented, correct strategy for configuring the web app per environment.

## Non-Goals
- Redesigning extraction runtime topology (covered by `refactor-extraction-runtime`).
- Adding new production dependencies without explicit approval.
- Changing public REST/WS contracts beyond what is needed to fix deployment correctness.

## Validation Plan
- `openspec validate fix-deployment-config-drift --strict`
- Manual checks:
  - Compose build succeeds for API + web images
  - API starts with Helm-mounted `config.yaml` and Secret-derived env vars
  - Web can reach API base URL using the documented configuration strategy

## Open Questions
- None for strategy selection (Option A chosen).
- Do we standardize on passing `VITE_API_URL=/api` for Kubernetes ingress deployments?
