# Change: Kubernetes Deployment

## Why
Application needs to be deployed to Kubernetes for production environment with proper resource management, scaling, and local filesystem storage for uploads.

## What Changes
- Create PostgreSQL deployment with PVC
- Create Redis deployment
- Create API deployment with PVC for uploads (/app/uploads)
- Create Web deployment
- Create Ingress for routing (/api path → backend, / path → frontend)
- Create ConfigMaps for environment variables
- Create Secrets for sensitive data (DB password, JWT, API keys)
- Add health checks and resource limits
- Create deployment documentation and scripts

## Impact
- Affected specs: New deployment capability
- Affected code: K8s manifests, Dockerfiles, deployment scripts
