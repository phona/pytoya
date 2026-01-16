# Web App Behavior

## Route Protection
- Dashboard routes are wrapped by `ProtectedRoute`.
- Unauthenticated users are redirected to `/login?next_url=...`.
- The route guard waits for auth hydration before deciding.

## Error Boundaries
- The app root and dashboard routes are wrapped in `ErrorBoundary`.
- Fallback UI provides retry and navigation options.

## Accessibility Basics
- A skip link targets `#main-content`.
- Focus shifts to main content on route changes.
- Dialogs return focus to the previous element on close.

## A11y Testing
- Axe-core automation is not enabled yet; consider adding it if coverage needs grow.
