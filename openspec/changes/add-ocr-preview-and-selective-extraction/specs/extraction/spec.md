## ADDED Requirements

### Requirement: OCR Result Caching

The system SHALL cache PaddleOCR-VL results in the database for reuse.

#### Scenario: Store OCR result after processing

- **WHEN** PaddleOCR-VL processing completes successfully
- **THEN** system stores complete OCR result in `manifests.ocr_result` as JSONB
- **AND** system stores timestamp in `manifests.ocr_processed_at`
- **AND** system calculates and stores quality score in `manifests.ocr_quality_score`

#### Scenario: Retrieve cached OCR result

- **GIVEN** a manifest with cached OCR result
- **WHEN** user requests OCR data via `GET /manifests/:id/ocr`
- **THEN** system returns cached OCR result without re-processing
- **AND** response includes quality score and processing timestamp

#### Scenario: OCR result not found

- **GIVEN** a manifest without cached OCR result
- **WHEN** user requests OCR data via `GET /manifests/:id/ocr`
- **THEN** system returns 404 or null result
- **AND** response indicates OCR can be triggered via POST

### Requirement: Manual OCR Trigger

The system SHALL allow users to manually trigger OCR processing.

#### Scenario: Trigger OCR for unprocessed manifest

- **GIVEN** a manifest without cached OCR result
- **WHEN** user POSTs to `/manifests/:id/ocr`
- **THEN** system calls PaddleOCR-VL service
- **AND** system stores result in database
- **AND** system returns 202 Accepted if processing asynchronously
- **OR** system returns 200 OK with result if processing synchronously

#### Scenario: OCR already cached

- **GIVEN** a manifest with existing OCR result
- **WHEN** user POSTs to `/manifests/:id/ocr` with force=false
- **THEN** system returns cached result without re-processing

#### Scenario: Force re-process OCR

- **GIVEN** a manifest with existing OCR result
- **WHEN** user POSTs to `/manifests/:id/ocr` with force=true
- **THEN** system calls PaddleOCR-VL service again
- **AND** system overwrites cached result
- **AND** system updates `ocr_processed_at` timestamp

### Requirement: OCR Quality Scoring

The system SHALL calculate quality score for OCR results.

#### Scenario: Calculate quality score

- **WHEN** OCR result is stored
- **THEN** system calculates quality score from:
  - Text coverage (% of page with detected text)
  - Average confidence score from PaddleOCR-VL
  - Layout detection success (tables, elements found)
  - Expected language match
- **AND** score is stored as integer 0-100

#### Scenario: Quality score thresholds

- **GIVEN** OCR quality score is calculated
- **WHEN** score is 90-100
- **THEN** result is marked "Excellent" (green)
- **WHEN** score is 70-89
- **THEN** result is marked "Good" (yellow)
- **WHEN** score is below 70
- **THEN** result is marked "Poor" (red)

### Requirement: Selective Extraction

The system SHALL allow users to select specific manifests for extraction.

#### Scenario: Extract selected manifests

- **GIVEN** user has selected multiple manifests from list
- **WHEN** user clicks "Extract Selected" button
- **THEN** system shows confirmation modal with:
  - Number of manifests to extract
  - Estimated cost range (min-max)
  - Selected model and prompt
- **AND** user confirms extraction
- **THEN** system queues BullMQ job for each manifest
- **AND** system returns job ID for tracking

#### Scenario: Extract single manifest

- **GIVEN** user clicks "Extract" button on single manifest row
- **THEN** system shows confirmation with estimated cost
- **AND** upon confirmation, queues single extraction job

#### Scenario: Cost estimation

- **WHEN** user requests extraction cost estimate
- **THEN** system calculates estimate from:
  - Number of manifests
  - Average OCR result token count
  - Selected model's token pricing
- **AND** returns estimated cost range (min and max)

### Requirement: Extraction Cost Tracking

The system SHALL track actual extraction cost per manifest.

#### Scenario: Record extraction cost

- **WHEN** LLM extraction completes
- **THEN** system calculates cost from:
  - Input tokens used × input price per million
  - Output tokens used × output price per million
- **AND** system stores total cost in `manifests.extraction_cost`

#### Scenario: Query total extraction cost

- **WHEN** user requests cost summary for group/project
- **THEN** system aggregates `extraction_cost` for filtered manifests
- **AND** returns total cost and document count

### Requirement: Field-level Re-extraction with OCR Context

The system SHALL allow re-extracting individual fields with OCR context preview.

#### Scenario: Preview OCR context before re-extraction

- **GIVEN** user wants to re-extract a specific field
- **WHEN** user opens re-extract dialog for field
- **THEN** system shows:
  - Current field value
  - Relevant OCR text snippet that informed extraction
  - Confidence score
  - Custom prompt input option
  - Estimated cost for re-extraction
- **AND** user can modify prompt before confirming

#### Scenario: Execute field-level re-extraction

- **GIVEN** user has reviewed OCR context in re-extract dialog
- **WHEN** user confirms re-extraction
- **THEN** system sends targeted request to LLM:
  - Includes OCR text relevant to field
  - Includes custom prompt if provided
  - Asks for specific field only
- **AND** system updates extracted field value in database
- **AND** system updates field confidence score

#### Scenario: Field re-extraction fails

- **WHEN** field-level re-extraction fails to extract value
- **THEN** system preserves existing value
- **AND** system records error in extraction history
- **AND** system shows error to user with option to retry

## MODIFIED Requirements

### Requirement: LLM Extraction

The system SHALL extract structured invoice data using OpenAI-compatible LLM providers, on-demand rather than automatically.

#### Scenario: Initial extraction

- **WHEN** user triggers extraction for manifest with cached OCR result
- **THEN** LLM is called with:
  - System prompt including JSON Schema
  - OCR markdown from `manifests.ocr_result`
  - Configured temperature and max tokens
- **AND** structured JSON data is extracted
- **AND** validation checks are performed
- **AND** extraction cost is calculated and stored

#### Scenario: Extraction without OCR result

- **WHEN** user triggers extraction for manifest without OCR result
- **THEN** system first processes OCR via PaddleOCR-VL
- **AND** system stores OCR result
- **THEN** system proceeds with LLM extraction

#### Scenario: Re-extraction with feedback

- **WHEN** previous extraction failed validation
- **THEN** re-extraction prompt includes:
  - Validation errors
  - Field paths that failed
  - Previous extraction result
  - OCR markdown from cache
- **AND** LLM provides improved extraction
- **AND** retry is attempted

### Requirement: Field-level Re-extraction

The system SHALL allow re-extracting specific fields using cached OCR results.

#### Scenario: Re-extract single field

- **GIVEN** manifest has cached OCR result
- **WHEN** user clicks re-extract button next to field
- **THEN** system POSTs to `/api/manifests/:id/re-extract` with `{ fieldName: "invoice.po_no" }`
- **AND** system retrieves relevant OCR context from cached result
- **AND** system shows preview dialog with OCR snippet
- **AND** upon confirmation, queues targeted extraction job
- **AND** extracted value replaces current value
- **AND** field extraction metadata is updated

#### Scenario: Re-extract field without OCR result

- **GIVEN** manifest lacks cached OCR result
- **WHEN** user attempts to re-extract field
- **THEN** system first processes OCR
- **OR** system returns error suggesting full re-extraction

### Requirement: Job Queue Processing

The system SHALL process extraction jobs asynchronously via BullMQ with cost tracking.

#### Scenario: Job queuing with cost estimate

- **WHEN** user triggers extraction for manifest(s)
- **THEN** job is added to BullMQ queue
- **AND** job record includes estimated cost
- **AND** job status is set to queued
- **AND** job includes reference to cached OCR result

#### Scenario: Job completion with cost

- **WHEN** extraction completes successfully
- **THEN** system stores actual token usage and cost
- **AND** manifest `extraction_cost` is updated
- **AND** job record is updated with actual cost
- **AND** WebSocket event includes cost information
