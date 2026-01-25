# excel-export Specification

## Purpose
TBD - created by archiving change add-excel-export. Update Purpose after archive.
## Requirements
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

### Requirement: Excel Workbook Contains Manifest and Item Tables
The Excel workbook SHALL provide tables that support spreadsheet analysis.

#### Scenario: Two-sheet default layout
- **WHEN** the system generates an Excel workbook for manifests
- **THEN** the workbook SHALL include a `Manifests` sheet with 1 row per manifest
- **AND** the workbook SHALL include an `Items` sheet with 1 row per item
- **AND** the `Items` sheet SHALL include a join key (`manifest_id` or equivalent)

### Requirement: Excel Export Safety
The system SHALL prevent spreadsheet injection risks in exported workbooks.

#### Scenario: User-controlled values are not formulas
- **GIVEN** a manifest contains user-controlled string values beginning with `=`, `+`, `-`, or `@`
- **WHEN** the system exports to `.xlsx`
- **THEN** the workbook SHALL store those values as string cells
- **AND** the workbook SHALL NOT create formula cells from user-controlled content

