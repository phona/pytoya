## MODIFIED Requirements

### Requirement: Extractors Page Performance
The web app SHALL avoid N+1 request patterns for list pages when equivalent bulk endpoints exist.

#### Scenario: Extractors page loads cost summaries in one request
- **GIVEN** the user opens the Extractors page
- **WHEN** the UI needs per-extractor cost summary data
- **THEN** the UI SHALL fetch summaries via a single bulk API call (not one request per extractor)

