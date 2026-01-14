## MODIFIED Requirements
### Requirement: Job Queue Processing
The system SHALL process extraction jobs asynchronously via BullMQ.

#### Scenario: Job queuing
- **WHEN** user triggers extraction for manifest via `POST /api/manifests/:id/extract`
- **THEN** job is added to BullMQ queue
- **AND** job record is created in database
- **AND** job status is set to queued

#### Scenario: Job processing
- **WHEN** worker picks up job
- **THEN** job status is set to processing
- **AND** job progress is updated
- **AND** WebSocket events are emitted

#### Scenario: Job completion
- **WHEN** extraction completes successfully
- **THEN** manifest extraction_data is saved
- **AND** manifest status is set to completed
- **AND** job status is set to completed
- **AND** job record is updated

#### Scenario: Job failure
- **WHEN** extraction fails
- **THEN** job status is set to failed
- **AND** error message is recorded
- **AND** manifest status reflects failure

## MODIFIED Requirements
### Requirement: Field-level Re-extraction
The system SHALL allow re-extracting specific fields.

#### Scenario: Re-extract single field
- **WHEN** user clicks re-extract button next to PO number field
- **THEN** web calls `POST /api/manifests/:id/re-extract` with `{ fieldName: "invoice.po_no" }`
- **AND** job is queued with a field-level target
- **AND** OCR and LLM are called for that field only
- **AND** extracted value replaces current value
- **AND** extraction info is updated

