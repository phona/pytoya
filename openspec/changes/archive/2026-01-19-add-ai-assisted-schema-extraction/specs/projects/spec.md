## MODIFIED Requirements

### Requirement: Project Management
The system SHALL allow users to create, read, update, and delete projects, including a simplified multi-step wizard for creating projects with model configuration, schema-based extraction, and validation rules.

#### Scenario: Create project with schema-based extraction and rules
- **WHEN** an authenticated user creates a project via the wizard
- **THEN** the system SHALL create a new project entity
- **AND** the system SHALL associate selected schema with the project
- **AND** the system SHALL associate selected OCR and LLM models with the project
- **AND** the system SHALL set the extraction strategy to "schema"
- **AND** the system SHALL associate validation rules with the schema

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
