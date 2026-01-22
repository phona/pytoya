## ADDED Requirements

### Requirement: Duplicate Upload Warning
The web application SHALL warn the user when one or more uploaded manifest files were detected as duplicates.

#### Scenario: Upload shows duplicate summary
- **GIVEN** the user uploads one or more manifest files
- **WHEN** the upload response includes one or more items with `isDuplicate=true`
- **THEN** the UI shows a clear summary (e.g. "Created N, duplicates M")
- **AND** the UI offers an action to review duplicates

#### Scenario: Review duplicates
- **GIVEN** the upload summary indicates duplicates occurred
- **WHEN** the user selects "Review duplicates"
- **THEN** the UI lists duplicated filenames
- **AND** each item provides an "Open existing" action that navigates to the existing manifest

