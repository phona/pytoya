# kubernetes Specification

## Purpose
TBD - created by archiving change deploy-kubernetes. Update Purpose after archive.
## Requirements
### Requirement: Kubernetes Deployment
The system SHALL be deployable to Kubernetes with an optional Helm hook Job that seeds the default admin user when admin values are provided.

#### Scenario: Admin seed job runs on install/upgrade
- **WHEN** Helm values include `admin.username` and `admin.password`
- **THEN** a post-install/post-upgrade Job runs `node dist/cli newadmin`
- **AND** the Job uses the same config/secrets as the API deployment

#### Scenario: Admin seed job omitted when values missing
- **WHEN** Helm values do not include admin credentials
- **THEN** no admin seed Job is rendered

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

#### Scenario: Helm migration job uses YAML-derived config
- **WHEN** the Helm migration Job runs in Kubernetes
- **THEN** the mounted `config.yaml` values are available to the API container
- **AND** the migration command uses the same configuration values as the API deployment

### Requirement: Helm-Managed Migration Job
The system SHALL provide a Helm-managed migration Job that runs database migrations before API pods start during install/upgrade.

#### Scenario: Pre-install migration hook
- **WHEN** Helm installs or upgrades the release
- **THEN** a migration Job runs before API pods are created
- **AND** the Job uses the same database credentials as the API
- **AND** the release fails if the Job fails

#### Scenario: Job cleanup
- **WHEN** the migration Job completes
- **THEN** Kubernetes cleans up the Job using configured TTL

