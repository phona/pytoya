# auth Spec Delta (add-casl-access-control)

## MODIFIED Requirements

### Requirement: Role-Based Access
The system SHALL enforce role-based access control (admin/user) **and** SHALL enforce resource-level authorization for project-scoped data (ownership).

#### Scenario: Admin-only endpoints
- **WHEN** a user role attempts to access an admin-only endpoint (e.g., queue pause/resume, extractor management, schema management)
- **THEN** a 403 forbidden response is returned

#### Scenario: Ownership enforcement
- **WHEN** a non-admin user accesses a project-scoped resource they do not own
- **THEN** a 403 forbidden response is returned

## ADDED Requirements

### Requirement: Centralized Policy Authorization
The backend SHALL evaluate authorization using a centralized policy engine (CASL abilities) rather than ad-hoc scattered checks.

#### Scenario: Policy guard denies unauthorized requests
- **GIVEN** an authenticated user
- **WHEN** a request is evaluated by policy and the user is not allowed
- **THEN** the request MUST be rejected with 403 Forbidden

