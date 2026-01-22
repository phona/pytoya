## MODIFIED Requirements

### Requirement: Manifest List Display

The manifest list SHALL display manifests with extraction controls and OCR quality, and SHALL render schema-driven summary fields as dynamic columns derived from the project's active JSON Schema. The manifest list SHALL allow sorting and filtering by those schema-driven fields.

#### Scenario: Minimal default system columns

- **WHEN** the manifest list table renders
- **THEN** the table SHALL render a minimal set of non-schema columns suitable for a summary view (e.g., Filename, Status, Actions)
- **AND** the table MAY render a selection checkbox column only when batch actions are enabled

#### Scenario: Use schema-defined table columns

- **GIVEN** the project's active JSON Schema defines `x-table-columns` as a non-empty ordered list of dot-paths (e.g., `invoice.po_no`, `department.code`)
- **WHEN** the manifest list table renders
- **THEN** the table SHALL render a column for each configured field path in order
- **AND** each cell value SHALL be read from `manifest.extractedData` using the dot-path
- **AND** missing values SHALL render as `N/A` (or equivalent)

#### Scenario: Explicit opt-out with empty `x-table-columns`

- **GIVEN** the project's active JSON Schema defines `x-table-columns` as an empty array (`[]`)
- **WHEN** the manifest list table renders
- **THEN** the table SHALL render no schema-driven columns
- **AND** the table SHALL NOT fall back to auto-selected schema fields

#### Scenario: Fallback column selection when `x-table-columns` is absent

- **GIVEN** the project's active JSON Schema does not define `x-table-columns`
- **WHEN** the manifest list table renders
- **THEN** the table SHOULD select a small capped set of scalar leaf fields from the schema for display
- **AND** required fields SHOULD be prioritized
- **AND** array fields (paths containing `[]`) SHALL NOT be selected as table columns

#### Scenario: Sort by schema-driven field

- **GIVEN** schema-driven columns are visible in the manifest list table
- **WHEN** the user clicks a schema-driven column header to sort
- **THEN** the system SHALL request the manifest list with `sortBy=<fieldPath>&order=<asc|desc>`
- **AND** the UI SHALL display the active sort indicator on that column

#### Scenario: Filter by schema-driven field using column filter dropdown

- **GIVEN** schema-driven columns are visible in the manifest list table
- **WHEN** the user opens a schema-driven column filter dropdown
- **AND** the user types a value or selects an available value
- **THEN** the manifest list query SHALL include `filter[<fieldPath>]=<value>`
- **AND** the results SHALL update to show only matching manifests

#### Scenario: Toggle visible schema columns via Columns dropdown

- **GIVEN** schema-driven columns are available in the manifest list table
- **WHEN** the user opens the Columns dropdown
- **AND** the user unchecks one schema-driven field
- **THEN** the manifest list table SHALL hide that schema-driven column
- **AND** pinned columns (e.g., Filename, Actions) SHALL remain visible

#### Scenario: Navigate to manifest audit via Filename

- **GIVEN** the manifest list table is visible
- **WHEN** the user clicks anywhere on a manifest row
- **THEN** the system SHALL NOT navigate away (row click is non-navigational)
- **WHEN** the user clicks the Filename value
- **THEN** the system SHALL navigate to the manifest audit/detail view

#### Scenario: Actions available via a single menu

- **GIVEN** the manifest list table is visible
- **WHEN** the user opens the `⋮` menu in the Actions column
- **THEN** the menu SHALL include high-signal actions for the manifest (e.g., Preview OCR, Run validation, Extract / Re-extract)
- **AND** low-signal or global actions (e.g., “Update rules”) SHOULD NOT appear in the per-row Actions menu
