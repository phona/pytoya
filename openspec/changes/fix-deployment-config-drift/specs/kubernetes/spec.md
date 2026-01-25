## MODIFIED Requirements

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

## ADDED Requirements

### Requirement: Web Frontend Environment Configuration
The Kubernetes deployment SHALL document and implement a supported strategy for configuring the Vite web app per environment.

#### Scenario: Build-time Vite configuration (Option A)
- **WHEN** the web image is built for an environment
- **THEN** the build process SHALL set `VITE_API_URL` (and optionally `VITE_WS_URL`) as build arguments
- **AND** Helm SHALL NOT rely on runtime container env vars to configure the Vite bundle

