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
The configuration source SHALL prefer `src/apps/api/config.yaml` and fall back to `.env` when the YAML file is missing.

#### Scenario: WebSocket and HTTP share configuration rules
- **WHEN** a WebSocket gateway/guard needs a secret or origin
- **THEN** it MUST read values using `ConfigService`
- **AND** it MUST NOT use insecure fallback defaults for secrets

#### Scenario: YAML config takes precedence
- **WHEN** both `src/apps/api/config.yaml` and `.env` exist
- **THEN** the backend MUST use values from `config.yaml`
- **AND** `.env` values MUST only apply when `config.yaml` is missing

#### Scenario: CLI and migration tooling share config precedence
- **WHEN** operators run CLI commands or TypeORM migrations
- **THEN** the tooling MUST read configuration from the same YAML-first loader
- **AND** `.env` values MUST only apply when `config.yaml` is missing

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

