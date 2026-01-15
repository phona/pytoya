## MODIFIED Requirements
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
