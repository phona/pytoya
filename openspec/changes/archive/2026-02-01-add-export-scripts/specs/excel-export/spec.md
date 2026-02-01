## MODIFIED Requirements

### Requirement: Export Manifests as Excel
The system SHALL support exporting manifests as an Excel workbook (`.xlsx`) for both filtered and selected scopes.

#### Scenario: Export filtered manifests as Excel
- **GIVEN** an authenticated user is on the Manifests list page with filters applied
- **WHEN** the user exports using scope “All matching current filters” and format “Excel (.xlsx)”
- **THEN** the system SHALL return an `.xlsx` attachment download
- **AND** the workbook SHALL include at least a `Manifests` sheet

#### Scenario: Export selected manifests as Excel
- **GIVEN** an authenticated user has selected one or more manifests
- **WHEN** the user exports using scope “Selected only” and format “Excel (.xlsx)”
- **THEN** the web SHALL call `POST /api/manifests/export/xlsx` with `{ manifestIds: [...] }`
- **AND** the system SHALL return an `.xlsx` attachment download

#### Scenario: Export fails when export script fails
- **GIVEN** a project has an enabled export script
- **AND** the export script throws or returns an invalid shape
- **WHEN** the user exports to `.xlsx`
- **THEN** the export SHALL fail with a user-visible error identifying the script

### Requirement: Excel Workbook Contains Manifest and Item Tables
The Excel workbook SHALL provide tables that support spreadsheet analysis.

#### Scenario: Two-sheet default layout
- **WHEN** the system generates an Excel workbook for manifests
- **THEN** the workbook SHALL include a `Manifests` sheet with 1 row per manifest
- **AND** the workbook SHALL include an `Items` sheet with 1 row per item
- **AND** the `Items` sheet SHALL include a join key (`manifest_id` or equivalent)

#### Scenario: Manifests sheet applies export scripts when enabled
- **GIVEN** a project has one or more enabled export scripts
- **WHEN** the system generates an Excel workbook for manifests
- **THEN** the system SHALL execute `exportRows(extractedData, ctx)` for each manifest
- **AND** the `Manifests` sheet SHALL contain one row per returned row object
- **AND** each row SHALL include a join key (`manifest_id` or equivalent)
- **AND** the `Items` sheet behavior SHALL remain unchanged
