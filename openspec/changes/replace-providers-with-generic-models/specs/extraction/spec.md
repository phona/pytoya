# extraction Specification Delta

## MODIFIED Requirements

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

## REMOVED Requirements

### ~~Provider Selection for Extraction~~

This requirement is replaced by Model Selection for Extraction above.

~~The system SHALL allow selecting providers at extraction time.~~
