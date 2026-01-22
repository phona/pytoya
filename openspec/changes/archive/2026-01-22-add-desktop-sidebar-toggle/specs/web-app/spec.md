## MODIFIED Requirements

### Requirement: Dashboard Navigation
The web application SHALL provide a simplified sidebar navigation in the dashboard for accessing main application sections, and SHALL allow users to collapse/expand the sidebar on desktop to improve focus and maximize workspace.

#### Scenario: Desktop collapse/expand
- **GIVEN** a user is on a dashboard page on a desktop viewport
- **WHEN** the user collapses the sidebar
- **THEN** the system SHALL hide the sidebar navigation
- **AND** the system SHALL provide a control to re-open the sidebar
- **AND** the main content area SHALL use the available width

#### Scenario: Desktop collapse state persistence
- **GIVEN** a user collapses the sidebar on desktop
- **WHEN** the user reloads the page
- **THEN** the system SHALL restore the sidebar collapsed state

