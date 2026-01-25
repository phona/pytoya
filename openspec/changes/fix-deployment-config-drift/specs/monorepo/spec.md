## MODIFIED Requirements

### Requirement: Monorepo Structure
The project SHALL be organized as a monorepo with separate applications, and SHALL provide a working `docker-compose up` development environment that matches the repo Dockerfile build contexts and configuration contracts.

#### Scenario: Docker Compose orchestration
- **WHEN** developer runs `docker-compose up`
- **THEN** PostgreSQL, Redis, backend API, and web frontend start successfully
- **AND** Docker builds succeed using the correct build context for each app Dockerfile
- **AND** compose environment variables align with the API `config.yaml` template variables
- **AND** web configuration follows the documented Vite strategy (build-time or runtime injection)
