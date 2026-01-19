# Change: Add Z-Index Scale Documentation

## Why

The web application uses z-index values inconsistently without documentation or a clear hierarchy. Values like z-10, z-30, z-40, and z-50 are scattered throughout the codebase without clear rationale. Multiple components use z-50, which can lead to stacking conflicts. This makes it difficult to reason about layer order and causes issues when adding new layered components.

## What Changes

- Define a documented z-index scale for the web application
- Update existing components to use the documented scale
- Add CSS custom properties or Tailwind arbitrary values for named layers
- Document the z-index scale in project documentation

## Impact

- Affected specs: `web-app` (new z-index standards)
- Affected code:
  - `src/apps/web/src/routes/dashboard/DashboardLayout.tsx`
  - `src/apps/web/src/shared/components/SidebarNav.tsx`
  - `src/apps/web/src/shared/components/manifests/AuditPanel.tsx`
  - `src/apps/web/src/shared/components/manifests/ManifestList.tsx`
  - All dialog/modal components using shadcn-ui

## Migration

Existing z-index values will be remapped to the new scale:
- z-10 → z-10 (base overlays)
- z-30 → z-20 (header)
- z-40 → z-40 (backdrops)
- z-50 → z-50 (modals, sidebars, tooltips)
