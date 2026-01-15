# auth Spec Delta

## MODIFIED Requirements
### Requirement: User Authentication
The system SHALL provide explicit CLI commands for service start and seeding the default admin account.

#### Scenario: Admin seed via CLI
- **WHEN** an operator runs `newadmin` with `ADMIN_USERNAME` and `ADMIN_PASSWORD` configured
- **AND** no admin user exists
- **THEN** the system creates a new admin user with a hashed password
- **AND** the command exits successfully

#### Scenario: Admin already exists
- **WHEN** an operator runs `newadmin`
- **AND** an admin user already exists
- **THEN** no changes are made
- **AND** the command exits successfully

#### Scenario: Missing admin env values
- **WHEN** an operator runs `newadmin`
- **AND** `ADMIN_USERNAME` or `ADMIN_PASSWORD` is missing
- **THEN** the command logs an error and exits without creating a user
