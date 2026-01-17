# Implementation Tasks: shadcn-ui and Companion Libraries

## Phase 1: Foundation (shadcn-ui Setup + Core Components)

### 1.1 Installation and Setup
- [x] 1.1.1 Run `npx shadcn-ui@latest init` in `src/apps/web`
- [x] 1.1.2 Configure `components.json` with proper aliases
- [x] 1.1.3 Create `src/shared/lib/utils.ts` with `cn()` helper
- [x] 1.1.4 Update `tailwind.config.js` if needed
- [x] 1.1.5 Add CSS variables to `globals.css`

### 1.2 Core UI Components
- [x] 1.2.1 Add `button` component (`npx shadcn-ui@latest add button`)
- [x] 1.2.2 Add `input` component
- [x] 1.2.3 Add `label` component
- [x] 1.2.4 Add `dialog` component
- [x] 1.2.5 Add `toast` component and `Toaster`
- [x] 1.2.6 Add `use-toast` hook

### 1.3 Main.tsx Updates
- [x] 1.3.1 Add `Toaster` component to `main.tsx`
- [x] 1.3.2 Test toast notifications work

### 1.4 Dialog Migration (Proof of Concept)
- [x] 1.4.1 Update `ProjectsPage.tsx` to use `ui/dialog`
- [x] 1.4.2 Update `ModelsPage.tsx` to use `ui/dialog`
- [x] 1.4.3 Update `ManifestsPage.tsx` to use `ui/dialog`
- [x] 1.4.4 Test keyboard navigation (Escape, focus trap)
- [x] 1.4.5 Remove old `Dialog.tsx` (deprecate or delete)
- [x] 1.4.6 Update `Dialog.test.tsx` or remove

---

## Phase 2: Forms (React Hook Form + Zod)

### 2.1 Installation
- [x] 2.1.1 Install `react-hook-form`
- [x] 2.1.2 Install `zod`
- [x] 2.1.3 Install `@hookform/resolvers`

### 2.2 Form Components
- [x] 2.2.1 Add `form` component (shadcn form wrapper)
- [x] 2.2.2 Add `select` component
- [x] 2.2.3 Add `switch` component
- [x] 2.2.4 Add `textarea` component
- [x] 2.2.5 Add `checkbox` component
- [x] 2.2.6 Add `radio-group` component

### 2.3 Validation Schemas
- [x] 2.3.1 Create `src/shared/schemas/project.schema.ts`
- [x] 2.3.2 Create `src/shared/schemas/model.schema.ts`
- [x] 2.3.3 Create `src/shared/schemas/group.schema.ts`
- [x] 2.3.4 Create `src/shared/schemas/schema.schema.ts`
- [x] 2.3.5 Create `src/shared/schemas/user.schema.ts`

### 2.4 Form Migration
- [x] 2.4.1 Migrate `ProjectForm.tsx` to React Hook Form + Zod
- [x] 2.4.2 Migrate `ModelForm.tsx` to React Hook Form + Zod
- [x] 2.4.3 Migrate `GroupForm.tsx` to React Hook Form + Zod
- [x] 2.4.4 Migrate `SchemaForm.tsx` to React Hook Form + Zod
- [x] 2.4.5 Update all form tests

---

## Phase 3: Data Fetching (React Query)

### 3.1 Installation
- [x] 3.1.1 Install `@tanstack/react-query`

### 3.2 Setup
- [x] 3.2.1 Create `QueryClient` instance in `main.tsx`
- [x] 3.2.2 Wrap app with `QueryClientProvider`
- [x] 3.2.3 Configure default options (staleTime, retry)

### 3.3 Hook Migration
- [x] 3.3.1 Migrate `use-projects.ts` to React Query
- [x] 3.3.2 Migrate `use-models.ts` to React Query
- [x] 3.3.3 Migrate `use-schemas.ts` to React Query
- [x] 3.3.4 Migrate `use-groups.ts` to React Query
- [x] 3.3.5 Migrate `use-manifests.ts` to React Query
- [x] 3.3.6 Migrate `use-auth.ts` to React Query (if applicable)

### 3.4 Page Updates
- [x] 3.4.1 Update `ProjectsPage.tsx` to use React Query hooks
- [x] 3.4.2 Update `ModelsPage.tsx` to use React Query hooks
- [x] 3.4.3 Update `ManifestsPage.tsx` to use React Query hooks
- [x] 3.4.4 Update `SchemasPage.tsx` to use React Query hooks

### 3.5 Testing
- [x] 3.5.1 Update test utilities to include `QueryClientProvider`
- [x] 3.5.2 Update `use-projects.test.ts`
- [x] 3.5.3 Update `use-models.test.ts`
- [x] 3.5.4 Update page component tests

---

## Phase 4: Remaining UI Components

### 4.1 Navigation Components
- [x] 4.1.1 Add `tabs` component
- [x] 4.1.2 Add `dropdown-menu` component
- [x] 4.1.3 Add `breadcrumb` component
- [x] 4.1.4 Add `pagination` component

### 4.2 Feedback Components
- [x] 4.2.1 Add `alert` component
- [x] 4.2.2 Add `progress` component
- [x] 4.2.3 Add `skeleton` component
- [x] 4.2.4 Add `badge` component

### 4.3 Overlay Components
- [x] 4.3.1 Add `tooltip` component
- [x] 4.3.2 Add `popover` component
- [x] 4.3.3 Add `hover-card` component

### 4.4 Data Display Components
- [x] 4.4.1 Add `card` component
- [x] 4.4.2 Add `accordion` component
- [x] 4.4.3 Add `collapsible` component
- [x] 4.4.4 Add `scroll-area` component
- [x] 4.4.5 Add `separator` component

### 4.5 Migration Tasks
- [x] 4.5.1 Migrate `ValidationResultsPanel.tsx` to use `tabs`
- [x] 4.5.2 Migrate `ExtractionStrategySelector.tsx` to use `toggle-group`
- [x] 4.5.3 Add tooltips to action buttons
- [x] 4.5.4 Replace custom dropdowns with `dropdown-menu`
- [x] 4.5.5 Replace custom progress with `progress`
- [x] 4.5.6 Add `skeleton` loading states

---

## Phase 5: Optional (Zustand + Advanced Features)

### 5.1 State Management (Zustand)
- [x] 5.1.1 Install `zustand`
- [x] 5.1.2 Create `src/shared/stores/auth.ts` if needed
- [x] 5.1.3 Create `src/shared/stores/ui.ts` for theme/sidebar state
- [x] 5.1.4 Migrate auth state from existing solution

### 5.2 Advanced Tables (TanStack Table)
- [x] 5.2.1 Install `@tanstack/react-table`
- [x] 5.2.2 Add `table` component wrapper
- [x] 5.2.3 Create reusable table component
- [x] 5.2.4 Migrate `ManifestList.tsx` to use TanStack Table
- [x] 5.2.5 Add sorting to ManifestList
- [x] 5.2.6 Add filtering to ManifestList

### 5.3 Date Utilities (date-fns)
- [x] 5.3.1 Install `date-fns`
- [x] 5.3.2 Replace custom date formatting with `format()`
- [x] 5.3.3 Replace custom date parsing with `parse()`

### 5.4 Icons (lucide-react)
- [x] 5.4.1 Verify `lucide-react` is installed
- [x] 5.4.2 Replace custom SVG components with lucide icons
- [x] 5.4.3 Update icon usage across components

---

## Testing

### Component Tests
- [x] Test `ui/dialog` integration
- [x] Test `ui/tabs` integration
- [x] Test `ui/dropdown-menu` integration
- [x] Test `ui/form` with React Hook Form

### Accessibility Tests
- [x] Keyboard navigation (Tab, Enter, Escape, Arrow keys)
- [x] Screen reader compatibility
- [x] Focus trap in dialogs
- [x] Focus restoration after dialog close
- [x] ARIA attributes validation

### E2E Tests (skip)
- [x] Test complete form submission flow
- [x] Test data fetching and caching
- [x] Test error handling and retry

---

## Documentation

### Code Documentation
- [x] Add JSDoc comments to new schemas
- [x] Document React Query hook patterns
- [x] Document form component patterns

### User Documentation
- [x] Update `docs/WEB_APP.md` with new component patterns
- [x] Add form validation guide
- [x] Add data fetching guide

---

## Cleanup

### Remove Deprecated Code
- [x] Remove old `Dialog.tsx`
- [x] Remove old form validation logic
- [x] Remove old data fetching hooks
- [x] Remove unused imports

### Package Cleanup
- [x] Remove unused dependencies (if any)
- [x] Update `package.json` scripts

---

## Verification

### Functionality
- [x] All existing features work correctly
- [x] No regressions in user workflows
- [x] Performance is not degraded

### Accessibility
- [x] Lighthouse accessibility score > 95
- [x] All keyboard workflows work
- [x] No console errors

### Bundle Size
- [x] Verify bundle size increase is acceptable
- [x] Check tree-shaking is working
- [x] Analyze with `npm run build`

---

## Rollback Plan

If critical issues arise:
1. Revert `main.tsx` changes
2. Revert component migrations (git revert)
3. Keep shadcn components for future gradual adoption
4. Document issues for retry
