# Change: Enable Dark Mode Compatibility

## Why

The web application has extensive hard-coded color values (gray-*, indigo-*, white, etc.) that will break when dark mode is enabled. While CSS variables for dark mode are defined in `globals.css`, components use hard-coded colors instead of semantic tokens. This means dark mode will appear broken with white text on white backgrounds, invisible borders, and poor contrast.

## What Changes

- Replace all `bg-white` with `bg-card` semantic token
- Replace all `bg-gray-50` with `bg-background` semantic token
- Replace all `text-gray-900` with `text-foreground` or `text-card-foreground`
- Replace all `text-gray-600` with `text-muted-foreground`
- Replace all `border-gray-200` with `border-border`
- Replace all `bg-indigo-600` with `bg-primary`
- Replace all `text-indigo-600` with `text-primary`
- Replace all `focus:ring-indigo-500` with `focus:ring-ring`
- Create theme-aware status color utilities

## Impact

- Affected specs: `web-app` (new dark mode requirements)
- Affected code: 28+ files with 150+ instances of hard-coded colors
- Key files:
  - `ProjectCard.tsx`, `GroupCard.tsx`, `ModelCard.tsx`, `ManifestCard.tsx`
  - `ProjectWizard.tsx` (50+ instances)
  - `ProjectsPage.tsx`, `SchemasPage.tsx`
  - `ManifestFilters.tsx`, `ManifestTable.tsx`, `Pagination.tsx`

## Migration

This is a breaking change for custom styling. All hard-coded color classes will be replaced with shadcn/ui semantic tokens that automatically adapt to light/dark themes.

| Old Class | New Token |
|-----------|-----------|
| `bg-white` | `bg-card` |
| `bg-gray-50` | `bg-background` |
| `text-gray-900` | `text-foreground` / `text-card-foreground` |
| `text-gray-600` | `text-muted-foreground` |
| `border-gray-200` | `border-border` |
| `bg-indigo-600` | `bg-primary` |
| `text-indigo-600` | `text-primary` |
| `focus:border-indigo-500` | `focus:border-ring` |
| `focus:ring-indigo-500` | `focus:ring-ring` |
| `text-red-600` | `text-destructive` |
