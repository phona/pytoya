## REMOVED Requirements
### Requirement: Subpath Deployment (Traefik Ingress)
Subpath deployments (example: `/pytoya`) are no longer supported.

#### Scenario: Chart does not advertise basePath
- **WHEN** users consult Helm values and docs for Kubernetes deployment
- **THEN** the chart documentation SHALL NOT instruct configuring `global.basePath`
- **AND** the chart SHALL NOT render Ingress path rules that depend on a base path

## ADDED Requirements
### Requirement: Host-Based Deployment (Traefik Ingress)
The system SHALL support host-based routing behind a shared gateway using Kubernetes `Ingress` with `ingressClassName: traefik`.

The Helm chart SHALL route:
- web UI under `/`
- API under `/api/`

#### Scenario: Host routes web and API under stable paths
- **GIVEN** the Helm chart renders an `Ingress` resource with a configured host
- **WHEN** the Ingress is applied
- **THEN** the Ingress MUST route `path: /api` (Prefix) to the API service
- **AND** the Ingress MUST route `path: /` (Prefix) to the web service

