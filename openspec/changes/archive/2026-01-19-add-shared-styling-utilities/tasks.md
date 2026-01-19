## 1. Create Shared Utility Modules
- [x] 1.1 Create `src/apps/web/src/shared/styles/status-badges.ts`
- [x] 1.2 Reuse existing `src/apps/web/src/shared/lib/utils.ts` instead of adding class-utils
- [x] 1.3 Add unit tests for utility functions

## 2. Update Status Badge Usage
- [x] 2.1 Update `ManifestCard.tsx` to use `getStatusBadgeClasses()`
- [x] 2.2 Update `ManifestTable.tsx` to use `getStatusBadgeClasses()`
- [x] 2.3 Update `AuditPanel.tsx` to use `getStatusBadgeClasses()`
- [x] 2.4 Remove duplicate status color logic from updated files

## 3. Add More Shared Utilities (Optional)
- [x] 3.1 Consider adding button variant utilities if patterns exist (no duplicate patterns found)
- [x] 3.2 Consider adding card variant utilities if patterns exist (no duplicate patterns found)
- [x] 3.3 Consider adding input state utilities if patterns exist (no duplicate patterns found)

## 4. Verification
- [x] 4.1 Run tests to ensure no visual regressions (all 37 test files pass)
- [x] 4.2 Verify all status badges render consistently (using getStatusBadgeClasses utility)
- [x] 4.3 Check bundle size impact is minimal (small utility module with tests)
