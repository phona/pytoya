# Change: Update audit panel actions menu + OCR refresh

## Why
The audit page header has many peer action buttons, which creates clutter and wrapping on smaller widths.

In addition, users currently cannot force a rebuild of the cached OCR/text result from the audit UI.

## What Changes
- The audit page header SHALL keep frequently used actions visible:
  - Save
  - Run validation
- Less-frequent actions SHALL be merged into a single `Actions ▼` menu:
  - Refresh results
  - Refresh OCR cache (rebuild)
  - Extract
- The audit page SHALL provide keyboard shortcuts for these actions (when safe to do so):
  - `Ctrl/Cmd+S` => Save
  - `V` => Run validation
  - `R` => Refresh results
  - `O` => Refresh OCR cache
  - `E` => Extract
- The API SHALL expose an endpoint to rebuild OCR cache for a manifest and persist the updated OCR result.

## UX Sketch (ASCII)
Before:
```
[Prev] [X of N] [Next] [Refresh] [Save] [Run validation] [Extract] [X]
```

After:
```
[Prev] [X of N] [Next] [Save] [Run validation] [Actions ▼] [X]

Actions ▼
  - Refresh results        (R)
  - Refresh OCR cache      (O)
  - Extract                (E)
```

## Impact
- Affected specs:
  - `web-app` (audit header actions + shortcuts)
  - `extraction` or `web-app` (OCR refresh endpoint behavior, if documented there)
- Affected code (expected):
  - `src/apps/web/src/shared/components/manifests/AuditPanel.tsx`
  - `src/apps/web/src/shared/hooks/use-manifests.ts`
  - `src/apps/web/src/api/manifests.ts`
  - `src/apps/api/src/manifests/manifests.controller.ts`
  - `src/apps/api/src/manifests/manifests.service.ts` (reuse existing OCR processing logic)

## Non-goals
- Adding new production dependencies.
- Implementing a background OCR refresh queue with progress (initial version is synchronous).

