## MODIFIED Requirements

### Requirement: Cost Display
The web application SHALL display extraction costs when cost data is available.

#### Scenario: Show cost on extractor cards
- **GIVEN** extractor cost summaries are available
- **WHEN** the Extractors page loads
- **THEN** each extractor card SHALL show average cost per extraction
- **AND** each card SHALL show total spend when available
- **AND** the UI SHALL show a currency code for displayed cost values

#### Scenario: Show cost in manifest list
- **GIVEN** manifests include extraction cost data
- **WHEN** the manifests list loads
- **THEN** each manifest row SHALL show the extraction cost
- **AND** the UI SHALL show a currency code when available

#### Scenario: Show cost breakdown in manifest detail
- **GIVEN** a manifest with extraction cost data
- **WHEN** the manifest detail panel opens
- **THEN** the system SHALL display a cost breakdown panel
- **AND** the panel SHALL show text extraction cost, LLM cost, and total cost when available
- **AND** the panel SHALL show a currency code for each cost value (or “unknown” when missing)

#### Scenario: Project cost summary page
- **GIVEN** a project with extraction cost history
- **WHEN** the user navigates to `/projects/:id/costs`
- **THEN** the system SHALL show total extraction costs and cost by extractor
- **AND** the system SHALL show cost over time
- **AND** the UI SHALL support multi-currency totals by showing one total per currency

