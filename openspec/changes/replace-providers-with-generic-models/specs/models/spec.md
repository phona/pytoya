# models Specification

## Purpose

Defines the generic adapter-based model management system that replaces the rigid provider-based architecture. Models encapsulate all configuration needed for OCR and LLM services, with dynamic parameter schemas defined by each adapter type.

## ADDED Requirements

### Requirement: Model Entity

The system SHALL provide a ModelEntity with dynamic JSONB parameters.

#### Scenario: Model entity structure
- **GIVEN** the system needs to store model configurations
- **WHEN** a ModelEntity is created
- **THEN** it has id (UUID), name (string), adapterType (string), parameters (JSONB), description (string | null), isActive (boolean)
- **AND** parameters can store any valid JSON structure
- **AND** parameters are validated against the adapter's schema

#### Scenario: Model category filtering
- **GIVEN** models exist with different adapter types
- **WHEN** querying models by category (ocr or llm)
- **THEN** only models matching the category are returned
- **AND** category is derived from adapter type (paddlex → ocr, openai/anthropic → llm)

### Requirement: Adapter Schema Registry

The system SHALL provide a registry of adapter schemas that define valid parameters for each adapter type.

#### Scenario: Get adapter schema
- **GIVEN** an adapter type (e.g., 'openai')
- **WHEN** requesting the schema via `/models/adapters`
- **THEN** the complete parameter definitions are returned
- **AND** each parameter has type, required flag, default value, label, and validation rules

#### Scenario: List all adapters
- **GIVEN** the system has registered adapters
- **WHEN** requesting `/models/adapters`
- **THEN** all available adapter types are returned
- **AND** each includes name, description, category, capabilities, and parameter schema

#### Scenario: Validate parameters against schema
- **GIVEN** an adapter schema with required parameters
- **WHEN** creating or updating a model
- **THEN** parameters are validated against the schema
- **AND** missing required parameters are rejected
- **AND** invalid parameter types are rejected
- **AND** parameters outside valid ranges are rejected

### Requirement: Model CRUD Operations

The system SHALL provide full CRUD operations for models via REST API.

#### Scenario: Create model
- **GIVEN** an authenticated user
- **WHEN** creating a model with valid name, adapterType, and parameters
- **THEN** the model is saved to the database
- **AND** parameters are validated against the adapter schema
- **AND** the model appears in the models list
- **AND** a 201 response is returned with the created model

#### Scenario: Create model with invalid parameters
- **GIVEN** an authenticated user
- **WHEN** creating a model with parameters that don't match the adapter schema
- **THEN** a 400 error is returned
- **AND** the error message indicates which parameters are invalid

#### Scenario: Update model
- **GIVEN** an existing model
- **WHEN** updating model name, description, or parameters
- **THEN** the model is updated in the database
- **AND** updated parameters are validated against the adapter schema
- **AND** updatedAt timestamp is updated

#### Scenario: Delete model
- **GIVEN** an existing model
- **WHEN** deleting the model
- **THEN** the model is removed from the database
- **AND** projects referencing the model have their references set to null

#### Scenario: List models
- **GIVEN** multiple models exist
- **WHEN** requesting `/models`
- **THEN** all models are returned
- **AND** results can be filtered by adapter type or category
- **AND** results include model metadata and parameter summary (API keys masked)

#### Scenario: Get model details
- **GIVEN** an existing model ID
- **WHEN** requesting `/models/:id`
- **THEN** the full model details are returned
- **AND** all parameters are included
- **AND** secret parameters (apiKey) are masked or returned based on user role

### Requirement: Model Connection Testing

The system SHALL allow testing model connections before saving.

#### Scenario: Test OCR model connection
- **GIVEN** a PaddleX model configuration
- **WHEN** sending a test request to `/models/:id/test`
- **THEN** a connection is attempted to the configured baseUrl
- **AND** a simple health check or ping is performed
- **AND** success/failure status is returned
- **AND** response time (latency) is included on success

#### Scenario: Test LLM model connection
- **GIVEN** an OpenAI-compatible model configuration
- **WHEN** sending a test request to `/models/:id/test`
- **THEN** a minimal API call is made (e.g., a short completion)
- **AND** the model name is verified to be accessible
- **AND** success/failure status and model name are returned

#### Scenario: Test with invalid credentials
- **GIVEN** a model with invalid API key or URL
- **WHEN** testing the connection
- **THEN** the test fails gracefully
- **AND** an error message is returned
- **AND** the model is not saved (if testing during creation)

### Requirement: Adapter Implementations

The system SHALL provide adapter implementations for supported service types.

#### Scenario: PaddleX adapter
- **GIVEN** the PaddleX adapter schema
- **WHEN** configuring a PaddleX model
- **THEN** required parameters are: baseUrl
- **AND** optional parameters are: apiKey, timeout, maxRetries
- **AND** default values are provided for timeout (60000ms) and maxRetries (3)
- **AND** the adapter category is 'ocr'

#### Scenario: OpenAI adapter
- **GIVEN** the OpenAI adapter schema
- **WHEN** configuring an OpenAI-compatible model
- **THEN** required parameters are: baseUrl, apiKey, modelName
- **AND** optional parameters are: temperature, maxTokens, supportsVision, supportsStructuredOutput
- **AND** default values are provided for temperature (0.7) and maxTokens (4096)
- **AND** the adapter category is 'llm'
- **AND** capabilities include 'llm' and conditionally 'vision'

#### Scenario: Add new adapter type
- **GIVEN** the adapter registry pattern
- **WHEN** adding support for a new service (e.g., Anthropic)
- **THEN** only a new adapter schema file and service class are needed
- **AND** no database schema changes are required
- **AND** the new adapter is automatically available via `/models/adapters`

### Requirement: Model Activation

The system SHALL allow models to be activated or deactivated without deletion.

#### Scenario: Deactivate model
- **GIVEN** an active model
- **WHEN** setting isActive to false
- **THEN** the model is not used for new operations
- **AND** the model remains in the database
- **AND** existing references are preserved

#### Scenario: Reactivate model
- **GIVEN** an inactive model
- **WHEN** setting isActive to true
- **THEN** the model is available for use again
- **AND** it appears in filtered queries for active models

### Requirement: Model Selection for Projects

The system SHALL allow projects to select default models for OCR and LLM operations.

#### Scenario: Project selects OCR model
- **GIVEN** a project and at least one OCR model (category='ocr')
- **WHEN** setting project.ocrModelId
- **THEN** only models with 'ocr' capability can be selected
- **AND** the reference is stored as a UUID
- **AND** extraction operations use this model by default

#### Scenario: Project selects LLM model
- **GIVEN** a project and at least one LLM model (category='llm')
- **WHEN** setting project.llmModelId
- **THEN** only models with 'llm' capability can be selected
- **AND** the reference is stored as a UUID
- **AND** extraction operations use this model by default

#### Scenario: Model deletion affects projects
- **GIVEN** a project with a default model configured
- **WHEN** that model is deleted
- **THEN** the project's default model reference is set to null
- **AND** the system falls back to a global default or config.yaml
- **AND** a warning is shown to users

### Requirement: Secret Parameter Handling

The system SHALL handle secret parameters (API keys) securely.

#### Scenario: Mask secret parameters in list responses
- **GIVEN** models with apiKey parameters
- **WHEN** listing models via `/models`
- **THEN** secret parameters are masked (e.g., "sk-***")
- **AND** only partial values or indicators are shown

#### Scenario: Include secrets in detail responses
- **GIVEN** a model with secret parameters
- **WHEN** retrieving model details via `/models/:id`
- **THEN** secret parameters are included (for editing)
- **AND** only authorized users can view full secret values
- **AND** audit logs are created for secret access

#### Scenario: Validate secret parameter requirements
- **GIVEN** an adapter schema that requires an API key
- **WHEN** creating a model without the required secret
- **THEN** the model is rejected
- **AND** a validation error indicates the missing secret parameter
