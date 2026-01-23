## MODIFIED Requirements

### Requirement: Dialog-Based Forms
The web application SHALL use modal dialogs for entity creation and editing forms that do not require deep-linking, and SHALL use a dedicated route page for the Manifests audit/edit flow.

#### Scenario: Manifest audit navigation
- **WHEN** a user clicks a manifest row/card to audit or edit
- **THEN** the system SHALL navigate to the manifest audit page route
- **AND** the system SHALL NOT open a modal dialog for this flow

#### Scenario: Group create/edit uses modal
- **WHEN** a user creates or edits a Group from the Project Detail page
- **THEN** the system SHALL open a modal dialog for the Group form
- **AND** the current page scroll position SHALL be preserved after closing

#### Scenario: Long editors use side-sheet dialogs
- **WHEN** a user creates or edits a Schema, Prompt, or Validation Script
- **THEN** the system SHOULD open a side-sheet style dialog (scrollable content area)
- **AND** the system SHALL NOT navigate away from the current route

#### Scenario: Dirty form close confirmation
- **GIVEN** a user has modified a form in an open dialog (dirty state)
- **WHEN** the user attempts to close the dialog (Escape, backdrop click, close button, or Cancel)
- **THEN** the system SHALL prompt the user to confirm discarding changes
- **AND** closing SHALL proceed only after explicit confirmation

