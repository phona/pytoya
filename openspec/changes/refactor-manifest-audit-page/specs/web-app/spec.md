## MODIFIED Requirements

### Requirement: Dialog-Based Create and Edit
The web application SHALL use a shared centered dialog component for Models create/edit and Manifests upload flows, and SHALL use a dedicated route page for the Manifests audit/edit flow.

#### Scenario: Manifests audit page
- **WHEN** a user audits or edits a manifest
- **THEN** the system SHALL navigate to a dedicated audit page route
- **AND** the system SHALL render the audit panel as page content (not a modal dialog)
- **AND** the audit page SHALL be deep-linkable and refresh-safe

### Requirement: Dialog-Based Forms
The web application SHALL use modal dialogs for entity creation and editing forms that do not require deep-linking, and SHALL use a dedicated route page for the Manifests audit/edit flow.

#### Scenario: Manifest audit navigation
- **WHEN** a user clicks a manifest row/card to audit or edit
- **THEN** the system SHALL navigate to the manifest audit page route
- **AND** the system SHALL NOT open a modal dialog for this flow

