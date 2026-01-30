## MODIFIED Requirements

### Requirement: Secret Parameter Handling
The system SHALL handle secret parameters (API keys) securely.

#### Scenario: Secret parameters are masked in all read responses
- **GIVEN** a model contains secret parameters
- **WHEN** the client retrieves model data (list or detail)
- **THEN** secret parameter values SHALL be masked (e.g., `********`)
- **AND** the API SHALL NOT return the plaintext secret value

#### Scenario: Users recheck configuration via test connection
- **GIVEN** a model exists with a stored secret parameter
- **WHEN** a client calls `POST /api/models/:id/test`
- **THEN** the system SHALL attempt a minimal connection using stored credentials
- **AND** the response SHALL indicate success/failure without revealing the secret

