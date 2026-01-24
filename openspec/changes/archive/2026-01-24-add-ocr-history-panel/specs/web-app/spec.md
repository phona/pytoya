## ADDED Requirements

### Requirement: OCR History Section
The manifest audit page SHALL provide a dedicated OCR history section to review OCR refresh runs separately from extraction history.

#### Scenario: User reviews OCR refresh runs
- **GIVEN** a manifest has one or more OCR refresh jobs
- **WHEN** the user opens the audit page History tab
- **THEN** the system SHALL display an OCR history section listing OCR refresh runs
- **AND** the section SHALL show run status and timestamps
- **AND** the section SHALL NOT be mixed into the extraction history list

