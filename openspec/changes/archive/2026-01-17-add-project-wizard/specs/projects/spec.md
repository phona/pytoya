## MODIFIED Requirements

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

## ADDED Requirements

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
