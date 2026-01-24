## ADDED Requirements

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

