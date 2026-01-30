## MODIFIED Requirements

### Requirement: Pagination Support
The system SHALL support pagination for manifest list responses.

#### Scenario: Pagination defaults apply when omitted
- **WHEN** an authenticated user requests `GET /groups/1/manifests` without `page` and `pageSize`
- **THEN** the system SHALL return a paginated envelope `{ data, meta }`
- **AND** `meta.page` SHALL default to 1
- **AND** `meta.pageSize` SHALL default to the server default page size

