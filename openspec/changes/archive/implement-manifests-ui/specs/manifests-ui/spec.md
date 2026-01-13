## ADDED Requirements

### Requirement: Manifest List with Filters
The system SHALL display manifests with advanced filtering and sorting.

#### Scenario: Filter by status
- **WHEN** user selects status filter (pending/processing/completed/failed)
- **THEN** only manifests with that status are displayed
- **AND** filter count is updated

#### Scenario: Search by PO number
- **WHEN** user enters PO number in search box
- **THEN** manifests matching that PO are shown
- **AND** search is case-insensitive

#### Scenario: Date range filter
- **WHEN** user selects date range
- **THEN** manifests with invoice_date in range are displayed

#### Scenario: Confidence range filter
- **WHEN** user adjusts confidence slider
- **THEN** manifests with confidence in range are shown
- **AND** results update in real-time

#### Scenario: Human verified filter
- **WHEN** user checks "Human verified only"
- **THEN** only manifests with human_checked=true are shown

#### Scenario: Sort by field
- **WHEN** user selects sort option (PO, date, confidence)
- **THEN** manifests are sorted by selected field
- **AND** sort direction is maintained

### Requirement: Audit Panel
The system SHALL provide two-column audit panel for reviewing and editing extracted data.

#### Scenario: View manifest in audit panel
- **WHEN** user clicks manifest from list
- **THEN** audit panel opens with PDF on left and form on right
- **AND** current extraction data is populated in form

#### Scenario: Edit extracted data
- **WHEN** user edits form field and saves
- **THEN** changes are persisted to database
- **AND** save success notification is shown
- **AND** manifest status is updated

#### Scenario: Auto-save
- **WHEN** user edits form field
- **THEN** changes are debounced for 2 seconds
- **AND** auto-save is triggered
- **AND** unsaved changes indicator is shown

### Requirement: Re-extract Features
The system SHALL allow re-extracting entire manifest or individual fields.

#### Scenario: Re-extract all
- **WHEN** user clicks "Re-extract All" button
- **THEN** full extraction job is queued
- **AND** manifest status is set to processing
- **AND** WebSocket updates show progress

#### Scenario: Re-extract single field
- **WHEN** user clicks re-extract button next to PO number
- **THEN** targeted extraction is triggered
- **AND** only that field value is updated
- **AND** extraction info notes the re-extraction

#### Scenario: View OCR result
- **WHEN** user switches to "OCR Result" tab
- **THEN** raw OCR markdown is displayed
- **AND** user can copy or reference OCR data

### Requirement: Items Management
The system SHALL allow adding, editing, and deleting invoice items.

#### Scenario: Add new item
- **WHEN** user clicks "Add Item" button
- **THEN** new item form appears with blank fields
- **AND** item is added to items array on save

#### Scenario: Edit item
- **WHEN** user modifies item fields
- **THEN** changes are reflected in items array
- **AND** validation checks are performed (unit must be KG/EA/M)

#### Scenario: Delete item
- **WHEN** user clicks delete button on item
- **THEN** item is removed from array
- **AND** user is prompted for confirmation
