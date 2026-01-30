## MODIFIED Requirements

### Requirement: Dynamic Field Filtering
The system SHALL support filtering manifests by extracted data fields using dot-notation paths and SHALL NOT require invoice-centric “system filter” parameters for core functionality.

#### Scenario: OCR “unprocessed” is unambiguous
- **GIVEN** manifests may have `ocrQualityScore` unset (unprocessed) or set to a numeric value (processed)
- **WHEN** the client filters for “unprocessed” OCR
- **THEN** the system SHALL match only manifests where `ocrQualityScore` is NULL (or equivalent “not processed” state)
- **AND** a numeric `ocrQualityScore = 0` SHALL be treated as a processed result (e.g. “poor”), not “unprocessed”

