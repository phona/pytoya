# Web App Behavior

## Home Route
- The root route `/` redirects authenticated users to `/projects`.
- Unauthenticated users are redirected to `/login`.
- The home route waits for auth hydration before redirecting.

## Route Protection
- Dashboard routes are wrapped by `ProtectedRoute`.
- Unauthenticated users are redirected to `/login?next_url=...`.
- The route guard waits for auth hydration before deciding.

## Navigation
- Dashboard pages render a sidebar with links to Projects, Models, and Settings.
- Active routes are highlighted based on the current pathname.
- The sidebar is collapsible on mobile with a hamburger toggle.
- Sign out is handled from the sidebar and clears auth state before redirecting to login.

Admin-only pages (Schemas, Prompts, Validation Scripts) are still available but no longer appear in the main navigation.

## Dialog Patterns
- Projects, Models, and Manifests use modal dialogs for create/edit flows.
- Manifests audit opens in a dialog overlay.
- Dialogs trap focus, close on Escape/backdrop, and return focus to the triggering element.
- Dialogs are implemented with shadcn/ui components (`src/apps/web/src/shared/components/ui/dialog`).

## UI Components
- shadcn/ui components live under `src/apps/web/src/shared/components/ui`.
- Toast notifications are rendered by the global `Toaster` in `src/apps/web/src/main.tsx`.

## Forms and Validation
- Forms use React Hook Form with shadcn form primitives and Zod schemas.
- Schemas live in `src/apps/web/src/shared/schemas` and provide field-level errors.
- Form components should validate on submit and display inline error messaging.

## Data Fetching
- Server state uses React Query hooks under `src/apps/web/src/shared/hooks`.
- `QueryClientProvider` is created in `src/apps/web/src/main.tsx` and shared in tests.

## Manifests List
- Filters, sorting, and pagination are server-driven via `GET /api/groups/:groupId/manifests`.
- Custom field filters accept dot-notation paths (e.g., `invoice.po_no`, `receipt.merchant.name`).
- Pagination metadata (`total`, `page`, `pageSize`, `totalPages`) is returned when list parameters are present.

## Project Creation Wizard
Project creation is a multi-step wizard dialog:
1. Basics (name, description)
2. Model selection (LLM required, OCR optional)
3. Schema editor (JSON editor with generate/import helpers; required fields live in JSON Schema)
4. Rules (AI-assisted rule generation and manual edits)
5. Review and create

See `docs/PROJECT_CREATION.md` for a step-by-step guide.

## Project Detail Enhancements
- Project details include a Validation Scripts section scoped to the project.
- Validation scripts can be created, edited, enabled/disabled, and deleted inline.

## Error Boundaries
- The app root and dashboard routes are wrapped in `ErrorBoundary`.
- Fallback UI provides retry and navigation options.

## Accessibility Basics
- A skip link targets `#main-content`.
- Focus shifts to main content on route changes.
- Dialogs return focus to the previous element on close.

## A11y Testing
- Axe-core automation is not enabled yet; consider adding it if coverage needs grow.
