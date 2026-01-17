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
The system SHALL extract structured invoice data using OpenAI-compatible LLM providers.

#### Scenario: Initial extraction
- **WHEN** OCR results are available
- **THEN** LLM is called with system prompt and OCR markdown
- **AND** structured YAML data is extracted
- **AND** validation checks are performed

#### Scenario: Re-extraction with feedback
- **WHEN** previous extraction failed validation
- **THEN** re-extraction prompt includes missing fields and previous result
- **AND** LLM provides improved extraction
- **AND** retry is attempted

#### Scenario: LLM provider selection
- **WHEN** extraction is triggered
- **THEN** configured provider (PaddleX or OpenAI-compatible) is used
- **AND** provider-specific API key and base URL are applied

### Requirement: Job Queue Processing
The system SHALL process extraction jobs asynchronously via BullMQ.

#### Scenario: Job queuing
- **WHEN** user triggers extraction for manifest
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

### Requirement: Field-level Re-extraction
The system SHALL allow re-extracting specific fields.

#### Scenario: Re-extract single field
- **WHEN** user clicks re-extract button next to PO number field
- **THEN** web calls `POST /api/manifests/:id/re-extract` with `{ fieldName: "invoice.po_no" }`
- **AND** job is queued with a field-level target
- **AND** OCR and LLM are called for that field only
- **AND** extracted value replaces current value
- **AND** extraction info is updated

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

