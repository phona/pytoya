# PyToYa Helm Chart

Helm chart for deploying the PyToYa invoice processing system (NestJS API, Vite web, PostgreSQL, Redis).

## Quick Start: Building Images

Before deploying, you need to build Docker images for each app:

```bash
# Build API image
docker build -t pytoya/api:latest -f src/apps/api/Dockerfile .

# Build Web image
docker build -t pytoya/web:latest -f src/apps/web/Dockerfile . \
  --build-arg VITE_API_URL=/api

# Optional: Push to registry
docker tag pytoya/api:latest your-registry/pytoya/api:latest
docker tag pytoya/web:latest your-registry/pytoya/web:latest
docker push your-registry/pytoya/api:latest
docker push your-registry/pytoya/web:latest
```

**Note:** Dockerfiles are now located in each app directory:
- API: `src/apps/api/Dockerfile`
- Web: `src/apps/web/Dockerfile`

## Prerequisites
- Kubernetes 1.23+
- Helm 3.x
- Ingress controller (nginx recommended) if using Ingress
- Built Docker images pushed to accessible registry

## Installation

```bash
helm install pytoya helm/pytoya \
  --namespace pytoya \
  --create-namespace
```

## NodePort (No Ingress)

If you don't have an Ingress controller, you can expose Services via NodePort.

Example: deploy only Postgres + Redis for development:

```bash
POSTGRES_PASSWORD=change-me ./scripts/deploy-deps-nodeport.sh
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

To see assigned NodePorts:

```bash
kubectl get svc -n pytoya-dev
```

### Development

```bash
helm install pytoya helm/pytoya \
  --namespace pytoya \
  --create-namespace \
  --values helm/pytoya/values-dev.yaml
```

### Production

```bash
helm install pytoya helm/pytoya \
  --namespace pytoya \
  --create-namespace \
  --values helm/pytoya/values-prod.yaml
```

## Configuration Reference

Key values (see `values.yaml` for the full list):

- `global.namespace`: Namespace to deploy into
- `global.imageRegistry`: Optional image registry prefix
- `global.imagePullSecrets`: List of image pull secret names
- `global.nodeSelector`, `global.tolerations`, `global.affinity`: Scheduling controls

- `postgres.*`: PostgreSQL image, resources, persistence, and auth
- `redis.*`: Redis image, resources, persistence
- `api.*`: API image, replicas, env, persistence, service, health checks
- `worker.*`: Optional worker deployment (BullMQ processors only)
- `web.*`: Web image, replicas, env, service, health checks
- `ingress.*`: Ingress settings (hosts, TLS, annotations, class)
- `hpa.api.*`, `hpa.web.*`: Autoscaler settings
- `secrets.jwtSecret`, `secrets.llmApiKey`: Sensitive values

### Required Secrets
Set these before installing:

```bash
helm install pytoya helm/pytoya \
  --set postgres.auth.password=change-me \
  --set secrets.jwtSecret=change-me \
  --set secrets.llmApiKey=change-me
```

### Notes on `VITE_API_URL`
`VITE_API_URL` is compiled into the web frontend at image build time. For the default Ingress routing (`/api/*` to the backend), use `--build-arg VITE_API_URL=/api` when building the web image.

### Subpath deployments (`global.basePath` + `VITE_BASE_PATH`)
To host PyToYa under a base path (example: `/pytoya`) behind a shared gateway:
- Set Helm: `--set global.basePath=/pytoya`
- Build the web image with:

```bash
docker build -t pytoya/web:latest -f src/apps/web/Dockerfile . \
  --build-arg VITE_API_URL=/pytoya/api \
  --build-arg VITE_BASE_PATH=/pytoya
```

## Upgrading

```bash
helm upgrade pytoya helm/pytoya \
  --namespace pytoya \
  --values helm/pytoya/values-prod.yaml
```

## Rolling Back

```bash
helm rollback pytoya 1 --namespace pytoya
```

## Uninstalling

```bash
helm uninstall pytoya --namespace pytoya
```

## Troubleshooting

- Check pods: `kubectl get pods -n pytoya`
- Describe a pod: `kubectl describe pod <pod> -n pytoya`
- Check logs: `kubectl logs <pod> -n pytoya`
- Check ingress: `kubectl get ingress -n pytoya`

## See Also
- `docs/KUBERNETES_DEPLOYMENT.md`
