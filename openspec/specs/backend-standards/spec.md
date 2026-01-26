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

All DTOs SHALL enforce validation rules appropriate to their domain.

#### Scenario: Unknown fields are rejected
- **WHEN** a client sends JSON with unknown properties to an endpoint that uses a DTO
- **THEN** the request MUST be rejected with a 400 response

#### Scenario: Password validation enforces complexity
- **WHEN** a user registers or changes password
- **THEN** the password MUST meet complexity requirements:
  - Minimum 8 characters
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number
  - At least one special character (@$!%*?&)
  - Maximum 128 characters
- **AND** validation failure MUST return clear error message

#### Scenario: Username validation enforces format
- **WHEN** a user registers or logs in
- **THEN** the username MUST meet format requirements:
  - 3-50 characters
  - Alphanumeric, underscore, hyphen only
  - Must start with a letter
- **AND** validation failure MUST return clear error message

### Requirement: Centralized Config Access
The backend SHALL NOT access configuration via `process.env` in runtime request paths.
All runtime configuration MUST be read via `ConfigService`.
The configuration source SHALL be `src/apps/api/config.yaml` (Handlebars template with placeholders).

Credential values MUST be injected via environment variables before application startup.
The configuration loader MUST substitute template placeholders with environment variable values.
The application MUST fail to start if required credential environment variables are missing.

Server configuration SHALL be nested under `server` key:
- `server.port`: HTTP server port (default: 3000)
- `server.logLevel`: Logging level (default: "info")

#### Scenario: Server configuration uses simplified structure
- **WHEN** reading server configuration
- **THEN** `server.port` MUST be used for the HTTP port
- **AND** `server.logLevel` MUST be used for logger configuration
- **AND** logging settings MUST NOT be in a separate `logging` object
- **AND** `nodeEnv` MUST NOT be used in configuration

#### Scenario: Configuration uses template preprocessing
- **WHEN** the application initializes configuration
- **THEN** the config file (`config.yaml`) MUST be read
- **AND** `{{VARIABLE}}` placeholders MUST be replaced with environment variable values
- **AND** the resulting YAML MUST be parsed into a configuration object
- **AND** the configuration object MUST be validated before use

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
3. **Defaults in Code**: Default values SHALL be defined in `app.config.ts` or via `{{default}}` template helper
4. **Single Source of Truth**: Each configuration value MUST have one canonical path (no multiple sources)
5. **Validation Mirrors Structure**: TypeScript validation classes MUST mirror the YAML structure exactly
6. **Environment-Specific Values**: Environment-specific configuration MUST use deployment tooling (Helm), not committed config files
7. **Credential Separation**: Sensitive values MUST use `{{VARIABLE}}` placeholders and be injected via environment variables

#### Scenario: Configuration is grouped by domain
- **WHEN** adding new configuration values
- **THEN** related settings MUST be grouped under a common domain key (e.g., `server.*`, `database.*`, `redis.*`)
- **AND** settings MUST NOT be separated by technical layer (e.g., `logging.levels` separate from `server.port`)

#### Scenario: Configuration uses flat structure
- **WHEN** designing configuration structure
- **THEN** flat structures SHOULD be preferred (e.g., `server.logLevel`)
- **AND** unnecessary nesting MUST be avoided (e.g., `server.logging.levels`)

#### Scenario: Defaults are defined in code or templates
- **WHEN** defining default configuration values
- **THEN** defaults MUST be in `app.config.ts` DEFAULT_CONFIG or via `{{default}}` template helper
- **AND** sensitive values MUST NOT have defaults (must be provided via environment)
- **AND** example config files SHOULD only contain commonly-overridden values
- **AND** default config serves as both documentation and fallback

#### Scenario: Single source of truth for config
- **WHEN** reading configuration values
- **THEN** each value MUST have exactly one canonical path
- **AND** fallback to multiple sources (e.g., `process.env`) MUST NOT be used
- **AND** runtime environment variable access MUST NOT occur after app initialization
- **AND** credential values MUST come from environment variables injected at startup

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
- **AND** credentials MUST be injected via Kubernetes Secrets or environment variables

#### Scenario: Credentials are separated from config
- **WHEN** defining sensitive configuration values (passwords, secrets, API keys)
- **THEN** these values MUST use `{{VARIABLE_NAME}}` placeholder syntax in the template
- **AND** the actual values MUST be provided via environment variables
- **AND** placeholder names MUST correspond to environment variable names
- **AND** required credentials MUST NOT have default values

### Requirement: Supported NestJS Major Version
The backend SHALL target NestJS major version 11 for runtime and tooling packages (all @nestjs/* dependencies).

#### Scenario: Adding or upgrading NestJS packages
- **WHEN** adding or updating a NestJS dependency
- **THEN** the package MUST be on major version 11
- **AND** the NestJS package set MUST NOT mix major versions

### Requirement: Credential Separation
The backend SHALL separate sensitive credentials from non-sensitive configuration using Handlebars template preprocessing.

Configuration templates SHALL use `{{VARIABLE_NAME}}` syntax for environment variable substitution.
Sensitive values MUST be injected via environment variables and MUST NOT be stored in committed configuration files.

Required environment variables for credentials:
- `DB_PASSWORD`: Database password
- `JWT_SECRET`: JWT signing secret

Optional environment variables (with defaults via `{{default}}`):
- `DB_HOST`: Database host (default: "localhost")
- `DB_PORT`: Database port (default: 5432)
- `SERVER_PORT`: HTTP server port (default: 3000)

#### Scenario: Template-based config loading
- **WHEN** the application starts
- **THEN** the configuration loader MUST read the config file specified by `CONFIG_PATH`
- **AND** the loader MUST substitute `{{VARIABLE}}` placeholders with environment variable values
- **AND** the loader MUST support `{{default VAR_NAME value}}` helper for optional values
- **AND** the loader MUST throw a clear error if a required variable is missing

#### Scenario: Missing credential causes startup failure
- **WHEN** a required environment variable (e.g., `DB_PASSWORD`, `JWT_SECRET`) is not set
- **THEN** the application MUST fail to start
- **AND** the error message MUST indicate which variable is missing
- **AND** the error message MUST suggest setting the environment variable

#### Scenario: Local development uses environment variables
- **WHEN** developing locally
- **THEN** developers MUST set credential environment variables via shell exports or PowerShell
- **AND** environment variables MUST NOT be committed to version control
- **AND** documentation MUST provide examples for bash/zsh and PowerShell

### Requirement: CORS Configuration
The backend SHALL configure CORS (Cross-Origin Resource Sharing) with an explicit origin whitelist via the configuration file.

CORS configuration MUST:
- Be read from `security.cors` section in config.yaml
- Support `enabled` flag to enable/disable CORS
- Support `allowedOrigins` array of origin URLs
- Allow credentials (cookies, authorization headers)
- Restrict methods to GET, POST, PUT, DELETE, PATCH
- Restrict headers to Content-Type and Authorization
- Support template variables for environment-specific origins
- Default to localhost:3001 for development when not specified

#### Scenario: CORS rejects unauthorized origins
- **WHEN** a request originates from a domain not in the `allowedOrigins` list
- **THEN** the backend MUST reject the request with CORS headers
- **AND** the browser MUST block the response

#### Scenario: CORS allows authorized origins
- **WHEN** a request originates from a domain in the `allowedOrigins` list
- **THEN** the backend MUST process the request normally
- **AND** the response MUST include appropriate CORS headers

#### Scenario: CORS can be disabled
- **WHEN** `security.cors.enabled` is false
- **THEN** CORS middleware MUST NOT be applied
- **AND** the application MUST handle requests without CORS headers

#### Scenario: Development CORS configuration
- **WHEN** running in development mode
- **THEN** localhost:3001 MUST be in the allowed origins (via default value)
- **AND** additional origins MAY be specified via config file or environment variables

#### Scenario: Production CORS configuration
- **WHEN** running in production mode
- **THEN** `allowedOrigins` MUST be explicitly configured
- **AND** wildcard origins MUST NOT be used
- **AND** only production frontend domains MUST be allowed

### Requirement: Security Headers
The backend SHALL set security HTTP headers using `@nestjs/helmet` middleware.

Required headers:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
- `Content-Security-Policy: default-src 'self'`

#### Scenario: Security headers are present
- **WHEN** any HTTP request is made to the backend
- **THEN** the response MUST include all required security headers
- **AND** headers MUST be set by Helmet middleware

#### Scenario: HSTS enforces HTTPS
- **WHEN** the backend is accessed over HTTPS
- **THEN** the Strict-Transport-Security header MUST be set
- **AND** max-age MUST be at least 31536000 (1 year)
- **AND** includeSubDomains MUST be enabled

### Requirement: Static File Authentication
The backend SHALL require authentication for accessing files in the `/api/uploads` directory (relative to the deployment base path).

File access control MUST:
- Validate JWT token for all `/api/uploads` requests
- Verify file ownership (user can only access files from their projects)
- Return 401 if authentication is missing
- Return 403 if user doesn't own the file
- Return 404 if file doesn't exist (don't leak existence)

#### Scenario: Unauthenticated file access is rejected
- **WHEN** a request is made to `/api/uploads/*` without a valid JWT token
- **THEN** the backend MUST return 401 Unauthorized
- **AND** the error message MUST indicate authentication is required

#### Scenario: Unauthorized file access is rejected
- **WHEN** a user requests a file belonging to another user's project
- **THEN** the backend MUST return 403 Forbidden
- **AND** the error message MUST indicate access is denied

#### Scenario: Authorized file access succeeds
- **WHEN** a user requests a file from their own project
- **THEN** the backend MUST serve the file
- **AND** the response MUST include appropriate content-type header

### Requirement: Request ID Tracking
The backend SHALL assign a unique request ID to each HTTP request.

Request ID handling MUST:
- Generate UUID if not provided in `X-Request-ID` header
- Include request ID in response headers
- Include request ID in all log messages
- Enable log correlation across services

#### Scenario: Request ID is generated
- **WHEN** a request arrives without an `X-Request-ID` header
- **THEN** the backend MUST generate a UUID
- **AND** the UUID MUST be used for logging and response headers

#### Scenario: Request ID is propagated
- **WHEN** a request arrives with an `X-Request-ID` header
- **THEN** the backend MUST use the provided value
- **AND** the value MUST be included in response headers

#### Scenario: Request ID appears in logs
- **WHEN** a request is processed
- **THEN** all log messages MUST include the request ID
- **AND** the format MUST be `[request-id] message`

### Requirement: Rate Limiting
The backend SHALL implement rate limiting using `@nestjs/throttler`.

Rate limiting MUST:
- Limit auth endpoints to 5 requests per minute per IP
- Limit registration to 3 requests per minute per IP
- Limit other endpoints to 10 requests per minute
- Use Redis for storage when available
- Fall back to in-memory storage if Redis is unavailable
- Return 429 Too Many Requests when limit exceeded

#### Scenario: Rate limit blocks excessive requests
- **WHEN** an IP exceeds the rate limit for an endpoint
- **THEN** the backend MUST return 429 Too Many Requests
- **AND** the response MUST include Retry-After header

#### Scenario: Rate limit allows normal usage
- **WHEN** an IP stays within the rate limit
- **THEN** requests MUST be processed normally
- **AND** rate limit counters MUST be tracked

### Requirement: Global Exception Filter
The backend SHALL use a global exception filter for consistent error responses.

Error response format MUST:
- Include error code
- Include user-friendly message
- Include request ID
- Include timestamp
- Include request path
- Exclude stack traces in production

#### Scenario: Errors have consistent format
- **WHEN** any exception occurs during request processing
- **THEN** the response MUST follow the standard error format
- **AND** all required fields MUST be present

#### Scenario: Production errors hide details
- **WHEN** an unexpected error occurs in production mode
- **THEN** the error message MUST be generic ("An unexpected error occurred")
- **AND** stack traces MUST NOT be included
- **AND** the error MUST still be logged with full details

#### Scenario: Development errors include details
- **WHEN** an error occurs in development mode
- **THEN** the error message MAY include stack traces
- **AND** additional debugging information MAY be included

### Requirement: Stable Application Error Codes
The backend SHALL emit stable, machine-readable application error codes for client handling and localization.

#### Scenario: Domain error returns stable code
- **WHEN** a request fails due to a known domain condition (e.g. missing project, invalid credentials)
- **THEN** the backend MUST return a stable `error.code` that is not derived from raw English text
- **AND** the backend MAY include `error.params` to support client-side message formatting

#### Scenario: Unknown error returns safe fallback
- **WHEN** an unexpected error occurs
- **THEN** the backend MUST return `error.code` as `INTERNAL_SERVER_ERROR`
- **AND** the backend MUST NOT leak sensitive details in the response message in production

### Requirement: Structured Validation Error Details
Validation failures SHALL include structured validation error details suitable for client-side localization.

#### Scenario: Validation failure includes details
- **WHEN** request validation fails
- **THEN** the backend MUST return an error envelope containing `error.details`
- **AND** each detail item MUST include a field path and a machine-readable rule identifier

### Requirement: Domain Rules Live in Project Configuration
The backend SHALL NOT hardcode document-type-specific business rules in production runtime defaults (e.g., invoice-only field names, required fields, or value formats).
Domain constraints MUST be expressed via project configuration (JSON Schema + supported `x-*` extensions, schema rules, validation scripts, and schema-scoped prompt templates).

#### Scenario: New document type is configuration-first
- **GIVEN** a new project needs extraction for a new document type
- **WHEN** an admin defines a JSON Schema (and optional rules/scripts/templates) for that project
- **THEN** the system SHALL be able to extract and audit that document type without introducing new domain-specific code paths
