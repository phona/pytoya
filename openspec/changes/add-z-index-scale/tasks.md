## 1. Define Z-Index Scale
- [ ] 1.1 Create `src/apps/web/src/styles/z-index.css` with custom properties
- [ ] 1.2 Document z-index scale in `docs/WEB_APP.md`

## 2. Update Components to Use Named Scale
- [ ] 2.1 Update `SidebarNav.tsx` - verify z-40 (backdrop) and z-50 (sidebar) are correct
- [ ] 2.2 Update `DashboardLayout.tsx` - change header from z-30 to z-20
- [ ] 2.3 Update `AuditPanel.tsx` - verify overlay z-index is appropriate
- [ ] 2.4 Update `ManifestList.tsx` - verify toggle button z-index is appropriate

## 3. Add Type Safety (Optional)
- [ ] 3.1 Consider adding TypeScript types for z-index values
- [ ] 3.2 Or use Tailwind arbitrary values with semantic names

## 4. Verification
- [ ] 4.1 Verify stacking order is correct across all pages
- [ ] 4.2 Test modal/backdrop stacking
- [ ] 4.3 Test sidebar/backdrop stacking
- [ ] 4.4 Test dropdown/tooltip stacking
