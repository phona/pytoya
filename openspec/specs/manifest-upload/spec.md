# manifest-upload Specification

## Purpose
TBD - created by archiving change implement-manifest-upload. Update Purpose after archive.
## Requirements
### Requirement: File Upload
The system SHALL accept PDF file uploads and store them in local filesystem.

#### Scenario: Single file upload
- **WHEN** authenticated user uploads single PDF file to a group
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

### Requirement: Manifest CRUD
The system SHALL provide full CRUD operations for manifest records with server-side filtering, sorting, and pagination support.

#### Scenario: List manifests
- **WHEN** authenticated user requests manifests for a group
- **THEN** all manifests for that group are returned (backward compatible)
- **AND** results include status, file metadata
- **AND** optional filter parameter `filter[fieldPath]=value` filters by extracted data
- **AND** optional sort parameters `sortBy=fieldPath&order=asc|desc` sort results
- **AND** optional pagination parameters `page=N&pageSize=N` limit results

#### Scenario: List manifests with filtering
- **WHEN** authenticated user requests `GET /groups/1/manifests?filter[invoice.po_no]=0000009`
- **THEN** only manifests matching the filter are returned
- **AND** filter uses dot-notation paths into extractedData JSONB
- **AND** matching is case-insensitive partial match

#### Scenario: List manifests with sorting
- **WHEN** authenticated user requests `GET /groups/1/manifests?sortBy=invoice.po_no&order=asc`
- **THEN** manifests are sorted by the specified field
- **AND** sort order follows the `order` parameter (asc or desc)

#### Scenario: List manifests with pagination
- **WHEN** authenticated user requests `GET /groups/1/manifests?page=1&pageSize=25`
- **THEN** first 25 manifests are returned
- **AND** response includes metadata: `{ total, page, pageSize, totalPages }`

#### Scenario: List manifests with combined parameters
- **WHEN** authenticated user requests with filter, sort, and pagination
- **THEN** results are filtered, then sorted, then paginated
- **AND** total count reflects filtered results

#### Scenario: Update manifest metadata
- **WHEN** authenticated user updates manifest extraction data
- **THEN** manifest record is updated in database
- **AND** file storage is unchanged

#### Scenario: Delete manifest
- **WHEN** authenticated user deletes manifest
- **THEN** manifest record is removed from database
- **AND** PDF file is deleted from filesystem

