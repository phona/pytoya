## ADDED Requirements

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

