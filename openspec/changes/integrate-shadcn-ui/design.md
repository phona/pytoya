# Design: shadcn-ui and Companion Libraries Integration

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         PyToYa Web App                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    Domain Layer                           │  │
│  │  SchemaVisualBuilder │ JSONSchemaEditor │ PromptEditor   │  │
│  │  ProjectWizard       │ UploadDialog      │ *Form          │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              ▲                                  │
│                              │                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                 Generic UI Layer (shadcn-ui)              │  │
│  │  Dialog │ Tabs │ Dropdown │ Form │ Select │ Button │ ... │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              ▲                                  │
│                              │                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              Companion Libraries Layer                    │  │
│  │  React Hook Form │ React Query │ Zustand │ TanStack Table│  │
│  └───────────────────────────────────────────────────────────┘  │
│                              ▲                                  │
│                              │                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    Primitives Layer                       │  │
│  │            Radix UI │ React │ Tailwind CSS               │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Component Mapping

### Current → Migration Path

| Current Component | New Component | Notes |
|-------------------|---------------|-------|
| `Dialog.tsx` (152 lines) | `ui/dialog.tsx` | Direct replacement |
| Custom tabs (inline) | `ui/tabs.tsx` | Direct replacement |
| Custom dropdowns | `ui/dropdown-menu.tsx` | Direct replacement |
| Custom tooltips | `ui/tooltip.tsx` | New capability |
| Form inputs (inline) | `ui/input.tsx`, `ui/select.tsx` | Better a11y |
| Custom buttons | `ui/button.tsx` | Consistent variants |
| Custom toasts | `ui/toast.tsx` | New capability |
| `ExtractionStrategySelector` | `ui/toggle-group.tsx` | Simplified |
| Custom progress | `ui/progress.tsx` | Direct replacement |
| Custom form validation | React Hook Form + Zod | Declarative |

### Keep Custom (Domain-Specific)

| Component | Reason |
|-----------|--------|
| `SchemaVisualBuilder` | Domain logic (JSON schema builder) |
| `JSONSchemaEditor` | Domain logic (schema editing) |
| `PromptEditor` | Domain logic (prompt templates) |
| `ProjectWizard` | Multi-step workflow (uses shadcn Dialog) |
| `UploadDialog` | File upload logic (uses shadcn Dialog) |
| `ProjectCard`, `ModelCard`, `GroupCard` | Simple layouts, no need to migrate |
| All `*Form` components | Our validation patterns (use shadcn inputs) |

## Directory Structure

### After Migration

```
src/apps/web/src/
├── shared/
│   ├── components/
│   │   ├── ui/                          # NEW: shadcn-ui components
│   │   │   ├── dialog.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── form.tsx
│   │   │   ├── input.tsx
│   │   │   ├── select.tsx
│   │   │   ├── button.tsx
│   │   │   ├── label.tsx
│   │   │   ├── toast.tsx
│   │   │   ├── tooltip.tsx
│   │   │   ├── switch.tsx
│   │   │   ├── progress.tsx
│   │   │   ├── table.tsx               # TanStack Table wrapper
│   │   │   └── ...
│   │   ├── Dialog.tsx                   # DEPRECATED: Remove after migration
│   │   ├── ProjectWizard.tsx            # KEEP: Domain logic, uses ui/dialog
│   │   ├── SchemaVisualBuilder.tsx      # KEEP: Domain-specific
│   │   ├── JSONSchemaEditor.tsx         # KEEP: Domain-specific
│   │   ├── PromptEditor.tsx             # KEEP: Domain-specific
│   │   └── ...
│   ├── hooks/
│   │   ├── use-projects.ts              # MIGRATE: Use React Query
│   │   ├── use-schemas.ts               # MIGRATE: Use React Query
│   │   ├── use-models.ts                # MIGRATE: Use React Query
│   │   └── use-toast.ts                 # NEW: From shadcn
│   ├── lib/
│   │   └── utils.ts                     # NEW: cn() helper for shadcn
│   └── stores/
│       └── auth.ts                      # NEW: Zustand store (optional)
├── routes/dashboard/
│   ├── ProjectsPage.tsx                 # MIGRATE: Use shadcn components
│   ├── ModelsPage.tsx                   # MIGRATE: Use shadcn components
│   └── ManifestsPage.tsx                # MIGRATE: Use shadcn components
└── main.tsx                             # UPDATE: Add QueryClientProvider
```

## Code Examples

### 1. Dialog Migration

#### Before (Current)
```tsx
import { Dialog } from '@/shared/components/Dialog';

export function ProjectsPage() {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <Dialog isOpen={isOpen} onClose={setIsOpen} title="Create Project">
      <ProjectForm />
    </Dialog>
  );
}
```

#### After (shadcn-ui)
```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';

export function ProjectsPage() {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Project</DialogTitle>
        </DialogHeader>
        <ProjectForm />
      </DialogContent>
    </Dialog>
  );
}
```

### 2. Form Migration (React Hook Form + Zod)

#### Before (Current)
```tsx
export function ProjectForm({ project, onSubmit }: Props) {
  const [name, setName] = useState(project?.name || '');
  const [description, setDescription] = useState(project?.description || '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!name.trim()) newErrors.name = 'Name is required';
    if (name.length > 100) newErrors.name = 'Name too long';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    await onSubmit({ name, description });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} />
        {errors.name && <span>{errors.name}</span>}
      </div>
      <button type="submit">Save</button>
    </form>
  );
}
```

#### After (React Hook Form + Zod)
```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/shared/components/ui/form';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';

const projectSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  description: z.string().max(500).optional(),
});

type ProjectFormValues = z.infer<typeof projectSchema>;

export function ProjectForm({ project, onSubmit }: Props) {
  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: project?.name || '',
      description: project?.description || '',
    },
  });

  const handleSubmit = async (values: ProjectFormValues) => {
    await onSubmit(values);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Save</Button>
      </form>
    </Form>
  );
}
```

### 3. Data Fetching Migration (React Query)

#### Before (Current - use-projects.ts)
```tsx
export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setIsLoading(true);
    getProjects()
      .then(setProjects)
      .catch(setError)
      .finally(() => setIsLoading(false));
  }, []);

  const createProject = async (data: CreateProjectDto) => {
    const project = await createProjectApi(data);
    setProjects(prev => [...prev, project]);
    return project;
  };

  const updateProject = async (id: number, data: UpdateProjectDto) => {
    const updated = await updateProjectApi(id, data);
    setProjects(prev => prev.map(p => p.id === id ? updated : p));
    return updated;
  };

  const deleteProject = async (id: number) => {
    await deleteProjectApi(id);
    setProjects(prev => prev.filter(p => p.id !== id));
  };

  return { projects, isLoading, error, createProject, updateProject, deleteProject };
}
```

#### After (React Query)
```tsx
import { useQuery, useMutation, useQueryClient, UseQueryResult } from '@tanstack/react-query';

export function useProjects(): UseQueryResult<Project[], Error> & {
  createProject: (data: CreateProjectDto) => Promise<Project>;
  updateProject: (id: number, data: UpdateProjectDto) => Promise<Project>;
  deleteProject: (id: number) => Promise<void>;
} {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['projects'],
    queryFn: getProjects,
  });

  const createMutation = useMutation({
    mutationFn: createProjectApi,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateProjectDto }) => updateProjectApi(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProjectApi,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  });

  return {
    ...query,
    createProject: createMutation.mutateAsync,
    updateProject: (id, data) => updateMutation.mutateAsync({ id, data }),
    deleteProject: deleteMutation.mutateAsync,
  };
}
```

### 4. Tabs Migration

#### Before (Current - inline)
```tsx
export function ValidationResultsPanel({ results }: Props) {
  const [activeTab, setActiveTab] = useState('errors');

  return (
    <div>
      <div className="flex border-b">
        <button
          className={`px-4 py-2 ${activeTab === 'errors' ? 'border-b-2 border-indigo-600' : ''}`}
          onClick={() => setActiveTab('errors')}
        >
          Errors
        </button>
        <button
          className={`px-4 py-2 ${activeTab === 'warnings' ? 'border-b-2 border-indigo-600' : ''}`}
          onClick={() => setActiveTab('warnings')}
        >
          Warnings
        </button>
      </div>
      {activeTab === 'errors' && <div>{/* errors */}</div>}
      {activeTab === 'warnings' && <div>{/* warnings */}</div>}
    </div>
  );
}
```

#### After (shadcn-ui)
```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';

export function ValidationResultsPanel({ results }: Props) {
  return (
    <Tabs defaultValue="errors">
      <TabsList>
        <TabsTrigger value="errors">Errors ({results.errors.length})</TabsTrigger>
        <TabsTrigger value="warnings">Warnings ({results.warnings.length})</TabsTrigger>
        <TabsTrigger value="info">Info ({results.info.length})</TabsTrigger>
      </TabsList>
      <TabsContent value="errors">
        {results.errors.map(error => <ValidationError key={error.id} error={error} />)}
      </TabsContent>
      <TabsContent value="warnings">
        {results.warnings.map(warning => <ValidationWarning key={warning.id} warning={warning} />)}
      </TabsContent>
      <TabsContent value="info">
        {results.info.map(info => <ValidationInfo key={info.id} info={info} />)}
      </TabsContent>
    </Tabs>
  );
}
```

## Setup Configuration

### 1. Tailwind Configuration (components.json)
```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.js",
    "css": "src/shared/styles/globals.css",
    "baseColor": "slate",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/shared/components",
    "utils": "@/shared/lib",
    "ui": "@/shared/components/ui",
    "lib": "@/shared/lib",
    "hooks": "@/shared/hooks"
  }
}
```

### 2. Main.tsx (React Query Provider)
```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { router } from './app/router';
import { ErrorBoundary } from './shared/components/ErrorBoundary';
import { Toaster } from './shared/components/ui/toaster';
import './shared/styles/globals.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary title="PyToYa is unavailable">
        <RouterProvider router={router} />
        <Toaster />
      </ErrorBoundary>
    </QueryClientProvider>
  </React.StrictMode>,
);
```

### 3. Utils File (lib/utils.ts)
```typescript
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

## Migration Strategy

### Phase 1: Foundation (Setup + Core Components)
1. Initialize shadcn-ui
2. Add `lib/utils.ts`
3. Add core components: `button`, `input`, `label`, `dialog`
4. Update `main.tsx` with Toaster
5. Migrate `Dialog.tsx` usages to `ui/dialog`

### Phase 2: Forms (React Hook Form + Zod)
1. Install `react-hook-form`, `zod`, `@hookform/resolvers`
2. Add `form`, `select`, `switch`, `textarea` components
3. Create common validation schemas
4. Migrate one form as proof of concept
5. Migrate remaining forms

### Phase 3: Data Fetching (React Query)
1. Install `@tanstack/react-query`
2. Add QueryClientProvider to `main.tsx`
3. Create API helpers
4. Migrate `use-projects.ts` hook
5. Migrate remaining data fetching hooks

### Phase 4: Remaining UI Components
1. Add `tabs`, `dropdown-menu`, `tooltip`, `toast`, `progress`
2. Migrate inline implementations
3. Add `table` wrapper (TanStack Table)

### Phase 5: Optional (Zustand, Advanced Features)
1. Add Zustand if global state needed
2. Add TanStack Table for complex tables
3. Add `date-fns` for date utilities

## Testing Considerations

### Component Tests
- shadcn-ui components are pre-tested (by Radix UI)
- Focus tests on domain-specific components
- Test integration between shadcn and our components

### Form Tests
- Test validation schemas (Zod)
- Test form submission with React Hook Form
- Mock React Query mutations

### Data Fetching Tests
- Mock QueryClient in tests
- Test loading/error/success states
- Test invalidation behavior

## Accessibility
All shadcn-ui components include:
- ✅ Keyboard navigation (Tab, Escape, Arrow keys)
- ✅ ARIA attributes (role, aria-label, aria-describedby)
- ✅ Focus management (focus trap, focus restoration)
- ✅ Screen reader support
- ✅ High contrast mode support

Our custom components should match this level of a11y after migration.
