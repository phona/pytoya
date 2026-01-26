## ADDED Requirements

### Requirement: BasePath-Safe Navigation
When deployed under a configured `VITE_BASE_PATH` (e.g. `/pytoya`), the web application SHALL avoid duplicating the base path during redirects and hard navigations.

#### Scenario: Auth redirect preserves next_url without duplicating base path
- **GIVEN** the app is served under `/pytoya`
- **WHEN** an unauthenticated user is redirected to login
- **THEN** the login URL SHALL be `/pytoya/login?next_url=...`
- **AND** the `next_url` value SHALL be router-relative (e.g. `/projects/1`, not `/pytoya/projects/1`)

#### Scenario: Error boundary home link respects base path
- **GIVEN** the app is served under `/pytoya`
- **WHEN** the user clicks “Go to home” on an error boundary
- **THEN** the browser navigates to `/pytoya/` (not `/`)

### Requirement: Streaming Requests Use Configured API Base
The web application SHALL use `VITE_API_URL` (or the configured API base) for non-Axios fetch flows, to remain compatible with cross-origin API deployments.

#### Scenario: Stream prompt rules uses API base URL
- **WHEN** the user triggers prompt-rules generation streaming
- **THEN** the request SHALL be sent to `<VITE_API_URL>/api/schemas/:id/generate-prompt-rules/stream`

