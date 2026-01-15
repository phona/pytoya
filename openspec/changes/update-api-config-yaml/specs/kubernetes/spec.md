## MODIFIED Requirements
### Requirement: Dev K8s Dependency Setup
The system SHALL provide a documented helper workflow to deploy dev dependencies (PostgreSQL and Redis) to Kubernetes using NodePort and configure local development environment variables.
The helper SHALL update `src/apps/api/config.yaml` with DB/Redis values and MAY update `.env` as a fallback if present.
Helm charts SHALL render `src/apps/api/config.yaml` from values into a ConfigMap and mount it into the API deployment.

#### Scenario: Helm renders API config.yaml
- **WHEN** the Helm chart is rendered for the API
- **THEN** the ConfigMap includes a `config.yaml` entry derived from values
- **AND** the API deployment mounts the ConfigMap at `src/apps/api/config.yaml`

#### Scenario: Deploy dev dependencies
- **WHEN** a developer runs the helper with a POSTGRES_PASSWORD
- **THEN** PostgreSQL and Redis are deployed to a dev namespace with NodePort services
- **AND** API and web components are disabled for the dev dependency deployment

#### Scenario: Configure local dev environment
- **WHEN** dependencies are deployed with auto-assigned NodePorts
- **THEN** the helper retrieves the NodePorts and a reachable node IP
- **AND** local `config.yaml` is updated with DB_HOST/DB_PORT and REDIS_HOST/REDIS_PORT
- **AND** `.env` is updated only when the file exists
