# Change: Migrate web app to Vite + React Router

## Why
The current frontend uses Next.js App Router even though the app is a client-only SPA backed by NestJS. Migrating to Vite simplifies the stack and aligns tooling with a pure SPA approach.

## What Changes
- Replace Next.js App Router with a Vite + React Router data router setup.
- Replace Next.js-specific features (metadata, next/font, next/navigation) with SPA equivalents.
- Update frontend build and dev tooling from Next.js to Vite.
- Switch frontend unit testing from Jest to Vitest.
- **BREAKING** Update monorepo expectations for frontend app structure and scripts.

## Guidance (agent-friendly defaults)
- Use a single data layer: TanStack Query for API calls; use route loaders only for auth gating and critical prefetch, then hydrate the Query cache.
- Use React Router data router with `createBrowserRouter` and nested layouts plus error boundaries.
- Keep typed boundaries: strict TypeScript and runtime validation for external data (API responses).
- Adopt a predictable structure: `src/app` (providers/router), `src/routes` (route modules), `src/features` (feature slices), `src/shared` (UI/utils), `src/api` (client), `src/mocks` (MSW), `src/tests` (test utils).
- Keep tooling consistent: Vite + React + TypeScript, MSW for mocks, Vitest + Testing Library.

## Impact
- Affected specs: monorepo, testing
- Affected code: src/apps/web (routing, app entry, config), root package scripts, Docker/K8s web build config
