## MODIFIED Requirements

### Requirement: Batch Action Scope Defaults
The web app SHALL choose safe, intention-preserving defaults for batch action scopes.

#### Scenario: Selection defaults to “Selected scope”
- **GIVEN** a user has selected one or more manifests
- **WHEN** the user opens a batch action modal
- **THEN** the modal SHALL default to “Selected”
- **AND** the user MAY switch to “Filtered” explicitly

