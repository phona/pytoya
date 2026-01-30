## MODIFIED Requirements

### Requirement: Manifests List Responsiveness
The web app SHALL avoid unnecessary list refetches when a single manifest is edited.

#### Scenario: Editing one manifest does not refetch unrelated groups
- **GIVEN** the user edits a manifest within a group
- **WHEN** the save request succeeds
- **THEN** the UI SHALL refresh the edited manifest and its group list
- **AND** the UI SHOULD NOT refetch manifest lists for other groups

