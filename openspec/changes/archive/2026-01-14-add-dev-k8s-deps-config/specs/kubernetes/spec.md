## ADDED Requirements
### Requirement: Dev K8s Dependency Setup
The system SHALL provide a documented helper workflow to deploy dev dependencies (PostgreSQL and Redis) to Kubernetes using NodePort and configure local development environment variables.

#### Scenario: Deploy dev dependencies
- **WHEN** a developer runs the helper with a POSTGRES_PASSWORD
- **THEN** PostgreSQL and Redis are deployed to a dev namespace with NodePort services
- **AND** API and web components are disabled for the dev dependency deployment

#### Scenario: Configure local dev environment
- **WHEN** dependencies are deployed with auto-assigned NodePorts
- **THEN** the helper retrieves the NodePorts and a reachable node IP
- **AND** local `.env` is updated with DB_HOST/DB_PORT and REDIS_HOST/REDIS_PORT
