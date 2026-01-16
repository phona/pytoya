# Change: Add Web Error Boundaries

## Why

The web application currently has no React Error Boundaries to catch component errors. When a component throws an error during rendering, the entire application crashes with a blank screen, providing poor user experience and making debugging difficult. Generic error messages in API responses also reduce usability when things go wrong.

## What Changes

- Create `ErrorBoundary` component following React class component pattern
- Display user-friendly error messages with recovery options (retry, go back)
- Log errors for debugging (console.error in dev, potentially telemetry in prod)
- Wrap route components with error boundary at appropriate levels
- Improve error messages in API client and components to be more user-friendly

## Impact

- Affected specs: `web-app` (error handling capability)
- Affected code: `src/apps/web/src/shared/components/ErrorBoundary.tsx`, `src/apps/web/src/app/router.tsx`
- Dependencies: None (uses standard React Error Boundary pattern)
- Breaking changes: None
