## ADDED Requirements

### Requirement: CORS Configuration
The backend SHALL configure CORS (Cross-Origin Resource Sharing) with an explicit origin whitelist via the configuration file.

CORS configuration MUST:
- Be read from `security.cors` section in config.yaml
- Support `enabled` flag to enable/disable CORS
- Support `allowedOrigins` array of origin URLs
- Allow credentials (cookies, authorization headers)
- Restrict methods to GET, POST, PUT, DELETE, PATCH
- Restrict headers to Content-Type and Authorization
- Support template variables for environment-specific origins
- Default to localhost:3001 for development when not specified

#### Scenario: CORS rejects unauthorized origins
- **WHEN** a request originates from a domain not in the `allowedOrigins` list
- **THEN** the backend MUST reject the request with CORS headers
- **AND** the browser MUST block the response

#### Scenario: CORS allows authorized origins
- **WHEN** a request originates from a domain in the `allowedOrigins` list
- **THEN** the backend MUST process the request normally
- **AND** the response MUST include appropriate CORS headers

#### Scenario: CORS can be disabled
- **WHEN** `security.cors.enabled` is false
- **THEN** CORS middleware MUST NOT be applied
- **AND** the application MUST handle requests without CORS headers

#### Scenario: Development CORS configuration
- **WHEN** running in development mode
- **THEN** localhost:3001 MUST be in the allowed origins (via default value)
- **AND** additional origins MAY be specified via config file or environment variables

#### Scenario: Production CORS configuration
- **WHEN** running in production mode
- **THEN** `allowedOrigins` MUST be explicitly configured
- **AND** wildcard origins MUST NOT be used
- **AND** only production frontend domains MUST be allowed

### Requirement: Security Headers
The backend SHALL set security HTTP headers using `@nestjs/helmet` middleware.

Required headers:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
- `Content-Security-Policy: default-src 'self'`

#### Scenario: Security headers are present
- **WHEN** any HTTP request is made to the backend
- **THEN** the response MUST include all required security headers
- **AND** headers MUST be set by Helmet middleware

#### Scenario: HSTS enforces HTTPS
- **WHEN** the backend is accessed over HTTPS
- **THEN** the Strict-Transport-Security header MUST be set
- **AND** max-age MUST be at least 31536000 (1 year)
- **AND** includeSubDomains MUST be enabled

### Requirement: Static File Authentication
The backend SHALL require authentication for accessing files in the `/uploads` directory.

File access control MUST:
- Validate JWT token for all `/uploads` requests
- Verify file ownership (user can only access files from their projects)
- Return 401 if authentication is missing
- Return 403 if user doesn't own the file
- Return 404 if file doesn't exist (don't leak existence)

#### Scenario: Unauthenticated file access is rejected
- **WHEN** a request is made to `/uploads/*` without a valid JWT token
- **THEN** the backend MUST return 401 Unauthorized
- **AND** the error message MUST indicate authentication is required

#### Scenario: Unauthorized file access is rejected
- **WHEN** a user requests a file belonging to another user's project
- **THEN** the backend MUST return 403 Forbidden
- **AND** the error message MUST indicate access is denied

#### Scenario: Authorized file access succeeds
- **WHEN** a user requests a file from their own project
- **THEN** the backend MUST serve the file
- **AND** the response MUST include appropriate content-type header

### Requirement: Request ID Tracking
The backend SHALL assign a unique request ID to each HTTP request.

Request ID handling MUST:
- Generate UUID if not provided in `X-Request-ID` header
- Include request ID in response headers
- Include request ID in all log messages
- Enable log correlation across services

#### Scenario: Request ID is generated
- **WHEN** a request arrives without an `X-Request-ID` header
- **THEN** the backend MUST generate a UUID
- **AND** the UUID MUST be used for logging and response headers

#### Scenario: Request ID is propagated
- **WHEN** a request arrives with an `X-Request-ID` header
- **THEN** the backend MUST use the provided value
- **AND** the value MUST be included in response headers

#### Scenario: Request ID appears in logs
- **WHEN** a request is processed
- **THEN** all log messages MUST include the request ID
- **AND** the format MUST be `[request-id] message`

### Requirement: Rate Limiting
The backend SHALL implement rate limiting using `@nestjs/throttler`.

Rate limiting MUST:
- Limit auth endpoints to 5 requests per minute per IP
- Limit registration to 3 requests per minute per IP
- Limit other endpoints to 10 requests per minute
- Use Redis for storage when available
- Fall back to in-memory storage if Redis is unavailable
- Return 429 Too Many Requests when limit exceeded

#### Scenario: Rate limit blocks excessive requests
- **WHEN** an IP exceeds the rate limit for an endpoint
- **THEN** the backend MUST return 429 Too Many Requests
- **AND** the response MUST include Retry-After header

#### Scenario: Rate limit allows normal usage
- **WHEN** an IP stays within the rate limit
- **THEN** requests MUST be processed normally
- **AND** rate limit counters MUST be tracked

### Requirement: Global Exception Filter
The backend SHALL use a global exception filter for consistent error responses.

Error response format MUST:
- Include error code
- Include user-friendly message
- Include request ID
- Include timestamp
- Include request path
- Exclude stack traces in production

#### Scenario: Errors have consistent format
- **WHEN** any exception occurs during request processing
- **THEN** the response MUST follow the standard error format
- **AND** all required fields MUST be present

#### Scenario: Production errors hide details
- **WHEN** an unexpected error occurs in production mode
- **THEN** the error message MUST be generic ("An unexpected error occurred")
- **AND** stack traces MUST NOT be included
- **AND** the error MUST still be logged with full details

#### Scenario: Development errors include details
- **WHEN** an error occurs in development mode
- **THEN** the error message MAY include stack traces
- **AND** additional debugging information MAY be included

## MODIFIED Requirements

### Requirement: Strict Global Request Validation
The backend SHALL enable strict global request validation:
- `transform: true`
- `whitelist: true`
- `forbidNonWhitelisted: true`

All DTOs SHALL enforce validation rules appropriate to their domain.

#### Scenario: Unknown fields are rejected
- **WHEN** a client sends JSON with unknown properties to an endpoint that uses a DTO
- **THEN** the request MUST be rejected with a 400 response

#### Scenario: Password validation enforces complexity
- **WHEN** a user registers or changes password
- **THEN** the password MUST meet complexity requirements:
  - Minimum 8 characters
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number
  - At least one special character (@$!%*?&)
  - Maximum 128 characters
- **AND** validation failure MUST return clear error message

#### Scenario: Username validation enforces format
- **WHEN** a user registers or logs in
- **THEN** the username MUST meet format requirements:
  - 3-50 characters
  - Alphanumeric, underscore, hyphen only
  - Must start with a letter
- **AND** validation failure MUST return clear error message
