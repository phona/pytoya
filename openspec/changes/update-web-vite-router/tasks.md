## 1. Migration Planning
- [ ] 1.1 Inventory Next.js App Router routes and map to React Router data routes
- [ ] 1.2 Identify Next.js-only APIs in use (navigation, metadata, fonts) and plan replacements

## 2. Vite + React Router Scaffold
- [ ] 2.1 Add Vite config and entrypoints for SPA
- [ ] 2.2 Create React Router data router structure with nested layouts
- [ ] 2.3 Implement head/metadata management for routes

## 3. Port App Features
- [ ] 3.1 Replace Next.js navigation and search params with React Router equivalents
- [ ] 3.2 Port global providers (React Query, auth store) to new entry
- [ ] 3.3 Centralize API access through TanStack Query hooks (queries/mutations)
- [ ] 3.4 Port shared components and pages to new routes

## 4. Tooling and Testing
- [ ] 4.1 Replace Jest with Vitest for frontend unit tests
- [ ] 4.2 Update MSW setup for Vitest
- [ ] 4.3 Update CI scripts for new test commands

## 5. Clean-up and Validation
- [ ] 5.1 Remove Next.js dependencies and configs
- [ ] 5.2 Update monorepo scripts, Docker/K8s build for Vite
- [ ] 5.3 Run frontend build and unit tests
