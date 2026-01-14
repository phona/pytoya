# csv-export Specification

## Purpose
TBD - created by archiving change implement-csv-export. Update Purpose after archive.
## Requirements
### Requirement: CSV Export
The system SHALL export manifest data to CSV format with advanced filtering.

#### Scenario: Export all manifests
- **WHEN** authenticated user clicks "Export CSV" on manifests list
- **THEN** CSV file is generated with all visible manifests
- **AND** CSV contains all extracted data fields (PO, date, department, items)
- **AND** file download is triggered

#### Scenario: Export with filters
- **WHEN** user applies filters (status, PO range, date range) before export
- **THEN** CSV contains only filtered manifests
- **AND** filter criteria are reflected in filename (e.g., manifests-completed-2024-01-12.csv)

#### Scenario: Export selected manifests
- **WHEN** user selects multiple manifests and clicks "Export Selected"
- **THEN** web calls `POST /api/manifests/export/csv` with `{ manifestIds: [...] }`
- **AND** CSV contains only selected manifests
- **AND** selection order is preserved in CSV

#### Scenario: Export by group
- **WHEN** user exports from project detail page
- **THEN** CSV contains all manifests in that project
- **AND** filename includes project name

