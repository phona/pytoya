# PyToYa Helm Chart

Helm chart for deploying the PyToYa invoice processing system (NestJS API, Next.js web, PostgreSQL, Redis).

## Quick Start: Building Images

Before deploying, you need to build Docker images for each app:

```bash
# Build API image
docker build -t pytoya/api:latest -f src/apps/api/Dockerfile src/apps/api

# Build Web image
docker build -t pytoya/web:latest -f src/apps/web/Dockerfile src/apps/web

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
