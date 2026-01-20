## MODIFIED Requirements
### Requirement: Project Management
The system SHALL allow users to create, read, update, and delete projects, including a multi-step wizard for creating projects with associated models, extraction strategy, and validation configuration.

#### Scenario: Create project with schema-based extraction
- **WHEN** an authenticated user creates a project via the wizard with schema-based extraction
- **THEN** the system SHALL create a new project entity
- **AND** the system SHALL associate selected schema with the project
- **AND** the system SHALL associate selected text extractor and LLM model with the project
- **AND** the system SHALL set the extraction strategy to "schema"

#### Scenario: Create project with prompt-based extraction
- **WHEN** an authenticated user creates a project via the wizard with prompt-based extraction
- **THEN** the system SHALL create a new project entity
- **AND** the system SHALL store the optimized prompt with the project
- **AND** the system SHALL associate selected text extractor and LLM model with the project
- **AND** the system SHALL set the extraction strategy to "prompt"

### Requirement: Project-level Model Configuration
The system SHALL allow configuring default text extractor and LLM model per project.

#### Scenario: Set project text extractor
- **GIVEN** an authenticated user and at least one text extractor exists
- **WHEN** updating project.textExtractorId with a valid extractor UUID
- **THEN** the extractor reference is saved
- **AND** the extractor is used as the default for text extraction in this project

#### Scenario: Set project LLM model
- **GIVEN** an authenticated user and at least one LLM model exists
- **WHEN** updating project.llmModelId with a valid model UUID
- **THEN** the model reference is saved
- **AND** the model must have 'llm' capability
- **AND** the model is used as the default for LLM operations in this project

#### Scenario: Clear project model reference
- **GIVEN** a project with a default configuration
- **WHEN** setting the text extractor or LLM model reference to null
- **THEN** the reference is cleared
- **AND** the system falls back to global defaults or config.yaml
- **AND** existing extractions are not affected

#### Scenario: Validate model capability
- **GIVEN** a project update request
- **WHEN** setting llmModelId to a model without 'llm' capability
- **THEN** the update is rejected
- **AND** a validation error indicates the model type mismatch

#### Scenario: Validate model existence
- **GIVEN** a project update request
- **WHEN** setting textExtractorId or llmModelId to a non-existent UUID
- **THEN** the update is rejected
- **AND** a validation error indicates the reference was not found

#### Scenario: Deletion affects project
- **GIVEN** a project with default extractor/model configured
- **WHEN** one of them is deleted
- **THEN** the project's reference is automatically set to null
- **AND** the project continues to function with fallback configuration
