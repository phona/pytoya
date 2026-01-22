## ADDED Requirements

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

