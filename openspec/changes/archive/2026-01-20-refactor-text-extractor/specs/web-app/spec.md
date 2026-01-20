## ADDED Requirements

### Requirement: Global Extractors Page
The web application SHALL provide a global page for managing text extractors.

#### Scenario: Navigate to extractors page
- **GIVEN** a user is logged in
- **WHEN** the user navigates to `/extractors`
- **THEN** the system SHALL display the Extractors page
- **AND** the page SHALL show a list of extractors and a "New Extractor" action

#### Scenario: List extractor cards
- **GIVEN** extractors exist
- **WHEN** the page loads
- **THEN** each extractor card SHALL show name, description, extractor type, and active status
- **AND** each card SHALL show "Used by X projects" when usage data is available

#### Scenario: Create extractor
- **GIVEN** a user opens the new extractor dialog
- **WHEN** the user saves a valid configuration
- **THEN** the system SHALL call `POST /api/extractors`
- **AND** the list SHALL refresh with the new extractor

#### Scenario: Edit extractor
- **GIVEN** a user opens an existing extractor
- **WHEN** the user saves changes
- **THEN** the system SHALL call `PUT /api/extractors/:id`
- **AND** the list SHALL refresh with updated data

#### Scenario: Delete extractor
- **GIVEN** a user clicks delete on an extractor
- **WHEN** the system confirms deletion
- **THEN** the system SHALL call `DELETE /api/extractors/:id`
- **AND** the extractor SHALL be removed from the list
- **AND** if the extractor is in use, the system SHALL show a clear error

#### Scenario: Test extractor connection
- **GIVEN** a user clicks "Test" on an extractor card
- **WHEN** the test runs
- **THEN** the system SHALL call `POST /api/extractors/:id/test`
- **AND** the system SHALL display success or error details

### Requirement: Extractor Form with Dynamic Configuration
The web application SHALL generate extractor configuration forms based on type schemas.

#### Scenario: Load extractor types
- **WHEN** the extractor dialog opens
- **THEN** the system SHALL call `GET /api/extractors/types`
- **AND** the system SHALL populate the type selector from the response

#### Scenario: Generate form from schema
- **GIVEN** an extractor type is selected
- **WHEN** the schema is available
- **THEN** the system SHALL render a field for each parameter
- **AND** required fields SHALL be marked with an asterisk

#### Scenario: Apply preset configuration
- **GIVEN** presets are available
- **WHEN** the user selects a preset
- **THEN** the system SHALL pre-fill the configuration form
- **AND** the system SHALL focus the API key field

#### Scenario: Inline validation and save errors
- **GIVEN** a user edits configuration fields
- **WHEN** a field value is invalid
- **THEN** the system SHALL show an inline error message
- **AND** the system SHALL prevent save until errors are resolved

### Requirement: Extractor Preset Selection
The web application SHALL provide preset configurations for common vision models.

#### Scenario: View available presets
- **WHEN** the preset section is displayed
- **THEN** the system SHALL show preset cards for common models (GPT-4o, Claude, Qwen)
- **AND** each card SHALL display the model name and provider
- **AND** each card SHALL have a "Select" button

#### Scenario: Load presets from API
- **WHEN** the preset section loads
- **THEN** the system SHALL call `GET /api/extractors/presets`
- **AND** the UI SHALL render the returned preset list

### Requirement: Project Extractor Selection Page
The web application SHALL allow selecting a global extractor for a project.

#### Scenario: Navigate to project extractor settings
- **GIVEN** a user is on a project page
- **WHEN** the user navigates to `/projects/:id/settings/extractors`
- **THEN** the system SHALL display the Project Extractor Settings page
- **AND** the page SHALL show the currently selected extractor

#### Scenario: Select extractor for project
- **GIVEN** the selection dialog is open
- **WHEN** the user selects an extractor and saves
- **THEN** the system SHALL call `PUT /api/projects/:id/extractor`
- **AND** the project SHALL update to use the selected extractor

#### Scenario: Selection is read-only for config
- **GIVEN** the project extractor settings page is open
- **THEN** the page SHALL not expose extractor configuration fields
- **AND** configuration edits SHALL only be available on the global Extractors page

### Requirement: Models Page LLM-Only
The web application SHALL limit the Models page to structured LLM configuration only.

#### Scenario: Remove OCR configuration from models
- **GIVEN** a user opens the Models page
- **WHEN** the model create/edit dialog is displayed
- **THEN** the form SHALL not include OCR or text extraction configuration fields
- **AND** the form SHALL focus on structured LLM settings only

#### Scenario: Vision-capable model does not require OCR config
- **GIVEN** a user configures a vision-capable model
- **WHEN** the model form is validated
- **THEN** the UI SHALL not require any OCR/text extraction configuration
- **AND** the user can save without OCR settings

#### Scenario: Direct users to Extractors for text extraction
- **GIVEN** a user is viewing model configuration help text
- **THEN** the UI SHALL indicate text extraction is configured in Extractors

### Requirement: Extractor Information Display
The web application SHALL display which extractor was used for each manifest extraction.

#### Scenario: Show extractor in manifest list
- **GIVEN** the manifests list page is displayed
- **WHEN** the page loads
- **THEN** each manifest row SHALL show the extractor used
- **AND** the system SHALL display an ExtractorStatusBadge with the extractor name
- **AND** the badge SHALL be color-coded by category (OCR=blue, Vision=purple, Hybrid=green)

#### Scenario: Show extractor details in manifest detail
- **GIVEN** a user clicks on a manifest to view details
- **WHEN** the manifest detail panel opens
- **THEN** the system SHALL display an "Extraction Info" section
- **AND** the section SHALL show the extractor name and version
- **AND** the section SHALL show the processing time
- **AND** the section SHALL show any additional metadata from the extractor

#### Scenario: Filter manifests by extractor
- **GIVEN** the manifests list page is displayed
- **WHEN** the user applies a filter for a specific extractor
- **THEN** the system SHALL filter the list to show only manifests processed by that extractor
- **AND** the filter badge SHALL show the extractor name

### Requirement: Cost Display
The web application SHALL display extraction costs when cost data is available.

#### Scenario: Show cost on extractor cards
- **GIVEN** extractor cost summaries are available
- **WHEN** the Extractors page loads
- **THEN** each extractor card SHALL show average cost per extraction
- **AND** each card SHALL show total spend when available

#### Scenario: Show cost in manifest list
- **GIVEN** manifests include extraction cost data
- **WHEN** the manifests list loads
- **THEN** each manifest row SHALL show the extraction cost

#### Scenario: Show cost breakdown in manifest detail
- **GIVEN** a manifest with extraction cost data
- **WHEN** the manifest detail panel opens
- **THEN** the system SHALL display a cost breakdown panel
- **AND** the panel SHALL show text extraction cost, LLM cost, and total cost when available

#### Scenario: Project cost summary page
- **GIVEN** a project with extraction cost history
- **WHEN** the user navigates to `/projects/:id/costs`
- **THEN** the system SHALL show total extraction costs and cost by extractor
- **AND** the system SHALL show cost over time

### Requirement: Secure API Key Handling
The web application SHALL handle extractor API keys securely in the UI.

#### Scenario: Mask existing API keys
- **GIVEN** an existing extractor configuration with an API key
- **WHEN** the configuration form loads
- **THEN** the API key input SHALL show masked bullets instead of the actual key
- **AND** the input SHALL indicate the key is configured

#### Scenario: Toggle API key visibility
- **GIVEN** a user has entered a new API key in the current session
- **WHEN** the user clicks the eye icon
- **THEN** the system SHALL reveal the entered API key
- **AND** the user can click again to mask it

#### Scenario: Copy API key to clipboard
- **GIVEN** a user has entered a new API key in the current session
- **WHEN** the user clicks the copy button
- **THEN** the system SHALL copy the API key to the clipboard
- **AND** the system SHALL show a "Copied!" confirmation tooltip

#### Scenario: Indicate API key change
- **GIVEN** an existing API key configuration
- **WHEN** the user modifies the API key value
- **THEN** the system SHALL display a "Changed" indicator next to the field
- **AND** the system SHALL warn the user that the key will be updated on save

### Requirement: Error Handling and Feedback
The web application SHALL provide clear feedback for errors and loading states.

#### Scenario: Show loading state during fetch
- **GIVEN** the page is fetching extractor data
- **WHEN** the fetch is in progress
- **THEN** the system SHALL display a loading spinner
- **AND** the system SHALL disable form inputs during loading

#### Scenario: Show error state on fetch failure
- **GIVEN** the API request fails
- **WHEN** the error is received
- **THEN** the system SHALL display an error message
- **AND** the system SHALL provide a "Retry" button
- **AND** the system SHALL log the error for debugging

#### Scenario: Show unsaved changes warning
- **GIVEN** a user has made unsaved changes to an extractor form
- **WHEN** the user attempts to navigate away
- **THEN** the system SHALL display a confirmation dialog
- **AND** the dialog SHALL warn about unsaved changes
- **AND** the system SHALL allow the user to stay or discard changes

### Requirement: Navigation Integration
The web application SHALL integrate extractor management into navigation.

#### Scenario: Sidebar includes Extractors
- **WHEN** the sidebar is rendered
- **THEN** the menu SHALL include an "Extractors" link
- **AND** clicking the link SHALL navigate to `/extractors`

#### Scenario: Project settings includes Extractors
- **GIVEN** a user opens the project settings menu
- **WHEN** the menu is displayed
- **THEN** the menu SHALL include an "Extractors" option
- **AND** clicking the option SHALL navigate to `/projects/:id/settings/extractors`

#### Scenario: Breadcrumb navigation
- **GIVEN** a user is on the project extractor settings page
- **WHEN** the page is displayed
- **THEN** the breadcrumb SHALL show "Projects > [Project Name] > Settings > Extractors"
- **AND** clicking any breadcrumb segment SHALL navigate to that level

## MODIFIED Requirements
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
- **THEN** the system SHALL display available text extractors
- **AND** the system SHALL display available LLM models
- **AND** the system SHALL require selecting one text extractor and one LLM model
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
