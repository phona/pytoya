## MODIFIED Requirements

### Requirement: Manual OCR Trigger
The system SHALL NOT allow triggering OCR processing independently of extraction.

#### Scenario: Manual OCR endpoint is not available
- **WHEN** an authenticated user attempts to trigger OCR via an OCR trigger endpoint
- **THEN** the request SHALL be rejected (e.g. 404 Not Found)
- **AND** the user MUST start extraction to generate OCR results

### Requirement: Filtered Bulk Extraction
The system SHALL support triggering extraction for all manifests matching a set of manifest list filters, without requiring the client to enumerate manifest IDs across pages.

#### Scenario: Queue jobs for filtered extraction
- **WHEN** an authenticated user requests filtered extraction
- **THEN** the system SHALL enqueue one extraction job per matching manifest
- **AND** OCR/text extraction MAY occur during job execution (after the user explicitly starts extraction)

### Requirement: Cost Estimation Removed
The system SHALL NOT expose cost estimation endpoints or return estimated cost fields when starting extraction.

#### Scenario: Cost estimate endpoint is not available
- **WHEN** an authenticated user requests `GET /manifests/cost-estimate`
- **THEN** the request SHALL be rejected (e.g. 404 Not Found)

#### Scenario: Starting extraction returns only job identifiers
- **WHEN** an authenticated user starts extraction (single, bulk, or filtered)
- **THEN** the response SHALL include job identifiers
- **AND** the response MUST NOT include estimated cost fields
