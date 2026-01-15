## MODIFIED Requirements
### Requirement: Monorepo Structure
The project SHALL be organized as a monorepo with separate applications.

#### Scenario: Root package configuration
- **WHEN** developer inspects root package.json
- **THEN** npm workspaces are configured for `src/apps/*`

#### Scenario: Backend application structure
- **WHEN** developer navigates to `src/apps/api`
- **THEN** NestJS application structure exists with package.json, src/, tsconfig.json

#### Scenario: Frontend application structure
- **WHEN** developer navigates to `src/apps/web`
- **THEN** Vite React application structure exists with package.json, src/, index.html
- **AND** frontend folders follow `src/app`, `src/routes`, `src/features`, `src/shared`, `src/api`, `src/mocks`, `src/tests`

#### Scenario: Docker Compose orchestration
- **WHEN** developer runs `docker-compose up`
- **THEN** PostgreSQL, Redis, backend API, and web frontend start successfully
- **AND** applications can communicate via service names
- **AND** web can call backend REST endpoints under `/api/*`
- **AND** web can connect to backend WebSocket namespace `/manifests`

#### Scenario: Monorepo scripts
- **WHEN** developer runs `npm run dev`
- **THEN** both API and web applications start in parallel
- **WHEN** developer runs `npm run build`
- **THEN** both applications build successfully
