## MODIFIED Requirements

### Requirement: Global Jobs Panel
The web application SHALL provide a global Jobs panel to monitor queued and running background jobs, including OCR refresh jobs started from the Audit page.

#### Scenario: Jobs panel loads details on demand
- **GIVEN** a user is using the web app and the Jobs panel is closed
- **WHEN** the app renders the global Jobs badge/button
- **THEN** the app SHOULD avoid fetching full job history solely to render the badge

#### Scenario: Jobs list renders without per-job manifest fetches
- **GIVEN** the Jobs panel is open and displays a list of jobs
- **WHEN** the UI renders job rows that include manifest filename/title
- **THEN** the UI SHOULD avoid issuing per-job manifest detail requests

