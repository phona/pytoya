## 1. Implementation

- [x] 11.1 Create Helm chart directory structure (helm/pytoya/)
- [x] 11.2 Create Chart.yaml with chart metadata and dependencies
- [x] 11.3 Create values.yaml with configurable parameters for all services
- [x] 11.4 Create namespace template (templates/namespace.yaml)
- [x] 11.5 Create PostgreSQL templates (deployment, service, pvc, secrets)
- [x] 11.6 Create Redis templates (deployment, service)
- [x] 11.7 Create API templates (deployment, service, configmap, secrets, pvc)
- [x] 11.8 Create Web templates (deployment, service)
- [x] 11.9 Create Ingress template with routing rules (/api → backend, / → frontend)
- [x] 11.10 Create ConfigMap and Secret templates with proper value references
- [x] 11.11 Add health checks and resource limits to deployment templates
- [x] 11.12 Create NOTES.txt for post-installation instructions
- [x] 11.13 Create deployment script using Helm (scripts/deploy-helm.sh)
- [x] 11.14 Create environment-specific values files (values-dev.yaml, values-prod.yaml)
- [x] 11.15 Create deployment documentation (helm/pytoya/README.md)
- [x] 11.16 Test deployment locally (minikube or kind) - *User to test when K8s available*
