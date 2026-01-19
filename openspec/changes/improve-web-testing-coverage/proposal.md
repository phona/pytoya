# Change: Improve Web Testing Coverage

## Why

The web application currently has 52.79% test coverage, which is below the 60% target threshold defined in the project conventions. While 37 test files exist with 169 tests passing, some critical areas remain untested:
- Page components (PromptsPage, SchemaDetailPage)
- Hooks (useManifests, useWebSocket, useValidationScripts)
- Shared components (ExportButton, ExtractionProgress, ExtractionStrategySelector)
- API modules (extraction.ts, prompts.ts)
- Route components (RootLayout, router.tsx)

## What Changes

- Add component tests for page components missing coverage (`PromptsPage`, `SchemaDetailPage`)
- Add hook tests for custom hooks missing coverage (`useManifests`, `useWebSocket`, `useValidationScripts`)
- Add tests for shared components missing coverage (`ExportButton`, `ExtractionProgress`, `ExtractionStrategySelector`)
- Add tests for API modules (`extraction.ts`, `prompts.ts`)
- Improve test coverage for route components (`RootLayout`, `router.tsx`)
- Update test utilities and factory functions if needed

## Impact

- Affected specs: `testing` (frontend testing standards)
- Affected code: `src/apps/web/src/routes/`, `src/apps/web/src/shared/hooks/`, `src/apps/web/src/shared/components/`, `src/apps/web/src/api/`
- Dependencies: No new external dependencies (using existing Vitest, React Testing Library)
- Breaking changes: None

## Current State

- 37 test files passing with 169 tests
- 52.79% statement coverage (target: 60%)
- 72.11% branch coverage
- 49.06% function coverage

## Target State

- 60%+ statement coverage
- Maintain or improve branch/function coverage
- All critical page components covered
- All hooks covered
- All shared components covered
