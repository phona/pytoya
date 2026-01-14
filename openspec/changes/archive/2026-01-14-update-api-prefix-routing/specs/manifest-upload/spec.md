## MODIFIED Requirements
### Requirement: File Upload
The system SHALL accept PDF file uploads and store them in local filesystem.

#### Scenario: Single file upload
- **WHEN** authenticated user uploads single PDF file to a group via `POST /api/groups/:groupId/manifests` (multipart field `file`)
- **THEN** file is saved to `projects/{projectId}/groups/{groupId}/manifests/{filename}`
- **AND** manifest record is created in database

#### Scenario: Batch file upload
- **WHEN** authenticated user selects multiple PDF files
- **THEN** all files are uploaded
- **AND** manifest records are created for each file
- **AND** upload progress is shown

#### Scenario: File organization
- **WHEN** files are uploaded
- **THEN** storage structure follows `projects/{projectId}/groups/{groupId}/manifests/`
- **AND** filenames are preserved or timestamped to avoid conflicts

## MODIFIED Requirements
### Requirement: Manifest CRUD
The system SHALL provide full CRUD operations for manifest records.

#### Scenario: List manifests
- **WHEN** authenticated user requests manifests for a group
- **THEN** all manifests for that group are returned
- **AND** results include status, file metadata

#### Scenario: Update manifest metadata
- **WHEN** authenticated user updates manifest extraction data
- **THEN** manifest record is updated in database
- **AND** file storage is unchanged

#### Scenario: Delete manifest
- **WHEN** authenticated user deletes manifest
- **THEN** manifest record is removed from database
- **AND** PDF file is deleted from filesystem

