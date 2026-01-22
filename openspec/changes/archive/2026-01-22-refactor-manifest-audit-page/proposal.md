# Change: Refactor manifest audit to a page

## Why
The manifest audit/edit flow needs deep-linking, refresh safety, and cleaner extensibility than a modal dialog provides.

## What Changes
- Replace the dialog-based manifest audit flow with a dedicated route page.
- Keep the audit UI (PDF viewer + editable form) functionally equivalent.

## Impact
- Affected spec: `openspec/specs/web-app/spec.md`
- Affected code: web router and manifests UI routes.

## Approval
- Approved by user on 2026-01-21.

