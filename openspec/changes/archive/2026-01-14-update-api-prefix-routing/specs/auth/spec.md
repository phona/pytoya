## MODIFIED Requirements
### Requirement: User Authentication
The system SHALL authenticate users via email and password, returning JWT tokens.

#### Scenario: Successful login
- **WHEN** user provides valid email and password
- **THEN** JWT token is returned
- **AND** token is stored in localStorage via a single source of truth used by both HTTP and WebSocket clients

#### Scenario: Failed login
- **WHEN** user provides invalid credentials
- **THEN** error message is displayed
- **AND** no token is stored

#### Scenario: Token usage
- **WHEN** authenticated user makes API request with valid token
- **THEN** request is permitted
- **WHEN** token is expired or invalid
- **THEN** 401 unauthorized response is returned

