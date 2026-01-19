# Design: Dark Mode Compatibility

## Context

The application uses shadcn/ui which includes built-in dark mode support via CSS custom properties. However, components use hard-coded Tailwind color classes instead of the semantic tokens that shadcn/ui provides.

### Current State
- `globals.css` correctly defines dark mode variables
- Components ignore these and use hard-coded colors
- Dark mode will appear broken if enabled

### Shadcn/UI Semantic Tokens

| Token | Light Mode | Dark Mode |
|-------|------------|-----------|
| `--background` | white | #09090b |
| `--foreground` | #09090b | #fafafa |
| `--card` | white | #09090b |
| `--card-foreground` | #09090b | #fafafa |
| `--popover` | white | #09090b |
| `--popover-foreground` | #09090b | #fafafa |
| `--primary` | #4f46e5 | #6366f1 |
| `--primary-foreground` | #fafafa | #fafafa |
| `--muted` | #f4f4f5 | #27272a |
| `--muted-foreground` | #71717a | #a1a1aa |
| `--accent` | #f4f4f5 | #27272a |
| `--border` | #e4e4e7 | #27272a |
| `--input` | #e4e4e7 | #27272a |
| `--ring` | #4f46e5 | #6366f1 |
| `--destructive` | #ef4444 | #dc2626 |

## Goals / Non-Goals

**Goals:**
- Make dark mode work correctly
- Use semantic tokens for all colors
- Maintain visual consistency

**Non-Goals:**
- Changing the color palette
- Adding advanced theme customization (only light/dark toggle)
- Persisting theme preference to the backend

## Decisions

### Color Token Migration Strategy

**Step 1: Background Colors**
```tsx
// Before
className="bg-white"
className="bg-gray-50"

// After
className="bg-card"
className="bg-background"
```

**Step 2: Text Colors**
```tsx
// Before
className="text-gray-900"  // Primary text
className="text-gray-600"  // Secondary text
className="text-gray-500"  // Muted text

// After
className="text-foreground"
className="text-muted-foreground"
className="text-muted-foreground" (with opacity)
```

**Step 3: Border Colors**
```tsx
// Before
className="border border-gray-200"
className="border-gray-300"

// After
className="border border-border"
className="border-input"
```

**Step 4: Primary/Brand Colors**
```tsx
// Before
className="bg-indigo-600 hover:bg-indigo-700"
className="text-indigo-600 hover:text-indigo-700"

// After
className="bg-primary hover:bg-primary/90"
className="text-primary"
```

**Step 5: Focus States**
```tsx
// Before
className="focus:border-indigo-500 focus:ring-indigo-500"

// After
className="focus:border-ring focus:ring-ring"
```

**Step 6: Destructive/Error States**
```tsx
// Before
className="text-red-600 hover:text-red-700"
className="border-red-500 bg-red-50"

// After
className="text-destructive"
className="border-destructive bg-destructive/10"
```

### Status Colors in Dark Mode

Status colors (green, yellow, blue, red) need special handling. Options:

**Option 1: Use same colors in both modes**
- Pros: Consistent recognition
- Cons: May vibrate in dark mode

**Option 2: Darken status colors for dark mode**
- Pros: Better visual comfort
- Cons: More CSS variables

**Decision: Option 2** - Add status color CSS variables

```css
:root {
  --status-completed-bg: #dcfce7;
  --status-completed-text: #166534;
  --status-pending-bg: #fef9c3;
  --status-pending-text: #854d0e;
  --status-processing-bg: #dbeafe;
  --status-processing-text: #1e40af;
  --status-failed-bg: #fee2e2;
  --status-failed-text: #991b1b;
}

.dark {
  --status-completed-bg: #166534;
  --status-completed-text: #dcfce7;
  --status-pending-bg: #854d0e;
  --status-pending-text: #fef9c3;
  --status-processing-bg: #1e40af;
  --status-processing-text: #dbeafe;
  --status-failed-bg: #991b1b;
  --status-failed-text: #fee2e2;
}
```

## Risks / Trade-offs

- **Risk:** Large-scale find/replace may introduce errors
  - **Mitigation:** Changes per file, test after each file

- **Risk:** Some semantic tokens may not match exactly
  - **Mitigation:** Visual QA after changes, adjust tokens if needed

- **Trade-off:** More abstract class names
  - **Benefit:** Dark mode works automatically

## Migration Plan

1. **Phase 1: Card components** (ProjectCard, GroupCard, ModelCard, ManifestCard)
2. **Phase 2: Form components** (ProjectWizard, ManifestFilters)
3. **Phase 3: Page components** (ProjectsPage, SchemasPage, etc.)
4. **Phase 4: Status colors** with CSS variables
5. **Phase 5: Testing** - Enable dark mode, test all pages

## Open Questions

- None. A light/dark toggle is implemented with localStorage persistence and initial system preference detection.
