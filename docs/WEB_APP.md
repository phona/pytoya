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
- Dashboard pages render a sidebar with links to Projects, Models, and Extractors.
- Active routes are highlighted based on the current pathname.
- The sidebar can be collapsed on desktop (to focus on content) and is collapsible on mobile with a hamburger toggle.
- Sign out is handled from the sidebar and clears auth state before redirecting to login.
- Theme toggling is available from the sidebar.
- Deep pages show breadcrumbs (Projects > Project > …) for quick orientation and parent navigation.

Admin-only pages (Validation Scripts) are still available but no longer appear in the main navigation.
Schema access is project-scoped and available from the project settings dropdown.

## Dialog Patterns
- Projects, Models, and Manifests use modal dialogs for create/edit flows.
- Manifests audit opens in a dialog overlay.
- Dialogs trap focus, close on Escape/backdrop, and return focus to the triggering element.
- Dialogs are implemented with shadcn/ui components (`src/apps/web/src/shared/components/ui/dialog`).
- Saving a manifest as **Human Verified** is gated by a validation run; if validation returns errors, the user must confirm before the flag is persisted.

## Z-Index Scale
- Z-index variables live in `src/apps/web/src/styles/z-index.css`.
- Use Tailwind arbitrary values with variables (example: `z-[var(--z-index-modal)]`).
- Layers:
  - `dropdown` (10): select menus, toggles
  - `sticky` (20): headers, sticky nav
  - `overlay` (30): backdrops, overlays
  - `modal` (40): dialogs
  - `popover` (50): tooltips, sidebars
  - `toast` (60): toasts

## UI Components
- shadcn/ui components live under `src/apps/web/src/shared/components/ui`.
- Toast notifications are rendered by the global `Toaster` in `src/apps/web/src/main.tsx`.
- Status badges use shared classes from `src/apps/web/src/shared/styles/status-badges.ts`.
- Empty states use `src/apps/web/src/shared/components/EmptyState.tsx`.

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
- Toolbar batch actions (Export CSV, Run validation, Extract) use a scope confirmation modal:
  - Default scope: **All matching current filters**
  - Optional scope: **Selected only** (available when selection exists)
- Manifest table columns are schema-driven from the project's active JSON Schema:
  - If the schema defines root-level `x-table-columns` (dot-paths), the table renders those columns in order.
  - If `x-table-columns` is present but empty (`[]`), the table renders no schema-driven columns (explicit opt-out).
  - If `x-table-columns` is absent, the UI falls back to a small capped set of scalar leaf fields.
- Schema-driven columns support:
  - Click header to sort via `sortBy=<fieldPath>&order=<asc|desc>`
  - Header filter dropdown (search + value picker) to filter via `filter[<fieldPath>]=<value>`
- Table view includes a `Columns` dropdown to show/hide schema columns (and Status); Filename and Actions are pinned.
- Table row clicks are non-navigational; click the Filename to open the audit page.
- The Actions column uses a single `⋮` menu for Preview OCR, Run validation, and Extract / Re-extract.
- System filters (status, extraction status, human verified, confidence, PO number, department, invoice date, cost, OCR quality, extractor type, extractor) are available from the corresponding system column headers.

## Responsive Layout
- Filters live in column headers; on small screens the table scrolls horizontally.
- Audit panels stack the PDF viewer and form vertically on mobile.
- Manifest line items use a 1/2/3 column grid across mobile/tablet/desktop.

## Project Creation Wizard
Project creation offers two paths:
1. **Quick Create**: name + text extractor + LLM selection, used for fast setup.
2. **Guided Setup**: multi-step wizard for full configuration (basics, extractors, models, schema, rules, review).

See `docs/PROJECT_CREATION.md` for a step-by-step guide.

## Project Detail Enhancements
- Project settings use a dropdown menu and dedicated settings pages for basic info, extractor selection, model selection, and cost summaries.
- Schema and Rules open the schema detail view, with Rules landing on the Rules tab.
- Validation scripts are accessed from the Settings dropdown and remain project-scoped.
- Validation scripts can be created, edited, enabled/disabled, and deleted inline.
- The validation script form can generate a draft script via LLM using a prompt; it uses the project’s configured LLM model and current JSON Schema automatically.

## Schema Settings
- The schema settings route is `/projects/:id/settings/schema` (admin-only).
- Schema editing supports a **Visual Builder** and a **Code Editor**.
- The Visual Builder supports nested objects and arrays-of-objects via expand/collapse, and persists property ordering via `x-ui-order`.
- The Visual Builder supports editing extraction hints via `x-extraction-hint`.

## Error Boundaries
- The app root and dashboard routes are wrapped in `ErrorBoundary`.
- Fallback UI provides retry and navigation options.

## Accessibility Basics
- A skip link targets `#main-content`.
- Focus shifts to main content on route changes.
- Dialogs return focus to the previous element on close.

## A11y Testing
- Axe-core automation is not enabled yet; consider adding it if coverage needs grow.
