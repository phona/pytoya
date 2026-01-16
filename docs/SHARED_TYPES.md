# Shared Types Workspace

The `@pytoya/shared` workspace provides a single source of truth for API/web DTOs. It re-exports DTO types from the API (it does not move them).

## Location
- Package root: `src/shared/`
- Types entrypoint: `src/shared/src/types/index.ts`

## Usage (Web)
```typescript
import type { ProjectResponseDto } from '@pytoya/shared/types/projects';
import type { ModelResponseDto } from '@pytoya/shared/types/models';
```

## Conventions
- Keep DTOs in `src/apps/api/src/**/dto/` for backend ownership.
- Add new type re-exports under `src/shared/src/types/` when API DTOs change.
- Use the shared types in the web API clients instead of duplicating interfaces.
