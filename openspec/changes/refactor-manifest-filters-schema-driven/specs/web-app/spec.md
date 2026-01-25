## MODIFIED Requirements

### Requirement: Manifest List Filtering UI
The web app SHALL support filtering by schema-driven extracted-data fields and SHOULD avoid invoice-centric filter UI controls when the project schema does not define invoice fields.

#### Scenario: Schema-driven filter UI
- **GIVEN** a project schema defines a set of fields for display (e.g., via `x-table-columns`)
- **WHEN** a user opens the manifests list filters
- **THEN** the UI SHALL present filter controls derived from schema configuration (not invoice-only fields)

