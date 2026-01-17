# projects Specification

## Purpose
TBD - created by archiving change implement-projects-groups. Update Purpose after archive.
## Requirements
### Requirement: Project Management
The system SHALL allow users to create, read, update, and delete projects, including a multi-step wizard for creating projects with associated models, extraction strategy, and validation configuration.

#### Scenario: Create project with schema-based extraction
- **WHEN** an authenticated user creates a project via the wizard with schema-based extraction
- **THEN** the system SHALL create a new project entity
- **AND** the system SHALL associate selected schema with the project
- **AND** the system SHALL associate selected OCR and LLM models with the project
- **AND** the system SHALL set the extraction strategy to "schema"

#### Scenario: Create project with prompt-based extraction
- **WHEN** an authenticated user creates a project via the wizard with prompt-based extraction
- **THEN** the system SHALL create a new project entity
- **AND** the system SHALL store the optimized prompt with the project
- **AND** the system SHALL associate selected OCR and LLM models with the project
- **AND** the system SHALL set the extraction strategy to "prompt"

#### Scenario: List projects
- **WHEN** an authenticated user navigates to the projects page
- **THEN** all user's projects are displayed
- **AND** projects show group count and manifest count

#### Scenario: Update project
- **WHEN** an authenticated user edits project name or description
- **THEN** the project is updated in the database
- **AND** the UI reflects changes

#### Scenario: Delete project
- **WHEN** an authenticated user deletes a project
- **THEN** the project and all associated data (groups, manifests) are deleted

### Requirement: Group Management
The system SHALL allow users to create, read, update, and delete groups within projects.

#### Scenario: Create group under project
- **WHEN** authenticated user creates group within a project
- **THEN** group is saved with project_id foreign key
- **AND** group appears in project detail page

#### Scenario: List groups in project
- **WHEN** authenticated user views project detail
- **THEN** all groups for that project are displayed

#### Scenario: Delete group
- **WHEN** authenticated user deletes group
- **THEN** group and all associated manifests are deleted
- **AND** project remains intact

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

### Requirement: Per-Project Validation Scripts
The system SHALL allow validation scripts to be configured at the project level rather than globally.

#### Scenario: Add validation script to project
- **WHEN** a user adds a validation script to a project
- **THEN** the system SHALL store validation script with project entity
- **AND** the system SHALL apply validation rules during extraction for that project
- **AND** the system SHALL NOT apply validation rules to other projects

#### Scenario: Remove validation script from project
- **WHEN** a user removes a validation script from a project
- **THEN** the system SHALL delete validation script from project
- **AND** the system SHALL stop applying validation during extraction

