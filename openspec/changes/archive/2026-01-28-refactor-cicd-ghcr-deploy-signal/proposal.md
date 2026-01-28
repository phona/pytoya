# Change: Refactor CI/CD to GHCR + Deploy Signal

## Why
The current `.github/workflows/cicd.yaml` mixes CI concerns (tests/builds) with production deployment details (cluster access, Helm/Kubectl presence, node-local values files, and optional insecure registry behaviors).

This creates:
- **Security risk**: registry hacks like `/etc/hosts` injection and “insecure registry” flags expand the blast radius of CI/CD configuration.
- **Operational brittleness**: deployments depend on runner-local state (`/home/github-runner/pytoya.values.yaml`, preinstalled `kubectl`/`helm`, kubeconfig shape).
- **Complexity**: the workflow tries to support multiple registries and behaviors, making it hard to reason about what runs in production.

## What Changes
### High-level
- **GHCR-only artifacts**: build/push Docker images and Helm chart (OCI) to GitHub Container Registry (`ghcr.io`) only.
- **Deploy becomes a signal**: the deploy job on the self-hosted runner only calls `/home/github-runner/deploy.sh` with immutable identifiers:
  - `--app <app>`
  - `--chart oci://ghcr.io/<ORG>/charts/<chart-id>`
  - `--chart-version <version>`
  - `--images '<json>'` (full image refs)

### Workflow Contract
GitHub Actions SHALL NOT:
- edit `/etc/hosts`
- configure Docker “insecure registries”
- perform registry logins using ad-hoc credentials for non-GHCR hosts
- directly run `kubectl` or `helm upgrade` against production clusters

Instead, the self-hosted node SHALL own:
- GHCR credentials (if charts/images are private)
- Kubernetes credentials
- mapping from `--app` to environment-specific details (namespace/release/values)
- the actual deploy mechanism (Helm/ArgoCD/Lightway/etc.)

## Non-Goals
- Redesigning the Helm chart itself (unless required to support digest-pinned images).
- Changing Kubernetes manifests/templates beyond what is necessary to support the new deploy contract.
- Introducing new production dependencies in the application.

## Security & Risk Notes
- **Self-hosted runner is high-trust**: deploy MUST NOT run on `pull_request` events.
- Prefer **digest-pinned** deployments where possible to prevent retag attacks (may require small Helm chart extensions).
- Keep GitHub Actions permissions minimal (only `packages: write` where pushing artifacts).

## Rollout
1. Introduce the new deploy-signal job in parallel (no production cutover).
2. Confirm the self-hosted `deploy.sh` can deploy from GHCR-only artifacts.
3. Remove legacy registry hacks and direct Helm deploy steps from the workflow.
4. Document the new contract in `docs/` and `CLAUDE.md` if behavior changes.
