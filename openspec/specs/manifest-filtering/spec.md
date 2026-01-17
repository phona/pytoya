# manifest-filtering Specification

## Purpose
TBD - created by archiving change add-dynamic-manifest-filtering. Update Purpose after archive.
## Requirements
### Requirement: Dynamic Field Filtering
The system SHALL support filtering manifests by any extracted data field using dot-notation paths.

#### Scenario: Filter by invoice PO number
- **WHEN** authenticated user requests `GET /groups/1/manifests?filter[invoice.po_no]=0000009`
- **THEN** only manifests with matching PO number are returned
- **AND** filter uses case-insensitive partial match (ILIKE)

#### Scenario: Filter by credit card ID
- **WHEN** authenticated user requests `GET /groups/1/manifests?filter[credit_card.id_number]=4532`
- **THEN** only manifests with matching credit card ID are returned

#### Scenario: Filter by receipt merchant
- **WHEN** authenticated user requests `GET /groups/1/manifests?filter[receipt.merchant]=Amazon`
- **THEN** only receipts from that merchant are returned

#### Scenario: Multiple filters (AND logic)
- **WHEN** authenticated user requests `GET /groups/1/manifests?filter[invoice.po_no]=0000009&filter[department.code]=ENG`
- **THEN** only manifests matching BOTH conditions are returned

#### Scenario: Invalid field path rejected
- **WHEN** authenticated user requests `GET /groups/1/manifests?filter[invo;ice.po]=value`
- **THEN** request is rejected with 400 Bad Request
- **AND** error message indicates invalid field path

### Requirement: Dynamic Field Sorting
The system SHALL support sorting manifests by any extracted data field.

#### Scenario: Sort by PO number ascending
- **WHEN** authenticated user requests `GET /groups/1/manifests?sortBy=invoice.po_no&order=asc`
- **THEN** manifests are sorted by PO number in ascending order
- **AND** PO numbers are compared as numeric values

#### Scenario: Sort by invoice date descending
- **WHEN** authenticated user requests `GET /groups/1/manifests?sortBy=invoice.invoice_date&order=desc`
- **THEN** manifests are sorted by invoice date, newest first

#### Scenario: Sort by credit card last 4 digits
- **WHEN** authenticated user requests `GET /groups/1/manifests?sortBy=credit_card.last_4_digits&order=asc`
- **THEN** manifests are sorted by last 4 digits as text

#### Scenario: Sort with filter applied
- **WHEN** authenticated user requests `GET /groups/1/manifests?filter[invoice.po_no]=0000&sortBy=invoice.total_amount&order=desc`
- **THEN** filtered results are sorted by total amount descending

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

