# extraction Specification

## Purpose
TBD - created by archiving change implement-extraction-engine. Update Purpose after archive.
## Requirements
### Requirement: OCR Processing
The system SHALL extract text from PDF files using PaddleOCR-VL remote service.

#### Scenario: OCR with retry
- **WHEN** OCR request fails
- **THEN** system retries with exponential backoff
- **AND** retries are logged
- **WHEN** max retries reached without success
- **THEN** manifest status is set to failed
- **AND** error message is recorded

#### Scenario: OCR success
- **WHEN** OCR request succeeds
- **THEN** markdown, raw_text, and layout are extracted
- **AND** results are stored for LLM processing

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

### Requirement: Model Selection for Extraction

The system SHALL use ModelEntity configurations instead of ProviderEntity for extraction operations.

#### Scenario: Extraction uses project OCR model
- **GIVEN** a project with ocrModelId configured
- **WHEN** an extraction job is created
- **THEN** the OCR model is loaded from the database
- **AND** the model's parameters are used for the OCR API call
- **AND** the adapterType determines which adapter service executes the request

#### Scenario: Extraction uses project LLM model
- **GIVEN** a project with llmModelId configured
- **WHEN** an extraction job is created
- **THEN** the LLM model is loaded from the database
- **AND** the model's parameters (apiKey, modelName, temperature, etc.) are used
- **AND** the adapter service executes the LLM completion

#### Scenario: Fallback to config when no model configured
- **GIVEN** a project without default models configured
- **WHEN** an extraction job is created
- **THEN** the system falls back to config.yaml settings
- **AND** a warning is logged indicating the use of fallback configuration

#### Scenario: Override model per extraction
- **GIVEN** an extraction request with specific model IDs
- **WHEN** the extraction job is created
- **THEN** the provided models override the project defaults
- **AND** the specified models are used for this extraction only

#### Scenario: Model not found
- **GIVEN** a project with an invalid model ID (deleted or non-existent)
- **WHEN** an extraction job is created
- **THEN** the system falls back to config.yaml settings
- **AND** an error is logged indicating the invalid model reference

### Requirement: LLM Prompt Optimization
The extraction service SHALL provide an endpoint to optimize extraction prompts using the configured LLM.

#### Scenario: Optimize prompt from description
- **WHEN** a user provides extraction requirements description
- **THEN** the system SHALL send description to configured LLM
- **AND** the system SHALL request LLM to generate optimized extraction prompt
- **AND** the system SHALL include context about invoice processing requirements
- **AND** the system SHALL include context about Chinese language support
- **AND** the system SHALL return generated prompt to user

#### Scenario: Prompt optimization response format
- **WHEN** the LLM returns optimized prompt
- **THEN** the system SHALL return JSON with prompt content
- **AND** the system SHALL include metadata about generation
- **AND** the system SHALL handle LLM errors gracefully

#### Scenario: Context-aware optimization
- **WHEN** generating optimized prompt
- **THEN** the system SHALL include domain context (invoice processing)
- **AND** the system SHALL include field format requirements (PO number, units)
- **AND** the system SHALL include OCR correction patterns if relevant
- **AND** the system SHALL include language requirements (Chinese invoices)

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

