# manifest-upload Specification

## Purpose
TBD - created by archiving change implement-manifest-upload. Update Purpose after archive.
## Requirements
### Requirement: File Upload
The system SHALL store uploaded files in a way that remains accessible to background extraction workers under the configured deployment topology.

#### Scenario: Worker can access stored files
- **GIVEN** a manifest has been uploaded and stored
- **WHEN** an extraction job runs in a separate worker process/pod
- **THEN** the worker SHALL be able to read the manifest file by the stored reference (e.g., storagePath)
- **AND** the uploads backend (local disk vs shared storage) SHALL be configurable by deployment

### Requirement: Manifest CRUD
The system SHALL provide full CRUD operations for manifest records with server-side filtering, sorting, and pagination support.

#### Scenario: List manifests
- **WHEN** authenticated user requests manifests for a group
- **THEN** the response SHALL be an envelope `{ data, meta }`
- **AND** `data` SHALL include all manifests for that group
- **AND** `meta` SHALL include `{ total, page, pageSize, totalPages }`
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
- **THEN** response includes first 25 manifests in `data`
- **AND** `meta` includes `{ total, page, pageSize, totalPages }`

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
