## MODIFIED Requirements

### Requirement: CSV Export
The system SHALL export manifest data to CSV using schema-driven extracted-data columns.

#### Scenario: Export uses schema-defined columns
- **GIVEN** the project's active JSON Schema defines `x-table-columns` as an ordered list of dot paths
- **WHEN** an authenticated user exports CSV
- **THEN** the CSV SHALL include stable manifest metadata columns
- **AND** the CSV SHALL include extracted-data columns in the same order as `x-table-columns`

#### Scenario: Export falls back when no columns configured
- **GIVEN** the project's active JSON Schema has no `x-table-columns` (or it is empty)
- **WHEN** an authenticated user exports CSV
- **THEN** the CSV SHALL include a column containing JSON-stringified `extractedData`

#### Scenario: Export applies export scripts when enabled
- **GIVEN** the project has one or more enabled export scripts
- **WHEN** an authenticated user exports CSV
- **THEN** the system SHALL execute `exportRows(extractedData, ctx)` for each manifest
- **AND** the CSV SHALL contain one output row per returned row object
- **AND** each output row SHALL include the stable manifest metadata columns

#### Scenario: Export fails when export script fails
- **GIVEN** the project has an enabled export script
- **AND** the export script throws or returns an invalid shape
- **WHEN** an authenticated user exports CSV
- **THEN** the export SHALL fail with a user-visible error identifying the script
