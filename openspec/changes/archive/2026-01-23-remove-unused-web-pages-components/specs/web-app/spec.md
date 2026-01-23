## ADDED Requirements

### Requirement: Unused Web UI Cleanup

The web application SHALL remove unused pages and components that are not reachable from the router or referenced by production code.

#### Scenario: Unreachable dashboard pages are removed
- **GIVEN** the dashboard router configuration does not reference a page component
- **WHEN** an unreachable page is identified as unused
- **THEN** the system SHALL remove the page implementation to avoid shipping dead UI

#### Scenario: Test-only UI is either integrated or removed
- **GIVEN** a UI component is referenced only by tests and not by production code
- **WHEN** the component is not part of an approved user-facing workflow
- **THEN** the system SHALL remove the component and its tests

