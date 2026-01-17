# web-app Specification

## Purpose
TBD - created by archiving change add-web-error-boundaries. Update Purpose after archive.
## Requirements
### Requirement: Error Boundary
The web application SHALL implement React Error Boundaries to gracefully handle component errors and prevent application crashes.

#### Scenario: Component throws error during rendering
- **WHEN** a component throws an error during rendering
- **THEN** the error boundary SHALL catch the error
- **AND** the system SHALL display a user-friendly error message
- **AND** the system SHALL NOT crash the entire application

#### Scenario: Error recovery options
- **WHEN** an error is caught by the error boundary
- **THEN** the system SHALL provide recovery options to the user
- **AND** recovery options SHALL include "Retry" and "Go Back/Home" actions

#### Scenario: Error logging
- **WHEN** an error is caught by the error boundary
- **THEN** the system SHALL log the error for debugging purposes
- **AND** the log SHALL include error message, stack trace, and component info

### Requirement: User-Friendly Error Messages
The web application SHALL display user-friendly error messages that provide actionable guidance when errors occur.

#### Scenario: API error response
- **WHEN** an API call returns an error
- **THEN** the system SHALL display a clear, non-technical error message
- **AND** the message SHALL explain what went wrong in user terms
- **AND** the message SHALL suggest next steps when possible

#### Scenario: Empty or loading state
- **WHEN** a page has no data to display
- **THEN** the system SHALL display an appropriate empty state message
- **AND** the message SHALL explain why there's no data
- **AND** the message SHALL guide the user on what to do next

### Requirement: Protected Routes
The web application SHALL protect dashboard routes from unauthenticated access using a route guard component.

#### Scenario: Unauthenticated user attempts to access dashboard
- **WHEN** an unauthenticated user navigates to any `/dashboard/*` route
- **THEN** the system SHALL redirect the user to the `/login` page
- **AND** the system SHALL preserve the intended destination for post-login redirect

#### Scenario: Authenticated user accesses dashboard
- **WHEN** an authenticated user navigates to any `/dashboard/*` route
- **THEN** the system SHALL render the requested page
- **AND** the system SHALL NOT redirect the user

#### Scenario: Loading state during authentication check
- **WHEN** the authentication status is being determined
- **THEN** the system SHALL display a loading indicator
- **AND** the system SHALL NOT render protected content or redirect until auth status is known

#### Scenario: Post-login redirect
- **WHEN** a user successfully logs in after being redirected
- **THEN** the system SHALL redirect the user to their originally intended destination
- **AND** if no destination was preserved, the system SHALL redirect to the default dashboard page

### Requirement: Homepage Routing
The web application SHALL route users based on authentication status when accessing the root path `/`.

#### Scenario: Authenticated user visits root
- **WHEN** an authenticated user navigates to `/`
- **THEN** the system SHALL redirect the user to `/projects`
- **AND** the system SHALL preserve the user's session

#### Scenario: Non-authenticated user visits root
- **WHEN** a non-authenticated user navigates to `/`
- **THEN** the system SHALL redirect the user to `/login`

### Requirement: Dashboard Navigation
The web application SHALL provide a simplified sidebar navigation in the dashboard for accessing main application sections.

#### Scenario: Display navigation menu
- **WHEN** a user is on any dashboard page
- **THEN** the system SHALL display a sidebar navigation menu
- **AND** the menu SHALL include links to Projects and Models
- **AND** the menu SHALL include a Settings link for user preferences
- **AND** the menu SHALL highlight the currently active route

#### Scenario: Removed navigation items
- **WHEN** the sidebar navigation is displayed
- **THEN** the system SHALL NOT display direct links to Schemas
- **AND** the system SHALL NOT display direct links to Prompts
- **AND** the system SHALL NOT display direct links to Validation Scripts
- **AND** these items SHALL be accessible through the project creation wizard or project settings

### Requirement: Dialog-Based Create and Edit
The web application SHALL use a shared centered dialog component for Models and Manifests create/edit flows.

#### Scenario: Models create dialog
- **WHEN** a user creates a model
- **THEN** the system SHALL present a model type selection step inside a centered dialog
- **AND** after selecting a model type, the system SHALL present the model configuration form

#### Scenario: Models edit dialog
- **WHEN** a user edits a model
- **THEN** the system SHALL present the model form inside a centered dialog
- **AND** the model type SHALL NOT be editable during edit

#### Scenario: Manifests upload dialog
- **WHEN** a user uploads manifests
- **THEN** the system SHALL present the upload flow inside a centered dialog

#### Scenario: Manifests audit dialog
- **WHEN** a user audits or edits a manifest
- **THEN** the system SHALL present the audit panel inside a centered dialog

### Requirement: Dialog-Based Forms
The web application SHALL use modal dialogs for all entity creation and editing forms, overlaying the current list page without navigation.

#### Scenario: Open form dialog
- **WHEN** a user clicks "New [Entity]" or "Edit" on a list page
- **THEN** the system SHALL open a modal dialog overlay
- **AND** the system SHALL NOT navigate to a new route
- **AND** the system SHALL preserve the list page context behind the dialog

#### Scenario: Close form dialog
- **WHEN** a user clicks cancel, close button, or presses Escape
- **THEN** the system SHALL close the dialog
- **AND** the system SHALL return focus to the triggering element
- **AND** the list page SHALL remain unchanged

#### Scenario: Submit form dialog
- **WHEN** a user submits the form successfully
- **THEN** the system SHALL close the dialog
- **AND** the system SHALL refresh the list page with new data
- **AND** the system SHALL display success notification

#### Scenario: Dialog accessibility
- **WHEN** a dialog is open
- **THEN** the system SHALL trap focus within the dialog
- **AND** the system SHALL set aria-modal="true"
- **AND** the system SHALL manage focus return on close

#### Scenario: Model form dialog
- **WHEN** a user creates or edits a model
- **THEN** the system SHALL display the form in a dialog
- **AND** the system SHALL NOT use a separate page for forms

### Requirement: Multi-Step Project Creation Wizard
The web application SHALL provide a multi-step wizard for creating projects with inline schema and prompt configuration.

#### Scenario: Start project creation
- **WHEN** a user clicks "New Project"
- **THEN** the system SHALL open a modal dialog containing the multi-step wizard
- **AND** the system SHALL NOT navigate away from the projects list page
- **AND** the system SHALL show progress indicator (Step 1 of 5)

#### Scenario: Step 1 - Basic info
- **WHEN** the wizard is at step 1
- **THEN** the system SHALL prompt for project name and description
- **AND** the system SHALL validate that name is provided
- **AND** the system SHALL enable Next button when valid

#### Scenario: Step 2 - Extraction strategy selection
- **WHEN** the wizard is at step 2
- **THEN** the system SHALL prompt to choose extraction strategy
- **AND** the system SHALL display options: "Schema-based" or "Prompt-based"
- **AND** the system SHALL proceed to step 3a for schema-based or step 3b for prompt-based

#### Scenario: Step 3a - Schema builder (schema-based)
- **WHEN** the user selected schema-based strategy
- **THEN** the system SHALL display visual schema builder
- **AND** the system SHALL allow creating JSON schema with form fields
- **AND** the system SHALL provide preview of schema structure
- **AND** the system SHALL allow naming and saving the schema

#### Scenario: Step 3b - Prompt optimization (prompt-based)
- **WHEN** the user selected prompt-based strategy
- **THEN** the system SHALL display prompt optimization interface
- **AND** the system SHALL prompt user to describe extraction requirements
- **AND** the system SHALL send description to LLM for prompt generation
- **AND** the system SHALL display optimized prompt for review
- **AND** the system SHALL allow manual editing of generated prompt

#### Scenario: Step 4 - Model selection
- **WHEN** the wizard is at step 4
- **THEN** the system SHALL display available OCR models
- **AND** the system SHALL display available LLM models
- **AND** the system SHALL require selecting one OCR and one LLM model
- **AND** the system SHALL show model test status if available

#### Scenario: Step 5 - Review and create
- **WHEN** the wizard is at step 5
- **THEN** the system SHALL display summary of all selections
- **AND** the system SHALL allow navigation back to previous steps
- **AND** the system SHALL create project upon confirmation
- **AND** the system SHALL redirect to project detail page on success

#### Scenario: Wizard navigation
- **WHEN** the user clicks Next
- **THEN** the system SHALL validate current step
- **AND** the system SHALL proceed to next step if valid
- **AND** the system SHALL show validation errors if invalid
- **WHEN** the user clicks Back
- **THEN** the system SHALL return to previous step
- **AND** the system SHALL preserve entered data

### Requirement: LLM Prompt Optimization
The web application SHALL provide LLM-assisted prompt optimization for extraction prompts.

#### Scenario: Generate prompt from description
- **WHEN** a user enters extraction requirements description
- **THEN** the system SHALL send description to backend optimization endpoint
- **AND** the backend SHALL use configured LLM to generate optimized prompt
- **AND** the system SHALL display generated prompt in editor

#### Scenario: Edit generated prompt
- **WHEN** a prompt is generated
- **THEN** the system SHALL allow manual editing
- **AND** the system SHALL preserve edits when navigating wizard steps

#### Scenario: Regenerate prompt
- **WHEN** a user clicks regenerate
- **THEN** the system SHALL call optimization endpoint again
- **AND** the system SHALL replace current prompt with new generation

### Requirement: Inline Schema Management
The web application SHALL allow schema creation and management within the project creation wizard.

#### Scenario: Create new schema in wizard
- **WHEN** a user is in schema-based extraction step
- **THEN** the system SHALL allow creating new schema
- **AND** the system SHALL save schema as entity when project is created
- **AND** the system SHALL associate schema with project

#### Scenario: Edit existing schema in wizard
- **WHEN** a user selects an existing schema
- **THEN** the system SHALL load schema into visual builder
- **AND** the system SHALL allow modifications
- **AND** the system SHALL create new version or update existing

### Requirement: Per-Project Validation Scripts
The web application SHALL allow validation script configuration within individual projects.

#### Scenario: Access validation scripts
- **WHEN** a user is viewing a project detail page
- **THEN** the system SHALL display validation scripts section
- **AND** the system SHALL allow adding/editing validation rules

#### Scenario: Add validation rule
- **WHEN** a user adds a validation script
- **THEN** the system SHALL prompt for field name and validation expression
- **AND** the system SHALL save script to project
- **AND** the system SHALL apply validation during extraction

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

