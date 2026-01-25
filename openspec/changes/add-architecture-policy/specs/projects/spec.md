## ADDED Requirements

### Requirement: Single Schema Contract Per Project
Each project SHALL have exactly one active schema contract for extraction and audit.
The schema contract MAY be versioned internally over time, but the project has only one active version at a time.

#### Scenario: Project has one active schema contract
- **GIVEN** a project exists
- **WHEN** the project is viewed in the UI or retrieved via API
- **THEN** the project SHALL reference a single active schema (or schema version) used for extraction and audit

