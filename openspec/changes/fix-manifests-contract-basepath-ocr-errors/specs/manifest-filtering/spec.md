## MODIFIED Requirements

### Requirement: Pagination Support
The system SHALL support pagination for manifest list responses.

#### Scenario: Paginate manifests returns an envelope
- **WHEN** authenticated user requests `GET /groups/1/manifests?page=1&pageSize=25`
- **THEN** response SHALL be an envelope `{ data, meta }`
- **AND** `data` SHALL include first 25 manifests
- **AND** `meta` SHALL include total count and page info

