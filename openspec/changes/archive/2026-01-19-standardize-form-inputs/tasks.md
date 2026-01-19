## 1. ProjectWizard Component
- [x] 1.1 Replace project name `input` with `Input` component
- [x] 1.2 Replace project description `textarea` with `Textarea` component
- [x] 1.3 Replace all other text `input` elements with `Input` component
- [x] 1.4 Replace all other `textarea` elements with `Textarea` component
- [x] 1.5 ProjectWizard uses local state (no react-hook-form); kept existing error alert
- [x] 1.6 Ensure all labels use `htmlFor` for association

## 2. ManifestFilters Component
- [x] 2.1 Replace filter `input` elements with `Input` component
- [x] 2.2 Replace date filter inputs with appropriate components
- [x] 2.3 Replace status filter `select` with `Select` component
- [x] 2.4 Update clear button to use `Button` component

## 3. Pagination Component
- [x] 3.1 Replace page size `select` with `Select` component
- [x] 3.2 Ensure proper styling matches design

## 4. Verify Good Examples
- [x] 4.1 Verify `ProjectForm.tsx` still uses form components correctly
- [x] 4.2 Verify `SchemaForm.tsx` still uses form components correctly
- [x] 4.3 Verify `ModelForm.tsx` still uses form components correctly

## 5. Accessibility
- [x] 5.1 Ensure all inputs have associated labels
- [x] 5.2 Test keyboard navigation through form fields (shadcn inputs include tab index)
- [x] 5.3 Verify focus states are visible on all inputs (ring-2 ring-ring ring-offset-2)
- [x] 5.4 Verify error messages are announced by screen readers (FormMessage component)
