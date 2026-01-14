# kubernetes Specification

## Purpose
TBD - created by archiving change deploy-kubernetes. Update Purpose after archive.
## Requirements
### Requirement: Kubernetes Deployment
The system SHALL be deployable to Kubernetes with all services configured.

#### Scenario: Namespace creation
- **WHEN** deploying to Kubernetes
- **THEN** pytoya namespace is created
- **AND** all resources are deployed in this namespace

#### Scenario: PostgreSQL deployment
- **WHEN** deploying PostgreSQL
- **THEN** PostgreSQL pod starts with PVC for data persistence
- **AND** service is accessible on port 5432
- **AND** secrets contain database password

#### Scenario: Redis deployment
- **WHEN** deploying Redis
- **THEN** Redis pod starts
- **AND** service is accessible on port 6379

#### Scenario: API deployment
- **WHEN** deploying backend API
- **THEN** API pods start with PVC for /app/uploads
- **AND** service is accessible on port 3000
- **AND** health checks are configured (liveness and readiness probes)
- **AND** environment variables include database, redis, and storage paths
- **AND** backend REST endpoints are available under `/api/*` (no ingress rewrite required)

#### Scenario: Web deployment
- **WHEN** deploying frontend web
- **THEN** web pods start
- **AND** service is accessible on port 80
- **AND** NEXT_PUBLIC_API_URL points to backend service

#### Scenario: Ingress routing
- **WHEN** deploying ingress
- **THEN** `/api/*` routes to backend service
- **AND** `/` routes to frontend service
- **AND** TLS certificates are configured (optional)

### Requirement: Dev K8s Dependency Setup
The system SHALL provide a documented helper workflow to deploy dev dependencies (PostgreSQL and Redis) to Kubernetes using NodePort and configure local development environment variables.

#### Scenario: Deploy dev dependencies
- **WHEN** a developer runs the helper with a POSTGRES_PASSWORD
- **THEN** PostgreSQL and Redis are deployed to a dev namespace with NodePort services
- **AND** API and web components are disabled for the dev dependency deployment

#### Scenario: Configure local dev environment
- **WHEN** dependencies are deployed with auto-assigned NodePorts
- **THEN** the helper retrieves the NodePorts and a reachable node IP
- **AND** local `.env` is updated with DB_HOST/DB_PORT and REDIS_HOST/REDIS_PORT

