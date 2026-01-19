## 1. ManifestsPage Filter Sidebar
- [x] 1.1 Update `ManifestsPage.tsx` filter layout to stack vertically on mobile
- [x] 1.2 Add collapsible/expandable state for filters on mobile
- [x] 1.3 Change filter container from `w-64` to `w-full lg:w-64`
- [x] 1.4 Update parent flex container to `flex-col lg:flex-row`

## 2. AuditPanel Split View
- [x] 2.1 Update `AuditPanel.tsx` to use stacked layout on mobile
- [x] 2.2 Change 50/50 split panels to `w-full lg:w-1/2`
- [x] 2.3 Remove magic number height calc `h-[calc(100vh-300px)]`
- [x] 2.4 Use flex-1 with proper overflow handling instead

## 3. EditableForm Grid
- [x] 3.1 Update `EditableForm.tsx` grid to use responsive columns
- [x] 3.2 Change from `grid-cols-3` to `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`

## 4. Verification
- [x] 4.1 Test layouts at various breakpoints (320px, 375px, 768px, 1024px)
- [x] 4.2 Verify PDF viewer remains usable on mobile (stacked layout with flex-1)
- [x] 4.3 Ensure all form inputs are tappable on mobile (min 44px height)
