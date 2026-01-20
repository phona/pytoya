## ADDED Requirements

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

### Requirement: Extraction Cost Tracking
The system SHALL calculate and store text extraction cost when pricing configuration is provided.

#### Scenario: Store extraction cost metadata
- **GIVEN** an extractor returns cost metadata
- **WHEN** extraction completes
- **THEN** the manifest SHALL store extractionCost as a numeric total
- **AND** the API SHALL return extractionCost in manifest responses
- **AND** the API SHALL return textCost and llmCost breakdown when available

#### Scenario: Text extraction cost uses textCost naming
- **GIVEN** a text extractor returns a calculated cost
- **WHEN** the extraction job completes
- **THEN** the system SHALL expose the value as textCost (actual usage)
- **AND** the total extractionCost SHALL include textCost + llmCost

#### Scenario: Retrieve extractor cost summary
- **GIVEN** cost data exists for an extractor
- **WHEN** a client calls `GET /api/extractors/:id/cost-summary`
- **THEN** the system SHALL return total cost and average cost per extraction
- **AND** the response SHALL include textCost + llmCost breakdown when available

#### Scenario: Retrieve project cost summary
- **GIVEN** a project has extraction cost data
- **WHEN** a client calls `GET /api/projects/:id/cost-summary`
- **THEN** the system SHALL return total extraction cost and cost by extractor

#### Scenario: Retrieve project cost over time
- **GIVEN** a project has extraction cost history
- **WHEN** a client calls `GET /api/projects/:id/cost-by-date-range`
- **THEN** the system SHALL return cost totals grouped by date

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

## RENAMED Requirements
- FROM: `### Requirement: OCR Processing`
- TO: `### Requirement: Text Extraction Processing`

## MODIFIED Requirements
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
