# Change: Show validation errors/warnings on Audit Save

## Why
In the Audit panel, clicking **Save** can trigger a validation run (Human Verified gate). When validation scripts report errors/warnings (or a script fails), users don’t reliably see the details at the moment they need them, which slows down auditing and makes “Save failed” feel opaque.

## What Changes
- Audit **Save** flow surfaces validation **errors** and **warnings** immediately (not only via a separate “Run validation” action).
- When validation returns issues, the Audit UI provides a direct way to view details (opens the Validation section/tab).
- When the validation request fails (network/server), the UI shows a clear error and does not silently proceed with `humanVerified=true`.

## Impact
- Affected specs: `web-app` (audit save UX + Human Verified validation gate)
- Affected code: `src/apps/web/src/shared/components/manifests/AuditPanel.tsx` and related tests/i18n
- Risk: Slight UX change (more visible validation feedback on Save); mitigated by keeping behavior consistent with existing “Run validation” toast patterns.

