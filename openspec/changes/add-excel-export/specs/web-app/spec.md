## MODIFIED Requirements

### Requirement: Manifest list batch actions use consistent scope modals
The web application SHALL present a consistent scope confirmation modal UX for the Manifests list batch actions: Export CSV, Export Excel, Run validation, and Extract.

#### Scenario: Default scope is filtered
- **GIVEN** a user is on the Manifests list page with any selection state
- **WHEN** the user opens Export (CSV/Excel), Run validation, or Extract
- **THEN** the system SHALL default the scope to “All matching current filters”

#### Scenario: Selected-only scope is available when there is a selection
- **GIVEN** a user has selected one or more manifests on the Manifests list page
- **WHEN** the user opens Export (CSV/Excel), Run validation, or Extract
- **THEN** the system SHALL allow switching the scope to “Selected only”

#### Scenario: Selected-only scope is disabled when there is no selection
- **GIVEN** a user has selected zero manifests on the Manifests list page
- **WHEN** the user opens Export (CSV/Excel), Run validation, or Extract
- **THEN** the system SHALL disable “Selected only” scope selection

#### Scenario: Export format selection
- **WHEN** the user opens the Export modal on the Manifests list page
- **THEN** the UI SHALL allow choosing the export format: CSV or Excel (`.xlsx`)

