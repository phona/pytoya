## MODIFIED Requirements

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

## ADDED Requirements

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
