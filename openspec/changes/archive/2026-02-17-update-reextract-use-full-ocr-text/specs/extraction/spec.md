## MODIFIED Requirements

### Requirement: Field-level Re-extraction

The system SHALL allow re-extracting specific fields using cached OCR results.

#### Scenario: Re-extract single field

- **GIVEN** manifest has cached OCR result
- **WHEN** user clicks re-extract button next to field
- **THEN** system POSTs to `/api/manifests/:id/re-extract` with `{ fieldName: "invoice.po_no" }`
- **AND** upon confirmation (if any), queues targeted extraction job
- **AND** the extraction job MUST send the full cached OCR Markdown to the LLM
- **AND** extracted value replaces current value
- **AND** field extraction metadata is updated

#### Scenario: Re-extract field when LLM rejects oversized context

- **GIVEN** manifest has cached OCR result
- **WHEN** user triggers re-extract
- **AND** the LLM provider rejects the request due to context length
- **THEN** the extraction job SHALL fail with a stable, human-readable error message
- **AND** the client SHALL show an error tip (toast/modal)
- **AND** the client MUST NOT retry with snippet-only OCR context

#### Scenario: Re-extract field without OCR result

- **GIVEN** manifest lacks cached OCR result
- **WHEN** user attempts to re-extract field
- **THEN** system first processes OCR
- **OR** system returns error suggesting full re-extraction