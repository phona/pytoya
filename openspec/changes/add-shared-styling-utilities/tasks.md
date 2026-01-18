## 1. Create Shared Utility Modules
- [ ] 1.1 Create `src/apps/web/src/shared/styles/status-badges.ts`
- [ ] 1.2 Create `src/apps/web/src/shared/styles/class-utils.ts`
- [ ] 1.3 Add unit tests for utility functions

## 2. Update Status Badge Usage
- [ ] 2.1 Update `ManifestCard.tsx` to use `getStatusBadgeClasses()`
- [ ] 2.2 Update `ManifestTable.tsx` to use `getStatusBadgeClasses()`
- [ ] 2.3 Update `AuditPanel.tsx` to use `getStatusBadgeClasses()`
- [ ] 2.4 Remove duplicate status color logic from updated files

## 3. Add More Shared Utilities (Optional)
- [ ] 3.1 Consider adding button variant utilities if patterns exist
- [ ] 3.2 Consider adding card variant utilities if patterns exist
- [ ] 3.3 Consider adding input state utilities if patterns exist

## 4. Verification
- [ ] 4.1 Run tests to ensure no visual regressions
- [ ] 4.2 Verify all status badges render consistently
- [ ] 4.3 Check bundle size impact is minimal
