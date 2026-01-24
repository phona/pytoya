# extraction Specification

## Purpose
TBD - created by archiving change implement-extraction-engine. Update Purpose after archive.
## Requirements
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
- **AND** job record includes estimated cost **and currency**
- **AND** job status is set to queued
- **AND** job includes reference to cached OCR result

#### Scenario: Job completion with cost

- **WHEN** extraction completes successfully
- **THEN** system stores actual token usage and cost **with currency**
- **AND** manifest `extraction_cost` is updated
- **AND** job record is updated with actual cost **and currency**
- **AND** WebSocket event includes cost information **and currency**

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
The system SHALL use ModelEntity configurations for structured data extraction.

#### Scenario: Extraction uses project LLM model
- **GIVEN** a project with llmModelId configured
- **WHEN** an extraction job is created
- **THEN** the LLM model is loaded from the database
- **AND** the model's parameters (apiKey, modelName, temperature, etc.) are used
- **AND** the adapter service executes the LLM completion

#### Scenario: Fallback to config when no LLM model configured
- **GIVEN** a project without default LLM model configured
- **WHEN** an extraction job is created
- **THEN** the system falls back to config.yaml settings
- **AND** a warning is logged indicating the use of fallback configuration

#### Scenario: Override LLM model per extraction
- **GIVEN** an extraction request with a specific llmModelId
- **WHEN** the extraction job is created
- **THEN** the provided LLM model overrides the project default
- **AND** the specified model is used for this extraction only

#### Scenario: LLM model not found
- **GIVEN** a project with an invalid llmModelId (deleted or non-existent)
- **WHEN** an extraction job is created
- **THEN** the system falls back to config.yaml settings
- **AND** an error is logged indicating the invalid model reference

#### Scenario: Vision-capable model does not require OCR config
- **GIVEN** a vision-capable model is configured for structured extraction
- **WHEN** the model configuration is validated
- **THEN** the system SHALL not require OCR/text extraction configuration
- **AND** text extraction SHALL be configured via the project's selected text extractor

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
  - Estimated cost range (min-max) **and currency**
  - Selected model and prompt
- **AND** user confirms extraction
- **THEN** system queues BullMQ job for each manifest
- **AND** system returns job ID for tracking

#### Scenario: Extract single manifest

- **GIVEN** user clicks "Extract" button on single manifest row
- **THEN** system shows confirmation with estimated cost **and currency**
- **AND** upon confirmation, queues single extraction job

#### Scenario: Cost estimation

- **WHEN** user requests extraction cost estimate
- **THEN** system calculates estimate from:
  - Number of manifests
  - Average OCR result token count
  - Selected model's token pricing
- **AND** returns estimated cost range (min and max) **and currency**

### Requirement: Extraction Cost Tracking
The system SHALL calculate and store text extraction cost when pricing configuration is provided.

#### Scenario: Store extraction cost metadata
- **GIVEN** an extractor returns cost metadata
- **WHEN** extraction completes
- **THEN** the manifest SHALL store extractionCost as a numeric total **and currency**
- **AND** the API SHALL return extractionCost **and currency** in manifest responses
- **AND** the API SHALL return textCost and llmCost breakdown when available (same currency)

#### Scenario: Text extraction cost uses textCost naming
- **GIVEN** a text extractor returns a calculated cost
- **WHEN** the extraction job completes
- **THEN** the system SHALL expose the value as textCost (actual usage)
- **AND** the total extractionCost SHALL include textCost + llmCost (same currency)

#### Scenario: Deterministic rounding
- **GIVEN** a manifest has token usage and pricing configured
- **WHEN** the system calculates cost for storage/transport
- **THEN** the system SHALL calculate using integer nano units (1e-9) internally
- **AND** the system SHALL round once at the boundary to a numeric value with up to 9 fractional digits

#### Scenario: Retrieve extractor cost summary
- **GIVEN** cost data exists for an extractor
- **WHEN** a client calls `GET /api/extractors/:id/cost-summary`
- **THEN** the system SHALL return total cost and average cost per extraction
- **AND** the response SHALL include currency
- **AND** the response SHALL NOT sum costs across different currencies

#### Scenario: Retrieve project cost summary
- **GIVEN** a project has extraction cost data
- **WHEN** a client calls `GET /api/projects/:id/cost-summary`
- **THEN** the system SHALL return total extraction cost and cost by extractor
- **AND** totals SHALL be grouped by currency when multiple currencies exist

#### Scenario: Retrieve project cost over time
- **GIVEN** a project has extraction cost history
- **WHEN** a client calls `GET /api/projects/:id/cost-by-date-range`
- **THEN** the system SHALL return cost totals grouped by date
- **AND** totals SHALL be grouped by currency when multiple currencies exist

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

### Requirement: Text Extraction Processing
The system SHALL extract text using the project's selected text extractor before structured data extraction.

#### Scenario: Text extraction uses project-selected extractor
- **GIVEN** a project with textExtractorId configured
- **WHEN** an extraction job starts
- **THEN** the system SHALL load the extractor by id
- **AND** the system SHALL run text extraction using the extractor configuration

#### Scenario: Missing extractor selection
- **GIVEN** a project without textExtractorId configured
- **WHEN** an extraction job starts
- **THEN** the system SHALL fail the job with a clear error
- **AND** the system SHALL not fall back to config.yaml for text extraction

### Requirement: Text Extractor Plugin System
The system SHALL provide a plugin architecture for text extractors with dynamic registration and instantiation.

#### Scenario: List available extractors
- **GIVEN** the system has registered extractor types and stored extractor configurations
- **WHEN** a client calls `GET /api/extractors`
- **THEN** the system SHALL return an array of extractor configurations
- **AND** each item SHALL include id, name, description, extractorType, and isActive

#### Scenario: List extractor types and schemas
- **WHEN** a client calls `GET /api/extractors/types`
- **THEN** the system SHALL return available extractor types
- **AND** each type SHALL include id, name, description, category, paramsSchema, and defaults

#### Scenario: Validate extractor configuration on create
- **WHEN** a client calls `POST /api/extractors` with `{ name, extractorType, config }`
- **THEN** the system SHALL validate config against the extractor type schema
- **AND** the system SHALL return validation errors if any parameters are invalid
- **AND** the system SHALL create the extractor if validation succeeds

### Requirement: Extractor Configuration Management
The system SHALL allow managing global extractor configurations.

#### Scenario: Update extractor configuration
- **GIVEN** an existing extractor
- **WHEN** a client calls `PUT /api/extractors/:id` with updated config
- **THEN** the system SHALL validate and persist the changes

#### Scenario: Test extractor connection
- **GIVEN** an existing extractor
- **WHEN** a client calls `POST /api/extractors/:id/test`
- **THEN** the system SHALL run a lightweight test and return the result

#### Scenario: Delete extractor
- **GIVEN** an extractor that is not used by any project
- **WHEN** a client calls `DELETE /api/extractors/:id`
- **THEN** the system SHALL delete the extractor
- **AND** if the extractor is in use, the system SHALL return a clear error

### Requirement: Text Extractor Implementation
Extractors SHALL be implemented as classes with static metadata and an extract method.

#### Scenario: Extractor declares metadata
- **GIVEN** a class implements `ITextExtractor`
- **WHEN** the class is defined
- **THEN** the class SHALL have a `static readonly metadata: ExtractorMetadata` property
- **AND** the metadata SHALL include id, name, description, category, and paramsSchema
- **AND** the instance method `getMetadata()` SHALL return the static metadata

#### Scenario: Extractor validates configuration
- **GIVEN** an extractor is instantiated with configuration parameters
- **WHEN** parameters are provided that violate the schema
- **THEN** the extractor SHALL throw a validation error
- **AND** the error SHALL indicate which parameter is invalid and why

#### Scenario: Extractor extracts text from buffer
- **GIVEN** a configured extractor instance
- **WHEN** `extract(buffer)` is called with a file buffer
- **THEN** the extractor SHALL return a `TextExtractionResult`
- **AND** the result SHALL contain text, markdown, and metadata fields
- **AND** the metadata SHALL include extractorId and processingTimeMs

### Requirement: Vision LLM Extractor
The system SHALL provide a generic VisionLLMExtractor that works with any OpenAI-compatible vision API.

#### Scenario: Configure GPT-4o vision extractor
- **GIVEN** a user wants to use GPT-4o for text extraction
- **WHEN** configuring VisionLLMExtractor with `{ baseUrl: 'https://api.openai.com/v1', apiKey: 'sk-...', model: 'gpt-4o' }`
- **THEN** the extractor SHALL use the specified endpoint
- **AND** the extractor SHALL include the API key in requests
- **AND** the extractor SHALL use the gpt-4o model

#### Scenario: Configure Claude vision extractor via proxy
- **GIVEN** a user wants to use Claude 3.5 Sonnet via OpenAI-compatible proxy
- **WHEN** configuring VisionLLMExtractor with `{ baseUrl: 'https://proxy.example.com/v1', apiKey: 'sk-...', model: 'claude-3-5-sonnet' }`
- **THEN** the extractor SHALL use the proxy endpoint
- **AND** the extractor SHALL format requests according to OpenAI API spec

#### Scenario: Configure SiliconFlow Chinese vision model
- **GIVEN** a user wants to use Qwen2-VL for Chinese text extraction
- **WHEN** configuring VisionLLMExtractor with `{ baseUrl: 'https://api.siliconflow.cn/v1', apiKey: 'sk-...', model: 'Qwen/Qwen2-VL-72B-Instruct', prompt: '请提取图片中的所有文字内容...' }`
- **THEN** the extractor SHALL use the SiliconFlow endpoint
- **AND** the extractor SHALL use the custom Chinese prompt

#### Scenario: Custom extraction prompt
- **GIVEN** a user wants to optimize extraction for specific document types
- **WHEN** configuring VisionLLMExtractor with a custom prompt parameter
- **THEN** the extractor SHALL use the custom prompt as the system message
- **AND** the extractor SHALL extract text according to the prompt's instructions

### Requirement: PaddleOCR Extractor
The system SHALL provide a PaddleOcrExtractor that integrates with the PaddleOCR-VL service.

#### Scenario: Configure PaddleOCR endpoint
- **GIVEN** a user wants to use PaddleOCR-VL for text extraction
- **WHEN** configuring PaddleOcrExtractor with `{ baseUrl: 'http://localhost:8080', timeout: 120 }`
- **THEN** the extractor SHALL call the configured endpoint
- **AND** the extractor SHALL use the specified timeout

#### Scenario: PaddleOCR returns markdown
- **GIVEN** a PDF file buffer is provided to PaddleOcrExtractor
- **WHEN** the extraction completes
- **THEN** the result SHALL contain the raw_text field from PaddleOCR
- **AND** the result SHALL contain the markdown field from PaddleOCR
- **AND** the result SHALL include page count in metadata

### Requirement: Extractor Selection per Project
The system SHALL allow each project to select its preferred text extractor from global configurations.

#### Scenario: Project selects extractor
- **GIVEN** a project owner
- **WHEN** a client calls `PUT /api/projects/:id/extractor` with `{ textExtractorId }`
- **THEN** the system SHALL validate the extractor exists and is active
- **AND** the system SHALL save textExtractorId on the project
- **AND** subsequent extractions for the project SHALL use the selected extractor

#### Scenario: Project extractor not found
- **GIVEN** a project with a configured textExtractorId
- **WHEN** the extractor is not found or inactive
- **THEN** the system SHALL return an error
- **AND** the system SHALL require the user to select a valid extractor

#### Scenario: Project returns selected extractor
- **GIVEN** a project with a configured textExtractorId
- **WHEN** a client calls `GET /api/projects/:id`
- **THEN** the response SHALL include textExtractorId

#### Scenario: Override extractor per extraction
- **GIVEN** a project with a default extractor configured
- **WHEN** triggering extraction with a specific extractorId override
- **THEN** the system SHALL use the override extractor for this extraction only
- **AND** the project configuration SHALL remain unchanged

### Requirement: Extractor Factory with Caching
The system SHALL cache extractor instances per configuration to avoid re-instantiation.

#### Scenario: Create extractor instance
- **GIVEN** an extractor configuration
- **WHEN** calling `TextExtractorFactory.createInstance(config)`
- **THEN** the factory SHALL check if an instance exists for this config hash
- **AND** if cached, the factory SHALL return the existing instance
- **AND** if not cached, the factory SHALL create a new instance and cache it

#### Scenario: Different configs create different instances
- **GIVEN** two extractor configs with different parameters
- **WHEN** calling createInstance for each config
- **THEN** the factory SHALL create two separate instances
- **AND** each instance SHALL use its respective configuration

### Requirement: Extractor Presets
The system SHALL provide preset configurations for common vision models.

#### Scenario: List available presets
- **WHEN** a client calls `GET /api/extractors/presets`
- **THEN** the system SHALL return a list of preset configurations
- **AND** each preset SHALL include name, description, and default config

#### Scenario: Create extractor from preset
- **GIVEN** a preset 'gpt-4o' with default config
- **WHEN** a user provides an API key and selects the preset
- **THEN** the system SHALL create the extractor with preset config + API key
- **AND** the user SHALL not need to specify baseUrl, model, or other defaults

### Requirement: Text Extraction Flow
The system SHALL extract text using the selected extractor, then extract structured data using LLM.

#### Scenario: Full extraction with selected extractor
- **GIVEN** a project with a configured text extractor
- **WHEN** an extraction job is triggered for a manifest
- **THEN** the system SHALL load the project's textExtractorId
- **AND** the system SHALL load the extractor configuration by id
- **AND** the system SHALL create an extractor instance from the configuration
- **AND** the system SHALL extract text using the extractor
- **AND** the system SHALL pass the extracted text to the LLM for structured data extraction
- **AND** the system SHALL validate the structured output against the JSON schema
- **AND** the system SHALL save the result to the manifest

#### Scenario: Extraction result includes extractor metadata
- **GIVEN** a completed extraction
- **WHEN** retrieving the manifest
- **THEN** the manifest SHALL include which extractor was used
- **AND** the manifest SHALL include extractor processing time
- **AND** the manifest SHALL include any additional metadata from the extractor

#### Scenario: Text extractor failure
- **WHEN** the configured text extractor throws an error
- **THEN** the system SHALL log the error
- **AND** the system SHALL set manifest status to failed
- **AND** the system SHALL include the error message in the manifest

### Requirement: Extraction Result Storage
The system SHALL store extractor information with extraction results.

#### Scenario: Manifest stores extractor metadata
- **GIVEN** a manifest with completed extraction
- **WHEN** the extraction result is saved
- **THEN** the manifest SHALL include extractorId
- **AND** the manifest SHALL include extraction metadata (processing time, model, etc.)
- **AND** the metadata SHALL be queryable via API

#### Scenario: API returns extractor information
- **GIVEN** a client requests manifest details
- **WHEN** the manifest has completed extraction
- **THEN** the API response SHALL include the extractorId
- **AND** the response SHALL include extractor metadata
- **AND** the web UI SHALL display this information

### Requirement: Filtered Bulk Extraction

The system SHALL support triggering extraction for all manifests matching a set of manifest list filters, without requiring the client to enumerate manifest IDs across pages.

#### Scenario: Dry-run estimate for filtered extraction

- **WHEN** an authenticated user requests a filtered extraction estimate with `dryRun=true`
- **THEN** the system SHALL return the total matching manifest count
- **AND** the system SHALL return an estimated cost range and currency

#### Scenario: Queue jobs for filtered extraction

- **WHEN** an authenticated user requests filtered extraction with `dryRun=false`
- **THEN** the system SHALL enqueue one extraction job per matching manifest
- **AND** the system SHALL return a batch job identifier and jobIds
- **AND** WebSocket updates SHALL be emitted per manifest as jobs progress and complete

#### Scenario: Default filtered extraction skips completed and processing

- **WHEN** an authenticated user requests filtered extraction without explicit behavior overrides
- **THEN** the system SHALL include only manifests in status `pending` or `failed`
- **AND** the system SHALL skip manifests in status `completed` or `processing`

#### Scenario: Processing manifests require explicit force include

- **GIVEN** the filtered result set includes one or more `processing` manifests
- **WHEN** the request does not explicitly enable “include processing”
- **THEN** the system SHALL skip `processing` manifests
- **AND** **WHEN** the request explicitly enables “include processing”
- **THEN** the system SHALL include `processing` manifests

### Requirement: Currency-Aware Cost Dashboard Metrics API
The system SHALL provide a cost dashboard metrics endpoint that aggregates usage and costs without mixing currencies.

#### Scenario: Retrieve cost dashboard metrics grouped by currency
- **GIVEN** jobs and manifests exist with costs in one or more currencies
- **WHEN** a client calls `GET /api/metrics/cost-dashboard`
- **THEN** the system SHALL return totals grouped by currency
- **AND** the system SHALL include LLM token usage totals (input/output) in the response
- **AND** the system SHALL include text extraction usage totals (pages processed) in the response

#### Scenario: Filter dashboard metrics by date range
- **GIVEN** cost data exists over multiple days
- **WHEN** a client calls `GET /api/metrics/cost-dashboard?from=YYYY-MM-DD&to=YYYY-MM-DD`
- **THEN** the system SHALL aggregate results only within the requested date range

#### Scenario: Do not sum costs across different currencies
- **GIVEN** jobs exist in multiple currencies
- **WHEN** a client calls `GET /api/metrics/cost-dashboard`
- **THEN** the system SHALL NOT return a single total that sums across currencies
- **AND** each returned total SHALL be associated with an explicit currency code (or `unknown`)

### Requirement: LLM Token Metrics Use Stored Usage Fields
The system SHALL calculate dashboard token metrics using stored per-job token usage fields.

#### Scenario: Group token metrics by LLM model id
- **GIVEN** jobs include `llm_input_tokens` and `llm_output_tokens`
- **WHEN** the system aggregates token metrics for the dashboard
- **THEN** metrics SHALL be grouped by the job `llm_model_id` value

### Requirement: Vision LLM Page-by-Page Text Extraction

When the selected text extractor is `vision-llm` and the input is a multi-page PDF, the system SHALL support extracting Markdown page-by-page and stitching the result into a single Markdown document.

#### Scenario: Page-by-page extraction for PDFs

- **GIVEN** a manifest PDF converts to N page images
- **WHEN** text extraction runs
- **THEN** the system SHALL call the vision LLM once per page image
- **AND** the system SHALL preserve page order in the final Markdown output
- **AND** the system SHALL insert stable page separators (e.g. `--- PAGE k ---`)
- **AND** the system SHALL aggregate token usage and cost across all page calls

#### Scenario: Never send entire PDF to vision LLM

- **GIVEN** a manifest PDF converts to N page images
- **WHEN** text extraction runs using the `vision-llm` extractor
- **THEN** the system SHALL NOT send all page images in a single vision LLM request

