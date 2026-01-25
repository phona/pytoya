## MODIFIED Requirements

### Requirement: CSV Export
The system SHALL export manifest data to CSV using schema-driven extracted-data columns (no invoice-only default headers).

#### Scenario: Export uses schema-defined columns
- **GIVEN** the project's active JSON Schema defines `x-table-columns` as an ordered list of dot paths
- **WHEN** an authenticated user exports CSV
- **THEN** the CSV SHALL include stable manifest metadata columns
- **AND** the CSV SHALL include extracted-data columns in the same order as `x-table-columns`

#### Scenario: Export falls back when no columns configured
- **GIVEN** the project's active JSON Schema has no `x-table-columns` (or it is empty)
- **WHEN** an authenticated user exports CSV
- **THEN** the CSV SHALL include a column containing JSON-stringified `extractedData`

