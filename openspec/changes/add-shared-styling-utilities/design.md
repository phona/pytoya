# Design: Shared Styling Utilities

## Context

Styling logic for common UI patterns (status badges, button variants, etc.) is duplicated across multiple files. This makes it difficult to:
- Maintain consistent styling
- Update styles globally
- Ensure type safety

## Goals / Non-Goals

**Goals:**
- Extract common styling patterns into reusable utilities
- Provide type-safe class name generators
- Reduce code duplication

**Non-Goals:**
- Creating a full design system (use shadcn-ui for that)
- Abstracting away all Tailwind classes
- Adding runtime CSS-in-JS overhead

## Decisions

### Status Badge Utilities

Create `src/apps/web/src/shared/styles/status-badges.ts`:

```typescript
type ManifestStatus = 'pending' | 'processing' | 'completed' | 'failed';

export function getStatusBadgeClasses(status: ManifestStatus): string {
  const baseClasses = 'inline-flex items-center rounded-full px-2 py-1 text-xs font-medium';

  const statusClasses: Record<ManifestStatus, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    processing: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
  };

  return `${baseClasses} ${statusClasses[status]}`;
}
```

### Class Name Utilities

Create `src/apps/web/src/shared/styles/class-utils.ts`:

```typescript
/**
 * Conditional className joiner
 * Filters out falsy values and joins with spaces
 */
export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * Creates a className string from conditional parts
 * Useful for ternary-based styling
 */
export function cva(
  base: string,
  variants: Record<string, Record<string, string>>
): (props: Record<string, string>) => string {
  return (props) => {
    const variantClasses = Object.entries(props)
      .map(([key, value]) => variants[key]?.[value] || '')
      .join(' ');
    return cn(base, variantClasses);
  };
}
```

### Alternatives Considered

**Option 1: class-variance-authority (CVA) library**
- Pros: battle-tested, TypeScript support, feature-rich
- Cons: additional dependency, may be overkill for simple use cases
- **Decision:** Skip for now, evaluate if needs grow

**Option 2: clsx / cn utilities**
- Pros: simple, widely used
- Cons: doesn't handle variants
- **Decision:** Implement our own lightweight `cn()` function

**Option 3: Inline Tailwind classes everywhere**
- Pros: no abstraction
- Cons: duplication, hard to maintain
- **Decision:** Extract only repeated patterns

## Risks / Trade-offs

- **Trade-off:** Abstraction vs. clarity
  - Too much abstraction makes code harder to read
  - Too little leads to duplication
  - **Balance:** Only extract patterns used 3+ times

- **Risk:** Bundle size increase from utility functions
  - **Mitigation:** Functions are tree-shakeable and minimal

## Migration Plan

1. Create utility modules with tests
2. Update one component at a time
3. Run visual regression tests after each update
4. Delete old duplicate code

## Open Questions

- Should we consider CVA if variants become more complex?
- Should status colors be configurable via CSS variables?
