## MODIFIED Requirements

### Requirement: Multi-Step Project Creation Wizard
The web application SHALL provide a simplified multi-step wizard for creating projects with model selection, AI-assisted schema creation, and rule configuration.

#### Scenario: Start project creation
- **WHEN** a user clicks "New Project"
- **THEN** the system SHALL open a modal dialog containing the multi-step wizard
- **AND** the system SHALL NOT navigate away from the projects list page
- **AND** the system SHALL show progress indicator (Step 1 of 5)
- **AND** the step labels SHALL be: Basics, Models, Schema, Rules, Review

#### Scenario: Step 1 - Basic info
- **WHEN** the wizard is at step 1
- **THEN** the system SHALL prompt for project name and description
- **AND** the system SHALL validate that name is provided
- **AND** the system SHALL enable Next button when valid

#### Scenario: Step 2 - Model selection
- **WHEN** the wizard is at step 2
- **THEN** the system SHALL display available OCR models
- **AND** the system SHALL display available LLM models
- **AND** the system SHALL require selecting one OCR and one LLM model
- **AND** the system SHALL show model test status if available
- **AND** the system SHALL display note that selected LLM will assist with schema and rules creation

#### Scenario: Step 3 - Schema creation with JSON Editor
- **WHEN** the wizard is at step 3
- **THEN** the system SHALL display JSON Schema code editor with syntax highlighting
- **AND** the system SHALL provide "Generate by LLM" quick action button
- **AND** the system SHALL provide "Import File" quick action button
- **AND** the system SHALL provide toolbar actions: Format, Copy, Validate
- **AND** the system SHALL allow editing JSON directly in the editor
- **AND** the system SHALL NOT allow selecting existing schemas (schemas are project-scoped)

#### Scenario: Generate schema by LLM
- **GIVEN** a user has selected an LLM model in step 2
- **WHEN** user clicks "Generate by LLM" button
- **THEN** the system SHALL display generation modal with description input
- **AND** the system SHALL allow entering natural language description
- **AND** the system SHALL provide option to generate extraction hints
- **AND** the system SHALL send description and selected LLM to backend when submitted
- **AND** the system SHALL display loading state during generation
- **AND** the system SHALL populate JSON Editor with generated schema
- **AND** the generated schema SHALL include x-extraction-hint fields for extraction guidance

#### Scenario: Import JSON Schema file
- **WHEN** user clicks "Import File" button
- **THEN** the system SHALL display file upload modal with drag-and-drop
- **AND** the system SHALL accept .json files
- **AND** the system SHALL validate the JSON Schema with ajv
- **AND** the system SHALL show validation errors with line and position if invalid
- **AND** the system SHALL populate JSON Editor with imported schema if valid
- **AND** the system SHALL preserve x-extraction-hint fields if present in imported schema

#### Scenario: Edit JSON Schema directly
- **WHEN** user edits JSON in the editor
- **THEN** the system SHALL allow editing with syntax highlighting
- **AND** the system SHALL support x-extraction-hint custom fields
- **AND** the system SHALL provide Format button to prettify JSON
- **AND** the system SHALL provide Copy button to copy to clipboard
- **AND** the system SHALL provide Validate button to check JSON Schema validity
- **AND** the system SHALL display validation results with field count and hint coverage

#### Scenario: Step 4 - Rules with AI assistance
- **WHEN** the wizard is at step 4
- **THEN** the system SHALL display AI rule generation section
- **AND** the system SHALL allow entering validation requirements description
- **AND** the system SHALL provide "Generate Rules" button
- **AND** the system SHALL provide "Auto-Generate All Rules" button
- **AND** the system SHALL display list of generated/editable rules
- **AND** the system SHALL allow adding manual rules
- **AND** the system SHALL NOT allow importing rules from other schemas

#### Scenario: Generate rules with AI
- **GIVEN** a user has created a schema in step 3
- **WHEN** user enters rule description and clicks "Generate Rules"
- **THEN** the system SHALL send schema and description to backend
- **AND** the system SHALL display loading state during generation
- **AND** the system SHALL populate rule list with generated rules
- **AND** each rule SHALL be editable via rule editor

#### Scenario: Edit generated rule
- **GIVEN** a list of generated rules
- **WHEN** user clicks edit on a rule
- **THEN** the system SHALL open rule editor dialog
- **AND** the system SHALL allow modifying field path, type, operator, and config
- **AND** the system SHALL allow adjusting priority
- **AND** the system SHALL save changes on confirm

#### Scenario: Add manual rule
- **GIVEN** a user is on the Rules step
- **WHEN** user clicks "Add Manual Rule"
- **THEN** the system SHALL open rule editor with empty form
- **AND** the system SHALL allow selecting field from schema
- **AND** the system SHALL allow selecting rule type and operator
- **AND** the system SHALL allow entering rule config
- **AND** the system SHALL add rule to list on save

#### Scenario: Step 5 - Review and create
- **WHEN** the wizard is at step 5
- **THEN** the system SHALL display summary of project name, description
- **AND** the system SHALL display selected models (OCR and LLM)
- **AND** the system SHALL display schema summary
- **AND** the system SHALL display rules count and preview
- **AND** the system SHALL allow navigation back to previous steps
- **AND** the system SHALL create project, schema, and rules upon confirmation
- **AND** the system SHALL redirect to project detail page on success

#### Scenario: Wizard navigation
- **WHEN** the user clicks Next
- **THEN** the system SHALL validate current step
- **AND** the system SHALL proceed to next step if valid
- **AND** the system SHALL show validation errors if invalid
- **WHEN** the user clicks Back
- **THEN** the system SHALL return to previous step
- **AND** the system SHALL preserve entered data

## REMOVED Requirements

### Requirement: Step 2 - Extraction strategy selection
**Reason**: Simplification - wizard now focuses on schema-based extraction only.

#### Scenario: Step 2 - Extraction strategy selection
- **WHEN** the wizard is at step 2
- **THEN** the system SHALL prompt to choose extraction strategy
- **AND** the system SHALL display options: "Schema-based" or "Prompt-based"
- **AND** the system SHALL proceed to step 3a for schema-based or step 3b for prompt-based

### Requirement: Step 3b - Prompt optimization (prompt-based)
**Reason**: Removed along with extraction strategy selection.

#### Scenario: Step 3b - Prompt optimization (prompt-based)
- **WHEN** the user selected prompt-based strategy
- **THEN** the system SHALL display prompt optimization interface
- **AND** the system SHALL prompt user to describe extraction requirements
- **AND** the system SHALL send description to LLM for prompt generation
- **AND** the system SHALL display optimized prompt for review
- **AND** the system SHALL allow manual editing of generated prompt

### Requirement: Step 4 - Model selection (old position)
**Reason**: Model selection moved to Step 2 to enable AI assistance in later steps.

#### Scenario: Step 4 - Model selection
- **WHEN** the wizard is at step 4
- **THEN** the system SHALL display available OCR models
- **AND** the system SHALL display available LLM models
- **AND** the system SHALL require selecting one OCR and one LLM model
- **AND** the system SHALL show model test status if available
