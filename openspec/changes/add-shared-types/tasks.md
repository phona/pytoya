# Implementation Tasks

## 1. Setup Shared Workspace
- [ ] 1.1 Create `src/shared/` directory structure
- [ ] 1.2 Create `src/shared/package.json` with workspace configuration
- [ ] 1.3 Create `src/shared/tsconfig.json` with proper TypeScript settings
- [ ] 1.4 Create `src/shared/src/types/` directory for type re-exports

## 2. Create Type Re-exports
- [ ] 2.1 Create `src/shared/src/types/projects.ts` (re-export project DTOs)
- [ ] 2.2 Create `src/shared/src/types/schemas.ts` (re-export schema DTOs)
- [ ] 2.3 Create `src/shared/src/types/extraction.ts` (re-export extraction DTOs)
- [ ] 2.4 Create `src/shared/src/types/manifests.ts` (re-export manifest DTOs)
- [ ] 2.5 Create `src/shared/src/types/providers.ts` (re-export provider DTOs)
- [ ] 2.6 Create `src/shared/src/types/prompts.ts` (re-export prompt DTOs)
- [ ] 2.7 Create `src/shared/src/types/auth.ts` (re-export auth DTOs)
- [ ] 2.8 Create `src/shared/src/types/index.ts` barrel export

## 3. Configure Workspaces
- [ ] 3.1 Update root `package.json` to include `src/shared` in workspaces
- [ ] 3.2 Install workspace dependencies (`npm install`)

## 4. Update Web App Imports
- [ ] 4.1 Update `src/apps/web/src/api/projects.ts` to use shared types
- [ ] 4.2 Update `src/apps/web/src/api/schemas.ts` to use shared types
- [ ] 4.3 Update `src/apps/web/src/api/manifests.ts` to use shared types
- [ ] 4.4 Update `src/apps/web/src/api/providers.ts` to use shared types
- [ ] 4.5 Update `src/apps/web/src/api/prompts.ts` to use shared types
- [ ] 4.6 Remove duplicate type definitions from web app API files

## 5. Configure TypeScript
- [ ] 5.1 Update root `tsconfig.json` with path aliases for `@pytoya/shared/types`
- [ ] 5.2 Update `src/apps/web/tsconfig.json` with path aliases
- [ ] 5.3 Update `src/apps/api/tsconfig.json` with path aliases (for consistency)

## 6. Verification
- [ ] 6.1 Run `npm run build` to verify all workspaces compile
- [ ] 6.2 Run `npm run type-check` in web app to verify types
- [ ] 6.3 Run `npm run test` to ensure no breaking changes
