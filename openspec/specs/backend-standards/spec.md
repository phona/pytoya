# backend-standards Specification

## Purpose
TBD - created by archiving change update-nestjs-guardrails. Update Purpose after archive.
## Requirements
### Requirement: Locked Backend Stack
The backend SHALL use a single, consistent stack:
- HTTP platform: Express (`@nestjs/platform-express`) only
- Validation: `class-validator` + `class-transformer` only
- Config: `@nestjs/config` only
- Logging: Nest `Logger` only
- Database: TypeORM only

#### Scenario: Backend stack decisions stay consistent
- **WHEN** adding a backend feature or refactoring an existing module
- **THEN** the change MUST NOT introduce a second HTTP platform, validation system, logger, or ORM
- **AND** any proposal to switch a core choice MUST be handled as a separate approved change

### Requirement: Strict Global Request Validation
The backend SHALL enable strict global request validation:
- `transform: true`
- `whitelist: true`
- `forbidNonWhitelisted: true`

#### Scenario: Unknown fields are rejected
- **WHEN** a client sends JSON with unknown properties to an endpoint that uses a DTO
- **THEN** the request MUST be rejected with a 400 response

### Requirement: Centralized Config Access
The backend SHALL NOT access configuration via `process.env` in runtime request paths.
All runtime configuration MUST be read via `ConfigService`.
The configuration source SHALL be `src/apps/api/config.yaml`.

Server configuration SHALL be nested under `server` key:
- `server.port`: HTTP server port (default: 3000)
- `server.logLevel`: Logging level (default: "info")

#### Scenario: Server configuration uses simplified structure
- **WHEN** reading server configuration
- **THEN** `server.port` MUST be used for the HTTP port
- **AND** `server.logLevel` MUST be used for logger configuration
- **AND** logging settings MUST NOT be in a separate `logging` object
- **AND** `nodeEnv` MUST NOT be used in configuration

### Requirement: Request-Path Error Handling Uses Nest Exceptions
Request-path code (controllers/services) SHALL NOT throw raw `Error`.
It MUST throw appropriate Nest exceptions (`BadRequestException`, `NotFoundException`, `UnauthorizedException`, etc.).

#### Scenario: Errors have stable HTTP meanings
- **WHEN** a request fails due to missing resource, invalid input, or authorization
- **THEN** the backend MUST return a correct 4xx status code
- **AND** unexpected failures MAY return 500 without leaking secrets

### Requirement: Explicit Response Contracts
Controllers SHALL return explicit response DTOs (or explicit interfaces) and SHALL NOT return ORM entities directly.

#### Scenario: ORM entity shape is not an API contract
- **WHEN** a controller returns data from the database
- **THEN** it MUST map to a response DTO/interface
- **AND** it MUST NOT expose internal columns (e.g. password hashes)

### Requirement: Configuration File Design Principles
Configuration structure MUST follow these design principles:

1. **Domain-Based Grouping**: Configuration SHALL be grouped by domain/feature area, not by technical layer
2. **Flat Over Nested**: Configuration SHOULD prefer flat structures within domain groups (avoid unnecessary nesting)
3. **Defaults in Code**: Default values SHALL be defined in `app.config.ts`, not in example config files
4. **Single Source of Truth**: Each configuration value MUST have one canonical path (no multiple sources)
5. **Validation Mirrors Structure**: TypeScript validation classes MUST mirror the YAML structure exactly
6. **Environment-Specific Values**: Environment-specific configuration MUST use deployment tooling (Helm), not committed config files

#### Scenario: Configuration is grouped by domain
- **WHEN** adding new configuration values
- **THEN** related settings MUST be grouped under a common domain key (e.g., `server.*`, `database.*`, `redis.*`)
- **AND** settings MUST NOT be separated by technical layer (e.g., `logging.levels` separate from `server.port`)

#### Scenario: Configuration uses flat structure
- **WHEN** designing configuration structure
- **THEN** flat structures SHOULD be preferred (e.g., `server.logLevel`)
- **AND** unnecessary nesting MUST be avoided (e.g., `server.logging.levels`)

#### Scenario: Defaults are defined in code
- **WHEN** defining default configuration values
- **THEN** defaults MUST be in `app.config.ts` DEFAULT_CONFIG
- **AND** example config files SHOULD only contain commonly-overridden values
- **AND** default config serves as both documentation and fallback

#### Scenario: Single source of truth for config
- **WHEN** reading configuration values
- **THEN** each value MUST have exactly one canonical path
- **AND** fallback to multiple sources (e.g., `process.env`) MUST NOT be used
- **AND** runtime environment variable access MUST NOT occur after app initialization

#### Scenario: Validation matches config structure
- **WHEN** defining TypeScript validation classes
- **THEN** class structure MUST mirror YAML structure exactly
- **AND** property names in validation classes MUST match config paths
- **AND** validation failures MUST point to exact config path

#### Scenario: Environment config uses deployment tooling
- **WHEN** configuring environment-specific values
- **THEN** Helm values MUST be used for Kubernetes deployments
- **AND** production secrets/URLs MUST NOT be committed to the repository
- **AND** environment-specific config files MAY only be used for local development

### Requirement: Supported NestJS Major Version
The backend SHALL target NestJS major version 11 for runtime and tooling packages (all @nestjs/* dependencies).

#### Scenario: Adding or upgrading NestJS packages
- **WHEN** adding or updating a NestJS dependency
- **THEN** the package MUST be on major version 11
- **AND** the NestJS package set MUST NOT mix major versions

