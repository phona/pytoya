## MODIFIED Requirements
### Requirement: Frontend Testing Standards
The system SHALL use Vitest with React Testing Library and MSW for API mocking, avoiding global patches.

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
