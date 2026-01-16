## ADDED Requirements

### Requirement: Homepage Routing
The web application SHALL route users based on authentication status when accessing the root path `/`.

#### Scenario: Authenticated user visits root
- **WHEN** an authenticated user navigates to `/`
- **THEN** the system SHALL redirect the user to `/projects`
- **AND** the system SHALL preserve the user's session

#### Scenario: Non-authenticated user visits root
- **WHEN** a non-authenticated user navigates to `/`
- **THEN** the system SHALL display a landing page
- **AND** the landing page SHALL include app description
- **AND** the landing page SHALL include login and register buttons

#### Scenario: Landing page content
- **WHEN** the landing page is displayed
- **THEN** it SHALL describe PyToYa as an invoice processing system
- **AND** it SHALL highlight key features (OCR + LLM extraction)
- **AND** it SHALL provide call-to-action buttons for login and registration

### Requirement: Dashboard Navigation
The web application SHALL provide a sidebar navigation in the dashboard for accessing main application sections.

#### Scenario: Display navigation menu
- **WHEN** a user is on any dashboard page
- **THEN** the system SHALL display a sidebar navigation menu
- **AND** the menu SHALL include links to Projects, Models, Schemas, Prompts, and Validation Scripts
- **AND** the menu SHALL highlight the currently active route

#### Scenario: Navigation links
- **WHEN** a user clicks a navigation link
- **THEN** the system SHALL navigate to the corresponding page
- **AND** the system SHALL update the active route highlight

#### Scenario: Logout functionality
- **WHEN** a user clicks the logout button
- **THEN** the system SHALL clear the authentication session
- **AND** the system SHALL redirect to the login page

#### Scenario: Mobile responsive navigation
- **WHEN** the viewport width is below a breakpoint (e.g., 768px)
- **THEN** the system SHALL collapse the sidebar navigation
- **AND** the system SHALL provide a toggle button to show/hide the navigation
