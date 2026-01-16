# monorepo Specification

## Purpose
TBD - created by archiving change setup-monorepo. Update Purpose after archive.
## Requirements
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

### Requirement: Shared Types Workspace
The project SHALL provide a shared workspace package for type definitions used across applications.

#### Scenario: Shared workspace structure
- **WHEN** developer inspects `src/shared/`
- **THEN** a workspace package exists with `package.json`, `tsconfig.json`, and `src/types/` directory
- **AND** the package re-exports DTOs from `src/apps/api/src/*/dto/`

#### Scenario: Type re-export pattern
- **WHEN** developer inspects `src/shared/src/types/`
- **THEN** each domain file (projects.ts, schemas.ts, etc.) re-exports types from the corresponding API DTOs
- **AND** an `index.ts` barrel export exists for convenient imports

#### Scenario: Web app consumes shared types
- **WHEN** web app imports API contract types
- **THEN** types are imported from `@pytoya/shared/types` using `import type` syntax
- **AND** no duplicate type definitions exist in the web app

#### Scenario: TypeScript path mapping
- **WHEN** developer inspects `tsconfig.json` files
- **THEN** `@pytoya/shared/types` is mapped to the shared workspace
- **AND** path aliases work in both API and web apps

#### Scenario: Root workspace configuration
- **WHEN** developer inspects root `package.json`
- **THEN** workspaces include `src/apps/*` and `src/shared`
- **AND** `npm install` resolves workspace dependencies correctly

