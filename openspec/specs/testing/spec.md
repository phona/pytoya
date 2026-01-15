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

