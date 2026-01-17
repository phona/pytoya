## ADDED Requirements

### Requirement: shadcn-ui UI Components
The web application SHALL integrate shadcn-ui components to eliminate custom generic UI implementations.

#### Scenario: Dialog component
- **WHEN** a user interface requires a modal dialog
- **THEN** the application SHALL use the shadcn-ui `Dialog` component from `@/shared/components/ui/dialog`
- **AND** the component SHALL provide built-in focus trap, keyboard navigation (Escape key), and accessibility attributes
- **AND** the component SHALL support title, description, and custom content rendering

#### Scenario: Tabs component
- **WHEN** a user interface requires tabbed content switching
- **THEN** the application SHALL use the shadcn-ui `Tabs` component from `@/shared/components/ui/tabs`
- **AND** the component SHALL provide built-in keyboard navigation (arrow keys)
- **AND** the component SHALL automatically manage active tab state

#### Scenario: Dropdown menu component
- **WHEN** a user interface requires a dropdown menu
- **THEN** the application SHALL use the shadcn-ui `DropdownMenu` component from `@/shared/components/ui/dropdown-menu`
- **AND** the component SHALL close on click outside and Escape key
- **AND** the component SHALL support menu items with optional separators

#### Scenario: Form input components
- **WHEN** a form requires text input, select, checkbox, or switch elements
- **THEN** the application SHALL use shadcn-ui components (`Input`, `Select`, `Checkbox`, `Switch`) from `@/shared/components/ui/`
- **AND** all components SHALL support proper label association via `htmlFor`
- **AND** all components SHALL display validation error messages

#### Scenario: Toast notifications
- **WHEN** the application needs to display transient notifications (success, error, info)
- **THEN** the application SHALL use the shadcn-ui `Toast` component from `@/shared/components/ui/toast`
- **AND** notifications SHALL automatically dismiss after a configurable duration
- **AND** multiple notifications SHALL stack appropriately

### Requirement: React Hook Form + Zod Validation
The web application SHALL use React Hook Form with Zod schema validation for all form handling.

#### Scenario: Form validation
- **WHEN** a user submits a form
- **THEN** the form SHALL be validated using Zod schemas
- **AND** validation errors SHALL be displayed inline with the relevant fields
- **AND** the form SHALL prevent submission if validation fails

#### Scenario: Type-safe form data
- **WHEN** a form is created with a Zod schema
- **THEN** TypeScript SHALL infer form field types from the schema
- **AND** all form values SHALL be type-safe

#### Scenario: Form submission
- **WHEN** a user submits a valid form
- **THEN** the form data SHALL be passed to the submit handler
- **AND** the form SHALL show loading state during submission
- **AND** the form SHALL handle errors gracefully

### Requirement: React Query Data Fetching
The web application SHALL use React Query for all data fetching, caching, and synchronization.

#### Scenario: Automatic caching
- **WHEN** data is fetched from the API
- **THEN** React Query SHALL cache the data with a configurable stale time
- **AND** subsequent requests for the same data SHALL return from cache when fresh

#### Scenario: Loading and error states
- **WHEN** data is being fetched
- **THEN** the application SHALL display a loading indicator
- **AND** if the request fails, the application SHALL display an error message
- **AND** the error message SHALL be user-friendly

#### Scenario: Automatic refetching
- **WHEN** a mutation (create, update, delete) succeeds
- **THEN** React Query SHALL automatically invalidate affected queries
- **AND** affected data SHALL be refetched in the background

#### Scenario: Optimistic updates
- **WHEN** a user performs an update operation
- **THEN** the UI SHALL immediately reflect the change
- **AND** if the update fails, the UI SHALL revert to the previous state
- **AND** the user SHALL be notified of the failure

### Requirement: Centralized Validation Schemas
The web application SHALL define Zod validation schemas in `src/shared/schemas/` for reuse across forms.

#### Scenario: Schema sharing
- **WHEN** multiple forms require the same entity validation (e.g., project name)
- **THEN** the validation logic SHALL be defined once in a shared schema
- **AND** all forms SHALL import and reuse the shared schema

#### Scenario: Schema types
- **WHEN** a Zod schema is defined
- **THEN** TypeScript SHALL automatically infer types from the schema
- **AND** form components SHALL use the inferred types

### Requirement: Date Formatting with date-fns
The web application SHALL use date-fns for all date formatting and manipulation.

#### Scenario: Date display
- **WHEN** a date is displayed in the UI
- **THEN** date-fns `format()` function SHALL be used
- **AND** the format SHALL be consistent across the application

#### Scenario: Relative time
- **WHEN** a timestamp is displayed as relative time (e.g., "2 hours ago")
- **THEN** date-fns `formatDistanceToNow()` function SHALL be used

### Requirement: Consistent Icons with lucide-react
The web application SHALL use lucide-react for all iconography.

#### Scenario: Icon consistency
- **WHEN** an icon is displayed
- **THEN** lucide-react icons SHALL be used
- **AND** icon sizes SHALL follow standards: h-3 w-3 (xs), h-4 w-4 (sm), h-5 w-5 (md)

#### Scenario: Icon in buttons
- **WHEN** a button contains an icon
- **THEN** the icon SHALL be sized appropriately (h-4 w-4 for default buttons)
- **AND** spacing SHALL be added between icon and text

### Requirement: Custom Dialog Component Migration
The existing custom `Dialog` component in `src/shared/components/Dialog.tsx` SHALL be migrated to shadcn-ui `Dialog`.

#### Scenario: Replace custom dialog
- **WHEN** the shadcn-ui integration is complete
- **THEN** all usages of the custom `Dialog` component SHALL be replaced with `@/shared/components/ui/dialog`
- **AND** the old `Dialog.tsx` file SHALL be removed

### Requirement: Form Components Migration
Existing form components (`ProjectForm`, `ModelForm`, `GroupForm`, `SchemaForm`) SHALL be refactored to use React Hook Form + Zod.

#### Scenario: Refactor form components
- **WHEN** React Hook Form + Zod are integrated
- **THEN** all form components SHALL use React Hook Form's `useForm()` hook
- **AND** validation SHALL be handled by Zod schemas
- **AND** form inputs SHALL use shadcn-ui form components

### Requirement: Data Fetching Hooks Migration
Existing custom data fetching hooks (`use-projects.ts`, `use-models.ts`, `use-schemas.ts`) SHALL be migrated to React Query.

#### Scenario: Replace custom hooks
- **WHEN** React Query is integrated
- **THEN** `use-projects.ts` SHALL use `useQuery()` for fetching and `useMutation()` for mutations
- **AND** loading, error, and data states SHALL be managed by React Query
- **AND** cache invalidation SHALL be configured for mutations

### Requirement: Main.tsx Provider Setup
The application entry point SHALL be updated to include required providers.

#### Scenario: QueryClientProvider
- **WHEN** the application boots
- **THEN** `QueryClientProvider` from React Query SHALL wrap the application
- **AND** `Toaster` from shadcn-ui SHALL be included for toast notifications
