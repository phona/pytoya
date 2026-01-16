# Change: Add Dialog Pattern for Models and Manifests

## Why
Models and Manifests create/edit flows are currently inline, leading to inconsistent UX and limited reuse. A shared dialog pattern provides a focused experience for creation and editing, while keeping pages cleaner. Model creation also needs a clear two-step flow: select model type first, then configure arguments.

## What Changes
- Add a shared centered modal dialog component for the web app.
- Use dialogs for Models create/edit flows.
  - Create flow: select model type (PaddleX / OpenAI-compatible), then configure arguments.
  - Edit flow: model type is locked; only model arguments can be edited.
- Use dialogs for Manifests upload (create) and audit (edit) flows.

## Impact
- Affected specs: `web-app`
- Affected code:
  - `src/apps/web/src/shared/components/` (new Dialog component)
- `src/apps/web/src/routes/dashboard/ModelsPage.tsx` (two-step create flow, edit lock)
  - `src/apps/web/src/routes/dashboard/ManifestsPage.tsx`
  - `src/apps/web/src/shared/components/UploadDialog.tsx` (integrate with shared dialog)
  - `src/apps/web/src/shared/components/manifests/AuditPanel.tsx` (render inside dialog)
- Breaking changes: None
- Dependencies: None
