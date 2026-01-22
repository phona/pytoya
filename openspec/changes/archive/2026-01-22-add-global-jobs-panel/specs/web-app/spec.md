## ADDED Requirements

### Requirement: Global Jobs Panel
The web application SHALL provide a global Jobs panel to monitor queued and running background jobs.

#### Scenario: Jobs are visible across navigation
- **GIVEN** a user starts an extraction job
- **WHEN** the user navigates to other dashboard pages
- **THEN** the Jobs panel SHALL continue to show the job and its progress

#### Scenario: Jobs survive page refresh
- **GIVEN** a user has one or more recent jobs
- **WHEN** the user refreshes the page
- **THEN** the Jobs panel SHALL restore recent jobs from persisted state
- **AND** the system SHOULD seed/update job entries from backend job history

#### Scenario: Jobs update in real time
- **GIVEN** an in-progress job is running on the backend
- **WHEN** the backend emits a `job-update` event
- **THEN** the Jobs panel SHALL update the job status/progress without requiring page refresh

#### Scenario: Cancel a queued or running job
- **GIVEN** a job is cancellable
- **WHEN** the user clicks “Cancel” in the Jobs panel
- **THEN** the system SHALL call the backend cancel endpoint
- **AND** the Jobs panel SHALL reflect the cancellation request and final status

