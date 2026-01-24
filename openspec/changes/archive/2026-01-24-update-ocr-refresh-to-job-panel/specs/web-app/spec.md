## MODIFIED Requirements

### Requirement: Global Jobs Panel
The web application SHALL provide a global Jobs panel to monitor queued and running background jobs, including OCR refresh jobs started from the Audit page.

#### Scenario: OCR refresh runs as a job
- **GIVEN** a user is auditing a manifest
- **WHEN** the user triggers “Refresh OCR cache”
- **THEN** the system SHALL enqueue a background job and return immediately
- **AND** the job SHALL be visible in the global Jobs panel with progress/status
- **AND** the system SHALL refresh the manifest OCR view when the job completes
