# Change: Standardize UI Color Scale

## Why

The web application currently uses an inconsistent mix of `gray-*` and `slate-*` Tailwind color scales across different pages and components. DashboardLayout and SidebarNav use `slate` colors, while ProjectsPage, ManifestsPage, and most other components use `gray` colors. This creates visual inconsistency and makes the application appear disjointed.

## What Changes

- **BREAKING**: Migrate all `gray-*` color usage to `slate-*` for consistency
- Update all page backgrounds, text colors, border colors, and hover states
- Standardize on the `slate` color scale as the primary neutral palette
- Maintain existing color semantics (e.g., `gray-50` → `slate-50`, `gray-200` → `slate-200`)

## Impact

- Affected specs: `web-app` (new styling consistency requirements)
- Affected code: All components in `src/apps/web/src/`
- Visual change: Colors will shift slightly from gray to slate scale (subtle but noticeable)

## Migration

All `gray-*` classes will be replaced with equivalent `slate-*` classes:
- `bg-gray-50` → `bg-slate-50`
- `text-gray-900` → `text-slate-900`
- `border-gray-200` → `border-slate-200`
- `hover:bg-gray-50` → `hover:bg-slate-50`
- etc.
