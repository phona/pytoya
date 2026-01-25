## MODIFIED Requirements

### Requirement: Database Schema
The system SHALL persist job lifecycle outcomes and manifest index fields in a way that supports reliable querying and user-facing history.

#### Scenario: Job cancellation persisted
- **WHEN** a user cancels a job
- **THEN** the job record SHALL store cancellation metadata (requestedAt, canceledAt, reason)
- **AND** the job outcome SHALL be queryable as “canceled”

