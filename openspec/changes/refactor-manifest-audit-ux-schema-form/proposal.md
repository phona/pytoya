# Change: Refactor manifest audit UX + schema-driven form

## Why
The manifest audit experience is currently optimized around a small hardcoded set of fields (department + invoice + items). When a project JSON Schema evolves, newly-added fields do not appear in the audit UI, forcing manual workarounds and risking missed validation.

The current audit UI also feels “embedded” (nested card + independent scrolling areas) rather than a focused, full-height audit page. This reduces efficiency for high-volume auditing and makes the page harder to scan and operate.

## What Changes
- Keep the manifest audit flow as a dedicated route page (deep-linkable + refresh-safe).
- Update the audit page layout to a full-height, two-column “audit workspace” inspired by `audit_page/index.html`:
  - Clear header with navigation and save/status signals
  - Split view: PDF viewer (left) + audit form (right)
  - Footer actions and predictable scrolling (avoid double-scroll traps)
- Replace hardcoded audit fields with schema-driven rendering:
  - Render form fields dynamically from the project’s `jsonSchema` (leaf fields)
  - Preserve existing UX behaviors: confidence highlighting, `x-extraction-hint` helper text, and per-field re-extract actions
  - Keep only `humanVerified` and `_extraction_info` as special UI blocks (verification + extraction guidance)

## Non-Goals (for this change)
- Building a generic JSON Schema form engine for the whole app
- Supporting every JSON Schema feature (e.g., `oneOf`, `anyOf`, advanced arrays, custom UI widgets)
- Changing extraction or validation backend behavior

## Impact
- Affected spec: `openspec/specs/web-app/spec.md`
- Affected code (expected):
  - `src/apps/web/src/routes/dashboard/ManifestAuditPage.tsx`
  - `src/apps/web/src/shared/components/manifests/AuditPanel.tsx`
  - `src/apps/web/src/shared/components/manifests/EditableForm.tsx` (or replacement component)
  - `src/apps/web/src/shared/utils/schema.ts` (optional helper additions)
  - Tests under `src/apps/web/src/**`

## Approval
- Pending
