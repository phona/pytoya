## MODIFIED Requirements

### Requirement: Job Queue Processing
The system SHALL support canceling extraction jobs and SHALL distinguish user-initiated cancellation from system failures.

#### Scenario: Cancel active job
- **GIVEN** an extraction job is active
- **WHEN** user requests cancellation
- **THEN** the job SHALL stop as soon as practical
- **AND** the job SHALL be persisted with a canceled outcome (not indistinguishable from failed)
- **AND** the system SHALL not retry a canceled job

