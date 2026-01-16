## MODIFIED Requirements

### Requirement: Dashboard Navigation
The web application SHALL provide a simplified sidebar navigation in the dashboard for accessing main application sections.

#### Scenario: Display navigation menu
- **WHEN** a user is on any dashboard page
- **THEN** the system SHALL display a sidebar navigation menu
- **AND** the menu SHALL include links to Projects and Models
- **AND** the menu SHALL include a Settings link for user preferences
- **AND** the menu SHALL highlight the currently active route

#### Scenario: Removed navigation items
- **WHEN** the sidebar navigation is displayed
- **THEN** the system SHALL NOT display direct links to Schemas
- **AND** the system SHALL NOT display direct links to Prompts
- **AND** the system SHALL NOT display direct links to Validation Scripts
- **AND** these items SHALL be accessible through the project creation wizard or project settings

## ADDED Requirements

### Requirement: Dialog-Based Forms
The web application SHALL use modal dialogs for all entity creation and editing forms, overlaying the current list page without navigation.

#### Scenario: Open form dialog
- **WHEN** a user clicks "New [Entity]" or "Edit" on a list page
- **THEN** the system SHALL open a modal dialog overlay
- **AND** the system SHALL NOT navigate to a new route
- **AND** the system SHALL preserve the list page context behind the dialog

#### Scenario: Close form dialog
- **WHEN** a user clicks cancel, close button, or presses Escape
- **THEN** the system SHALL close the dialog
- **AND** the system SHALL return focus to the triggering element
- **AND** the list page SHALL remain unchanged

#### Scenario: Submit form dialog
- **WHEN** a user submits the form successfully
- **THEN** the system SHALL close the dialog
- **AND** the system SHALL refresh the list page with new data
- **AND** the system SHALL display success notification

#### Scenario: Dialog accessibility
- **WHEN** a dialog is open
- **THEN** the system SHALL trap focus within the dialog
- **AND** the system SHALL set aria-modal="true"
- **AND** the system SHALL manage focus return on close

#### Scenario: Model form dialog
- **WHEN** a user creates or edits a model
- **THEN** the system SHALL display the form in a dialog
- **AND** the system SHALL NOT use a separate page for forms

### Requirement: Multi-Step Project Creation Wizard
The web application SHALL provide a multi-step wizard for creating projects with inline schema and prompt configuration.

#### Scenario: Start project creation
- **WHEN** a user clicks "New Project"
- **THEN** the system SHALL open a modal dialog containing the multi-step wizard
- **AND** the system SHALL NOT navigate away from the projects list page
- **AND** the system SHALL show progress indicator (Step 1 of 5)

#### Scenario: Step 1 - Basic info
- **WHEN** the wizard is at step 1
- **THEN** the system SHALL prompt for project name and description
- **AND** the system SHALL validate that name is provided
- **AND** the system SHALL enable Next button when valid

#### Scenario: Step 2 - Extraction strategy selection
- **WHEN** the wizard is at step 2
- **THEN** the system SHALL prompt to choose extraction strategy
- **AND** the system SHALL display options: "Schema-based" or "Prompt-based"
- **AND** the system SHALL proceed to step 3a for schema-based or step 3b for prompt-based

#### Scenario: Step 3a - Schema builder (schema-based)
- **WHEN** the user selected schema-based strategy
- **THEN** the system SHALL display visual schema builder
- **AND** the system SHALL allow creating JSON schema with form fields
- **AND** the system SHALL provide preview of schema structure
- **AND** the system SHALL allow naming and saving the schema

#### Scenario: Step 3b - Prompt optimization (prompt-based)
- **WHEN** the user selected prompt-based strategy
- **THEN** the system SHALL display prompt optimization interface
- **AND** the system SHALL prompt user to describe extraction requirements
- **AND** the system SHALL send description to LLM for prompt generation
- **AND** the system SHALL display optimized prompt for review
- **AND** the system SHALL allow manual editing of generated prompt

#### Scenario: Step 4 - Model selection
- **WHEN** the wizard is at step 4
- **THEN** the system SHALL display available OCR models
- **AND** the system SHALL display available LLM models
- **AND** the system SHALL require selecting one OCR and one LLM model
- **AND** the system SHALL show model test status if available

#### Scenario: Step 5 - Review and create
- **WHEN** the wizard is at step 5
- **THEN** the system SHALL display summary of all selections
- **AND** the system SHALL allow navigation back to previous steps
- **AND** the system SHALL create project upon confirmation
- **AND** the system SHALL redirect to project detail page on success

#### Scenario: Wizard navigation
- **WHEN** the user clicks Next
- **THEN** the system SHALL validate current step
- **AND** the system SHALL proceed to next step if valid
- **AND** the system SHALL show validation errors if invalid
- **WHEN** the user clicks Back
- **THEN** the system SHALL return to previous step
- **AND** the system SHALL preserve entered data

### Requirement: LLM Prompt Optimization
The web application SHALL provide LLM-assisted prompt optimization for extraction prompts.

#### Scenario: Generate prompt from description
- **WHEN** a user enters extraction requirements description
- **THEN** the system SHALL send description to backend optimization endpoint
- **AND** the backend SHALL use configured LLM to generate optimized prompt
- **AND** the system SHALL display generated prompt in editor

#### Scenario: Edit generated prompt
- **WHEN** a prompt is generated
- **THEN** the system SHALL allow manual editing
- **AND** the system SHALL preserve edits when navigating wizard steps

#### Scenario: Regenerate prompt
- **WHEN** a user clicks regenerate
- **THEN** the system SHALL call optimization endpoint again
- **AND** the system SHALL replace current prompt with new generation

### Requirement: Inline Schema Management
The web application SHALL allow schema creation and management within the project creation wizard.

#### Scenario: Create new schema in wizard
- **WHEN** a user is in schema-based extraction step
- **THEN** the system SHALL allow creating new schema
- **AND** the system SHALL save schema as entity when project is created
- **AND** the system SHALL associate schema with project

#### Scenario: Edit existing schema in wizard
- **WHEN** a user selects an existing schema
- **THEN** the system SHALL load schema into visual builder
- **AND** the system SHALL allow modifications
- **AND** the system SHALL create new version or update existing

### Requirement: Per-Project Validation Scripts
The web application SHALL allow validation script configuration within individual projects.

#### Scenario: Access validation scripts
- **WHEN** a user is viewing a project detail page
- **THEN** the system SHALL display validation scripts section
- **AND** the system SHALL allow adding/editing validation rules

#### Scenario: Add validation rule
- **WHEN** a user adds a validation script
- **THEN** the system SHALL prompt for field name and validation expression
- **AND** the system SHALL save script to project
- **AND** the system SHALL apply validation during extraction
