## MODIFIED Requirements

### Requirement: Batch Scope Modal Performance
The web app SHALL avoid large, unnecessary payload fetches when preparing batch actions.

#### Scenario: Batch modal loads ids without paging full manifests
- **GIVEN** a user opens a batch action modal for a filtered scope
- **WHEN** the UI needs the matching manifest IDs
- **THEN** the UI SHALL request IDs via a lightweight API (not by paging full manifest DTOs)
- **AND** the UI SHALL show a clear error when the filtered scope exceeds the server-side maximum

