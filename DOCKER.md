# Docker Guide for PyToYa

This guide covers building and running PyToYa with Docker.

## Dockerfiles

Dockerfiles are located in each app directory:
- **API:** `src/apps/api/Dockerfile`
- **Web:** `src/apps/web/Dockerfile`

Each Dockerfile is self-contained and builds only its respective application.

## Building Images

### Build API Image
```bash
docker build -t pytoya/api:latest -f src/apps/api/Dockerfile .
```

### Build Web Image
```bash
docker build -t pytoya/web:latest -f src/apps/web/Dockerfile .
```

### Build Both Images
```bash
docker build -t pytoya/api:latest -f src/apps/api/Dockerfile .
docker build -t pytoya/web:latest -f src/apps/web/Dockerfile .
```

### Build Web with a Kubernetes-friendly API base
The web app reads `NEXT_PUBLIC_API_URL` at build time (bundled into the client). For an Ingress that routes `/api/*` to the backend, a good default is:

```bash
docker build -t pytoya/web:latest -f src/apps/web/Dockerfile . \
  --build-arg NEXT_PUBLIC_API_URL=/api
```

### Building without Docker Hub
If Docker Hub is blocked from your build environment, mirror the base image and pass it in:

```bash
docker build -t pytoya/api:latest -f src/apps/api/Dockerfile . \
  --build-arg NODE_IMAGE=registry.dev.lan/<your-node-mirror>:20-alpine
```

## Running with Docker Compose

The `docker-compose.yml` file is configured for local development and includes:
- PostgreSQL database
- Redis cache/queue
- NestJS API (with hot reload)
- Next.js Web (with hot reload)

### Start All Services
```bash
docker-compose up -d
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api
docker-compose logs -f web
```

### Stop Services
```bash
docker-compose down
```

### Stop and Remove Volumes
```bash
docker-compose down -v
```

## Service URLs

When running with Docker Compose:

- **API:** http://localhost:3000
- **Web:** http://localhost:3001
- **PostgreSQL:** localhost:5432
- **Redis:** localhost:6379

## Environment Variables

The API requires these environment variables (configured in docker-compose.yml):

```
NODE_ENV=development
PORT=3000
DB_HOST=postgres
DB_PORT=5432
DB_USERNAME=pytoya_user
DB_PASSWORD=pytoya_pass
DB_DATABASE=pytoya
REDIS_HOST=redis
REDIS_PORT=6379
JWT_SECRET=dev-jwt-secret-change-in-production
PADDLEOCR_BASE_URL=http://localhost:8080
```

## Production Deployment with Helm

For Kubernetes deployment, use the Helm chart in `helm/pytoya/`:

1. Build and push images to your registry
2. Update `helm/pytoya/values.yaml` with your registry
3. Deploy with Helm

See `helm/pytoya/README.md` and `docs/KUBERNETES_DEPLOYMENT.md` for Kubernetes deployment instructions.

## Troubleshooting

### Container won't start
```bash
# Check logs
docker-compose logs api
docker-compose logs web

# Check container status
docker-compose ps
```

### Port conflicts
If ports 3000, 3001, 5432, or 6379 are already in use, edit the `ports` section in `docker-compose.yml`.

### Database connection errors
Ensure PostgreSQL is healthy before starting API:
```bash
docker-compose ps
# Wait for postgres to show "healthy" status
```

### Clean rebuild
```bash
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```
