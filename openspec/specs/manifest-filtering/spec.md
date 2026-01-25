# manifest-filtering Specification

## Purpose
TBD - created by archiving change add-dynamic-manifest-filtering. Update Purpose after archive.
## Requirements
### Requirement: Dynamic Field Filtering
The system SHALL support filtering manifests by extracted data fields using dot-notation paths and SHALL NOT require invoice-centric “system filter” parameters for core functionality.

#### Scenario: Filter using dynamic extracted-data filters
- **WHEN** authenticated user requests `GET /groups/1/manifests?filter[invoice.po_no]=0000009`
- **THEN** only manifests with matching extracted data are returned
- **AND** the system SHALL NOT require `poNo=...` as a special-case parameter

### Requirement: Dynamic Field Sorting
The system SHALL support sorting manifests by extracted data fields using semantics derived from schema type information (not field-name business rules).

#### Scenario: Sort by schema string field
- **GIVEN** a schema field path resolves to a `type=string` field
- **WHEN** authenticated user requests `GET /groups/1/manifests?sortBy=invoice.po_no&order=asc`
- **THEN** manifests are sorted using lexicographic string ordering (stable, deterministic)

#### Scenario: Sort by schema numeric field
- **GIVEN** a schema field path resolves to a `type=number` or `type=integer` field
- **WHEN** authenticated user requests `GET /groups/1/manifests?sortBy=invoice.total_amount&order=desc`
- **THEN** manifests are sorted using numeric ordering

### Requirement: Pagination Support
The system SHALL support pagination for manifest list responses.

#### Scenario: Paginate manifests
- **WHEN** authenticated user requests `GET /groups/1/manifests?page=1&pageSize=25`
- **THEN** response includes first 25 manifests
- **AND** response metadata includes total count and page info

#### Scenario: Pagination with filters
- **WHEN** authenticated user requests `GET /groups/1/manifests?filter[invoice.po_no]=0000&page=1&pageSize=25`
- **THEN** paginated response includes only filtered manifests
- **AND** total count reflects filtered results

#### Scenario: Pagination with sort
- **WHEN** authenticated user requests `GET /groups/1/manifests?sortBy=invoice.po_no&order=asc&page=2&pageSize=25`
- **THEN** second page of sorted results is returned

### Requirement: SQL-Safe Field Path Validation
The system SHALL validate field paths to prevent SQL injection attacks.

#### Scenario: Valid field path accepted
- **WHEN** field path matches regex `/^[a-zA-Z_][a-zA-Z0-9_.]*$/`
- **THEN** query is executed with validated path

#### Scenario: SQL injection attempt blocked
- **WHEN** field path contains SQL metacharacters (`;`, `'`, `"`, `--`, `OR`, `DROP`)
- **THEN** request is rejected with 400 Bad Request
- **AND** error message indicates invalid field path format

#### Scenario: Path traversal attempt blocked
- **WHEN** field path contains `../` or parent references
- **THEN** request is rejected with 400 Bad Request

### Requirement: JSONB Query Building
The system SHALL convert dot-notation paths to PostgreSQL JSONB operators.

#### Scenario: Single-level field
- **WHEN** field path is `status`
- **THEN** query uses `manifest.status = :value`

#### Scenario: Nested object field
- **WHEN** field path is `invoice.po_no`
- **THEN** query uses `extractedData -> 'invoice' ->> 'po_no' ILIKE :value`

#### Scenario: Deeply nested field
- **WHEN** field path is `receipt.merchant.name`
- **THEN** query uses `extractedData -> 'receipt' -> 'merchant' ->> 'name' ILIKE :value`

### Requirement: Cancellation Outcome Is Visible
The system SHALL expose user-initiated cancellation as a distinct outcome in user-facing history (not indistinguishable from failures).

#### Scenario: UI shows canceled vs failed
- **GIVEN** a job was canceled by the user
- **WHEN** the job is displayed in UI/history
- **THEN** it SHALL be labeled as canceled (not failed)

