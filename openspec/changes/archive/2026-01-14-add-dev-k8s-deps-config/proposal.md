# Change: Add dev K8s dependency setup helper

## Why
Local dev depends on Postgres/Redis running in Kubernetes with auto-assigned NodePorts. Updating `.env` manually is error-prone and slows onboarding.

## What Changes
- Add a helper workflow to deploy dev dependencies (PostgreSQL/Redis) to Kubernetes and fetch NodePorts.
- Add a helper to update local `.env` with DB/Redis host and ports from Kubernetes.
- Document the dev dependency workflow in project docs.

## Impact
- Affected specs: kubernetes
- Affected code: scripts/, docs/KUBERNETES_DEPLOYMENT.md, CLAUDE.md
