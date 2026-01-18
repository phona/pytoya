# Change: Standardize Button Components

## Why

The web application has inconsistent button implementations. Some components use the shadcn/ui `Button` component correctly (ProjectForm, SchemaForm), while others implement custom buttons with inline Tailwind classes (ProjectCard, GroupCard, ProjectsPage, SchemasPage, ProjectWizard). This creates:
- Inconsistent hover/focus/disabled states
- Missing focus indicators for keyboard navigation
- Inconsistent sizing and spacing
- More maintenance burden

## What Changes

- Replace all custom button implementations with shadcn/ui `Button` component
- Use appropriate variants: `default`, `destructive`, `outline`, `secondary`, `ghost`, `link`
- Use consistent sizes: `default`, `sm`, `lg`, `icon`
- Ensure all buttons have proper `aria-label` for icon-only buttons

## Impact

- Affected specs: `web-app` (new button consistency requirements)
- Affected code:
  - `ProjectCard.tsx` (2 custom buttons)
  - `GroupCard.tsx` (2 custom buttons)
  - `ProjectsPage.tsx` (2 custom buttons)
  - `SchemasPage.tsx` (4 custom buttons)
  - `ProjectWizard.tsx` (15+ custom buttons)
  - Any other components with custom button classes

## Migration

Custom button classes will be replaced with `Button` component:

```tsx
// Before
<button
  onClick={handleEdit}
  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
>
  Edit
</button>

// After
<Button onClick={handleEdit}>
  Edit
</Button>
```

```tsx
// Before (ghost style)
<button
  onClick={handleDelete}
  className="ml-4 text-sm text-indigo-600 hover:text-indigo-700"
>
  Delete
</button>

// After
<Button variant="ghost" onClick={handleDelete}>
  Delete
</Button>
```
