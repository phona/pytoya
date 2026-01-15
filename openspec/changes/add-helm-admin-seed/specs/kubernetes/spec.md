# kubernetes Spec Delta

## MODIFIED Requirements
### Requirement: Kubernetes Deployment
The system SHALL be deployable to Kubernetes with an optional Helm hook Job that seeds the default admin user when admin values are provided.

#### Scenario: Admin seed job runs on install/upgrade
- **WHEN** Helm values include `admin.username` and `admin.password`
- **THEN** a post-install/post-upgrade Job runs `node dist/cli newadmin`
- **AND** the Job uses the same config/secrets as the API deployment

#### Scenario: Admin seed job omitted when values missing
- **WHEN** Helm values do not include admin credentials
- **THEN** no admin seed Job is rendered
