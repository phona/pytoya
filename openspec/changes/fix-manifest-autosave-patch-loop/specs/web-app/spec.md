## MODIFIED Requirements

### Requirement: Schema-Driven Manifest Audit Form
The web application SHALL render manifest audit form fields dynamically from the project JSON Schema.

#### Scenario: Debounced auto-save does not re-enter (no PATCH loop)
- **GIVEN** a user edits one or more fields in the manifest audit form
- **WHEN** the user pauses editing
- **THEN** the web application SHALL debounce auto-save for ~3 seconds after the last edit
- **AND** the system SHALL send at most one `PATCH /api/manifests/:id` request per stable draft within the debounce window
- **AND** the system SHALL NOT repeatedly re-trigger auto-save solely due to component re-renders or `onSave` callback identity changes

