## MODIFIED Requirements

### Requirement: Job Queue Processing
The system SHALL emit job and manifest progress updates with consistent semantics and a single source of truth.

#### Scenario: Single progress publisher
- **GIVEN** an extraction job is queued in BullMQ
- **WHEN** the job transitions states (waiting/active/completed/failed) and reports progress
- **THEN** the system SHALL publish progress updates from a single subsystem (not multiple competing emitters)
- **AND** the published progress SHALL be monotonic (never decreases for a given job)
- **AND** duplicate or out-of-order updates SHALL be safe for clients to apply

## ADDED Requirements

### Requirement: Extraction Stage Pipeline
The extraction runtime SHALL model extraction as a sequence of named stages with a shared workflow state object to improve maintainability and testability without changing external behavior.

#### Scenario: Stage boundary logging
- **WHEN** an extraction job runs
- **THEN** the system SHALL log stage boundaries (start/end/fail) with:
  - stage name
  - manifestId and jobId (when available)
  - durationMs
- **AND** failures SHALL include a stage identifier to simplify diagnosis

### Requirement: Worker Topology Flexibility
The system SHALL support running extraction processing in a dedicated worker process/deployment while preserving the job contract.

#### Scenario: Separate worker processes jobs
- **GIVEN** the system is configured to run a separate worker
- **WHEN** the API enqueues an extraction job
- **THEN** the worker SHALL process the job and persist results identically to the in-process worker mode
- **AND** job progress updates SHALL continue to be published to clients
