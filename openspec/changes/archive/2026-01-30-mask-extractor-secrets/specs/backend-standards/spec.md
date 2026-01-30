## MODIFIED Requirements

### Requirement: Error Handling
The backend SHALL return safe error responses and MUST NOT leak sensitive values.

#### Scenario: Secret config values are not leaked in API responses
- **GIVEN** the system stores configuration objects that include secrets (API keys, passwords)
- **WHEN** an authenticated client requests configuration resources via the API
- **THEN** secret values SHALL be masked or omitted
- **AND** plaintext secrets SHALL NOT be returned in JSON responses

