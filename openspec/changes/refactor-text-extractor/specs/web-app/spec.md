## ADDED Requirements

### Requirement: Text Extraction Settings Page
The web application SHALL provide a settings page for configuring text extraction per project.

#### Scenario: Navigate to text extraction settings
- **GIVEN** a user is logged in as a project owner
- **WHEN** the user navigates to `/projects/:id/text-extraction`
- **THEN** the system SHALL display the Text Extraction Settings page
- **AND** the page SHALL show the current extractor configuration
- **AND** the page SHALL allow the user to modify the configuration

#### Scenario: View current extractor configuration
- **GIVEN** a project with a configured extractor
- **WHEN** the text extraction settings page loads
- **THEN** the system SHALL display the configured extractor name
- **AND** the system SHALL display the extractor category (OCR/Vision/Hybrid)
- **AND** the system SHALL display current parameter values (with secrets masked)

#### Scenario: Select extractor category
- **GIVEN** a user is on the text extraction settings page
- **WHEN** the user clicks on a category tab (OCR, Vision, or Hybrid)
- **THEN** the system SHALL filter extractors to show only that category
- **AND** the system SHALL update the extractor dropdown with filtered options

### Requirement: Extractor Selection Component
The web application SHALL provide a component for selecting and configuring text extractors.

#### Scenario: Search and filter extractors
- **GIVEN** the extractor selector component is displayed
- **WHEN** the user types in the search input
- **THEN** the system SHALL filter extractors by name and description
- **AND** the system SHALL update the dropdown list with matching results

#### Scenario: Select extractor from dropdown
- **GIVEN** the extractor dropdown is open
- **WHEN** the user selects an extractor
- **THEN** the system SHALL display the extractor's parameter form
- **AND** the system SHALL pre-fill the form with default values from schema

#### Scenario: View extractor details before selection
- **GIVEN** the extractor dropdown is open
- **WHEN** the user hovers over an extractor option
- **THEN** the system SHALL display a tooltip with the extractor's description
- **AND** the tooltip SHALL show supported file formats

### Requirement: Extractor Preset Selection
The web application SHALL provide preset configurations for common vision models.

#### Scenario: View available presets
- **GIVEN** the user has selected the Vision category
- **WHEN** the preset section is displayed
- **THEN** the system SHALL show preset cards for common models (GPT-4o, Claude, Qwen)
- **AND** each card SHALL display the model name and provider
- **AND** each card SHALL have a "Select" button

#### Scenario: Select preset configuration
- **GIVEN** the preset cards are displayed
- **WHEN** the user clicks the "Select" button on a preset
- **THEN** the system SHALL pre-fill the configuration form with preset values
- **AND** the system SHALL focus the API key input field
- **AND** the user SHALL only need to provide the API key

#### Scenario: Configure custom extractor after preset
- **GIVEN** a user has selected a preset
- **WHEN** the user modifies any parameter value
- **THEN** the system SHALL update the form to show "Custom" instead of the preset name
- **AND** the system SHALL indicate the configuration differs from the preset

### Requirement: Dynamic Configuration Form
The web application SHALL generate configuration forms dynamically based on extractor parameter schemas.

#### Scenario: Generate form from schema
- **GIVEN** an extractor with parameter schema is selected
- **WHEN** the schema is fetched from `GET /api/extractors/:id/schema`
- **THEN** the system SHALL generate a form field for each parameter
- **AND** each field SHALL use the appropriate input type based on parameter type
- **AND** required fields SHALL be marked with an asterisk

#### Scenario: String parameter input
- **GIVEN** a parameter with type 'string'
- **WHEN** rendering the form field
- **THEN** the system SHALL display a text input
- **AND** the input SHALL have the parameter's label as placeholder
- **AND** the input SHALL show the parameter's description as helper text

#### Scenario: Number parameter input
- **GIVEN** a parameter with type 'number'
- **WHEN** rendering the form field
- **THEN** the system SHALL display a number input
- **AND** the input SHALL enforce numeric validation
- **AND** the input SHALL show the parameter's description as helper text

#### Scenario: Boolean parameter input
- **GIVEN** a parameter with type 'boolean'
- **WHEN** rendering the form field
- **THEN** the system SHALL display a toggle switch
- **AND** the switch SHALL show the parameter's label
- **AND** the switch SHALL show the parameter's description as helper text

#### Scenario: Enum parameter input
- **GIVEN** a parameter with type 'enum'
- **WHEN** rendering the form field
- **THEN** the system SHALL display a select dropdown
- **AND** the dropdown SHALL contain options from the parameter's enumValues
- **AND** the dropdown SHALL display the parameter's label

#### Scenario: API Key parameter input
- **GIVEN** a parameter with type 'apiKey' and secret=true
- **WHEN** rendering the form field
- **THEN** the system SHALL display a password input with masking
- **AND** the input SHALL have a visibility toggle button (eye icon)
- **AND** the input SHALL have a copy to clipboard button
- **AND** existing values SHALL be masked as bullets (•••••••••••••)

### Requirement: Configuration Validation
The web application SHALL validate extractor configurations inline before submission.

#### Scenario: Validate on field change
- **GIVEN** a user is filling out the configuration form
- **WHEN** the user changes a field value
- **THEN** the system SHALL validate the field against the parameter schema
- **AND** the system SHALL display an inline error if validation fails
- **AND** the system SHALL clear the error when the value becomes valid

#### Scenario: Show required field errors
- **GIVEN** a user has not filled a required field
- **WHEN** the user attempts to save the configuration
- **THEN** the system SHALL highlight the missing required fields
- **AND** the system SHALL display error messages below each missing field
- **AND** the system SHALL prevent saving until all required fields are filled

#### Scenario: Validate via API before save
- **GIVEN** a user has filled all required fields
- **WHEN** the user clicks the Save button
- **THEN** the system SHALL call `POST /api/extractors/validate`
- **AND** the system SHALL display API validation errors if any
- **AND** the system SHALL save the configuration only if validation passes

### Requirement: Test Configuration Feature
The web application SHALL allow users to test their extractor configuration before saving.

#### Scenario: Test extractor configuration
- **GIVEN** a user has filled in the extractor configuration
- **WHEN** the user clicks the "Test Configuration" button
- **THEN** the system SHALL call `POST /api/projects/:id/extractor-config/test`
- **AND** the system SHALL show a loading state during the test
- **AND** the system SHALL display the test result when complete

#### Scenario: Display successful test result
- **GIVEN** the test extraction completed successfully
- **WHEN** the test result is received
- **THEN** the system SHALL display a success message
- **AND** the system SHALL show a sample of extracted text
- **AND** the system SHALL show the extraction time

#### Scenario: Display failed test result
- **GIVEN** the test extraction failed
- **WHEN** the test result is received
- **THEN** the system SHALL display an error message
- **AND** the system SHALL show the error details from the API
- **AND** the system SHALL suggest common fixes (e.g., "Check API key")

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

### Requirement: Secure API Key Handling
The web application SHALL handle API keys securely in the UI.

#### Scenario: Mask existing API keys
- **GIVEN** a configuration with an existing API key
- **WHEN** the configuration form loads
- **THEN** the API key input SHALL show masked bullets instead of the actual key
- **AND** the input SHALL indicate the key is configured (not empty)

#### Scenario: Toggle API key visibility
- **GIVEN** an API key input field with masked value
- **WHEN** the user clicks the eye icon
- **THEN** the system SHALL reveal the actual API key
- **AND** the user can click again to mask it

#### Scenario: Copy API key to clipboard
- **GIVEN** an API key input field
- **WHEN** the user clicks the copy button
- **THEN** the system SHALL copy the API key to the clipboard
- **AND** the system SHALL show a "Copied!" confirmation tooltip

#### Scenario: Indicate API key change
- **GIVEN** an existing API key configuration
- **WHEN** the user modifies the API key value
- **THEN** the system SHALL display a "Changed" indicator next to the field
- **AND** the system SHALL warn the user that the key will be updated on save

### Requirement: Configuration Persistence
The web application SHALL save and load extractor configurations per project.

#### Scenario: Save extractor configuration
- **GIVEN** a user has filled and validated the configuration form
- **WHEN** the user clicks the Save button
- **THEN** the system SHALL call `PUT /api/projects/:id/extractor-config`
- **AND** the system SHALL show a success message when saved
- **AND** the system SHALL update the current configuration display

#### Scenario: Cancel configuration changes
- **GIVEN** a user has made changes to the configuration form
- **WHEN** the user clicks the Cancel button
- **THEN** the system SHALL discard unsaved changes
- **AND** the system SHALL reload the saved configuration
- **AND** the system SHALL navigate back to the previous page if confirmation is accepted

#### Scenario: Load configuration on page mount
- **GIVEN** a user navigates to the text extraction settings page
- **WHEN** the page component mounts
- **THEN** the system SHALL call `GET /api/projects/:id/extractor-config`
- **AND** the system SHALL pre-fill the form with the loaded configuration
- **AND** the system SHALL show a loading state during the fetch

### Requirement: Error Handling and Feedback
The web application SHALL provide clear feedback for errors and loading states.

#### Scenario: Show loading state during fetch
- **GIVEN** the page is fetching extractor metadata or configuration
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
- **GIVEN** a user has made unsaved changes to the configuration
- **WHEN** the user attempts to navigate away
- **THEN** the system SHALL display a confirmation dialog
- **AND** the dialog SHALL warn about unsaved changes
- **AND** the system SHALL allow the user to stay or discard changes

### Requirement: Navigation Integration
The web application SHALL integrate text extraction settings into project settings navigation.

#### Scenario: Access from project settings
- **GIVEN** a user is on a project-related page
- **WHEN** the user opens the project settings menu
- **THEN** the menu SHALL include a "Text Extraction" option
- **AND** clicking the option SHALL navigate to the text extraction settings page

#### Scenario: Breadcrumb navigation
- **GIVEN** a user is on the text extraction settings page
- **WHEN** the page is displayed
- **THEN** the breadcrumb SHALL show "Projects > [Project Name] > Settings > Text Extraction"
- **AND** clicking any breadcrumb segment SHALL navigate to that level
