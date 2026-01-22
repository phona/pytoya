## MODIFIED Requirements

### Requirement: Dialog-Based Create and Edit
The web application SHALL use a shared centered dialog component for Models create/edit and Manifests upload flows, and SHALL use a dedicated route page for the Manifests audit/edit flow.

#### Scenario: Manifests audit page
- **WHEN** a user audits or edits a manifest
- **THEN** the system SHALL navigate to a dedicated audit page route
- **AND** the system SHALL render a full-height split view (PDF + audit form)
- **AND** the audit page SHALL be deep-linkable and refresh-safe

### Requirement: Dialog-Based Forms
The web application SHALL use modal dialogs for entity creation and editing forms that do not require deep-linking, and SHALL use a dedicated route page for the Manifests audit/edit flow.

#### Scenario: Manifest audit navigation
- **WHEN** a user clicks a manifest row/card to audit or edit
- **THEN** the system SHALL navigate to the manifest audit page route
- **AND** the system SHALL NOT open a modal dialog for this flow

### Requirement: Schema-Driven Manifest Audit Form
The web application SHALL render manifest audit form fields dynamically from the project JSON Schema.

#### Scenario: Schema adds a new leaf field
- **GIVEN** a project JSON Schema defines a leaf field path not previously present
- **WHEN** a user opens the manifest audit page for a manifest in that project
- **THEN** the audit form SHALL render an editable input for that field
- **AND** edits to the field SHALL be saved back into `manifest.extractedData` at the same field path

#### Scenario: Schema defines an array of objects
- **GIVEN** the JSON Schema defines an array field whose `items` is an object schema
- **WHEN** the audit form renders that array field
- **THEN** the UI SHALL render editable rows using the schema-defined properties
- **AND** the UI SHALL NOT hardcode per-row field names

#### Scenario: Field hints and confidence signals
- **GIVEN** the JSON Schema provides `x-extraction-hint` for a field path
- **WHEN** the audit form renders that field
- **THEN** the UI SHALL display the hint text for that field
- **AND** the UI SHALL display confidence highlighting when field confidence is available

#### Scenario: Re-extract per field
- **WHEN** the user clicks “Re-extract” for a rendered field
- **THEN** the system SHALL initiate re-extraction for that field path
