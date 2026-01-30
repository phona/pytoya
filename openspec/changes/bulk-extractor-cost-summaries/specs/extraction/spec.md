## MODIFIED Requirements

### Requirement: Extraction Cost Tracking
The system SHALL calculate and store text extraction cost when pricing configuration is provided.

#### Scenario: Retrieve extractor cost summaries in bulk
- **GIVEN** cost data exists for multiple extractors
- **WHEN** a client calls `GET /api/extractors/cost-summaries`
- **THEN** the system SHALL return a list of per-extractor cost summaries
- **AND** each entry SHALL include extractorId, total cost, and average cost per extraction

