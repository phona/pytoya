## ADDED Requirements

### Requirement: Vision-Based Extraction
The system SHALL support direct extraction from images and PDFs using vision-enabled LLM providers.

#### Scenario: Image file extraction with vision LLM
- **WHEN** an image file (PNG, JPEG, WebP) is uploaded
- **AND** extraction strategy is set to `vision-first`
- **AND** the selected provider supports vision
- **THEN** the image is converted to base64
- **AND** the image is sent directly to the vision LLM
- **AND** structured data is extracted without OCR processing

#### Scenario: PDF extraction with vision LLM
- **WHEN** a PDF file is uploaded
- **AND** extraction strategy is set to `vision-first`
- **AND** the selected provider supports vision
- **THEN** PDF pages are converted to images
- **AND** images are sent to the vision LLM
- **AND** structured data is extracted without OCR processing

#### Scenario: Vision provider without vision support
- **WHEN** extraction strategy is set to `vision-first`
- **AND** the selected provider does not support vision
- **THEN** the extraction falls back to OCR-first strategy
- **AND** a warning is logged indicating fallback occurred

### Requirement: Two-Stage Extraction
The system SHALL support a two-stage extraction process using separate LLM passes.

#### Scenario: Two-stage extraction with vision and structured LLMs
- **WHEN** extraction strategy is set to `two-stage`
- **THEN** Stage 1 extracts raw data using vision-enabled LLM
- **AND** Stage 2 refines raw data into structured JSON using schema-validation-capable LLM
- **AND** both stages use the same provider or configured provider pair
- **AND** final output conforms to the JSON Schema

#### Scenario: Two-stage with separate providers
- **WHEN** extraction strategy is set to `two-stage`
- **AND** separate providers are configured for vision and structured extraction
- **THEN** Stage 1 uses the vision-capable provider
- **AND** Stage 2 uses the structured-output-capable provider
- **AND** results from Stage 1 are passed as context to Stage 2

#### Scenario: Two-stage fallback on Stage 1 failure
- **WHEN** Stage 1 (vision extraction) fails
- **THEN** the extraction falls back to OCR-first strategy
- **AND** an error is logged indicating Stage 1 failure

### Requirement: Image File Upload Support
The system SHALL accept image files for extraction in addition to PDFs.

#### Scenario: Successful image upload
- **WHEN** an image file (PNG, JPEG, WebP) is uploaded
- **THEN** the file is validated for mimetype
- **AND** the file is validated for size limits
- **AND** a manifest record is created
- **AND** the file is stored for processing

#### Scenario: Invalid image file rejected
- **WHEN** a file is uploaded with unsupported mimetype
- **THEN** the upload is rejected with error
- **AND** error message indicates supported formats (PDF, PNG, JPEG, WebP)

### Requirement: PDF-to-Image Conversion
The system SHALL convert PDF pages to images for vision-based extraction.

#### Scenario: Successful PDF conversion
- **WHEN** a PDF requires vision-based processing
- **THEN** each page is converted to an image
- **AND** images are encoded as base64
- **AND** images are aggregated for batch processing
- **AND** conversion metadata (page count, DPI) is logged

#### Scenario: PDF conversion failure
- **WHEN** PDF-to-image conversion fails
- **THEN** the extraction falls back to OCR-first strategy
- **AND** a detailed error is logged
- **AND** the manifest status reflects the failure

### Requirement: Extraction Strategy Configuration
The system SHALL support configurable extraction strategies per schema or request.

#### Scenario: Strategy selection
- **WHEN** an extraction request is made
- **AND** an `extractionStrategy` is specified
- **THEN** the specified strategy is used
- **AND** available strategies are: `ocr-first`, `vision-first`, `vision-only`, `two-stage`

#### Scenario: Default strategy when not specified
- **WHEN** an extraction request is made
- **AND** no `extractionStrategy` is specified
- **THEN** the default strategy `ocr-first` is used
- **AND** existing behavior is preserved

### Requirement: Provider Vision Capability
The system SHALL track and validate provider vision capabilities.

#### Scenario: Provider with vision support
- **WHEN** a provider is configured with `supportsVision: true`
- **THEN** vision-based extraction strategies are available for this provider
- **AND** image content can be sent to this provider

#### Scenario: Provider without vision support
- **WHEN** a provider is configured with `supportsVision: false`
- **THEN** vision-based extraction strategies are unavailable for this provider
- **AND** attempts to use vision strategies fall back to OCR

## MODIFIED Requirements

### Requirement: LLM Extraction
The system SHALL extract structured data using OpenAI-compatible LLM providers with support for vision content.

#### Scenario: Vision-based extraction with image content
- **WHEN** extraction strategy is `vision-first` or `two-stage`
- **AND** provider supports vision
- **THEN** LLM is called with image_url content type
- **AND** image data is base64-encoded
- **AND** structured data is extracted from vision input

#### Scenario: OCR-based extraction (existing behavior preserved)
- **WHEN** extraction strategy is `ocr-first` (default)
- **THEN** OCR results are processed first
- **AND** LLM is called with text-only content
- **AND** existing behavior is preserved

#### Scenario: Provider selection based on capabilities
- **WHEN** extraction is triggered
- **THEN** provider is validated for required capabilities (vision, structured output)
- **AND** provider-specific API key and base URL are applied
- **AND** request fails if provider lacks required capabilities

### Requirement: LLM provider selection
The system SHALL select providers based on extraction strategy and provider capabilities.

#### Scenario: Vision-capable provider selection
- **WHEN** extraction requires vision capabilities
- **THEN** providers with `supportsVision: true` are eligible
- **AND** the configured provider is validated for vision support
- **AND** extraction fails if provider lacks vision capability

#### Scenario: Structured output capable provider selection
- **WHEN** extraction requires structured output
- **THEN** providers with `supportsStructuredOutput: true` are eligible
- **AND** the configured provider is validated for structured output
- **AND** extraction fails if provider lacks structured output capability
