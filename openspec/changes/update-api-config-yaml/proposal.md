# Change: Prefer API config.yaml with .env fallback

## Why
The API currently relies on a .env file for runtime configuration, and helper scripts write directly to it. Introducing a single API config file provides a consistent source of truth while preserving .env as a fallback for local development and compatibility.

## What Changes
- Add support for reading API configuration from `src/apps/api/config.yaml` with higher precedence than `.env`.
- Keep `.env` support as a fallback when `config.yaml` is missing.
- Update dev Kubernetes helper scripts to write configuration to `config.yaml` (and optionally `.env` when present).
- Render `config.yaml` from Helm values into a ConfigMap and mount it into the API deployment.

## Impact
- Affected specs: `specs/backend-standards/spec.md`, `specs/kubernetes/spec.md`
- Affected code: `src/apps/api/src/app.module.ts`, `src/apps/api/src/config/env.validation.ts`, `src/apps/api/src/database/data-source.ts`, `scripts/setup-dev-k8s-deps.ps1`, `helm/pytoya/templates/configmap.yaml`, `helm/pytoya/templates/api/deployment.yaml`, `helm/pytoya/values*.yaml`
