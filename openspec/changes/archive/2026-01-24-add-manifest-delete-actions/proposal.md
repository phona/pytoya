# Change: Add manifest delete actions (single + bulk)

## Why
Users need a safe, first-class way to delete incorrect or obsolete manifests from a group, including both single-document deletion and batch deletion.

## What Changes
- Add a per-manifest **Delete** action in the Manifests list row actions menu.
- Add a toolbar **Delete…** batch action that supports:
  - **Selected** scope (requires explicit selection)
  - **All matching current filters** scope (disabled when no filters are applied)
- Add a group-scoped bulk delete API endpoint to delete multiple manifests in one request.

## Impact
- **Affected specs**: `web-app`, `manifest-upload`
- **Affected code**:
  - Backend manifests controller/service (bulk delete endpoint + service method)
  - Web manifests list UI (row actions + batch scope modal integration)
  - Shared types for the new DTO
- **Risk**: Destructive action (data loss). Mitigations: confirm dialogs, destructive styling, disable filtered scope when no filters are applied, and cap filtered scope size (UI).

