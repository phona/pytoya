# Kubernetes Deployment (Helm)

PyToYa ships with a Helm chart at `helm/pytoya/` that deploys:
- NestJS API
- Next.js Web
- PostgreSQL
- Redis

## Architecture

```mermaid
flowchart LR
  U[User Browser] -->|HTTP/HTTPS| I[Ingress]
  I -->|/| WEB[Web Service]
  I -->|/api/*| API[API Service]
  API --> PG[(Postgres)]
  API --> R[(Redis)]
```

## Build & Push Images

Build from the repo root (the Dockerfiles depend on the root `package-lock.json` / workspaces):

```bash
# API
docker build -t registry.dev.lan/pytoya/api:1.0.0 -f src/apps/api/Dockerfile . \
  --build-arg NODE_IMAGE=registry.dev.lan/<your-node-mirror>:18-alpine
docker push registry.dev.lan/pytoya/api:1.0.0

# Web (compile the API base URL into the frontend bundle)
docker build -t registry.dev.lan/pytoya/web:1.0.0 -f src/apps/web/Dockerfile . \
  --build-arg NEXT_PUBLIC_API_URL=/api
docker push registry.dev.lan/pytoya/web:1.0.0
```

Notes:
- `NODE_IMAGE` MUST point to your internal mirror of `node:20-alpine` (examples: `registry.dev.lan/library/node:20-alpine` or `registry.dev.lan/node:20-alpine`).

## Deploy with Helm

```bash
helm upgrade --install pytoya helm/pytoya \
  --namespace pytoya \
  --create-namespace \
  --set global.imageRegistry=registry.dev.lan \
  --set api.tag=1.0.0 \
  --set web.tag=1.0.0 \
  --set postgres.auth.password=change-me \
  --set secrets.jwtSecret=change-me \
  --set secrets.llmApiKey=change-me
```

### Production Deployment

Use the Helm helper script for production deployment.

```powershell
pwsh -File scripts/deploy-helm.ps1 `
  -Environment prod `
  -PostgresPassword change-me `
  -JwtSecret change-me `
  -LlmApiKey change-me `
  -Registry registry.prod.lan `
  -ApiTag 1.0.0 `
  -WebTag 1.0.0 `
  -Namespace pytoya `
  -ReleaseName pytoya
```

Notes:
- Values files live under `helm/pytoya/` (e.g., `values-prod.yaml`).
- Run migrations as a separate, explicit step in CI/CD or a one-off job.

## NodePort (No Ingress)

If you don't have (or don't want) an Ingress controller, you can expose Services via NodePort.

Notes:
- NodePorts expose your services on every node IP. Treat this as dev-only unless you lock it down.
- If you don't set `*.service.nodePort`, Kubernetes assigns a free port automatically.

### Dependencies Only (Postgres + Redis)

PowerShell helper:

```powershell
pwsh -File scripts/deploy-deps-nodeport.ps1 -PostgresPassword change-me
```

Manual Helm command:

```bash
helm upgrade --install pytoya-dev helm/pytoya \
  --namespace pytoya-dev \
  --create-namespace \
  --set global.namespace=pytoya-dev \
  --set api.enabled=false \
  --set web.enabled=false \
  --set ingress.enabled=false \
  --set postgres.service.type=NodePort \
  --set redis.service.type=NodePort \
  --set postgres.auth.password=change-me \
  --set secrets.jwtSecret=dummy \
  --set secrets.llmApiKey=dummy
```

Get the NodePorts:

```bash
kubectl get svc -n pytoya-dev
```

### Dev Deps + Local .env Helper

Use the PowerShell helper to read NodePorts and update `src/apps/api/.env`:

```powershell
pwsh -File scripts/setup-dev-k8s-deps.ps1 -SkipDeploy -Namespace pytoya-dev -ReleaseName pytoya-dev
```

The setup helper can also deploy:

```powershell
pwsh -File scripts/setup-dev-k8s-deps.ps1 -PostgresPassword change-me -Namespace pytoya-dev -ReleaseName pytoya-dev
```

Notes:
- The helper updates `DB_HOST`, `DB_PORT`, `REDIS_HOST`, and `REDIS_PORT` in `src/apps/api/.env`.
- Pass `-EnvPath` to write a different env file.
- The helper creates or updates the Postgres app user by default (use `-SkipDbUserSetup` to skip).
- If `-NodeIp` is not provided, the helper prompts for a reachable node IP.

## Verify

```bash
kubectl get pods -n pytoya
kubectl get svc -n pytoya
kubectl get ingress -n pytoya
```

If you have an Ingress host configured, open:
- `https://<host>/` (web)
- `https://<host>/api/health` (api)
