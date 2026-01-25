## MODIFIED Requirements

### Requirement: Static File Authentication
The backend SHALL require authentication for accessing files in the `/api/uploads` directory (relative to the deployment base path).

File access control MUST:
- Validate JWT token for all `/api/uploads` requests
- Verify file ownership (user can only access files from their projects)
- Return 401 if authentication is missing
- Return 403 if user doesn't own the file
- Return 404 if file doesn't exist (don't leak existence)

#### Scenario: Unauthenticated file access is rejected
- **WHEN** a request is made to `/api/uploads/*` without a valid JWT token
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

