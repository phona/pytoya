# Change: Improve Mobile Responsiveness

## Why

Several key pages in the web application have poor mobile experiences due to fixed-width layouts that don't adapt to smaller screens. The ManifestsPage filter sidebar is fixed at `w-64`, the AuditPanel uses a 50/50 split view, and EditableForm has a fixed 3-column grid. These issues make the application difficult or impossible to use on mobile devices.

## What Changes

- **ManifestsPage**: Change filter sidebar from fixed width to full-width with collapsible filters on mobile
- **AuditPanel**: Stack PDF viewer and edit form vertically on mobile instead of 50/50 split
- **EditableForm**: Use responsive grid columns (1 on mobile, 2 on tablet, 3 on desktop)
- Remove magic number height calculations (`h-[calc(100vh-300px)]`) in favor of flexible layouts

## Impact

- Affected specs: `web-app` (new responsive design requirements)
- Affected code:
  - `src/apps/web/src/routes/dashboard/ManifestsPage.tsx`
  - `src/apps/web/src/shared/components/manifests/AuditPanel.tsx`
  - `src/apps/web/src/shared/components/manifests/EditableForm.tsx`

## Migration

No data migration needed - these are purely CSS/layout changes.
