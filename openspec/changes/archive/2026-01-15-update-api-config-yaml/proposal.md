# Change: Prefer API config.yaml (deprecate .env)

## Why
The API currently relies on `.env` for runtime configuration, while Helm and helper scripts manage values elsewhere. A single API config file makes configuration consistent across local dev, CLI/migration jobs, and Kubernetes deployments, and removes reliance on `.env`.

## What Changes
- Add support for reading API configuration from `src/apps/api/config.yaml` as the single source of truth.
- Remove `.env` loading from the API runtime configuration path.
- Update the API config loader and validation so `ConfigService` uses YAML-derived values only.
- Update TypeORM CLI data source to use the same config loader so migrations behave consistently.
- Update dev Kubernetes helper scripts to write configuration to `config.yaml`.
- Render `config.yaml` from Helm values into a ConfigMap and mount it into the API deployment.

## Impact
- Affected specs: `specs/backend-standards/spec.md`, `specs/kubernetes/spec.md`
- Affected code: `src/apps/api/src/app.module.ts`, `src/apps/api/src/config/env.validation.ts`, `src/apps/api/src/database/data-source.ts`, `scripts/setup-dev-k8s-deps.ps1`, `helm/pytoya/templates/configmap.yaml`, `helm/pytoya/templates/api/deployment.yaml`, `helm/pytoya/values*.yaml`
