# Change: Add Desktop Sidebar Toggle

## Why

The dashboard sidebar is always visible on desktop. During manifest audit/processing, users often want maximum horizontal space and fewer distractions.

## What Changes

- Add a desktop toggle to collapse/expand the dashboard sidebar.
- When collapsed, show an "open sidebar" control so navigation remains discoverable.
- Persist the desktop collapsed state so the UI stays consistent across refresh.
- Keep existing mobile behavior (hamburger open + backdrop close) unchanged.

## Impact

- Affected specs: `web-app`
- Affected code: `src/apps/web/src/routes/dashboard/DashboardLayout.tsx`, `src/apps/web/src/shared/components/SidebarNav.tsx`, `src/apps/web/src/shared/stores/ui.ts`
- Dependencies: none (no new production dependencies)
- Breaking changes: none intended

## Non-Goals (v1)

- Per-route auto-collapse (ex: always collapse on Manifests pages)
- Keyboard shortcuts for toggling
- A compact "icon rail" navigation mode

