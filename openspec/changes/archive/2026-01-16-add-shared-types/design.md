# Design: Shared Types Workspace Package

## Context

The monorepo currently has duplicate type definitions:
- **API**: DTOs with class-validator decorators in `src/apps/api/src/*/dto/`
- **Web**: TypeScript interfaces in `src/apps/web/src/api/` mirroring the DTOs

This duplication leads to:
- Maintenance burden when API contracts change
- Type drift between frontend and backend
- Inconsistent field names and types

## Goals / Non-Goals

**Goals:**
- Single source of truth for API contract types
- Web app imports types from shared package
- DTOs remain co-located with API business logic
- Type-only imports (no runtime validation logic in web)

**Non-Goals:**
- Moving DTOs out of the API app
- Runtime validation in the web app (class-validator stays API-side)
- Shared utilities or business logic

## Decisions

### 1. Re-export Pattern (not move)

The shared package re-exports types from the API app:

```typescript
// src/shared/src/types/projects.ts
export type { ProjectResponseDto } from '../../../apps/api/src/projects/dto/project-response.dto';
export type { CreateProjectDto } from '../../../apps/api/src/projects/dto/create-project.dto';
// ...
```

**Rationale:** Keeps DTOs near their controllers/services for easier maintenance. The shared package acts as a types aggregation layer.

### 2. Type-only Exports

Use `export type` to ensure only types are imported, avoiding runtime dependencies:

```typescript
// Web app
import type { ProjectResponseDto, CreateProjectDto } from '@pytoya/shared/types/projects';
```

**Rationale:** Prevents accidental import of validation decorators or other API-only code.

### 3. Barrel Export Pattern

Central index file for clean imports:

```typescript
// src/shared/src/types/index.ts
export * from './projects';
export * from './schemas';
export * from './extraction';
// ...
```

**Alternatives considered:**
- Flat structure (all in index.ts): Rejected - becomes unwieldy with many DTOs
- Per-feature barrels: **Selected** - balances organization and convenience

### 4. TypeScript Path Mapping

Configure path aliases in both apps:

```json
// tsconfig.json (root and apps)
{
  "compilerOptions": {
    "paths": {
      "@pytoya/shared/types": ["../../shared/src/types"]
    }
  }
}
```

**Rationale:** Shorter import paths, easier refactoring if workspace structure changes.

## Package Structure

```
src/shared/
├── package.json
├── tsconfig.json
└── src/
    └── types/
        ├── index.ts           # Barrel export
        ├── projects.ts        # Re-exports project DTOs
        ├── schemas.ts         # Re-exports schema DTOs
        ├── extraction.ts      # Re-exports extraction DTOs
        ├── manifests.ts       # Re-exports manifest DTOs
        ├── providers.ts       # Re-exports provider DTOs
        ├── prompts.ts         # Re-exports prompt DTOs
        └── auth.ts            # Re-exports auth DTOs
```

## Migration Plan

1. Create `src/shared/` workspace with package.json and tsconfig.json
2. Add re-export files for each domain (projects, schemas, etc.)
3. Update root `package.json` workspaces to include `src/shared`
4. Update web app API client files to import from `@pytoya/shared/types`
5. Remove duplicate type definitions from web app
6. Verify TypeScript compilation across all workspaces

**Rollback:** Delete `src/shared/` and revert web app type definitions.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Import path complexity | Use path aliases for clean imports |
| Circular dependencies | Shared package only depends on API, not vice versa |
| Build ordering | Ensure API builds before shared package is consumed |
| Type-only enforcement | Use `import type` syntax consistently |

## Open Questions

- Should the shared package have a build step, or only provide type definitions?
  - **Decision:** Type definitions only (no build needed for `export type`)
