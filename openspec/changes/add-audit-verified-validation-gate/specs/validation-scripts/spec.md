## MODIFIED Requirements

### Requirement: Validation Execution

The system SHALL execute validation scripts on extracted data, and SHALL support using validation results to gate user actions in the audit flow (e.g., saving a manifest as Human Verified).

#### Scenario: Validation is used to gate Human Verified

- **WHEN** the user attempts to save a manifest as Human Verified
- **THEN** the system SHALL run validation for that manifest
- **AND** validation results SHALL be returned to the UI so the user can decide whether to proceed when errors exist

