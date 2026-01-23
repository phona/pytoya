## ADDED Requirements

### Requirement: Human Verified Requires Validation Gate

The web application SHALL gate saving `manifest.humanVerified=true` behind a validation run, and SHALL require explicit user confirmation when validation returns one or more errors.

#### Scenario: Save as Human Verified with no validation errors

- **GIVEN** a user is auditing a manifest
- **AND** the user has marked the manifest as Human Verified (intent to save `humanVerified=true`)
- **WHEN** the user clicks Save
- **THEN** the system SHALL save the latest audit edits to the manifest
- **AND** the system SHALL run validation for that manifest
- **AND** **WHEN** validation returns `errorCount = 0`
- **THEN** the system SHALL persist `manifest.humanVerified=true`

#### Scenario: Save as Human Verified with validation errors requires confirmation

- **GIVEN** a user is auditing a manifest
- **AND** the user has marked the manifest as Human Verified (intent to save `humanVerified=true`)
- **WHEN** the user clicks Save
- **THEN** the system SHALL run validation for that manifest
- **AND** **WHEN** validation returns `errorCount > 0`
- **THEN** the system SHALL prompt the user for confirmation before persisting `humanVerified=true`
- **AND** **WHEN** the user cancels the confirmation
- **THEN** the system SHALL keep `manifest.humanVerified=false`
- **AND** **WHEN** the user confirms
- **THEN** the system SHALL persist `manifest.humanVerified=true`

#### Scenario: Run validation without leaving current audit section

- **WHEN** the user triggers “Run validation” from the audit header
- **THEN** the system SHALL run validation for the manifest
- **AND** the UI SHOULD display a summary of validation results without forcing navigation
- **AND** the UI SHOULD provide an explicit user action to open the Validation section

