# Change: fix-manifest-autosave-patch-loop

## Why

The manifest Audit page auto-save can enter a runaway loop that repeatedly sends `PATCH /api/manifests/:id` requests (e.g. `/api/manifests/78`) after a user edits a field. This causes noisy network traffic, slow UI, and can overload the API while the user is still editing.

## Root Cause

The web app’s Audit form auto-save is split across two components:

- `EditableForm` calls `onSave(draft)` from a `useEffect` while the form is dirty.
- `AuditPanel` provides `handleAutoSave` as the `onSave` prop and implements a debounced PATCH.

The loop occurs when `onSave` changes identity during the dirty period.

ASCII:
```
User edit -> EditableForm sets isDirty=true
  -> effect: onSave(draft) --------------+
     AuditPanel.handleAutoSave()         |
       setDebounceTimer(timer)           |
         re-render AuditPanel            |
           new handleAutoSave identity   |
             EditableForm effect runs again (isDirty still true)
               onSave(draft) -----------+
```

Concretely: `AuditPanel.handleAutoSave` currently depends on a `debounceTimer` state value, and also updates that state when scheduling the save. That re-render produces a new callback identity, which re-triggers `EditableForm`’s effect even though the draft hasn’t changed.

## What Changes

### A) Make auto-save callback stable (stop re-entrant saves)

Replace the debounced timer state in `AuditPanel` with a `useRef` stored timer handle so scheduling/canceling a timer does not change component state and does not change the `handleAutoSave` callback identity.

Pseudocode:
```
timerRef = useRef(null)

handleAutoSave(draft):
  clearTimeout(timerRef.current)
  timerRef.current = setTimeout(() => PATCH /manifests/:id, debounceMs)
```

### B) Debounce auto-save to 3 seconds

Change the auto-save delay from ~1s to ~3s after the last edit, to reduce PATCH frequency while users are actively typing.

### C) Regression test to prevent loop reintroduction

Update the AuditPanel unit test to simulate the real `EditableForm` behavior (effect depends on `onSave` identity) and assert a single PATCH occurs for one dirty change, even across AuditPanel re-renders.

## Impact

- Affected specs:
  - `openspec/specs/web-app/spec.md` (Audit form save behavior)
- Affected code (implementation later):
  - Web: `src/apps/web/src/shared/components/manifests/AuditPanel.tsx`
  - Web tests: `src/apps/web/src/shared/components/manifests/AuditPanel.test.tsx`
- No backend/API contract changes.

## Non-goals

- Changing backend manifest update semantics.
- Reworking the schema-driven form rendering.
- Adding new libraries for debouncing or state management.

