# kubernetes Specification

## Purpose
TBD - created by archiving change deploy-kubernetes. Update Purpose after archive.
## Requirements
### Requirement: Kubernetes Deployment
The system SHALL support a worker topology that can be scaled independently from the HTTP API when deployed to Kubernetes.

#### Scenario: Worker runs as separate deployment
- **GIVEN** Helm values enable a separate worker deployment
- **WHEN** the chart is rendered
- **THEN** a worker Deployment is created that:
  - uses the same image tag as the API
  - mounts the same `config.yaml` template
  - receives the same Secret-derived environment variables
- **AND** the API deployment remains responsible for HTTP routes

### Requirement: Dev K8s Dependency Setup
Helm charts SHALL render an API `config.yaml` that passes API config validation, including required nested sections.

#### Scenario: Helm renders complete API config template
- **WHEN** the Helm chart is rendered for the API
- **THEN** the ConfigMap MUST include a `config.yaml` entry with:
  - `database`, `redis`, `jwt`, `llm`, `security`
  - `queue.extraction.concurrency`
  - `features.manualExtraction`
- **AND** credential values MUST remain placeholders (populated by Secret-derived env vars)

#### Scenario: Secret placeholders are YAML-safe
- **WHEN** the API config template includes Secret placeholders (DB password, JWT secret, LLM key)
- **THEN** the placeholders SHALL be quoted or rendered safely so arbitrary secret values do not break YAML parsing

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

### Requirement: Kubernetes Secret Injection
The system SHALL inject sensitive credentials into the API deployment via Kubernetes Secrets and environment variables.

Required Secret keys:
- `db-password`: Database password → `DB_PASSWORD` env var
- `jwt-secret`: JWT signing secret → `JWT_SECRET` env var
- `llm-api-key`: LLM provider API key → `LLM_API_KEY` env var

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
- **AND** `LLM_API_KEY` env var MUST map to `llm-api-key` Secret key

#### Scenario: ConfigMap mounts config file
- **WHEN** the API pod starts
- **THEN** the ConfigMap MUST mount `config.yaml` at the expected path
- **AND** the config file MUST contain `{{VARIABLE}}` placeholders
- **AND** the config file MUST NOT contain actual credential values

### Requirement: Subpath Deployment (Traefik Ingress)
The system SHALL support being deployed under a configurable base path (example: `/pytoya`) behind a shared gateway using Kubernetes `Ingress` with `ingressClassName: traefik`.

The Helm chart SHALL expose `global.basePath` (default: empty) and SHALL render Ingress path rules that route:
- web UI under `<basePath>/`
- API under `<basePath>/api/`

#### Scenario: Base path routes web and API with two Ingress paths
- **GIVEN** `global.basePath=/pytoya`
- **WHEN** the Helm chart renders an `Ingress` resource
- **THEN** the Ingress MUST route `path: /pytoya/api` (Prefix) to the API service
- **AND** the Ingress MUST route `path: /pytoya` (Prefix) to the web service
- **AND** the deployment MUST NOT require additional Ingress paths for uploads or websockets (they are nested under `/pytoya/api/*`)

#### Scenario: Root deploy remains supported
- **GIVEN** `global.basePath` is empty
- **WHEN** the Helm chart renders an `Ingress` resource
- **THEN** the Ingress SHOULD route `path: /api` (Prefix) to the API service
- **AND** the Ingress SHOULD route `path: /` (Prefix) to the web service

### Requirement: Web Frontend Environment Configuration
The Kubernetes deployment SHALL document and implement a supported strategy for configuring the Vite web app per environment.

#### Scenario: Build-time Vite configuration (Option A)
- **WHEN** the web image is built for an environment
- **THEN** the build process SHALL set `VITE_API_URL` (and optionally `VITE_WS_URL`) as build arguments
- **AND** Helm SHALL NOT rely on runtime container env vars to configure the Vite bundle

### Requirement: WebSocket Topology Option
The system SHALL support a deployable topology where realtime updates remain functional when multiple API replicas exist.

#### Scenario: Multi-replica API keeps realtime updates working
- **GIVEN** the API is deployed with more than one replica
- **WHEN** an extraction job reports progress
- **THEN** the user interface SHALL receive progress updates for subscribed manifests
- **AND** the chosen deployment strategy (dedicated gateway, adapter, or sticky routing) SHALL be documented

