# Change: Add Reusable Empty State Component

## Why

Empty states are implemented inconsistently across the application. ProjectsPage and SchemasPage have well-structured empty states with icons, titles, descriptions, and CTAs, while ManifestTable uses a simple text message, and ProjectWizard has an inline empty state. This creates:
- Inconsistent user experience when viewing empty data
- Code duplication across components
- Maintenance burden when updating empty state styling

## What Changes

- Create a reusable `EmptyState` component in `src/shared/components/`
- Support optional icon, title, description, and action button
- Replace all existing empty state implementations with the new component
- Ensure consistent styling and spacing

## Impact

- Affected specs: `web-app` (new empty state component requirements)
- New file: `src/apps/web/src/shared/components/EmptyState.tsx`
- Files to update:
  - `ProjectsPage.tsx` - Replace current empty state with component
  - `SchemasPage.tsx` - Replace current empty state with component
  - `ManifestTable.tsx` - Replace simple message with component
  - `ProjectWizard.tsx` - Replace inline empty state with component

## Migration

```tsx
// Before (ProjectsPage.tsx - good pattern)
<div className="text-center">
  <svg className="mx-auto h-12 w-12 text-gray-400" ...>
  <h3 className="mt-2 text-sm font-semibold text-gray-900">No projects</h3>
  <p className="mt-1 text-sm text-gray-500">Get started by creating a new project.</p>
  <div className="mt-6">
    <button onClick={onCreate}>Create Project</button>
  </div>
</div>

// After (using component)
<EmptyState
  icon={FolderIcon}
  title="No projects"
  description="Get started by creating a new project."
  action={{
    label: "Create Project",
    onClick: onCreate
  }}
/>

// Before (ManifestTable.tsx - minimal pattern)
{emptyState ?? 'No results.'}

// After (using component)
<EmptyState
  title="No results"
  description={emptyState ?? "No matching manifests found."}
/>
```
