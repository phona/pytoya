## Context
The frontend currently uses Next.js 14 App Router but does not rely on server-side rendering, API routes, or middleware. The backend is a NestJS API, and the web app behaves as a client-side SPA.

## Goals / Non-Goals
- Goals:
  - Provide a Vite + React Router data router foundation that supports nested layouts and dynamic routes.
  - Preserve existing UI behavior and API interactions.
  - Move frontend unit tests to Vitest while keeping RTL and MSW patterns.
- Non-Goals:
  - Add SSR/SSG.
  - Change backend APIs or auth flows.
  - Redesign UI or change routes beyond parity.

## Decisions
- Decision: Use React Router data router (createBrowserRouter) for nested layouts.
  - Alternatives considered: BrowserRouter + Routes
  - Rationale: Matches nested layout needs and allows future loader usage without rework.
- Decision: Replace Next.js metadata handling with a client-side head manager.
  - Alternatives considered: manual document.title management
  - Rationale: preserves per-route titles with minimal boilerplate.
- Decision: Switch to Vitest for unit tests.
  - Alternatives considered: keep Jest
  - Rationale: aligns with Vite ecosystem and reduces config duplication.

## Risks / Trade-offs
- Loss of Next.js SSR/SSG features; mitigated by confirming SPA-only scope.
- Route parity errors when converting App Router groups and dynamic segments.
- Changes to testing runner may require updating CI commands and coverage settings.

## Migration Plan
1. Introduce Vite app scaffold alongside existing Next.js app.
2. Port routing and layouts to React Router data router.
3. Replace Next.js APIs (navigation, metadata, fonts) with SPA equivalents.
4. Swap test runner to Vitest and update configs.
5. Remove Next.js-specific build configs and update scripts/deploys.
6. Validate with build and unit tests.

## Open Questions
- Confirm whether to keep current frontend E2E runner or switch to a Vite-friendly setup.
