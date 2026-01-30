## ADDED Requirements

### Requirement: Batch Validation Returns Per-Manifest Outcomes
The system SHALL support running validation over a set of manifests and SHALL return an outcome for each requested manifest id.

#### Scenario: Batch validation succeeds for all manifests
- **GIVEN** a user requests batch validation for a list of manifests
- **WHEN** the batch validation run completes successfully for all manifests
- **THEN** the API response SHALL include an outcome entry for each requested manifest id
- **AND** each entry SHALL contain `{ ok=true, result=ValidationResult }`

#### Scenario: Batch validation has partial failures
- **GIVEN** a user requests batch validation for a list of manifests
- **WHEN** one or more manifests fail validation execution (e.g., missing extracted data, script error, unexpected runtime error)
- **THEN** the API response SHALL still include an outcome entry for each requested manifest id
- **AND** failed entries SHALL contain `{ ok=false, error={ message } }`

### Requirement: Batch Validation Concurrency Control
The system SHALL run batch validation with a bounded concurrency limit to reduce total time while keeping resource usage predictable.

#### Scenario: Concurrency is bounded
- **GIVEN** a user requests batch validation for N manifests
- **WHEN** the system executes the batch
- **THEN** the system SHALL process validations with a maximum concurrency limit
