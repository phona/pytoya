# Change: Standardize Form Inputs

## Why

The web application has inconsistent form input implementations. Some components use shadcn/ui form components correctly (ProjectForm, SchemaForm), while others implement custom inputs with inline Tailwind classes (ProjectWizard, ManifestFilters, Pagination). This creates:
- Inconsistent styling for focus states, error states, and disabled states
- Missing error message display for validation failures
- Inconsistent input sizing and spacing
- More maintenance burden

## What Changes

- Replace all native `<input>` elements with shadcn/ui `Input` component
- Replace all native `<textarea>` elements with shadcn/ui `Textarea` component
- Replace all native `<select>` elements with shadcn/ui `Select` component
- Use `FormMessage` component for consistent error display
- Ensure proper label association with `htmlFor`

## Impact

- Affected specs: `web-app` (new form input consistency requirements)
- Affected code:
  - `ProjectWizard.tsx` - Custom text inputs and textareas
  - `ManifestFilters.tsx` - Custom text inputs and selects
  - `Pagination.tsx` - Custom select for page size
  - Any other components with native form elements

## Migration

Custom input classes will be replaced with shadcn/ui components:

```tsx
// Before
<input
  id="project-name"
  type="text"
  value={name}
  onChange={(e) => setName(e.target.value)}
  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
/>

// After
<Input
  id="project-name"
  value={name}
  onChange={(e) => setName(e.target.value)}
/>
```

```tsx
// Before
<select className="w-full border border-gray-300 rounded-md px-3 py-2">
  <option value="10">10</option>
</select>

// After
<Select value={pageSize} onValueChange={setPageSize}>
  <SelectTrigger>
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="10">10</SelectItem>
  </SelectContent>
</Select>
```
