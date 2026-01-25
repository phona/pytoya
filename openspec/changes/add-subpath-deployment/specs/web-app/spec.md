## ADDED Requirements

### Requirement: Base Path Hosting
The web application SHALL support being hosted under a configurable base path (example: `/pytoya`) without broken routing, redirects, or static asset URLs.

#### Scenario: Deep link refresh works under base path
- **GIVEN** the web application is deployed under base path `/pytoya`
- **WHEN** a user loads a deep link (example: `/pytoya/projects`) and refreshes the page
- **THEN** the application SHALL load successfully
- **AND** the router SHALL keep the user on the same logical page (`/projects`)

#### Scenario: Auth redirect keeps base path
- **GIVEN** the web application is deployed under base path `/pytoya`
- **AND** the user is unauthenticated
- **WHEN** the user navigates to a protected route (example: `/pytoya/projects`)
- **THEN** the application SHALL redirect to `/pytoya/login?next_url=...`
- **AND** `next_url` SHALL preserve the intended destination under the same base path

