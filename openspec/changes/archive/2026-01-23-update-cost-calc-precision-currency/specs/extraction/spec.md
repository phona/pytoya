## MODIFIED Requirements

### Requirement: Job Queue Processing

The system SHALL process extraction jobs asynchronously via BullMQ with cost tracking.

#### Scenario: Job queuing with cost estimate

- **WHEN** user triggers extraction for manifest(s)
- **THEN** job is added to BullMQ queue
- **AND** job record includes estimated cost **and currency**
- **AND** job status is set to queued
- **AND** job includes reference to cached OCR result

#### Scenario: Job completion with cost

- **WHEN** extraction completes successfully
- **THEN** system stores actual token usage and cost **with currency**
- **AND** manifest `extraction_cost` is updated
- **AND** job record is updated with actual cost **and currency**
- **AND** WebSocket event includes cost information **and currency**

### Requirement: Selective Extraction

The system SHALL allow users to select specific manifests for extraction.

#### Scenario: Extract selected manifests

- **GIVEN** user has selected multiple manifests from list
- **WHEN** user clicks "Extract Selected" button
- **THEN** system shows confirmation modal with:
  - Number of manifests to extract
  - Estimated cost range (min-max) **and currency**
  - Selected model and prompt
- **AND** user confirms extraction
- **THEN** system queues BullMQ job for each manifest
- **AND** system returns job ID for tracking

#### Scenario: Extract single manifest

- **GIVEN** user clicks "Extract" button on single manifest row
- **THEN** system shows confirmation with estimated cost **and currency**
- **AND** upon confirmation, queues single extraction job

#### Scenario: Cost estimation

- **WHEN** user requests extraction cost estimate
- **THEN** system calculates estimate from:
  - Number of manifests
  - Average OCR result token count
  - Selected model's token pricing
- **AND** returns estimated cost range (min and max) **and currency**

### Requirement: Extraction Cost Tracking
The system SHALL calculate and store text extraction cost when pricing configuration is provided.

#### Scenario: Store extraction cost metadata
- **GIVEN** an extractor returns cost metadata
- **WHEN** extraction completes
- **THEN** the manifest SHALL store extractionCost as a numeric total **and currency**
- **AND** the API SHALL return extractionCost **and currency** in manifest responses
- **AND** the API SHALL return textCost and llmCost breakdown when available (same currency)

#### Scenario: Text extraction cost uses textCost naming
- **GIVEN** a text extractor returns a calculated cost
- **WHEN** the extraction job completes
- **THEN** the system SHALL expose the value as textCost (actual usage)
- **AND** the total extractionCost SHALL include textCost + llmCost (same currency)

#### Scenario: Deterministic rounding
- **GIVEN** a manifest has token usage and pricing configured
- **WHEN** the system calculates cost for storage/transport
- **THEN** the system SHALL calculate using integer nano units (1e-9) internally
- **AND** the system SHALL round once at the boundary to a numeric value with up to 9 fractional digits

#### Scenario: Retrieve extractor cost summary
- **GIVEN** cost data exists for an extractor
- **WHEN** a client calls `GET /api/extractors/:id/cost-summary`
- **THEN** the system SHALL return total cost and average cost per extraction
- **AND** the response SHALL include currency
- **AND** the response SHALL NOT sum costs across different currencies

#### Scenario: Retrieve project cost summary
- **GIVEN** a project has extraction cost data
- **WHEN** a client calls `GET /api/projects/:id/cost-summary`
- **THEN** the system SHALL return total extraction cost and cost by extractor
- **AND** totals SHALL be grouped by currency when multiple currencies exist

#### Scenario: Retrieve project cost over time
- **GIVEN** a project has extraction cost history
- **WHEN** a client calls `GET /api/projects/:id/cost-by-date-range`
- **THEN** the system SHALL return cost totals grouped by date
- **AND** totals SHALL be grouped by currency when multiple currencies exist

