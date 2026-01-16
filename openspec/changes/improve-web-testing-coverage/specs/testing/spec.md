## MODIFIED Requirements

### Requirement: Frontend Test Coverage
The frontend application SHALL maintain at least 60% code coverage for components, hooks, and pages using Vitest and React Testing Library.

#### Scenario: Page component coverage
- **WHEN** page components are implemented (`ProjectsPage`, `ModelsPage`, `ManifestsPage`)
- **THEN** they SHALL have corresponding test files with at least 60% coverage

#### Scenario: Hook coverage
- **WHEN** custom hooks are implemented (`useManifests`, `useWebSocket`, `useModels`)
- **THEN** they SHALL have corresponding test files with at least 60% coverage

#### Scenario: Shared component coverage
- **WHEN** shared components are implemented (`ModelCard`, `ModelForm`, `ExtractionStrategySelector`)
- **THEN** they SHALL have corresponding test files with at least 60% coverage

## ADDED Requirements

### Requirement: Frontend Test Data Factories
The frontend application SHALL provide test data factory functions for generating mock data in tests.

#### Scenario: Factory function usage
- **WHEN** writing tests that require mock data
- **THEN** developers SHALL use factory functions from `test/mocks/factories.ts`
- **AND** factories SHALL generate realistic data matching TypeScript types
