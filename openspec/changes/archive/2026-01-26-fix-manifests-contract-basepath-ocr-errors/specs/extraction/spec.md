## MODIFIED Requirements

### Requirement: Text Extraction Flow
The system SHALL extract text using the selected extractor, then extract structured data using LLM.

#### Scenario: Text extractor failure returns a normalized error
- **WHEN** the configured text extractor throws an error
- **THEN** the system SHALL set manifest status to failed
- **AND** the system SHALL store a safe, user-readable error message
- **AND** OCR-related failures SHOULD use stable error codes (e.g., timeout vs service unavailable)

