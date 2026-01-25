## ADDED Requirements

### Requirement: System Filter Columns Reflect Extracted Data
The system SHALL keep denormalized manifest columns used for server-side filtering and sorting in sync with the manifest’s extracted data.

#### Scenario: PO number filter works after extraction
- **GIVEN** a manifest has extracted data with `invoice.po_no`
- **WHEN** the system persists extraction results
- **THEN** the manifest `purchaseOrder` column SHALL be updated to match
- **AND** filtering by PO number using system filters SHALL return the manifest

#### Scenario: Manual edit updates projections
- **GIVEN** a manifest’s extracted data is edited by a user
- **WHEN** the manifest is saved
- **THEN** projected columns (PO number, invoice date, department) SHALL be recalculated

