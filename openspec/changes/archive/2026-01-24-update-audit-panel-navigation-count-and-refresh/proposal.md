# Change: Update audit panel navigation count + refresh

## Why
Today the manifest audit panel shows a navigation count like `3 / 25` even when the user is working with a filtered result set that matches more than 25 manifests.

Root cause:
- The manifests list fetches a paginated page (default `pageSize=25`).
- Row click passes `allManifestIds` for only the current page.
- The audit panel renders `{displayIndex} / {allManifestIds.length}`, so `allManifestIds.length` is usually `25`.

This is confusing for users who are:
- Reviewing a filtered set (expect `… of <filtered total>`), or
- Auditing “everything” in a group (expect `… of <group total>`).

## What Changes
- The Manifests list page SHALL provide an **Audit** action (similar placement/pattern as **Extract**) that opens the audit page with an explicit navigation scope:
  - **Audit filtered results (N)** (default when filters are applied)
  - **Audit selected (K)** (only when one or more rows are selected)
  - **Audit all in group (M)**
- The audit page SHALL open on the first manifest in the chosen scope (in current sort order).
- The audit page SHALL show the manifest position as `X of N` within a clear **scope**.
  - Default scope when opened from Manifests list: **Filtered results**
  - If opened without list context (deep link): **Unknown scope** (no list navigation)
- The audit panel SHALL provide a **Refresh results** button that refreshes the current navigation scope:
  - Updates `N` (total) and list ordering
  - Updates next/previous targets for navigation
- The audit page SHALL attempt to restore the last-known navigation scope after a browser refresh within the same session (best effort).

## UX Summary

From Manifests list (filtered):
```
ManifestsPage (filters + sort + page)
  -> Audit ▼ -> "Audit filtered results (N)"
Audit header:
  Scope: Filtered (N)   Position: X of N
  [Back to results] [Refresh results] [Prev] [Next]
```

From Manifests list (all in group):
```
ManifestsPage
  -> Audit ▼ -> "Audit all in group (M)"
Audit header:
  Scope: All (M)   Position: X of M
  [Back to results] [Refresh results] [Prev] [Next]
```

Deep link (no list context):
```
Audit header:
  Scope: Unknown   Position: —
  [Go to manifests list]   (Prev/Next disabled)
```

## Impact
- Affected specs:
  - `web-app` (audit page header + refresh + navigation scope)
- Affected code (expected):
  - `src/apps/web/src/routes/dashboard/ManifestsPage.tsx`
  - `src/apps/web/src/routes/dashboard/ManifestAuditPage.tsx`
  - `src/apps/web/src/shared/components/manifests/AuditPanel.tsx`
  - `src/apps/web/src/shared/hooks/use-manifests` (query usage from audit flow)

## Non-goals
- Changing the backend filtering/pagination semantics.
- Introducing new production dependencies.

## Open Questions (for review)
- Should **Refresh results** refetch:
  - (A) only the navigation scope list/meta, or
  - (B) both the navigation scope and the current manifest details?
- When refreshed ordering changes, should we keep the same manifest open and only update `X of N` (recommended), or re-position to the new `X` strictly by ordering?
- For **Audit selected (K)**, should the scope preserve the current list ordering only, or respect selection order?
