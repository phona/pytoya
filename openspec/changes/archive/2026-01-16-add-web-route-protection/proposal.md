# Change: Add Web Route Protection

## Why

The web application currently has no authentication guards on protected routes. Any user can navigate to dashboard pages (`/dashboard/*`) without being authenticated, which exposes sensitive business data and violates security requirements. This poses a security risk where unauthenticated users could potentially access invoice processing data.

## What Changes

- Create `ProtectedRoute` component that checks authentication state
- Wrap all `/dashboard/*` routes with the `ProtectedRoute` component
- Redirect unauthenticated users to the login page
- Preserve the intended destination for post-login redirect
- Add loading state during authentication check

## Impact

- Affected specs: `web-app` (new capability spec for routing/auth)
- Affected code: `src/apps/web/src/app/router.tsx`, `src/apps/web/src/routes/auth/ProtectedRoute.tsx`
- Dependencies: None (uses existing Zustand auth store)
- Breaking changes: None

## Migration

No migration needed - existing authenticated users will see no change. Unauthenticated users will now be redirected to login instead of seeing dashboard pages.
