## MODIFIED Requirements

### Requirement: File Upload
The system SHALL accept PDF file uploads and store them in local filesystem, and SHALL detect duplicate uploads within a group.

#### Scenario: Single file upload (non-duplicate)
- **WHEN** authenticated user uploads a PDF file to a group
- **THEN** the system saves the file to `projects/{projectId}/groups/{groupId}/manifests/{filename}`
- **AND** the system creates a manifest record in the database
- **AND** the upload response indicates `isDuplicate=false`

#### Scenario: Single file upload (duplicate)
- **GIVEN** a manifest already exists in the group with identical file content
- **WHEN** authenticated user uploads the same PDF content to the group
- **THEN** the system SHALL NOT create a new manifest record
- **AND** the system SHALL NOT store an additional copy of the PDF
- **AND** the system returns the existing manifest
- **AND** the upload response indicates `isDuplicate=true`

#### Scenario: Batch file upload with duplicates
- **WHEN** authenticated user selects multiple PDF files for a group (including duplicates)
- **THEN** the system processes each file independently
- **AND** each response item includes `isDuplicate` so the client can compute a summary
- **AND** upload progress is shown

