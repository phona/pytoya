# projects Specification Delta

## MODIFIED Requirements

### Requirement: Project-level Model Configuration

The system SHALL allow configuring default OCR and LLM models per project.

#### Scenario: Set project OCR model
- **GIVEN** an authenticated user and at least one OCR model exists
- **WHEN** updating project.ocrModelId with a valid model UUID
- **THEN** the model reference is saved
- **AND** the model must have 'ocr' capability
- **AND** the model is used as the default for OCR operations in this project

#### Scenario: Set project LLM model
- **GIVEN** an authenticated user and at least one LLM model exists
- **WHEN** updating project.llmModelId with a valid model UUID
- **THEN** the model reference is saved
- **AND** the model must have 'llm' capability
- **AND** the model is used as the default for LLM operations in this project

#### Scenario: Clear project model reference
- **GIVEN** a project with a default model configured
- **WHEN** setting the model reference to null
- **THEN** the reference is cleared
- **AND** the system falls back to global defaults or config.yaml
- **AND** existing extractions are not affected

#### Scenario: Validate model capability
- **GIVEN** a project update request
- **WHEN** setting ocrModelId to a model without 'ocr' capability
- **THEN** the update is rejected
- **AND** a validation error indicates the model type mismatch

#### Scenario: Validate model existence
- **GIVEN** a project update request
- **WHEN** setting ocrModelId or llmModelId to a non-existent UUID
- **THEN** the update is rejected
- **AND** a validation error indicates the model was not found

#### Scenario: Model deletion affects project
- **GIVEN** a project with default models configured
- **WHEN** one of the models is deleted
- **THEN** the project's model reference is automatically set to null
- **AND** the project continues to function with fallback models

## REMOVED Requirements

### ~~Project-level Provider Configuration~~

This requirement is replaced by Project-level Model Configuration above.

~~The system SHALL allow configuring default provider and prompts per project.~~

~~#### Scenario: Set project provider~~
~~- **WHEN** authenticated user selects provider for project~~
~~- **THEN** project.default_provider_id is saved~~
~~- **AND** provider is used for extractions in that project~~
