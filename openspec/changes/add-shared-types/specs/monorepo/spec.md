# monorepo Specification Delta

## ADDED Requirements

### Requirement: Shared Types Workspace
The project SHALL provide a shared workspace package for type definitions used across applications.

#### Scenario: Shared workspace structure
- **WHEN** developer inspects `src/shared/`
- **THEN** a workspace package exists with `package.json`, `tsconfig.json`, and `src/types/` directory
- **AND** the package re-exports DTOs from `src/apps/api/src/*/dto/`

#### Scenario: Type re-export pattern
- **WHEN** developer inspects `src/shared/src/types/`
- **THEN** each domain file (projects.ts, schemas.ts, etc.) re-exports types from the corresponding API DTOs
- **AND** an `index.ts` barrel export exists for convenient imports

#### Scenario: Web app consumes shared types
- **WHEN** web app imports API contract types
- **THEN** types are imported from `@pytoya/shared/types` using `import type` syntax
- **AND** no duplicate type definitions exist in the web app

#### Scenario: TypeScript path mapping
- **WHEN** developer inspects `tsconfig.json` files
- **THEN** `@pytoya/shared/types` is mapped to the shared workspace
- **AND** path aliases work in both API and web apps

#### Scenario: Root workspace configuration
- **WHEN** developer inspects root `package.json`
- **THEN** workspaces include `src/apps/*` and `src/shared`
- **AND** `npm install` resolves workspace dependencies correctly
