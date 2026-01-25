## ADDED Requirements

### Requirement: Use-Case Tests (Business-Logic-First)
The system SHALL support “use-case tests” that validate business workflows without HTTP, browser automation, Postgres, TypeORM, Redis, or BullMQ.

#### Scenario: Use-case test covers a full workflow
- **WHEN** testing the upload → extract → audit workflow
- **THEN** the test SHALL call use-cases directly
- **AND** external IO (repo/queue/storage/LLM/OCR) SHALL be provided via in-memory ports/adapters
- **AND** assertions SHALL focus on business invariants (state transitions, validation outcomes, emitted events)

#### Scenario: Deterministic async execution
- **WHEN** a workflow enqueues background work (extraction, OCR refresh)
- **THEN** tests SHALL run deterministically using an in-memory queue runner
- **AND** tests SHALL NOT depend on timers or sleeps

### Requirement: Thin API Wiring Tests
The system SHALL keep API tests focused on boundary behavior, not business logic duplication.

#### Scenario: Controller delegates to use-case
- **WHEN** testing a controller endpoint (e.g., `POST /manifests/:id/extract`)
- **THEN** the test SHALL validate input DTO handling and mapping
- **AND** the controller SHALL call the corresponding use-case with correct inputs
- **AND** the response shape/error mapping SHALL be asserted

### Requirement: Web Journey Tests Use MSW Stubs
The system SHALL support route-level “web journey tests” using Vitest + React Testing Library + MSW to cover most user journeys with minimal UI interactions.

#### Scenario: Poll-based job progress in journey tests
- **WHEN** the UI displays extraction progress
- **THEN** journey tests SHALL simulate progress via stubbed polling endpoints
- **AND** WebSocket behavior SHALL be mocked by default
- **AND** one or two focused tests MAY cover websocket-driven updates separately
- **AND** multipart upload flows MAY stub the API client boundary (e.g. `manifestsApi.uploadManifestsBatch`) when jsdom networking is brittle

#### Scenario: Unhandled requests fail fast
- **WHEN** a web journey test triggers an API call without an MSW handler
- **THEN** the test run SHOULD fail fast to avoid silent contract drift
