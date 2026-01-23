## ADDED Requirements

### Requirement: Remove Prompts Management Page

The web application SHALL NOT provide a dedicated prompt template management page at the `/prompts` route.

#### Scenario: Navigating to /prompts
- **GIVEN** the user is authenticated
- **WHEN** the user navigates to `/prompts`
- **THEN** the system SHALL NOT render a prompt-template CRUD page

#### Scenario: Sidebar does not include a Prompts link
- **WHEN** the dashboard sidebar navigation is rendered
- **THEN** the system SHALL NOT show a “Prompts” navigation link

