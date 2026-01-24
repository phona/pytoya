## ADDED Requirements

### Requirement: Audit header actions menu and shortcuts
The web application SHALL present audit actions in a compact header and SHALL support keyboard shortcuts for common actions.

#### Scenario: Header merges infrequent actions into Actions menu
- **GIVEN** the user is on the manifest audit page
- **THEN** the header SHALL show Save and Run validation as primary actions
- **AND** the header SHALL provide an "Actions" menu containing Refresh results, Refresh OCR cache, and Extract

#### Scenario: Keyboard shortcuts trigger actions when safe
- **GIVEN** the user is on the manifest audit page
- **AND** focus is not inside a text input/textarea/contenteditable element
- **AND** no modal dialog is open
- **WHEN** the user presses a supported shortcut key
- **THEN** the corresponding action SHALL run (Save, Validation, Refresh results, Refresh OCR cache, Extract)

### Requirement: Refresh OCR cache
The web application SHALL allow users to rebuild the cached OCR result for a manifest.

#### Scenario: Rebuild OCR cache from audit actions
- **GIVEN** the user is on the manifest audit page
- **WHEN** the user selects "Refresh OCR cache"
- **THEN** the system SHALL rebuild and persist the OCR result for that manifest
- **AND** the OCR view SHALL update to reflect the refreshed OCR result

