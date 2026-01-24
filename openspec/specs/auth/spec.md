# auth Specification

## Purpose
TBD - created by archiving change setup-auth. Update Purpose after archive.
## Requirements
### Requirement: User Authentication
The system SHALL authenticate users via username and password, returning JWT tokens, and enforce account lockout and login attempt tracking for security.

The login process MUST:
- Validate username and password format
- Check whether the account is locked
- Verify password hash
- Track failed attempts
- Reset failed attempts on success
- Return JWT token on success

#### Scenario: Successful login
- **WHEN** a user provides valid username and password
- **THEN** a JWT token MUST be returned
- **AND** `lastLoginAt` MUST be updated
- **AND** `failedLoginAttempts` MUST be reset to 0
- **AND** `lockedUntil` MUST be cleared

#### Scenario: Failed login
- **WHEN** a user provides invalid credentials
- **THEN** the login MUST fail with 401 Unauthorized
- **AND** `failedLoginAttempts` MUST be incremented
- **AND** `lastFailedLoginAt` MUST be updated
- **AND** account lockout MUST be applied if threshold reached

#### Scenario: Login to locked account fails
- **WHEN** a user attempts to login to a locked account
- **THEN** the login MUST fail with 401 Unauthorized
- **AND** the error message MUST indicate the account is locked
- **AND** the error message MUST include lockout expiration time (if temporary)
- **AND** no failed attempt counter increment MUST occur

#### Scenario: Login with invalid format fails
- **WHEN** a user logs in with username or password that doesn't meet format requirements
- **THEN** the login MUST fail with 400 Bad Request
- **AND** the error message MUST indicate validation failure
- **AND** no failed attempt counter increment MUST occur

#### Scenario: Token usage
- **WHEN** authenticated user makes API request with valid token
- **THEN** request is permitted
- **WHEN** token is expired or invalid
- **THEN** 401 unauthorized response is returned

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

### Requirement: Account Lockout Policy
The backend SHALL implement progressive account lockout after failed login attempts.

Lockout policy MUST:
- Track failed login attempts per user
- Lock account for 15 minutes after 5 failed attempts
- Lock account for 1 hour after 10 failed attempts
- Permanently lock account after 15 failed attempts (admin unlock required)
- Reset failed attempt counter on successful login
- Reset failed attempt counter after 24 hours of inactivity
- Store lockout state in database

#### Scenario: Progressive lockout after failed attempts
- **WHEN** a user has 5 failed login attempts
- **THEN** the account MUST be locked for 15 minutes
- **AND** subsequent login attempts MUST fail with lockout message

#### Scenario: Extended lockout after more failures
- **WHEN** a user has 10 failed login attempts
- **THEN** the account MUST be locked for 1 hour
- **AND** the error message MUST indicate lockout expiration time

#### Scenario: Permanent lockout after persistent attacks
- **WHEN** a user has 15 failed login attempts
- **THEN** the account MUST be permanently locked
- **AND** only an admin MUST be able to unlock the account
- **AND** the error message MUST contact admin for assistance

#### Scenario: Successful login resets counter
- **WHEN** a user successfully logs in
- **THEN** the failed login attempt counter MUST be reset to 0
- **AND** the lockout timestamp MUST be cleared
- **AND** the last login timestamp MUST be updated

#### Scenario: Admin can unlock accounts
- **WHEN** an admin unlocks a user account
- **THEN** the failed attempt counter MUST be reset to 0
- **AND** the lockout MUST be cleared
- **AND** the user MUST be able to login again

#### Scenario: Inactivity resets counter
- **WHEN** 24 hours pass since the last failed login attempt
- **THEN** the failed attempt counter MAY be reset to 0
- **AND** any existing lockout MUST be cleared

### Requirement: Login Attempt Tracking
The backend SHALL track login attempt timestamps for security auditing.

The User entity SHALL include:
- `failedLoginAttempts`: number of consecutive failed attempts
- `lockedUntil`: timestamp when lockout expires (null if not locked)
- `lastLoginAt`: timestamp of last successful login
- `lastFailedLoginAt`: timestamp of most recent failed attempt

#### Scenario: Failed login is tracked
- **WHEN** a login attempt fails due to invalid credentials
- **THEN** `failedLoginAttempts` MUST be incremented
- **AND** `lastFailedLoginAt` MUST be updated
- **AND** lockout timestamp MUST be set if threshold reached

#### Scenario: Successful login is tracked
- **WHEN** a login attempt succeeds
- **THEN** `lastLoginAt` MUST be updated
- **AND** `failedLoginAttempts` MUST be reset to 0
- **AND** `lockedUntil` MUST be set to null

### Requirement: Password Change
The backend SHALL allow an authenticated user to change their own password by providing their current password and a new password that meets the password policy.

#### Scenario: Change password succeeds
- **GIVEN** an authenticated user
- **WHEN** the user provides the correct current password and a valid new password
- **THEN** the system MUST update the stored password hash for that user
- **AND** the endpoint MUST return success

#### Scenario: Change password fails with wrong current password
- **GIVEN** an authenticated user
- **WHEN** the user provides an incorrect current password
- **THEN** the request MUST fail with 401 Unauthorized

#### Scenario: Change password fails with weak new password
- **GIVEN** an authenticated user
- **WHEN** the user provides a new password that does not meet the password policy
- **THEN** the request MUST fail with 400 Bad Request

