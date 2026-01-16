# Change: Improve Web Testing Coverage

## Why

The web application currently has minimal test coverage with only a few test files (`ProjectCard.test.tsx`, `use-projects.test.tsx`). Critical page components and hooks lack proper test coverage, which increases the risk of regressions and reduces confidence when making changes. The current coverage is below the 60% target threshold defined in the project conventions.

## What Changes

- Add component tests for page components (`ProjectsPage`, `ModelsPage`, `ManifestsPage`)
- Add hook tests for custom hooks missing coverage (`useManifests`, `useWebSocket`, `useModels`)
- Add tests for shared components (`ModelCard`, `ModelForm`, `ExtractionStrategySelector`)
- Add test utilities and factory functions for test data generation
- Update CI/CD configuration to enforce coverage thresholds

## Impact

- Affected specs: `testing` (frontend testing standards)
- Affected code: `src/apps/web/src/routes/`, `src/apps/web/src/shared/hooks/`, `src/apps/web/src/shared/components/`
- Dependencies: No new external dependencies (using existing Vitest, React Testing Library)
- Breaking changes: None
