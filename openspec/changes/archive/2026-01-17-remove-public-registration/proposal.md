# Change: Remove Public Web Registration

## Why
PyToYa is an internal/enterprise tool where user accounts should be managed by administrators via CLI commands, not through self-service public registration. The current landing page and registration endpoints expose unnecessary attack surface and don't align with the intended use case.

## What Changes
- Remove "Create account" button from homepage landing page
- Redirect unauthenticated users directly to `/login` instead of showing a marketing landing page
- Remove the public web registration endpoint/flow
- Keep CLI-based user creation (`npm run cli -- newadmin`) and admin bootstrap

## Impact
- Affected specs: `auth`, `web-app`
- Affected code:
  - `src/apps/web/src/routes/HomePage.tsx` - simplify to redirect-only
  - `src/apps/web/src/routes/RegisterPage.tsx` - can be removed
  - `src/apps/api/src/auth/...` - remove registration endpoint if exists
