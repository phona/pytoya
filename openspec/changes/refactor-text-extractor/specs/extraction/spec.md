## ADDED Requirements

### Requirement: Text Extractor Plugin System
The system SHALL provide a plugin architecture for text extractors with dynamic registration and instantiation.

#### Scenario: List available extractors
- **GIVEN** the system has registered text extractors
- **WHEN** a client calls `GET /api/extractors`
- **THEN** the system SHALL return an array of extractor metadata
- **AND** each metadata SHALL include id, name, description, category, and parameter schema

#### Scenario: Get extractor parameter schema
- **GIVEN** an extractor with ID 'vision-llm' is registered
- **WHEN** a client calls `GET /api/extractors/vision-llm/schema`
- **THEN** the system SHALL return the parameter schema
- **AND** the schema SHALL include field names, types, labels, descriptions, and required flags
- **AND** the schema SHALL include default values where applicable

#### Scenario: Validate extractor configuration
- **GIVEN** a client wants to configure an extractor before saving
- **WHEN** a client calls `POST /api/extractors/validate` with `{ extractorId, params }`
- **THEN** the system SHALL validate params against the extractor's schema
- **AND** the system SHALL return validation errors if any parameters are invalid
- **AND** the system SHALL return success if all parameters are valid

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

### Requirement: Extractor Configuration per Project
The system SHALL allow each project to configure its preferred text extractor.

#### Scenario: Project configures extractor
- **GIVEN** a project owner
- **WHEN** configuring a project with extractorId 'vision-llm' and params
- **THEN** the system SHALL save the configuration to the database
- **AND** the system SHALL validate the params before saving
- **AND** subsequent extractions for the project SHALL use the configured extractor

#### Scenario: Project extractor not found
- **GIVEN** a project with a configured extractorId
- **WHEN** the extractor is not registered in the system
- **THEN** the system SHALL return an error
- **AND** the system SHALL require the user to select a valid extractor

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

### Requirement: Project Extractor Configuration API
The system SHALL provide API endpoints for managing project-level extractor configurations.

#### Scenario: Get project extractor config
- **GIVEN** a project with ID 'project-123'
- **WHEN** calling `GET /api/projects/project-123/extractor-config`
- **THEN** the system SHALL return the project's extractor configuration
- **AND** the response SHALL include extractorId and params

#### Scenario: Update project extractor config
- **GIVEN** a project with ID 'project-123'
- **WHEN** calling `PUT /api/projects/project-123/extractor-config` with new config
- **THEN** the system SHALL validate the configuration
- **AND** the system SHALL update the project's extractor config in the database
- **AND** the system SHALL return the updated configuration

#### Scenario: Test extractor configuration
- **GIVEN** a project with an extractor configuration
- **WHEN** calling `POST /api/projects/project-123/extractor-config/test`
- **THEN** the system SHALL run a test extraction with a sample document
- **AND** the system SHALL return the test result including extracted text and timing
- **AND** the system SHALL return any errors that occurred

### Requirement: Text Extraction Flow
The system SHALL extract text using configured extractors, then extract structured data using LLM.

#### Scenario: Full extraction with configured extractor
- **GIVEN** a project with a configured text extractor
- **WHEN** an extraction job is triggered for a manifest
- **THEN** the system SHALL load the project's extractor configuration
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
