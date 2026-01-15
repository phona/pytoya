## ADDED Requirements
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
