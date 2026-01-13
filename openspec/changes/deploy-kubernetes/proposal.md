# Change: Kubernetes Deployment

## Why
Application needs to be deployed to Kubernetes for production environment with proper resource management, scaling, and local filesystem storage for uploads.

## What Changes
- Create Helm chart for PyToya deployment
- Helm chart includes templates for:
  - PostgreSQL deployment with PVC
  - Redis deployment
  - API deployment with PVC for uploads (/app/uploads)
  - Web deployment
  - Ingress for routing (/api path → backend, / path → frontend)
  - ConfigMaps for environment variables
  - Secrets for sensitive data (DB password, JWT, API keys)
  - Health checks and resource limits
- Create values.yaml for configuration
- Create deployment script using Helm CLI
- Create deployment documentation

## Impact
- Affected specs: New deployment capability
- Affected code: Helm chart, Dockerfiles, deployment scripts
- Benefits:
  - Easier configuration management via values.yaml
  - Better reusability across environments (dev, staging, prod)
  - Simplified upgrades and rollbacks with Helm
  - Standardized deployment process
