# Change: Add Shared Styling Utilities

## Why

Status badge styling logic is duplicated across multiple files (ManifestCard, ManifestTable, AuditPanel). This creates maintenance burden and increases risk of inconsistency when styles need to be updated. Other common patterns like button variants, card styles, and input states could also benefit from shared utilities.

## What Changes

- Create a `src/apps/web/src/shared/styles/status-badges.ts` module with status badge class generators
- Create a `src/apps/web/src/shared/styles/class-utils.ts` for reusable className utilities
- Update components to use shared utilities instead of inline ternary operators
- Use `class-variance-authority` (CVA) for variants if appropriate

## Impact

- Affected specs: `web-app` (new shared utilities requirements)
- Affected code:
  - `src/apps/web/src/shared/components/manifests/ManifestCard.tsx`
  - `src/apps/web/src/shared/components/manifests/ManifestTable.tsx`
  - `src/apps/web/src/shared/components/manifests/AuditPanel.tsx`
  - New files: `status-badges.ts`, `class-utils.ts`

## Migration

Components will import and use shared utilities instead of defining styles inline:
```tsx
// Before
const statusClass = status === 'completed' ? 'bg-green-100 text-green-700' : ...

// After
import { getStatusBadgeClasses } from '@/shared/styles/status-badges';
const statusClass = getStatusBadgeClasses(status);
```
