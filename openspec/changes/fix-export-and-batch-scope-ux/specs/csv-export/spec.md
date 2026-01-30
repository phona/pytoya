## MODIFIED Requirements

### Requirement: CSV Export
The system SHALL export manifest data to CSV using schema-driven extracted-data columns (no invoice-only default headers).

#### Scenario: Export supports list filter parity
- **GIVEN** the manifests list supports filtering by status, humanVerified, confidence, OCR quality, extraction status, cost, extractor fields, and dynamic extracted-data filters
- **WHEN** an authenticated user exports CSV for a filtered scope
- **THEN** the export filters SHALL support the same filter semantics as the manifests list

#### Scenario: CSV export has a maximum size
- **GIVEN** a filtered export scope matches a very large number of manifests
- **WHEN** an authenticated user exports CSV
- **THEN** the system SHALL reject the export with a clear error message
- **AND** the message SHOULD suggest narrowing filters
