## MODIFIED Requirements

### Requirement: Performance Baselines
The backend SHALL avoid N+1 query patterns in frequently-used endpoints.

#### Scenario: Metrics endpoints avoid N+1 queries
- **GIVEN** a metrics endpoint needs “latest job per manifest” information
- **WHEN** the client requests the metric for N manifests
- **THEN** the backend SHALL fetch the needed job data in O(1) queries (not O(N))
