## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: User Registration
Users MUST be able to register with a username and password that meet security requirements.

Username requirements:
- 3-50 characters
- Alphanumeric, underscore, hyphen only
- Must start with a letter
- Case-insensitive unique

Password requirements:
- Minimum 8 characters (increased from 6)
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character (@$!%*?&)
- Maximum 128 characters

#### Scenario: Registration with valid credentials succeeds
- **WHEN** a user registers with valid username and password
- **THEN** a new user account MUST be created
- **AND** the password MUST be hashed using bcrypt
- **AND** a JWT token MUST be returned
- **AND** failed login counters MUST be initialized to 0

#### Scenario: Registration with weak password fails
- **WHEN** a user registers with a password that doesn't meet complexity requirements
- **THEN** the registration MUST fail with 400 Bad Request
- **AND** the error message MUST list all password requirements

#### Scenario: Registration with invalid username fails
- **WHEN** a user registers with a username that doesn't meet format requirements
- **THEN** the registration MUST fail with 400 Bad Request
- **AND** the error message MUST explain username requirements

### Requirement: User Login
Users MUST be able to login with username and password.

The login process MUST:
- Validate username and password format
- Check if account is locked
- Verify password hash
- Track failed attempts
- Reset failed attempts on success
- Return JWT token on success

#### Scenario: Login with valid credentials succeeds
- **WHEN** a user logs in with valid username and password
- **THEN** a JWT token MUST be returned
- **AND** `lastLoginAt` MUST be updated
- **AND** failed attempt counter MUST be reset

#### Scenario: Login with invalid credentials fails
- **WHEN** a user logs in with invalid username or password
- **THEN** the login MUST fail with 401 Unauthorized
- **AND** failed attempt counter MUST be incremented
- **AND** `lastFailedLoginAt` MUST be updated
- **AND** account lockout MUST be applied if threshold reached

#### Scenario: Login to locked account fails
- **WHEN** a user attempts to login to a locked account
- **THEN** the login MUST fail with 401 Unauthorized
- **AND** the error message MUST indicate account is locked
- **AND** the error message MUST include lockout expiration time (if temporary)
- **AND** no failed attempt counter increment MUST occur

#### Scenario: Login with invalid format fails
- **WHEN** a user logs in with username or password that doesn't meet format requirements
- **THEN** the login MUST fail with 400 Bad Request
- **AND** the error message MUST indicate validation failure
- **AND** no failed attempt counter increment MUST occur
