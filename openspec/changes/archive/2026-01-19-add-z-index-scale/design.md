# Design: Z-Index Scale

## Context

The web application currently uses arbitrary z-index values (10, 30, 40, 50) without documentation. This leads to:
- Stacking conflicts when multiple layered components interact
- Unclear layering hierarchy
- Difficulty adding new layered components

## Goals / Non-Goals

**Goals:**
- Establish a clear, documented z-index scale
- Prevent stacking conflicts
- Make layering predictable

**Non-Goals:**
- Removing existing z-index usage from shadcn-ui components
- Creating a runtime z-index system (compile-time only)

## Decisions

### Z-Index Scale

| Layer | Z-Index | Usage |
|-------|---------|-------|
| `base` | 0 | Default document flow |
| `dropdown` | 10 | Dropdown menus, select lists |
| `sticky` | 20 | Sticky headers, navigation |
| `overlay` | 30 | Overlays, backdrops |
| `modal` | 40 | Modal dialogs |
| `popover` | 50 | Popovers, tooltips |
| `toast` | 60 | Toast notifications |

### Implementation Approaches

**Option 1: CSS Custom Properties**
```css
:root {
  --z-index-dropdown: 10;
  --z-index-sticky: 20;
  --z-index-overlay: 30;
  --z-index-modal: 40;
  --z-index-popover: 50;
  --z-index-toast: 60;
}
```
Use with Tailwind arbitrary values: `style="--z-index: var(--z-index-modal)"` or `z-[var(--z-index-modal)]`

**Option 2: Tailwind Arbitrary Values**
Use directly in classes: `z-[40]` with comments explaining purpose

**Option 3: TypeScript Constants**
```typescript
export const Z_INDEX = {
  dropdown: 10,
  sticky: 20,
  overlay: 30,
  modal: 40,
  popover: 50,
  toast: 60,
} as const;
```

**Decision:** Use **Option 2 (Tailwind arbitrary values)** with inline comments. This is:
- Simplest to implement
- Works with existing Tailwind setup
- No build configuration changes
- Self-documenting with comments

### Current Component Mappings

| Component | Current | Target | Notes |
|-----------|---------|--------|-------|
| SidebarNav backdrop | 40 | 30 | overlay layer |
| SidebarNav sidebar | 50 | 50 | popover layer (slides in) |
| DashboardLayout header | 30 | 20 | sticky layer |
| AuditPanel overlay | 10 | 30 | overlay layer |
| ManifestList toggle | 10 | 10 | dropdown layer |
| shadcn-ui Dialog | 50 | 40 | modal layer |
| shadcn-ui Tooltip | 50 | 50 | popover layer |
| shadcn-ui Toast | (varies) | 60 | toast layer |

## Risks / Trade-offs

- **Risk:** shadcn-ui components may have fixed z-index values that conflict
  - **Mitigation:** Test all dialog/tooltip interactions; use CSS overrides if needed

- **Trade-off:** Using arbitrary values (`z-[40]`) instead of scale values (`z-40`)
  - **Rationale:** Allows inline comments for documentation; still works with Tailwind

## Migration Plan

1. Document z-index scale in `docs/WEB_APP.md`
2. Update components one by one with inline comments
3. Test stacking interactions (modal → backdrop, sidebar → backdrop)
4. Add ESLint rule or comment check to prevent random z-index values

## Open Questions

None
