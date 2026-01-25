## MODIFIED Requirements

### Requirement: Manifest CRUD
The system SHALL provide full CRUD operations for manifest records with server-side filtering, sorting, and pagination support.

#### Scenario: List manifests returns a stable envelope
- **WHEN** an authenticated user requests `GET /groups/1/manifests`
- **THEN** the response SHALL be an envelope `{ data, meta }`
- **AND** `data` SHALL include all manifests for that group
- **AND** `meta` SHALL include `{ total, page, pageSize, totalPages }`

#### Scenario: List manifests with filtering
- **WHEN** authenticated user requests `GET /groups/1/manifests?filter[invoice.po_no]=0000009`
- **THEN** the response SHALL be an envelope `{ data, meta }`
- **AND** `data` SHALL include only manifests matching the filter

#### Scenario: List manifests with pagination
- **WHEN** authenticated user requests `GET /groups/1/manifests?page=1&pageSize=25`
- **THEN** the response SHALL be an envelope `{ data, meta }`
- **AND** `meta` SHALL include `{ total, page, pageSize, totalPages }`

