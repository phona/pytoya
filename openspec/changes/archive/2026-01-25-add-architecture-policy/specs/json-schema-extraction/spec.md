## MODIFIED Requirements

### Requirement: Project Schema Association
The system SHALL associate each project with a single active JSON Schema contract used for extraction and audit.

#### Scenario: Project uses its active schema for extraction
- **GIVEN** a project has an active JSON Schema
- **WHEN** extraction is triggered for a manifest in that project
- **THEN** the system SHALL use the project’s active JSON Schema for extraction and validation

### Requirement: JSON Extraction
The system SHALL extract structured data using JSON Schema validation.

#### Scenario: Schema-based validation with required fields
- **GIVEN** the project JSON Schema defines one or more required field paths (via JSON Schema `required`)
- **WHEN** LLM returns extracted data
- **THEN** ajv validates JSON against the project's JSON Schema
- **AND** field types are validated
- **AND** required fields are checked for missing/empty values
- **AND** validation failures return specific field paths

#### Scenario: Schema-based validation without required fields
- **GIVEN** the project JSON Schema defines no required field paths
- **WHEN** LLM returns extracted data
- **THEN** ajv validates JSON against the project's JSON Schema
- **AND** field types are validated
- **AND** the system SHALL NOT fail validation due to missing-field checks

## ADDED Requirements

### Requirement: Schema Version Provenance in Audit History
The system SHALL record the effective schema version used for each extraction and validation run so audit history remains reproducible as schemas evolve.

#### Scenario: Extraction run records schema version
- **WHEN** an extraction run completes (success or failure)
- **THEN** the run history SHALL include a reference to the schema version used (and the effective prompt/template if applicable)

