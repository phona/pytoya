# Spec Change: backend-standards

## Purpose
Update configuration structure requirements to reflect simplified server config and establish design principles for configuration files.

## MODIFIED Requirements

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
