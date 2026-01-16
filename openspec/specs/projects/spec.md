# projects Specification

## Purpose
TBD - created by archiving change implement-projects-groups. Update Purpose after archive.
## Requirements
### Requirement: Project Management
The system SHALL allow users to create, read, update, and delete projects.

#### Scenario: Create project
- **WHEN** authenticated user creates project with name and description
- **THEN** project is saved to database
- **AND** project is visible in projects list

#### Scenario: List projects
- **WHEN** authenticated user navigates to projects page
- **THEN** all user's projects are displayed
- **AND** projects show group count and manifest count

#### Scenario: Update project
- **WHEN** authenticated user edits project name or description
- **THEN** project is updated in database
- **AND** UI reflects changes

#### Scenario: Delete project
- **WHEN** authenticated user deletes project
- **THEN** project and all associated data (groups, manifests) are deleted

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

