# Docker Compose Deployment

Production deployment for pytoya using Docker Compose (or podman-compose).

## Prerequisites

- Docker / Podman with compose support
- Access to `ghcr.io/phona/pytoya` images (or build locally)
- PostgreSQL client (`pg_dump`/`psql`) if migrating from existing instance

## Setup

```bash
cp .env.example .env
# Edit .env with your secrets:
#   DB_PASSWORD
#   JWT_SECRET
#   IMAGE_TAG (commit SHA from CI, or "latest")
```

## Usage

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f

# Stop
docker compose down
```

## Migration from k3s

If migrating from a k3s deployment:

```bash
# 1. Dump existing database
kubectl exec -n components postgresql-0 -- env PGPASSWORD=$DB_PASSWORD \
  pg_dump -h 127.0.0.1 -U postgres -d pytoya --no-owner --no-acl > dump.sql

# 2. Start only the database
docker compose up -d postgres

# 3. Import data
docker compose exec -T postgres psql -U postgres -d pytoya < dump.sql

# 4. Start remaining services
docker compose up -d

# 5. Run migrations
docker compose run --rm api node dist/migrate.js
```

## Services

| Service | Image | Port | Description |
|---------|-------|------|-------------|
| postgres | postgres:15-alpine | 5432 | Database |
| redis | redis:7-alpine | 6379 | Queue backend |
| api | ghcr.io/phona/pytoya/api | 3000 | NestJS API |
| web | ghcr.io/phona/pytoya/web | 3001 | Nginx SPA + API proxy |
| worker | ghcr.io/phona/pytoya/api | - | BullMQ worker |

## Architecture

```text
Caddy (host, 443) → web:3001 → /api/ → api:3000
                                └─ static files
```
