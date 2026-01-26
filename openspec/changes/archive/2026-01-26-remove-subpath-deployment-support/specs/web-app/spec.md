## REMOVED Requirements
### Requirement: Base Path Hosting
Base path hosting (example: `/pytoya`) is no longer supported.

#### Scenario: App does not require base path configuration
- **WHEN** the web app is built and deployed
- **THEN** the app SHALL NOT require `VITE_BASE_PATH` to produce correct navigation and asset URLs

## ADDED Requirements
### Requirement: Root Path Hosting
The web application SHALL support being hosted at the root path `/` of its hostname without broken routing, redirects, or static asset URLs.

#### Scenario: Deep link refresh works at root
- **GIVEN** the web application is deployed at the root path `/`
- **WHEN** a user loads a deep link (example: `/projects`) and refreshes the page
- **THEN** the application SHALL load successfully
- **AND** the router SHALL keep the user on the same logical page (`/projects`)

#### Scenario: Auth redirect stays on-host
- **GIVEN** the web application is deployed at the root path `/`
- **AND** the user is unauthenticated
- **WHEN** the user navigates to a protected route (example: `/projects`)
- **THEN** the application SHALL redirect to `/login?next_url=...`
- **AND** `next_url` SHALL preserve the intended destination on the same host

