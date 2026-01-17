# Change: Integrate shadcn-ui and Companion Libraries for Development Efficiency

## Why
The web app currently builds and maintains 30+ custom UI components, form validation logic, data fetching hooks, and other basic facilities. This leads to:
- **High maintenance burden**: Every generic component requires ongoing maintenance, testing, and bug fixes
- **Slower development**: Building basic UI (dialogs, tabs, forms) takes hours instead of minutes
- **Inconsistent UX**: Custom implementations vary in accessibility, keyboard navigation, and behavior
- **Reinventing the wheel**: Generic problems (forms, data fetching, tables) solved repeatedly

By integrating shadcn-ui and companion libraries, we eliminate basic facility work and focus on domain-specific features that provide actual business value.

## What Changes
Add production-ready libraries for all generic UI/UX needs:

### 1. shadcn-ui (UI Components)
- **What**: 50+ pre-built, accessible React components built on Radix UI + Tailwind CSS
- **Why**: Eliminates custom Dialog, Tabs, Dropdown, Tooltip, and 40+ other generic components
- **Approach**: Copy components into project (not a dependency), full customization control
- **Components**: Dialog, Tabs, Dropdown Menu, Tooltip, Select, Switch, Progress, Alert, Toast, Form, etc.

### 2. React Hook Form + Zod (Form Validation)
- **What**: Performant form handling with schema validation
- **Why**: Eliminates manual form state, validation logic, and error handling
- **Benefits**: Type-safe forms, reusable validation schemas, better UX

### 3. React Query (Data Fetching)
- **What**: Powerful data synchronization library
- **Why**: Eliminates manual loading/error states, caching, refetching logic
- **Benefits**: Automatic caching, background refetching, optimistic updates

### 4. Zustand (State Management)
- **What**: Lightweight state management
- **Why**: Simple global state for auth, theme, UI state
- **Benefits**: Less boilerplate than Redux, easier than Context API

### 5. TanStack Table (Advanced Tables)
- **What**: Headless table library for sorting, filtering, pagination
- **Why**: Eliminates manual table logic for complex data views
- **Benefits**: Virtual scrolling, column resizing, server-side sorting

### 6. date-fns (Date/Time)
- **What**: Modern date utility library
- **Why**: Consistent date formatting, parsing, manipulation
- **Benefits**: Tree-shakeable, immutable, TypeScript support

### 7. lucide-react (Icons)
- **What**: Consistent icon set (included with shadcn-ui)
- **Why**: Replaces custom SVG components
- **Benefits**: 1000+ icons, tree-shakeable, consistent style

## Impact
- **Affected specs**: `web-app`
- **Affected code**:
  - `src/apps/web/src/shared/components/` (migrate 30+ generic components)
  - `src/apps/web/src/shared/hooks/` (replace custom hooks with React Query)
  - `src/apps/web/src/routes/` (update to use new components)
  - `package.json` (add new dependencies)
- **Breaking changes**: None (gradual migration)
- **Dependencies added**:
  - `@radix-ui/*` (via shadcn-ui)
  - `react-hook-form`, `zod`, `@hookform/resolvers`
  - `@tanstack/react-query`, `@tanstack/react-table`
  - `zustand`
  - `date-fns`
  - `lucide-react`
  - `class-variance-authority`, `clsx`, `tailwind-merge`

## Migration Approach
**Gradual, component-by-component migration** - no big bang rewrite:

| Phase | Components | Time |
|-------|------------|------|
| Phase 1 | shadcn-ui setup + Dialog, Tabs, Button | ~4 hours |
| Phase 2 | Form components + React Hook Form + Zod | ~3 hours |
| Phase 3 | React Query integration | ~2 hours |
| Phase 4 | Remaining shadcn-ui components | ~2 hours |
| Phase 5 | TanStack Table, Zustand (if needed) | ~2 hours |

**Total**: ~13-15 hours of development time

## What We Keep (Domain-Specific)
These components remain custom as they contain business logic:
- `SchemaVisualBuilder` - Domain-specific JSON schema builder
- `JSONSchemaEditor` - Domain-specific schema editing
- `PromptEditor` - Domain-specific prompt editing
- `ProjectWizard` - Multi-step domain workflow
- `UploadDialog` - File upload logic (uses shadcn Dialog)
- All `*Form` components - Our validation patterns (use shadcn inputs)
- All `*Card` components - Simple layouts, keep as-is

## Benefits
| Before | After |
|--------|-------|
| Build dialog from scratch (3 hours) | Copy and use (1 minute) |
| Manual form validation | React Hook Form + Zod (declarative) |
| Custom data fetching hooks | React Query (automatic caching) |
| 30+ custom components to maintain | 50+ battle-tested components |
| Inconsistent a11y | WCAG compliant out of box |
| ~100 hours saved on generic UI | Focus on business value |

## Alternatives Considered
| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| Keep custom components | No dependencies | High maintenance, slower dev | ❌ |
| Material UI | Pre-styled, complete | Heavy, Tailwind conflicts | ❌ |
| Ant Design | Enterprise-ready | Heavy, styling conflicts | ❌ |
| Raw Radix UI | Lightweight | Must style everything | ❌ |
| **shadcn-ui + companions** | **Fast, Tailwind-native, customizable** | **Initial setup** | ✅ |

## Risks
| Risk | Mitigation |
|------|------------|
| Learning curve | Gradual migration, keep old code during transition |
| Bundle size | Tree-shakeable, only import what we use |
| Customization limits | We own the shadcn files, can edit anything |
| Dependency updates | shadcn copies code into project, no breaking updates |

## Success Metrics
- [ ] Reduced time to add new UI features by 60-80%
- [ ] All generic UI components replaced with shadcn-ui
- [ ] Forms use React Hook Form + Zod
- [ ] Data fetching uses React Query
- [ ] Zero custom generic components (only domain-specific)
- [ ] All accessibility tests pass (keyboard navigation, screen readers)
