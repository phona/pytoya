## MODIFIED Requirements

### Requirement: Field-level Re-extraction with OCR Context
The system SHALL allow re-extracting individual fields with OCR context preview.

#### Scenario: Preview OCR context returns a bounded snippet
- **GIVEN** a manifest has cached OCR result
- **WHEN** the client requests a field re-extract preview with OCR context
- **THEN** the server SHALL return an OCR context preview with a bounded text snippet (not the full document)
- **AND** the snippet SHOULD be taken from the page most relevant to the target field
- **AND** the preview SHOULD include `pageNumber` and `confidence` when available

