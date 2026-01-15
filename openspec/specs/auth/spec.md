# auth Specification

## Purpose
TBD - created by archiving change setup-auth. Update Purpose after archive.
## Requirements
### Requirement: User Authentication
The system SHALL authenticate users via username and password, returning JWT tokens.

#### Scenario: Successful login
- **WHEN** user provides valid username and password
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

### Requirement: User Registration
The system SHALL allow new user registration with username and password.

#### Scenario: Successful registration
- **WHEN** user provides valid username and password
- **THEN** user account is created
- **AND** password is hashed before storage

### Requirement: Role-Based Access
The system SHALL enforce role-based access control (admin/user).

#### Scenario: Admin access
- **WHEN** user with admin role accesses protected endpoint
- **THEN** request is permitted

#### Scenario: User access restricted endpoint
- **WHEN** user role attempts to access admin-only endpoint
- **THEN** 403 forbidden response is returned

### Requirement: Default Admin Bootstrap
The system SHALL create a default admin user on startup when no admin user exists, using ADMIN_USERNAME and ADMIN_PASSWORD from configuration.

#### Scenario: Admin bootstrap on first startup
- **WHEN** no admin user exists and ADMIN_USERNAME and ADMIN_PASSWORD are configured
- **THEN** a new admin user is created with the configured username
- **AND** the password is stored as a hash

#### Scenario: Admin bootstrap skipped
- **WHEN** an admin user already exists
- **THEN** no default admin user is created

#### Scenario: Missing admin configuration
- **WHEN** no admin user exists and admin credentials are missing
- **THEN** the system logs a configuration error and does not create a default admin user

