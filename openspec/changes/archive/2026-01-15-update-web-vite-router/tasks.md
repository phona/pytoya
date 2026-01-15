## 1. Migration Planning
- [x] 1.1 Inventory Next.js App Router routes and map to React Router data routes
- [x] 1.2 Identify Next.js-only APIs in use (navigation, metadata, fonts) and plan replacements

## 2. Vite + React Router Scaffold
- [x] 2.1 Add Vite config and entrypoints for SPA
- [x] 2.2 Create React Router data router structure with nested layouts
- [x] 2.3 Implement head/metadata management for routes

## 3. Port App Features
- [x] 3.1 Replace Next.js navigation and search params with React Router equivalents
- [x] 3.2 Port global providers (React Query, auth store) to new entry
- [x] 3.3 Centralize API access through TanStack Query hooks (queries/mutations)
- [x] 3.4 Port shared components and pages to new routes

## 4. Tooling and Testing
- [x] 4.1 Replace Jest with Vitest for frontend unit tests
- [x] 4.2 Update MSW setup for Vitest
- [x] 4.3 Update CI scripts for new test commands

## 5. Clean-up and Validation
- [x] 5.1 Remove Next.js dependencies and configs
- [x] 5.2 Update monorepo scripts, Docker/K8s build for Vite
- [x] 5.3 Run frontend build and unit tests
