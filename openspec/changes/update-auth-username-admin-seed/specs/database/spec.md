## MODIFIED Requirements
### Requirement: User entity persistence
The system SHALL store user accounts with a unique username and hashed password.

#### Scenario: User account stored with username
- **WHEN** user registers with username and password
- **THEN** the username is stored as the unique identifier
- **AND** the password hash is stored
