## ADDED Requirements

### Requirement: OCR Metadata Is Domain-Neutral
The system SHALL store OCR result metadata without hardcoded domain assumptions (e.g., it MUST NOT default `document.type` to `"invoice"`).

#### Scenario: Fallback OCR result uses a neutral document type
- **WHEN** the system synthesizes a fallback OCR result (no provider-specific document type available)
- **THEN** `ocr_result.document.type` SHALL be neutral (e.g., `"unknown"` or `null`)

