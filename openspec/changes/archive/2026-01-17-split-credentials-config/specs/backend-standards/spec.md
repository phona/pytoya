## ADDED Requirements

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

## MODIFIED Requirements

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
