## MODIFIED Requirements

### Requirement: Export Manifests as Excel
The system SHALL support exporting manifests as an Excel workbook (`.xlsx`) for both filtered and selected scopes.

#### Scenario: Manifests sheet uses schema-defined columns
- **GIVEN** the project’s active JSON Schema defines `x-table-columns` as an ordered list of dot paths
- **WHEN** the system exports manifests to `.xlsx`
- **THEN** the `Manifests` sheet SHALL include stable manifest metadata columns
- **AND** the `Manifests` sheet SHALL include extracted-data columns in the same order as `x-table-columns`

#### Scenario: Export falls back when no columns configured
- **GIVEN** the project’s active JSON Schema has no `x-table-columns` (or it is empty)
- **WHEN** the system exports manifests to `.xlsx`
- **THEN** the workbook SHALL include a column containing JSON-stringified `extractedData`

#### Scenario: Filtered Excel export supports list filter parity
- **GIVEN** an authenticated user has applied filters in the manifests list
- **WHEN** the user exports a filtered scope as Excel
- **THEN** the Excel export filter semantics SHALL match the manifests list filter semantics
