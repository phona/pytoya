# Implementation Tasks: shadcn-ui and Companion Libraries

## Phase 1: Foundation (shadcn-ui Setup + Core Components)

### 1.1 Installation and Setup
- [ ] 1.1.1 Run `npx shadcn-ui@latest init` in `src/apps/web`
- [ ] 1.1.2 Configure `components.json` with proper aliases
- [ ] 1.1.3 Create `src/shared/lib/utils.ts` with `cn()` helper
- [ ] 1.1.4 Update `tailwind.config.js` if needed
- [ ] 1.1.5 Add CSS variables to `globals.css`

### 1.2 Core UI Components
- [ ] 1.2.1 Add `button` component (`npx shadcn-ui@latest add button`)
- [ ] 1.2.2 Add `input` component
- [ ] 1.2.3 Add `label` component
- [ ] 1.2.4 Add `dialog` component
- [ ] 1.2.5 Add `toast` component and `Toaster`
- [ ] 1.2.6 Add `use-toast` hook

### 1.3 Main.tsx Updates
- [ ] 1.3.1 Add `Toaster` component to `main.tsx`
- [ ] 1.3.2 Test toast notifications work

### 1.4 Dialog Migration (Proof of Concept)
- [ ] 1.4.1 Update `ProjectsPage.tsx` to use `ui/dialog`
- [ ] 1.4.2 Update `ModelsPage.tsx` to use `ui/dialog`
- [ ] 1.4.3 Update `ManifestsPage.tsx` to use `ui/dialog`
- [ ] 1.4.4 Test keyboard navigation (Escape, focus trap)
- [ ] 1.4.5 Remove old `Dialog.tsx` (deprecate or delete)
- [ ] 1.4.6 Update `Dialog.test.tsx` or remove

---

## Phase 2: Forms (React Hook Form + Zod)

### 2.1 Installation
- [ ] 2.1.1 Install `react-hook-form`
- [ ] 2.1.2 Install `zod`
- [ ] 2.1.3 Install `@hookform/resolvers`

### 2.2 Form Components
- [ ] 2.2.1 Add `form` component (shadcn form wrapper)
- [ ] 2.2.2 Add `select` component
- [ ] 2.2.3 Add `switch` component
- [ ] 2.2.4 Add `textarea` component
- [ ] 2.2.5 Add `checkbox` component
- [ ] 2.2.6 Add `radio-group` component

### 2.3 Validation Schemas
- [ ] 2.3.1 Create `src/shared/schemas/project.schema.ts`
- [ ] 2.3.2 Create `src/shared/schemas/model.schema.ts`
- [ ] 2.3.3 Create `src/shared/schemas/group.schema.ts`
- [ ] 2.3.4 Create `src/shared/schemas/schema.schema.ts`
- [ ] 2.3.5 Create `src/shared/schemas/user.schema.ts`

### 2.4 Form Migration
- [ ] 2.4.1 Migrate `ProjectForm.tsx` to React Hook Form + Zod
- [ ] 2.4.2 Migrate `ModelForm.tsx` to React Hook Form + Zod
- [ ] 2.4.3 Migrate `GroupForm.tsx` to React Hook Form + Zod
- [ ] 2.4.4 Migrate `SchemaForm.tsx` to React Hook Form + Zod
- [ ] 2.4.5 Update all form tests

---

## Phase 3: Data Fetching (React Query)

### 3.1 Installation
- [ ] 3.1.1 Install `@tanstack/react-query`

### 3.2 Setup
- [ ] 3.2.1 Create `QueryClient` instance in `main.tsx`
- [ ] 3.2.2 Wrap app with `QueryClientProvider`
- [ ] 3.2.3 Configure default options (staleTime, retry)

### 3.3 Hook Migration
- [ ] 3.3.1 Migrate `use-projects.ts` to React Query
- [ ] 3.3.2 Migrate `use-models.ts` to React Query
- [ ] 3.3.3 Migrate `use-schemas.ts` to React Query
- [ ] 3.3.4 Migrate `use-groups.ts` to React Query
- [ ] 3.3.5 Migrate `use-manifests.ts` to React Query
- [ ] 3.3.6 Migrate `use-auth.ts` to React Query (if applicable)

### 3.4 Page Updates
- [ ] 3.4.1 Update `ProjectsPage.tsx` to use React Query hooks
- [ ] 3.4.2 Update `ModelsPage.tsx` to use React Query hooks
- [ ] 3.4.3 Update `ManifestsPage.tsx` to use React Query hooks
- [ ] 3.4.4 Update `SchemasPage.tsx` to use React Query hooks

### 3.5 Testing
- [ ] 3.5.1 Update test utilities to include `QueryClientProvider`
- [ ] 3.5.2 Update `use-projects.test.ts`
- [ ] 3.5.3 Update `use-models.test.ts`
- [ ] 3.5.4 Update page component tests

---

## Phase 4: Remaining UI Components

### 4.1 Navigation Components
- [ ] 4.1.1 Add `tabs` component
- [ ] 4.1.2 Add `dropdown-menu` component
- [ ] 4.1.3 Add `breadcrumb` component
- [ ] 4.1.4 Add `pagination` component

### 4.2 Feedback Components
- [ ] 4.2.1 Add `alert` component
- [ ] 4.2.2 Add `progress` component
- [ ] 4.2.3 Add `skeleton` component
- [ ] 4.2.4 Add `badge` component

### 4.3 Overlay Components
- [ ] 4.3.1 Add `tooltip` component
- [ ] 4.3.2 Add `popover` component
- [ ] 4.3.3 Add `hover-card` component

### 4.4 Data Display Components
- [ ] 4.4.1 Add `card` component
- [ ] 4.4.2 Add `accordion` component
- [ ] 4.4.3 Add `collapsible` component
- [ ] 4.4.4 Add `scroll-area` component
- [ ] 4.4.5 Add `separator` component

### 4.5 Migration Tasks
- [ ] 4.5.1 Migrate `ValidationResultsPanel.tsx` to use `tabs`
- [ ] 4.5.2 Migrate `ExtractionStrategySelector.tsx` to use `toggle-group`
- [ ] 4.5.3 Add tooltips to action buttons
- [ ] 4.5.4 Replace custom dropdowns with `dropdown-menu`
- [ ] 4.5.5 Replace custom progress with `progress`
- [ ] 4.5.6 Add `skeleton` loading states

---

## Phase 5: Optional (Zustand + Advanced Features)

### 5.1 State Management (Zustand)
- [ ] 5.1.1 Install `zustand`
- [ ] 5.1.2 Create `src/shared/stores/auth.ts` if needed
- [ ] 5.1.3 Create `src/shared/stores/ui.ts` for theme/sidebar state
- [ ] 5.1.4 Migrate auth state from existing solution

### 5.2 Advanced Tables (TanStack Table)
- [ ] 5.2.1 Install `@tanstack/react-table`
- [ ] 5.2.2 Add `table` component wrapper
- [ ] 5.2.3 Create reusable table component
- [ ] 5.2.4 Migrate `ManifestList.tsx` to use TanStack Table
- [ ] 5.2.5 Add sorting to ManifestList
- [ ] 5.2.6 Add filtering to ManifestList

### 5.3 Date Utilities (date-fns)
- [ ] 5.3.1 Install `date-fns`
- [ ] 5.3.2 Replace custom date formatting with `format()`
- [ ] 5.3.3 Replace custom date parsing with `parse()`

### 5.4 Icons (lucide-react)
- [ ] 5.4.1 Verify `lucide-react` is installed
- [ ] 5.4.2 Replace custom SVG components with lucide icons
- [ ] 5.4.3 Update icon usage across components

---

## Testing

### Component Tests
- [ ] Test `ui/dialog` integration
- [ ] Test `ui/tabs` integration
- [ ] Test `ui/dropdown-menu` integration
- [ ] Test `ui/form` with React Hook Form

### Accessibility Tests
- [ ] Keyboard navigation (Tab, Enter, Escape, Arrow keys)
- [ ] Screen reader compatibility
- [ ] Focus trap in dialogs
- [ ] Focus restoration after dialog close
- [ ] ARIA attributes validation

### E2E Tests
- [ ] Test complete form submission flow
- [ ] Test data fetching and caching
- [ ] Test error handling and retry

---

## Documentation

### Code Documentation
- [ ] Add JSDoc comments to new schemas
- [ ] Document React Query hook patterns
- [ ] Document form component patterns

### User Documentation
- [ ] Update `docs/WEB_APP.md` with new component patterns
- [ ] Add form validation guide
- [ ] Add data fetching guide

---

## Cleanup

### Remove Deprecated Code
- [ ] Remove old `Dialog.tsx`
- [ ] Remove old form validation logic
- [ ] Remove old data fetching hooks
- [ ] Remove unused imports

### Package Cleanup
- [ ] Remove unused dependencies (if any)
- [ ] Update `package.json` scripts

---

## Verification

### Functionality
- [ ] All existing features work correctly
- [ ] No regressions in user workflows
- [ ] Performance is not degraded

### Accessibility
- [ ] Lighthouse accessibility score > 95
- [ ] All keyboard workflows work
- [ ] No console errors

### Bundle Size
- [ ] Verify bundle size increase is acceptable
- [ ] Check tree-shaking is working
- [ ] Analyze with `npm run build`

---

## Rollback Plan

If critical issues arise:
1. Revert `main.tsx` changes
2. Revert component migrations (git revert)
3. Keep shadcn components for future gradual adoption
4. Document issues for retry
