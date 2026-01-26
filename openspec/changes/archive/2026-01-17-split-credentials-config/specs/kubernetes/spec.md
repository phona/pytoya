## ADDED Requirements

### Requirement: Kubernetes Secret Injection
The system SHALL inject sensitive credentials into the API deployment via Kubernetes Secrets and environment variables.

Required Secret keys:
- `db-password`: Database password → `DB_PASSWORD` env var
- `jwt-secret`: JWT signing secret → `JWT_SECRET` env var

The ConfigMap SHALL mount the configuration file (`config.yaml`).
The API container SHALL receive credentials via environment variables from the Secret.

#### Scenario: Secret is created from Helm values
- **WHEN** Helm values include credential fields
- **THEN** a Secret MUST be created with the provided values
- **AND** the Secret MUST be referenced by the API deployment
- **AND** Secret values MUST NOT be visible in rendered manifests (use `stringData`)

#### Scenario: Environment variables are injected from Secret
- **WHEN** the API container starts
- **THEN** environment variables MUST be populated from the Kubernetes Secret
- **AND** `DB_PASSWORD` env var MUST map to `db-password` Secret key
- **AND** `JWT_SECRET` env var MUST map to `jwt-secret` Secret key

#### Scenario: ConfigMap mounts config file
- **WHEN** the API pod starts
- **THEN** the ConfigMap MUST mount `config.yaml` at the expected path
- **AND** the config file MUST contain `{{VARIABLE}}` placeholders
- **AND** the config file MUST NOT contain actual credential values

## MODIFIED Requirements

### Requirement: Dev K8s Dependency Setup
The system SHALL provide a documented helper workflow to deploy dev dependencies (PostgreSQL and Redis) to Kubernetes using NodePort and configure local development environment variables.
The helper SHALL output shell-exportable environment variable assignments for DB/Redis credential values.
Helm charts SHALL render `src/apps/api/config.yaml` from values into a ConfigMap and mount it into the API deployment.

Credential values SHALL be provided via Kubernetes Secrets and injected as environment variables.

#### Scenario: Helm renders API config template
- **WHEN** the Helm chart is rendered for the API
- **THEN** the ConfigMap includes a `config.yaml` entry with `{{VARIABLE}}` placeholders
- **AND** the API deployment mounts the ConfigMap at `src/apps/api/config.yaml`
- **AND** credential values are NOT included in the ConfigMap

#### Scenario: Helm creates Secret from values
- **WHEN** Helm values include credential fields
- **THEN** a Kubernetes Secret MUST be created
- **AND** the Secret MUST contain `db-password`, `jwt-secret`, and `llm-api-key` keys
- **AND** the API deployment MUST inject these as environment variables

#### Scenario: Deploy dev dependencies
- **WHEN** a developer runs the helper with a POSTGRES_PASSWORD
- **THEN** PostgreSQL and Redis are deployed to a dev namespace with NodePort services
- **AND** API and web components are disabled for the dev dependency deployment

#### Scenario: Configure local dev environment
- **WHEN** dependencies are deployed with auto-assigned NodePorts
- **THEN** the helper retrieves the NodePorts and a reachable node IP
- **AND** the helper outputs shell commands to set environment variables
- **AND** the helper provides separate instructions for bash/zsh and PowerShell

#### Scenario: Helm migration job uses template-derived config
- **WHEN** the Helm migration Job runs in Kubernetes
- **THEN** the mounted `config.yaml` template is available to the API container
- **AND** environment variables from Secrets populate the template placeholders
- **AND** the migration command uses the same configuration values as the API deployment

### Requirement: Helm-Managed Migration Job
The system SHALL provide a Helm-managed migration Job that runs database migrations before API pods start during install/upgrade.

The migration Job SHALL use the same credential environment variables as the API deployment.

#### Scenario: Pre-install migration hook
- **WHEN** Helm installs or upgrades the release
- **THEN** a migration Job runs before API pods are created
- **AND** the Job receives credential environment variables from the same Secret as the API
- **AND** the Job processes the config template with injected credentials
- **AND** the release fails if the Job fails

#### Scenario: Job cleanup
- **WHEN** the migration Job completes
- **THEN** Kubernetes cleans up the Job using configured TTL
