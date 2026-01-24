# manifest-upload Specification

## Purpose
TBD - created by archiving change implement-manifest-upload. Update Purpose after archive.
## Requirements
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

### Requirement: Bulk Delete Manifests
The system SHALL support deleting multiple manifests within a group in a single request, and SHALL delete the corresponding stored files.

#### Scenario: Bulk delete manifests by id
- **GIVEN** an authenticated user who owns the project
- **AND** a group with one or more manifests
- **WHEN** the client calls `POST /api/groups/:groupId/manifests/delete-bulk` with `manifestIds`
- **THEN** the system SHALL delete those manifests from the database
- **AND** the system SHALL delete the corresponding files from storage
- **AND** the system SHALL return `deletedCount`

#### Scenario: Bulk delete rejects manifests outside the group
- **GIVEN** an authenticated user who owns the project
- **WHEN** the client calls the bulk delete endpoint with any `manifestId` not in `groupId`
- **THEN** the system SHALL return an error response

