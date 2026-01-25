## MODIFIED Requirements

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

## ADDED Requirements

### Requirement: WebSocket Topology Option
The system SHALL support a deployable topology where realtime updates remain functional when multiple API replicas exist.

#### Scenario: Multi-replica API keeps realtime updates working
- **GIVEN** the API is deployed with more than one replica
- **WHEN** an extraction job reports progress
- **THEN** the user interface SHALL receive progress updates for subscribed manifests
- **AND** the chosen deployment strategy (dedicated gateway, adapter, or sticky routing) SHALL be documented
