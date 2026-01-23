# Proposal: Improve Create/Edit UX With Modals

- **Change ID**: `improve-create-edit-modals`
- **Status**: Draft (needs approval before implementation)
- **Date**: 2026-01-23

## Why

Users currently experience inconsistent create/edit flows across the dashboard:

- Some entities use a modal dialog (keeps context).
- Some entities render an inline “edit mode” card inside the page (causes scroll/context loss and layout shifts).

### Root Cause

Create/edit UI patterns were implemented page-by-page without a single rule for:

- When to use a modal vs a page route
- When to use a centered dialog vs a side-sheet style dialog
- How to handle “dirty form” close/escape behavior consistently

### Evidence (current implementation)

Already modal/dialog:
- `src/apps/web/src/routes/dashboard/ProjectsPage.tsx` (New Project dialog + wizard)
- `src/apps/web/src/routes/dashboard/ModelsPage.tsx` (New/Edit Model dialog)
- `src/apps/web/src/routes/dashboard/ExtractorsPage.tsx` (New/Edit Extractor dialog)
- `src/apps/web/src/routes/dashboard/ProjectSettingsBasicPage.tsx` (Edit Project Basics dialog)
- `src/apps/web/src/routes/dashboard/ProjectSettingsModelsPage.tsx` (Edit Model Settings dialog)

Still inline (best modal candidates):
- `src/apps/web/src/routes/dashboard/ProjectDetailPage.tsx` (Group create/edit)
- `src/apps/web/src/routes/dashboard/ProjectSettingsSchemaPage.tsx` (Schema edit)
- `src/apps/web/src/routes/dashboard/ProjectSettingsValidationScriptsPage.tsx` (Validation script create/edit)

## What Changes

Convert “inline edit cards” into modal-based flows so users can create/edit without losing their place.

### Simple Rule (Decision Matrix)

Use this rule everywhere (so UX becomes predictable):

```
IF the flow needs deep-linking / refresh-safe "edit mode":
  use a dedicated route page
ELSE IF the form is long, multi-section, or code-editor-like:
  use a side-sheet dialog (scroll inside)
ELSE:
  use a centered dialog
```

### Targeted Conversions (Phase 1)

- Groups: convert Group create/edit on Project Detail into a modal flow.
- Schema editing: convert Schema edit “inline mode” into a side-sheet dialog.
- Validation scripts: convert Script create/edit into a side-sheet dialog.

Non-goal: change the Manifests audit/edit page. It stays a dedicated route (deep-linkable, split view).

## UX Requirements (Acceptance Criteria)

- **Context preserved**: opening a modal MUST NOT navigate away or reset scroll position.
- **Keyboard accessible**:
  - focus moves into the dialog on open
  - Escape closes when safe
  - focus returns to the triggering button on close
- **Dirty protection**: closing a dirty form MUST show a “Discard changes?” confirm.
- **Loading safety**:
  - while submitting, close actions SHOULD be disabled
  - submit buttons show busy state
- **Responsive**: dialogs MUST fit small screens; long content scrolls inside the dialog (not behind it).

## Architecture Notes (high level)

Keep “form logic” inside existing form components. Add thin dialog wrappers that only handle:

- open/close state
- title/description
- dirty-close confirmation
- wiring `onSubmit` to refresh data + close

ASCII:
```
[Page] --opens--> [Dialog wrapper] --renders--> [Existing Form]
   ^                 | close/save              |
   |-----------------+----invalidate----------+
```

## Risks / Tradeoffs

- Long editors in a centered dialog can feel cramped → use side-sheet for long forms.
- New “dirty close confirm” can annoy users if too aggressive → only trigger when form is dirty.

## Rollout

- Phase 1: apply the rule to the listed pages (highest UX impact).
- Phase 2 (optional): consider standardizing any remaining inline create/edit patterns.

## Open Questions

- Should any of these dialogs be deep-linkable via query params (e.g. `?edit=...`) or is “local state only” sufficient?
- For Schema edit: do we want “Save + Keep open” as a secondary action?

