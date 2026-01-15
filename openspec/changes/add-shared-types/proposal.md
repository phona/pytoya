# Change: Add Shared Types Workspace Package

## Why

Currently, the frontend has duplicate type definitions that mirror backend DTOs (e.g., `Project` interface in web vs `ProjectResponseDto` in API). This creates a maintenance burden and leads to type drift when API contracts change. We need a single source of truth for shared types between the API and web applications.

## What Changes

- Create a new npm workspace package `@pytoya/shared` under `src/shared/`
- The shared package will **re-export** types from `src/apps/api/src/*/dto/` (not move them)
- Update web app to import types from the shared package
- Configure TypeScript path aliases for cleaner imports
- Set up the shared package with proper build configuration
- DTOs remain in their original API locations for co-location with business logic

**BREAKING**: Web app type imports need to be updated to use `@pytoya/shared`

## Impact

- Affected specs: `monorepo`
- Affected code:
  - New: `src/shared/` workspace package (re-exports API DTOs)
  - Modified: Type definitions in `src/apps/web/src/api/`
  - Modified: `package.json` (workspaces configuration)
  - Modified: TypeScript configs in both apps
