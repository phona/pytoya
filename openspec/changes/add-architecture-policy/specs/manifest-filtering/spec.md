## MODIFIED Requirements

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

