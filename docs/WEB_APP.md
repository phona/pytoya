# Web App Behavior

## Home Route
- The root route `/` redirects authenticated users to `/projects`.
- Unauthenticated users see a landing page with login and register calls to action.
- The home route waits for auth hydration before redirecting.

## Route Protection
- Dashboard routes are wrapped by `ProtectedRoute`.
- Unauthenticated users are redirected to `/login?next_url=...`.
- The route guard waits for auth hydration before deciding.

## Navigation
- Dashboard pages render a sidebar with links to Projects, Models, Schemas, Prompts, and Validation Scripts.
- Active routes are highlighted based on the current pathname.
- The sidebar is collapsible on mobile with a hamburger toggle.
- Sign out is handled from the sidebar and clears auth state before redirecting to login.

## Error Boundaries
- The app root and dashboard routes are wrapped in `ErrorBoundary`.
- Fallback UI provides retry and navigation options.

## Accessibility Basics
- A skip link targets `#main-content`.
- Focus shifts to main content on route changes.
- Dialogs return focus to the previous element on close.

## A11y Testing
- Axe-core automation is not enabled yet; consider adding it if coverage needs grow.
