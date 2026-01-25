# testing Specification

## Purpose
TBD - created by archiving change define-testing-standards. Update Purpose after archive.
## Requirements
### Requirement: Backend Testing Standards
The system SHALL use Jest with NestJS testing utilities, preferring dependency injection over monkey patching.

#### Scenario: Unit test with DI
- **WHEN** writing unit tests for NestJS service
- **THEN** use `Test.createTestingModule()` with `overrideProvider()` for mocks
- **AND** avoid `jest.mock()` at module level
- **AND** custom providers are used for test doubles

#### Scenario: Backend test file structure
- **WHEN** creating backend tests
- **THEN** test files are co-located with source files (*.spec.ts)
- **AND** structure mirrors source: auth/, projects/, extraction/
- **AND** shared utilities are in test/ directory

#### Scenario: Mock factories
- **WHEN** creating test data
- **THEN** mock factories provide consistent test objects
- **AND** factories use overrides for customization
- **AND** fixtures are in test/fixtures/ for static data

#### Scenario: External service mocking
- **WHEN** testing code that calls PaddleOCR or OpenAI
- **THEN** services are mocked via DI (not global monkey patch)
- **AND** mock responses are provided via `useValue` provider
- **AND** no global module-level mocks affect other tests

### Requirement: Frontend Testing Standards
The system SHALL use Vitest with React Testing Library and MSW for API mocking, avoiding global patches, and SHALL keep API mocks compatible with the TanStack Query data layer.

#### Scenario: Component tests
- **WHEN** writing React component tests
- **THEN** tests use vi.mock() at component level (not globally)
- **AND** MSW handlers are used for API mocking
- **AND** React Testing Library utilities (render, screen, fireEvent) are used

#### Scenario: Frontend test file structure
- **WHEN** creating frontend tests
- **THEN** test files are co-located with components (*.test.tsx)
- **AND** complex components have __tests__/ subdirectories
- **AND** E2E tests are in e2e/ directory

#### Scenario: MSW for API mocking
- **WHEN** testing components that call backend APIs
- **THEN** MSW handlers are used for mocking
- **AND** handlers are defined in test/mocks/handlers.ts
- **AND** mock server is set up in test/setup.ts

#### Scenario: Prefer integration tests over placeholders
- **GIVEN** a UI feature depends on real browser APIs (e.g., WebSocket) where unit mocks become brittle
- **WHEN** validating that behavior
- **THEN** the system SHOULD use an integration or E2E test (e.g., Playwright) rather than a placeholder unit test

### Requirement: Test Coverage
The system SHALL maintain minimum test coverage thresholds.

#### Scenario: Backend coverage
- **WHEN** running tests
- **THEN** coverage meets thresholds: branches 70%, functions 70%, lines 70%, statements 70%
- **AND** excludes are configured for main.ts, *.module.ts, *.dto.ts, *.entity.ts

#### Scenario: Frontend coverage
- **WHEN** running tests
- **THEN** coverage meets thresholds: branches 60%, functions 60%, lines 60%, statements 60%
- **AND** excludes are configured for *.stories.tsx, *.d.ts
- **AND** CI SHOULD enforce these thresholds to prevent regressions

### Requirement: Testing Documentation
The system SHALL document testing conventions and best practices.

#### Scenario: Testing guidelines reference
- **WHEN** developer needs to write tests
- **THEN** TESTING.md provides clear guidelines
- **AND** examples of DI mocking (not monkey patching)
- **AND** anti-patterns are documented with explanations

### Requirement: Non-interactive Linting
The system SHALL run linting in non-interactive mode for CI and automation.

#### Scenario: Lint runs without prompts
- **WHEN** developer runs `npm run lint`
- **THEN** lint completes without interactive prompts
- **AND** lint exits non-zero on violations

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

### Requirement: Frontend CI Quality Gates
The system SHALL enforce a minimum web app quality bar in CI.

#### Scenario: Web checks run in CI
- **WHEN** CI runs for a change that affects the repository
- **THEN** CI SHALL run `npm run lint`
- **AND** CI SHALL run `npm run type-check`
- **AND** CI SHALL run `npm run test:coverage`
- **AND** CI SHALL fail on violations or coverage below the configured thresholds

### Requirement: Frontend Test Data Factories
The frontend application SHALL provide test data factory functions for generating mock data in tests.

#### Scenario: Factory function usage
- **WHEN** writing tests that require mock data
- **THEN** developers SHOULD use factory functions (e.g., `src/apps/web/src/tests/mocks/factories.ts`)
- **AND** factories SHALL generate realistic data matching TypeScript types

### Requirement: Backend DI smoke tests
The system SHALL include fast backend “DI smoke tests” that compile critical NestJS modules and fail when dependency injection wiring is incomplete.

#### Scenario: Missing repository registration fails fast
- **GIVEN** a service injects `@InjectRepository(SchemaEntity)`
- **WHEN** the module omits `TypeOrmModule.forFeature([SchemaEntity])`
- **THEN** the DI smoke test SHALL fail with a dependency resolution error

#### Scenario: Smoke tests are DB-less
- **WHEN** DI smoke tests run
- **THEN** they SHALL NOT connect to Postgres
- **AND** repository providers SHALL be satisfied by a stubbed TypeORM `DataSource`

#### Scenario: Adding new smoke tests is cheap
- **WHEN** a new backend module is added that injects repositories or cross-module providers
- **THEN** developers SHOULD add a DI smoke test for that module using the shared helper

