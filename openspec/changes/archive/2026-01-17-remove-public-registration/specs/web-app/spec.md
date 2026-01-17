## MODIFIED Requirements
### Requirement: Homepage Routing
The web application SHALL route users based on authentication status when accessing the root path `/`.

#### Scenario: Authenticated user visits root
- **WHEN** an authenticated user navigates to `/`
- **THEN** the system SHALL redirect the user to `/projects`
- **AND** the system SHALL preserve the user's session

#### Scenario: Non-authenticated user visits root
- **WHEN** a non-authenticated user navigates to `/`
- **THEN** the system SHALL redirect the user to `/login`
