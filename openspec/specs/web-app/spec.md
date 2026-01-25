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
The web application SHALL provide a simplified sidebar navigation in the dashboard for accessing main application sections, and SHALL allow users to collapse/expand the sidebar on desktop to improve focus and maximize workspace.

#### Scenario: Desktop collapse/expand
- **GIVEN** a user is on a dashboard page on a desktop viewport
- **WHEN** the user collapses the sidebar
- **THEN** the system SHALL hide the sidebar navigation
- **AND** the hidden sidebar SHALL NOT be reachable by keyboard focus
- **AND** the system SHALL provide a control to re-open the sidebar
- **AND** the main content area SHALL use the available width

#### Scenario: Desktop collapse state persistence
- **GIVEN** a user collapses the sidebar on desktop
- **WHEN** the user reloads the page
- **THEN** the system SHALL restore the sidebar collapsed state

### Requirement: Dialog-Based Create and Edit
The web application SHALL use a shared centered dialog component for Models create/edit and Manifests upload flows, and SHALL use a dedicated route page for the Manifests audit/edit flow.

#### Scenario: Manifests audit page
- **WHEN** a user audits or edits a manifest
- **THEN** the system SHALL navigate to a dedicated audit page route
- **AND** the system SHALL render a full-height split view (PDF + audit form)
- **AND** the audit page SHALL be deep-linkable and refresh-safe

### Requirement: Dialog-Based Forms
The web application SHALL use modal dialogs for entity creation and editing forms that do not require deep-linking, and SHALL use a dedicated route page for the Manifests audit/edit flow.

#### Scenario: Manifest audit navigation
- **WHEN** a user clicks a manifest row/card to audit or edit
- **THEN** the system SHALL navigate to the manifest audit page route
- **AND** the system SHALL NOT open a modal dialog for this flow

#### Scenario: Group create/edit uses modal
- **WHEN** a user creates or edits a Group from the Project Detail page
- **THEN** the system SHALL open a modal dialog for the Group form
- **AND** the current page scroll position SHALL be preserved after closing

#### Scenario: Long editors use side-sheet dialogs
- **WHEN** a user creates or edits a Schema, Prompt, or Validation Script
- **THEN** the system SHOULD open a side-sheet style dialog (scrollable content area)
- **AND** the system SHALL NOT navigate away from the current route

#### Scenario: Dirty form close confirmation
- **GIVEN** a user has modified a form in an open dialog (dirty state)
- **WHEN** the user attempts to close the dialog (Escape, backdrop click, close button, or Cancel)
- **THEN** the system SHALL prompt the user to confirm discarding changes
- **AND** closing SHALL proceed only after explicit confirmation

### Requirement: Schema-Driven Manifest Audit Form
The web application SHALL render manifest audit form fields dynamically from the project JSON Schema.

#### Scenario: Schema adds a new leaf field
- **GIVEN** a project JSON Schema defines a leaf field path not previously present
- **WHEN** a user opens the manifest audit page for a manifest in that project
- **THEN** the audit form SHALL render an editable input for that field
- **AND** edits to the field SHALL be saved back into `manifest.extractedData` at the same field path

#### Scenario: Schema defines an array of objects
- **GIVEN** the JSON Schema defines an array field whose `items` is an object schema
- **WHEN** the audit form renders that array field
- **THEN** the UI SHALL render editable rows using the schema-defined properties
- **AND** the UI SHALL NOT hardcode per-row field names

#### Scenario: Field hints and confidence signals
- **GIVEN** the JSON Schema provides `x-extraction-hint` for a field path
- **WHEN** the audit form renders that field
- **THEN** the UI SHALL display the hint text for that field
- **AND** the UI SHALL display confidence highlighting when field confidence is available

#### Scenario: Re-extract per field
- **WHEN** the user clicks “Re-extract” for a rendered field
- **THEN** the system SHALL initiate re-extraction for that field path

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
- **THEN** the system SHALL display available text extractors
- **AND** the system SHALL display available LLM models
- **AND** the system SHALL require selecting one text extractor and one LLM model
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

### Requirement: Empty State Component
The web application SHALL provide a reusable `EmptyState` component for consistent display of empty data states.

#### Scenario: Empty state with action
- **WHEN** an empty state includes a call-to-action
- **THEN** the system SHALL display an optional icon
- **AND** the system SHALL display a title text
- **AND** the system SHALL display a description text
- **AND** the system SHALL display an action button
- **AND** all elements SHALL be centered and vertically spaced

#### Scenario: Empty state without action
- **WHEN** an empty state is informational only
- **THEN** the system SHALL display title and description
- **AND** the system SHALL NOT display an action button
- **AND** the icon SHALL be optional

#### Scenario: Empty state styling
- **WHEN** an empty state is displayed
- **THEN** the component SHALL use semantic color tokens (bg-background, text-muted-foreground)
- **AND** the icon SHALL use muted colors (text-muted-foreground)
- **AND** the title SHALL use foreground color (text-foreground)
- **AND** the description SHALL use muted color (text-muted-foreground)
- **AND** the component SHALL be responsive on mobile devices

#### Scenario: Empty state accessibility
- **WHEN** an empty state is displayed
- **THEN** the component SHALL have appropriate ARIA attributes
- **AND** the title SHALL be a heading element (h2 or h3)
- **AND** the action button SHALL be keyboard accessible
- **AND** screen readers SHALL announce the empty state message

### Requirement: Consistent Empty State Usage
All pages displaying empty data SHALL use the `EmptyState` component.

#### Scenario: Projects page empty state
- **WHEN** no projects exist
- **THEN** the system SHALL display `EmptyState` with folder icon
- **AND** the title SHALL be "No projects"
- **AND** the description SHALL explain how to get started
- **AND** an action button SHALL link to create project

#### Scenario: Schemas page empty state
- **WHEN** no schemas exist
- **THEN** the system SHALL display `EmptyState` with appropriate icon
- **AND** the description SHALL explain schemas are created within projects

#### Scenario: Manifest list empty state
- **WHEN** no manifests match the current filters
- **THEN** the system SHALL display `EmptyState` with search icon
- **AND** the description SHALL explain no results were found
- **AND** an action button MAY offer to clear filters

### Requirement: Shared Styling Utilities
The web application SHALL provide shared utility functions for common styling patterns.

#### Scenario: Status badge classes
- **WHEN** a component displays a status badge
- **THEN** the system SHALL use the `getStatusBadgeClasses()` utility from `@/shared/styles/status-badges`
- **AND** the utility SHALL return consistent Tailwind classes for each status
- **AND** statuses SHALL include: pending (yellow), processing (blue), completed (green), failed (red)

#### Scenario: Class name utilities
- **WHEN** a component needs conditional class names
- **THEN** the system MAY use the `cn()` utility from `@/shared/styles/class-utils`
- **AND** the utility SHALL filter out falsy values
- **AND** the utility SHALL join classes with spaces

#### Scenario: Duplicated styling patterns
- **WHEN** a styling pattern is used in three or more components
- **THEN** the system SHALL extract the pattern into a shared utility
- **AND** the utility SHALL be typed with TypeScript
- **AND** the utility SHALL have unit tests

### Requirement: Consistent Status Colors
The web application SHALL use consistent colors for manifest status indicators.

#### Scenario: Completed status
- **WHEN** a manifest has status "completed"
- **THEN** the system SHALL display green colors (bg-green-100, text-green-700)

#### Scenario: Pending status
- **WHEN** a manifest has status "pending"
- **THEN** the system SHALL display yellow colors (bg-yellow-100, text-yellow-700)

#### Scenario: Processing status
- **WHEN** a manifest has status "processing"
- **THEN** the system SHALL display blue colors (bg-blue-100, text-blue-700)

#### Scenario: Failed status
- **WHEN** a manifest has status "failed"
- **THEN** the system SHALL display red colors (bg-red-100, text-red-700)

### Requirement: Z-Index Scale
The web application SHALL use a documented z-index scale for all layered elements.

#### Scenario: Z-index hierarchy
- **WHEN** setting z-index values
- **THEN** developers SHALL use values from the documented scale
- **AND** the system SHALL document z-index scale in `docs/WEB_APP.md`

#### Scenario: Z-index scale values
- **WHEN** a component needs layering
- **THEN** the system SHALL use `z-[10]` for dropdowns
- **AND** the system SHALL use `z-[20]` for sticky headers
- **AND** the system SHALL use `z-[30]` for backdrops/overlays
- **AND** the system SHALL use `z-[40]` for modals
- **AND** the system SHALL use `z-[50]` for popovers/sidebars
- **AND** the system SHALL use `z-[60]` for toast notifications

#### Scenario: Z-index documentation
- **WHEN** a z-index value is used in code
- **THEN** the code SHALL include a comment explaining the layer purpose
- **EXAMPLE:** `className="z-[50] /* popover: above overlay */"`

### Requirement: Stacking Order Consistency
The web application SHALL maintain consistent stacking order across all pages.

#### Scenario: Modal over backdrop
- **WHEN** a modal dialog is displayed
- **THEN** the modal SHALL have z-index 40
- **AND** the backdrop SHALL have z-index 30
- **AND** the modal SHALL appear above the backdrop

#### Scenario: Sidebar over content
- **WHEN** the sidebar is opened
- **THEN** the sidebar SHALL have z-index 50
- **AND** the backdrop SHALL have z-index 30
- **AND** the sidebar SHALL appear above all page content

#### Scenario: Dropdown over content
- **WHEN** a dropdown menu is opened
- **THEN** the dropdown SHALL have z-index 10
- **AND** the dropdown SHALL appear above nearby content
- **AND** the dropdown SHALL NOT appear above modals or sidebars

### Requirement: Semantic Color Tokens
The web application SHALL use shadcn/ui semantic color tokens instead of hard-coded color values.

#### Scenario: Background colors
- **WHEN** a component background is styled
- **THEN** the system SHALL use `bg-background` for page backgrounds
- **AND** the system SHALL use `bg-card` for card/container backgrounds
- **AND** the system SHALL use `bg-muted` for secondary backgrounds
- **AND** the system SHALL NOT use hard-coded values like `bg-white` or `bg-gray-50`

#### Scenario: Text colors
- **WHEN** text is styled with neutral colors
- **THEN** the system SHALL use `text-foreground` for primary text
- **AND** the system SHALL use `text-card-foreground` for card text
- **AND** the system SHALL use `text-muted-foreground` for secondary text
- **AND** the system SHALL NOT use hard-coded values like `text-gray-900` or `text-gray-600`

#### Scenario: Border colors
- **WHEN** a border is styled
- **THEN** the system SHALL use `border-border` for default borders
- **AND** the system SHALL use `border-input` for form input borders
- **AND** the system SHALL NOT use hard-coded values like `border-gray-200` or `border-gray-300`

#### Scenario: Primary/brand colors
- **WHEN** a component uses brand colors
- **THEN** the system SHALL use `bg-primary` for primary button backgrounds
- **AND** the system SHALL use `text-primary` for primary text/links
- **AND** the system SHALL use `hover:bg-primary/90` for hover states
- **AND** the system SHALL NOT use hard-coded indigo values

#### Scenario: Focus states
- **WHEN** a focus state is styled
- **THEN** the system SHALL use `focus:border-ring` for border focus
- **AND** the system SHALL use `focus:ring-ring` for ring focus
- **AND** the system SHALL NOT use hard-coded indigo values

### Requirement: Dark Mode Status Colors
The web application SHALL use CSS custom properties for status badge colors that adapt to dark mode.

#### Scenario: Status color variables
- **WHEN** status badges are displayed
- **THEN** the system SHALL use CSS variables defined in `globals.css`
- **AND** the variables SHALL have different values for light and dark modes
- **AND** status colors SHALL include: completed (green), pending (yellow), processing (blue), failed (red)

#### Scenario: Status badge implementation
- **WHEN** a status badge is rendered
- **THEN** the badge SHALL use `bg-[var(--status-xxx-bg)] text-[var(--status-xxx-text)]`
- **AND** the colors SHALL automatically adapt when dark mode is enabled

### Requirement: Dark Mode Readiness
The web application SHALL be ready for dark mode implementation without requiring component changes.

#### Scenario: Semantic token usage
- **WHEN** dark mode is enabled via the `.dark` class on the root element
- **THEN** all components using semantic tokens SHALL automatically adapt
- **AND** components SHALL display correctly with proper contrast
- **AND** no component changes SHALL be required

#### Scenario: Contrast requirements
- **WHEN** colors are used in either light or dark mode
- **THEN** text SHALL meet WCAG AA contrast requirements (4.5:1 for normal text)
- **AND** interactive elements SHALL have visible focus indicators

### Requirement: Mobile-First Responsive Layouts
The web application SHALL use mobile-first responsive design patterns with Tailwind breakpoints for all layout components.

#### Scenario: Breakpoint hierarchy
- **WHEN** designing responsive layouts
- **THEN** the system SHALL use mobile as the default (no breakpoint)
- **AND** the system SHALL use `md:` breakpoint for tablet (768px+)
- **AND** the system SHALL use `lg:` breakpoint for desktop (1024px+)
- **AND** the system SHALL apply larger breakpoints progressively (mobile → tablet → desktop)

#### Scenario: Sidebar filters
- **WHEN** a sidebar filter component is displayed on mobile
- **THEN** the system SHALL stack filters vertically at full width
- **AND** the system SHALL provide a collapsible/expandable toggle
- **AND** the system SHALL display filters in a sidebar on desktop (lg: breakpoint)

#### Scenario: Split panel views
- **WHEN** a split panel view (e.g., PDF viewer + form) is displayed
- **THEN** the system SHALL stack panels vertically on mobile
- **AND** the system SHALL display panels side-by-side on desktop
- **AND** each panel SHALL be independently scrollable

#### Scenario: Form grids
- **WHEN** a form uses a grid layout
- **THEN** the system SHALL use single column on mobile
- **AND** the system SHALL use two columns on tablet (md:)
- **AND** the system SHALL use three columns on desktop (lg:)
- **AND** the system SHALL maintain proper field ordering across breakpoints

### Requirement: Flexible Height Layouts
The web application SHALL use flexible height layouts instead of fixed pixel calculations.

#### Scenario: Avoid magic number heights
- **WHEN** a component needs to fill available vertical space
- **THEN** the system SHALL use `flex-1` or `flex-grow` classes
- **AND** the system SHALL NOT use calc() with magic numbers like `calc(100vh-300px)`
- **AND** parent containers SHALL have defined height constraints

#### Scenario: Scrollable content areas
- **WHEN** content overflows the viewport
- **THEN** the system SHALL use `overflow-y-auto` on content containers
- **AND** the system SHALL maintain fixed headers/footers
- **AND** the system SHALL preserve scroll position during navigation

### Requirement: Consistent Button Component Usage
The web application SHALL use the shadcn/ui `Button` component for all button elements.

#### Scenario: Primary action buttons
- **WHEN** a primary action button is displayed (e.g., "Save", "Create", "Submit")
- **THEN** the system SHALL use the `Button` component with `variant="default"`
- **AND** the button SHALL have consistent styling across the application

#### Scenario: Secondary action buttons
- **WHEN** a secondary action button is displayed (e.g., "Cancel", "Close")
- **THEN** the system SHALL use the `Button` component with `variant="outline"` or `variant="ghost"`
- **AND** cancel actions SHALL use `variant="outline"`
- **AND** close/dismiss actions SHALL use `variant="ghost"`

#### Scenario: Destructive action buttons
- **WHEN** a destructive action button is displayed (e.g., "Delete", "Remove")
- **THEN** the system SHALL use the `Button` component with `variant="destructive"`
- **AND** the button SHALL have red styling to indicate danger

#### Scenario: Icon-only buttons
- **WHEN** a button contains only an icon without text
- **THEN** the system SHALL use the `Button` component with `variant="ghost"` and `size="icon"`
- **AND** the button SHALL include an `aria-label` describing the action

#### Scenario: Button sizes
- **WHEN** different button sizes are needed
- **THEN** the system SHALL use `size="sm"` for small buttons
- **AND** the system SHALL use `size="default"` for standard buttons (default)
- **AND** the system SHALL use `size="lg"` for large buttons

### Requirement: Button Accessibility
All buttons SHALL be accessible to keyboard users and screen readers.

#### Scenario: Keyboard navigation
- **WHEN** a user navigates with Tab key
- **THEN** all buttons SHALL be focusable
- **AND** the focus state SHALL be visually visible (focus ring)
- **AND** the button SHALL activate on Enter or Space key press

#### Scenario: Screen reader support
- **WHEN** a button is read by a screen reader
- **THEN** the button text SHALL clearly describe the action
- **AND** icon-only buttons SHALL have an `aria-label` attribute
- **AND** disabled buttons SHALL be announced as disabled

#### Scenario: Disabled state
- **WHEN** a button is disabled
- **THEN** the system SHALL pass the `disabled` prop to the `Button` component
- **AND** the button SHALL be visually styled as disabled
- **AND** the button SHALL NOT be clickable

### Requirement: Consistent Form Input Components
The web application SHALL use shadcn/ui form components for all form inputs.

#### Scenario: Text inputs
- **WHEN** a text input is needed
- **THEN** the system SHALL use the `Input` component from `@/shared/components/ui/input`
- **AND** the input SHALL have consistent styling and focus states
- **AND** the input SHALL support error states via React Hook Form integration

#### Scenario: Textarea inputs
- **WHEN** a multi-line text input is needed
- **THEN** the system SHALL use the `Textarea` component from `@/shared/components/ui/textarea`
- **AND** the textarea SHALL have consistent styling and resize behavior

#### Scenario: Select dropdowns
- **WHEN** a select dropdown is needed
- **THEN** the system SHALL use the `Select` component from `@/shared/components/ui/select`
- **AND** the select SHALL use `SelectTrigger`, `SelectValue`, `SelectContent`, and `SelectItem` components
- **AND** the select SHALL be keyboard accessible

#### Scenario: Error message display
- **WHEN** a form field has a validation error
- **THEN** the system SHALL use the `FormMessage` component to display the error
- **AND** the error SHALL appear below the input field
- **AND** the error SHALL be styled with destructive colors

#### Scenario: Label association
- **WHEN** a form input is rendered
- **THEN** the input SHALL have an associated label via `htmlFor` attribute
- **AND** the label SHALL clearly describe the expected input
- **AND** required fields SHALL be indicated

### Requirement: Form Input Accessibility
All form inputs SHALL be accessible to keyboard users and screen readers.

#### Scenario: Keyboard navigation
- **WHEN** a user navigates a form with Tab key
- **THEN** all inputs SHALL be focusable in logical order
- **AND** the focus state SHALL be visually visible
- **AND** the user SHALL be able to submit the form with Enter key

#### Scenario: Screen reader support
- **WHEN** a form input is read by a screen reader
- **THEN** the input SHALL be announced with its label
- **AND** required fields SHALL be announced as required
- **AND** validation errors SHALL be announced after the input label

#### Scenario: Error state accessibility
- **WHEN** a validation error is displayed
- **THEN** the error message SHALL be associated with the input via `aria-describedby`
- **AND** the input SHALL have `aria-invalid="true"` attribute
- **AND** the error SHALL be announced by screen readers

#### Scenario: Disabled state
- **WHEN** an input is disabled
- **THEN** the system SHALL pass the `disabled` prop to the component
- **AND** the input SHALL be visually styled as disabled
- **AND** the input SHALL NOT be interactive
- **AND** disabled state SHALL be announced by screen readers

### Requirement: Theme-Aware Neutral Palette
The web application SHALL use semantic, theme-aware Tailwind tokens for neutral surfaces, borders, and text.

#### Scenario: Page backgrounds
- **WHEN** a page background is styled
- **THEN** the system SHALL use `bg-background` for page surfaces
- **AND** the system SHALL use `bg-card` for card and container surfaces

#### Scenario: Text colors
- **WHEN** text is styled with neutral colors
- **THEN** the system SHALL use `text-foreground` for primary text
- **AND** the system SHALL use `text-muted-foreground` for secondary and muted text

#### Scenario: Border colors
- **WHEN** a border is styled with neutral colors
- **THEN** the system SHALL use `border-border` for neutral borders

#### Scenario: Hover states
- **WHEN** a hover state uses neutral colors
- **THEN** the system SHALL use `hover:bg-muted` for subtle hover effects
- **AND** the system SHALL use `hover:text-foreground` for text hover states

### Requirement: Project Settings Schema Access
The web application SHALL provide schema and rules access from the project settings dropdown only, without separate settings cards on the project detail page.

#### Scenario: Project settings dropdown entries
- **WHEN** a user opens the project settings dropdown
- **THEN** the menu SHALL include entries for Schema, Rules, and Validation Scripts
- **AND** the Schema entry SHALL open the schema detail view for the project
- **AND** the Rules entry SHALL open the schema detail view with the Rules tab active

#### Scenario: Disabled schema access
- **WHEN** a project does not yet have a schema
- **THEN** the Schema and Rules entries SHALL be disabled
- **AND** the Validation Scripts entry SHALL remain available

### Requirement: Schema Detail Back Navigation
The schema detail page SHALL return the user to the owning project detail page when navigating back.

#### Scenario: Back navigation from schema detail
- **WHEN** a user clicks the back action on the schema detail page
- **THEN** the system SHALL navigate to the related project detail route

### Requirement: Accessibility Labels
The web application SHALL provide appropriate accessibility labels for all interactive elements that lack visible text labels.

#### Scenario: Icon-only buttons
- **WHEN** a button contains only an icon or image
- **THEN** the button SHALL have an `aria-label` attribute describing its purpose
- **AND** the label SHALL be concise and descriptive

#### Scenario: Form inputs without visible labels
- **WHEN** a form input lacks a visible `<label>` element
- **THEN** the input SHALL have an `aria-label` or `aria-labelledby` attribute
- **AND** the label SHALL clearly indicate the input's purpose

### Requirement: Keyboard Navigation
The web application SHALL be fully operable using only a keyboard.

#### Scenario: Tab navigation
- **WHEN** a user presses the Tab key
- **THEN** focus SHALL move to the next interactive element in logical order
- **AND** the focus indicator SHALL be clearly visible

#### Scenario: Enter and Space keys
- **WHEN** an element has focus and the user presses Enter or Space
- **THEN** the element SHALL activate if it is interactive (button, link, etc.)

#### Scenario: Escape key
- **WHEN** a modal, dropdown, or overlay is open and the user presses Escape
- **THEN** the overlay SHALL close
- **AND** focus SHALL return to the triggering element

### Requirement: Focus Management
The web application SHALL properly manage focus for dynamic content changes and overlays.

#### Scenario: Modal opens
- **WHEN** a modal or dialog opens
- **THEN** focus SHALL move to the first interactive element within the modal
- **AND** focus SHALL be trapped within the modal until closed

#### Scenario: Modal closes
- **WHEN** a modal or dialog closes
- **THEN** focus SHALL return to the element that opened the modal

#### Scenario: Route navigation
- **WHEN** the user navigates to a new route
- **THEN** focus SHALL move to a sensible location (typically page title or main content)

### Requirement: Semantic HTML and Landmarks
The web application SHALL use semantic HTML elements and landmark regions to support screen reader navigation.

#### Scenario: Page structure
- **WHEN** a page is rendered
- **THEN** the page SHALL use `<main>`, `<nav>`, `<header>`, `<footer>` elements appropriately
- **AND** the page SHALL have a logical heading hierarchy (h1 → h2 → h3)

#### Scenario: Skip navigation
- **WHEN** a keyboard user navigates to a new page
- **THEN** a "skip to main content" link SHALL be available
- **AND** the link SHALL be visible when focused

### Requirement: Manifest List Display

The manifest list SHALL display manifests with extraction controls and OCR quality, and SHALL render schema-driven summary fields as dynamic columns derived from the project's active JSON Schema. The manifest list SHALL allow sorting and filtering by those schema-driven fields.

#### Scenario: Optional system columns (default hidden)

- **GIVEN** additional manifest system fields exist (e.g., Confidence, Verified, Invoice Date, Department, Purchase Order, Cost, OCR Quality, OCR Processed At, Extractor, File Size, File Type, Created, Updated, ID)
- **WHEN** the user opens the Columns dropdown
- **THEN** the user SHALL be able to toggle those additional system columns
- **AND** those optional system columns SHALL be hidden by default

#### Scenario: Confidence indicators are not color-only
- **GIVEN** the manifest list UI displays confidence using any visual highlight (e.g., row border color)
- **WHEN** the Confidence system column is hidden
- **THEN** the UI SHALL provide a non-color cue for the confidence signal (e.g., label, badge, tooltip text)
- **AND** the UI SHALL provide an accessible text equivalent for screen readers

#### Scenario: Filter by schema-driven field using column filter dropdown

- **GIVEN** schema-driven columns are visible in the manifest list table
- **WHEN** the user opens a schema-driven column filter dropdown
- **AND** the user types a value or selects an available value
- **THEN** the manifest list query SHALL include `filter[<fieldPath>]=<value>`
- **AND** the results SHALL update to show only matching manifests

#### Scenario: Available value scope is clear
- **GIVEN** the UI offers “available values” suggestions for a schema-driven column filter
- **WHEN** those suggestions are derived from the currently displayed page only
- **THEN** the UI SHALL label the suggestions as page-scoped (e.g., “Values from this page”)

### Requirement: Manifest Detail View

The manifest detail SHALL include OCR result preview and field re-extraction.

#### Scenario: Detail tabs updated

- **GIVEN** user opens manifest detail page
- **WHEN** page renders
- **THEN** system shows tabs:
  - [📄 PDF] - PDF viewer with OCR overlay toggle
  - [✏️ Data] - Extracted fields with inline edit
  - [👁️ OCR Raw] - Full OCR result JSON
  - [📊 History] - Extraction history with costs

#### Scenario: Audit header does not expose internal storage path
- **GIVEN** the user is viewing the manifest audit/detail page
- **WHEN** the header renders manifest metadata
- **THEN** the UI SHALL NOT display internal storage paths (e.g., `storagePath`) as primary user-facing text

### Requirement: Extraction Status Display

The system SHALL display extraction status with quality indicators.

#### Scenario: Extraction complete with quality

- **GIVEN** extraction has completed
- **WHEN** status is displayed
- **THEN** system shows:
  - Overall status badge (Complete, Partial, Failed)
  - Number of fields extracted vs required
  - Average confidence score
  - Extraction cost incurred
  - Time elapsed

#### Scenario: Partial extraction warning

- **GIVEN** extraction completed with missing fields
- **WHEN** status is displayed
- **THEN** system shows warning with:
  - List of missing required fields
  - Fields with low confidence
  - Recommendation to re-extract or edit manually

### Requirement: Manifest Filtering

The manifest filtering SHALL support OCR quality and extraction status filters.

#### Scenario: Filter by OCR quality

- **GIVEN** user is viewing manifest list
- **WHEN** user applies OCR quality filter
- **THEN** system shows filter options:
  - Excellent (≥90)
  - Good (70-89)
  - Poor (<70)
  - Not Processed
- **AND** table updates to show matching manifests

#### Scenario: Filter by extraction status

- **GIVEN** user is viewing manifest list
- **WHEN** user applies extraction status filter
- **THEN** system shows filter options:
  - Not Extracted
  - Extracting
  - Complete
  - Partial
  - Failed
- **AND** table updates to show matching manifests

#### Scenario: Filter by cost range

- **GIVEN** user has extracted manifests with various costs
- **WHEN** user applies cost filter
- **THEN** system shows:
  - Min cost input
  - Max cost input
  - Slider for range selection
- **AND** table updates to show matching manifests

### Requirement: Global Extractors Page
The web application SHALL provide a global page for managing text extractors.

#### Scenario: Navigate to extractors page
- **GIVEN** a user is logged in
- **WHEN** the user navigates to `/extractors`
- **THEN** the system SHALL display the Extractors page
- **AND** the page SHALL show a list of extractors and a "New Extractor" action

#### Scenario: List extractor cards
- **GIVEN** extractors exist
- **WHEN** the page loads
- **THEN** each extractor card SHALL show name, description, extractor type, and active status
- **AND** each card SHALL show "Used by X projects" when usage data is available

#### Scenario: Create extractor
- **GIVEN** a user opens the new extractor dialog
- **WHEN** the user saves a valid configuration
- **THEN** the system SHALL call `POST /api/extractors`
- **AND** the list SHALL refresh with the new extractor

#### Scenario: Edit extractor
- **GIVEN** a user opens an existing extractor
- **WHEN** the user saves changes
- **THEN** the system SHALL call `PUT /api/extractors/:id`
- **AND** the list SHALL refresh with updated data

#### Scenario: Delete extractor
- **GIVEN** a user clicks delete on an extractor
- **WHEN** the system confirms deletion
- **THEN** the system SHALL call `DELETE /api/extractors/:id`
- **AND** the extractor SHALL be removed from the list
- **AND** if the extractor is in use, the system SHALL show a clear error

#### Scenario: Test extractor connection
- **GIVEN** a user clicks "Test" on an extractor card
- **WHEN** the test runs
- **THEN** the system SHALL call `POST /api/extractors/:id/test`
- **AND** the system SHALL display success or error details

### Requirement: Extractor Form with Dynamic Configuration
The web application SHALL generate extractor configuration forms based on type schemas.

#### Scenario: Load extractor types
- **WHEN** the extractor dialog opens
- **THEN** the system SHALL call `GET /api/extractors/types`
- **AND** the system SHALL populate the type selector from the response

#### Scenario: Generate form from schema
- **GIVEN** an extractor type is selected
- **WHEN** the schema is available
- **THEN** the system SHALL render a field for each parameter
- **AND** required fields SHALL be marked with an asterisk

#### Scenario: Apply preset configuration
- **GIVEN** presets are available
- **WHEN** the user selects a preset
- **THEN** the system SHALL pre-fill the configuration form
- **AND** the system SHALL focus the API key field

#### Scenario: Inline validation and save errors
- **GIVEN** a user edits configuration fields
- **WHEN** a field value is invalid
- **THEN** the system SHALL show an inline error message
- **AND** the system SHALL prevent save until errors are resolved

### Requirement: Extractor Preset Selection
The web application SHALL provide preset configurations for common vision models.

#### Scenario: View available presets
- **WHEN** the preset section is displayed
- **THEN** the system SHALL show preset cards for common models (GPT-4o, Claude, Qwen)
- **AND** each card SHALL display the model name and provider
- **AND** each card SHALL have a "Select" button

#### Scenario: Load presets from API
- **WHEN** the preset section loads
- **THEN** the system SHALL call `GET /api/extractors/presets`
- **AND** the UI SHALL render the returned preset list

### Requirement: Project Extractor Selection Page
The web application SHALL allow selecting a global extractor for a project.

#### Scenario: Navigate to project extractor settings
- **GIVEN** a user is on a project page
- **WHEN** the user navigates to `/projects/:id/settings/extractors`
- **THEN** the system SHALL display the Project Extractor Settings page
- **AND** the page SHALL show the currently selected extractor

#### Scenario: Select extractor for project
- **GIVEN** the selection dialog is open
- **WHEN** the user selects an extractor and saves
- **THEN** the system SHALL call `PUT /api/projects/:id/extractor`
- **AND** the project SHALL update to use the selected extractor

#### Scenario: Selection is read-only for config
- **GIVEN** the project extractor settings page is open
- **THEN** the page SHALL not expose extractor configuration fields
- **AND** configuration edits SHALL only be available on the global Extractors page

### Requirement: Models Page LLM-Only
The web application SHALL limit the Models page to structured LLM configuration only.

#### Scenario: Remove OCR configuration from models
- **GIVEN** a user opens the Models page
- **WHEN** the model create/edit dialog is displayed
- **THEN** the form SHALL not include OCR or text extraction configuration fields
- **AND** the form SHALL focus on structured LLM settings only

#### Scenario: Vision-capable model does not require OCR config
- **GIVEN** a user configures a vision-capable model
- **WHEN** the model form is validated
- **THEN** the UI SHALL not require any OCR/text extraction configuration
- **AND** the user can save without OCR settings

#### Scenario: Direct users to Extractors for text extraction
- **GIVEN** a user is viewing model configuration help text
- **THEN** the UI SHALL indicate text extraction is configured in Extractors

### Requirement: Extractor Information Display
The web application SHALL display which extractor was used for each manifest extraction.

#### Scenario: Show extractor in manifest list
- **GIVEN** the manifests list page is displayed
- **WHEN** the page loads
- **THEN** each manifest row SHALL show the extractor used
- **AND** the system SHALL display an ExtractorStatusBadge with the extractor name
- **AND** the badge SHALL be color-coded by category (OCR=blue, Vision=purple, Hybrid=green)

#### Scenario: Show extractor details in manifest detail
- **GIVEN** a user clicks on a manifest to view details
- **WHEN** the manifest detail panel opens
- **THEN** the system SHALL display an "Extraction Info" section
- **AND** the section SHALL show the extractor name and version
- **AND** the section SHALL show the processing time
- **AND** the section SHALL show any additional metadata from the extractor

#### Scenario: Filter manifests by extractor
- **GIVEN** the manifests list page is displayed
- **WHEN** the user applies a filter for a specific extractor
- **THEN** the system SHALL filter the list to show only manifests processed by that extractor
- **AND** the filter badge SHALL show the extractor name

### Requirement: Cost Display
The web application SHALL display extraction costs when cost data is available.

#### Scenario: Show cost on extractor cards
- **GIVEN** extractor cost summaries are available
- **WHEN** the Extractors page loads
- **THEN** each extractor card SHALL show average cost per extraction
- **AND** each card SHALL show total spend when available
- **AND** the UI SHALL show a currency code for displayed cost values

#### Scenario: Show cost in manifest list
- **GIVEN** manifests include extraction cost data
- **WHEN** the manifests list loads
- **THEN** each manifest row SHALL show the extraction cost
- **AND** the UI SHALL show a currency code when available

#### Scenario: Show cost breakdown in manifest detail
- **GIVEN** a manifest with extraction cost data
- **WHEN** the manifest detail panel opens
- **THEN** the system SHALL display a cost breakdown panel
- **AND** the panel SHALL show text extraction cost, LLM cost, and total cost when available
- **AND** the panel SHALL show a currency code for each cost value (or “unknown” when missing)

#### Scenario: Project cost summary page
- **GIVEN** a project with extraction cost history
- **WHEN** the user navigates to `/projects/:id/costs`
- **THEN** the system SHALL show total extraction costs and cost by extractor
- **AND** the system SHALL show cost over time
- **AND** the UI SHALL support multi-currency totals by showing one total per currency

### Requirement: Secure API Key Handling
The web application SHALL handle extractor API keys securely in the UI.

#### Scenario: Mask existing API keys
- **GIVEN** an existing extractor configuration with an API key
- **WHEN** the configuration form loads
- **THEN** the API key input SHALL show masked bullets instead of the actual key
- **AND** the input SHALL indicate the key is configured

#### Scenario: Toggle API key visibility
- **GIVEN** a user has entered a new API key in the current session
- **WHEN** the user clicks the eye icon
- **THEN** the system SHALL reveal the entered API key
- **AND** the user can click again to mask it

#### Scenario: Copy API key to clipboard
- **GIVEN** a user has entered a new API key in the current session
- **WHEN** the user clicks the copy button
- **THEN** the system SHALL copy the API key to the clipboard
- **AND** the system SHALL show a "Copied!" confirmation tooltip

#### Scenario: Indicate API key change
- **GIVEN** an existing API key configuration
- **WHEN** the user modifies the API key value
- **THEN** the system SHALL display a "Changed" indicator next to the field
- **AND** the system SHALL warn the user that the key will be updated on save

### Requirement: Error Handling and Feedback
The web application SHALL provide clear feedback for errors and loading states.

#### Scenario: Show loading state during fetch
- **GIVEN** the page is fetching extractor data
- **WHEN** the fetch is in progress
- **THEN** the system SHALL display a loading spinner
- **AND** the system SHALL disable form inputs during loading

#### Scenario: Show error state on fetch failure
- **GIVEN** the API request fails
- **WHEN** the error is received
- **THEN** the system SHALL display an error message
- **AND** the system SHALL provide a "Retry" button
- **AND** the system SHALL log the error for debugging

#### Scenario: Show unsaved changes warning
- **GIVEN** a user has made unsaved changes to an extractor form
- **WHEN** the user attempts to navigate away
- **THEN** the system SHALL display a confirmation dialog
- **AND** the dialog SHALL warn about unsaved changes
- **AND** the system SHALL allow the user to stay or discard changes

### Requirement: Navigation Integration
The web application SHALL integrate extractor management into navigation.

#### Scenario: Sidebar includes Extractors
- **WHEN** the sidebar is rendered
- **THEN** the menu SHALL include an "Extractors" link
- **AND** clicking the link SHALL navigate to `/extractors`

#### Scenario: Project settings includes Extractors
- **GIVEN** a user opens the project settings menu
- **WHEN** the menu is displayed
- **THEN** the menu SHALL include an "Extractors" option
- **AND** clicking the option SHALL navigate to `/projects/:id/settings/extractors`

#### Scenario: Breadcrumb navigation
- **GIVEN** a user is on the project extractor settings page
- **WHEN** the page is displayed
- **THEN** the breadcrumb SHALL show "Projects > [Project Name] > Settings > Extractors"
- **AND** clicking any breadcrumb segment SHALL navigate to that level

### Requirement: Ordered Schema-Driven Audit Form Fields
The web application SHALL render schema-driven manifest audit form fields in a deterministic order derived from JSON Schema `x-ui-order` metadata.

#### Scenario: Root object ordering with partial metadata
- **GIVEN** the project's JSON Schema root object defines `properties` with `x-ui-order` on some properties
- **WHEN** a user opens the manifest audit page for a manifest in that project
- **THEN** properties with `x-ui-order` SHALL be rendered first in ascending numeric order
- **AND** properties without `x-ui-order` SHALL be rendered after, sorted by property name (A→Z)

#### Scenario: Nested object ordering
- **GIVEN** a property is an object schema with nested `properties`
- **WHEN** the audit form renders fields within that nested object
- **THEN** nested properties SHALL be ordered using the same `x-ui-order` rules

#### Scenario: Array items object ordering
- **GIVEN** a property is an array whose `items` is an object schema with `properties`
- **WHEN** the audit form renders editable rows for that array
- **THEN** row fields/columns SHALL be ordered using the same `x-ui-order` rules

### Requirement: Canonical Schema Preview Ordering
The web application SHALL present JSON Schema previews using canonical ordering based on `x-ui-order` metadata for readability.

#### Scenario: Preview uses canonical ordering
- **WHEN** a user views or formats a JSON Schema in the UI
- **THEN** the displayed JSON SHALL serialize `properties` in the canonical order derived from `x-ui-order`

### Requirement: Global Jobs Panel
The web application SHALL provide a global Jobs panel to monitor queued and running background jobs, including OCR refresh jobs started from the Audit page.

#### Scenario: OCR refresh runs as a job
- **GIVEN** a user is auditing a manifest
- **WHEN** the user triggers “Refresh OCR cache”
- **THEN** the system SHALL enqueue a background job and return immediately
- **AND** the job SHALL be visible in the global Jobs panel with progress/status
- **AND** the system SHALL refresh the manifest OCR view when the job completes

#### Scenario: Jobs panel tab semantics
- **GIVEN** the Jobs panel displays jobs in tabs
- **WHEN** the user selects the “In progress” tab
- **THEN** the UI SHALL show only non-terminal jobs
- **WHEN** the user selects the “Completed” tab
- **THEN** the UI SHALL show only jobs with `status=completed`
- **WHEN** the user selects the “Failed” tab
- **THEN** the UI SHALL show only failed/canceled jobs

### Requirement: Internationalization (i18n) Support
The web application SHALL support localized UI text and runtime language switching.

#### Scenario: Default locale selection
- **GIVEN** a user visits the web app with no saved language preference
- **WHEN** the application initializes
- **THEN** the app SHALL select a locale based on browser language
- **AND** the app SHALL fall back to `en` when the browser locale is unsupported

#### Scenario: Language preference persistence
- **GIVEN** a user selects a language in the UI
- **WHEN** the user reloads the page
- **THEN** the app SHALL restore the previously selected language

#### Scenario: Missing translation fallback
- **GIVEN** a translation key is missing for the active locale
- **WHEN** the UI renders that string
- **THEN** the app SHALL fall back to `en` for that key
- **AND** the UI SHALL still render a safe, user-friendly message

#### Scenario: Wizards are fully localized
- **GIVEN** the user opens a multi-step wizard (e.g., project guided setup)
- **WHEN** the UI is rendered in a non-default locale
- **THEN** wizard titles, step labels, and button labels SHALL use localized strings

### Requirement: Localized API Error Presentation
The web application SHALL present localized error messages based on backend error codes.

#### Scenario: Known backend error code
- **GIVEN** an API call fails with an error envelope containing `error.code`
- **WHEN** the UI displays an error message to the user
- **THEN** the UI SHALL map `error.code` to a translation key and render the localized message
- **AND** the UI SHOULD show `requestId` for support/debugging when available

#### Scenario: Unknown backend error code
- **GIVEN** an API call fails with an unknown `error.code`
- **WHEN** the UI displays an error message
- **THEN** the UI SHALL display a localized generic error message

### Requirement: Bulk Extraction Action With User Choice

The web application SHALL provide an “Extract” action that clearly explains side effects and lets the user choose between extracting selected manifests or all manifests matching the current filters.

#### Scenario: Extract selected manifests from list

- **GIVEN** the user has selected one or more manifests in the manifests list
- **WHEN** the user clicks “Extract”
- **THEN** the system SHALL offer “Selected manifests (N)” as a scope option
- **AND** the system SHALL show a confirmation notice describing what will happen
- **AND** upon confirmation the system SHALL start extraction jobs for the selected manifests
- **AND** jobs SHALL be visible in the global Jobs panel

#### Scenario: Extract all manifests matching current filters

- **GIVEN** the user has applied filters in the manifests list
- **AND** the filtered result set contains more manifests than the current page
- **WHEN** the user selects “All matching current filters”
- **THEN** the system SHALL estimate and display the extraction cost for the full filtered set
- **AND** the system SHALL require explicit user confirmation before queueing jobs

#### Scenario: Default bulk extraction skips completed and processing

- **GIVEN** the user opens the “Extract” modal with no explicit behavior overrides
- **WHEN** the user confirms extraction
- **THEN** the system SHALL extract only manifests that are not `completed`
- **AND** the system SHALL skip manifests that are `processing`

#### Scenario: Processing is skipped unless user forces inclusion

- **GIVEN** the filtered result set includes one or more `processing` manifests
- **WHEN** the user does not enable a “force include processing” option
- **THEN** the system SHALL skip `processing` manifests
- **AND** **WHEN** the user explicitly enables “force include processing”
- **THEN** the system SHALL include `processing` manifests in the extraction request

#### Scenario: Audit panel includes Extract action

- **GIVEN** the user is on the manifest audit page
- **WHEN** the user clicks “Extract”
- **THEN** the system SHALL start extraction for the current manifest

### Requirement: Duplicate Upload Warning
The web application SHALL warn the user when one or more uploaded manifest files were detected as duplicates.

#### Scenario: Upload shows duplicate summary
- **GIVEN** the user uploads one or more manifest files
- **WHEN** the upload response includes one or more items with `isDuplicate=true`
- **THEN** the UI shows a clear summary (e.g. "Created N, duplicates M")
- **AND** the UI offers an action to review duplicates

#### Scenario: Review duplicates
- **GIVEN** the upload summary indicates duplicates occurred
- **WHEN** the user selects "Review duplicates"
- **THEN** the UI lists duplicated filenames
- **AND** each item provides an "Open existing" action that navigates to the existing manifest

### Requirement: Remove Prompts Management Page

The web application SHALL NOT provide a dedicated prompt template management page at the `/prompts` route.

#### Scenario: Navigating to /prompts
- **GIVEN** the user is authenticated
- **WHEN** the user navigates to `/prompts`
- **THEN** the system SHALL NOT render a prompt-template CRUD page

#### Scenario: Sidebar does not include a Prompts link
- **WHEN** the dashboard sidebar navigation is rendered
- **THEN** the system SHALL NOT show a “Prompts” navigation link

### Requirement: Unused Web UI Cleanup

The web application SHALL remove unused pages and components that are not reachable from the router or referenced by production code.

#### Scenario: Unreachable dashboard pages are removed
- **GIVEN** the dashboard router configuration does not reference a page component
- **WHEN** an unreachable page is identified as unused
- **THEN** the system SHALL remove the page implementation to avoid shipping dead UI

#### Scenario: Test-only UI is either integrated or removed
- **GIVEN** a UI component is referenced only by tests and not by production code
- **WHEN** the component is not part of an approved user-facing workflow
- **THEN** the system SHALL remove the component and its tests

### Requirement: Group Status Indicators
The system SHALL display manifest status counts on each GroupCard, including a count for manifests with status "completed".

#### Scenario: Show status breakdown includes completed
- **WHEN** a GroupCard is rendered for a group
- **THEN** the system SHALL display counts for pending, error (failed), completed, and verified manifests in that group
- **AND** the completed count SHALL include manifests with `status="completed"`
- **AND** the verified count SHALL include manifests with `humanVerified=true`

### Requirement: Human Verified Requires Validation Gate

The web application SHALL gate saving `manifest.humanVerified=true` behind a validation run, and SHALL require explicit user confirmation when validation returns one or more errors.

#### Scenario: Save as Human Verified with no validation errors

- **GIVEN** a user is auditing a manifest
- **AND** the user has marked the manifest as Human Verified (intent to save `humanVerified=true`)
- **WHEN** the user clicks Save
- **THEN** the system SHALL save the latest audit edits to the manifest
- **AND** the system SHALL run validation for that manifest
- **AND** **WHEN** validation returns `errorCount = 0`
- **THEN** the system SHALL persist `manifest.humanVerified=true`
- **AND** the UI SHOULD present a “Validation passed” indicator (or equivalent) without requiring navigation

#### Scenario: Save as Human Verified with validation warnings is allowed and visible

- **GIVEN** a user is auditing a manifest
- **AND** the user has marked the manifest as Human Verified (intent to save `humanVerified=true`)
- **WHEN** the user clicks Save
- **THEN** the system SHALL run validation for that manifest
- **AND** **WHEN** validation returns `errorCount = 0` and `warningCount > 0`
- **THEN** the system SHALL persist `manifest.humanVerified=true`
- **AND** the UI SHALL surface the warnings summary on Save
- **AND** the UI SHALL provide an explicit user action to open the Validation section for details

#### Scenario: Save as Human Verified with validation errors requires confirmation and is visible

- **GIVEN** a user is auditing a manifest
- **AND** the user has marked the manifest as Human Verified (intent to save `humanVerified=true`)
- **WHEN** the user clicks Save
- **THEN** the system SHALL run validation for that manifest
- **AND** **WHEN** validation returns `errorCount > 0`
- **THEN** the system SHALL surface the errors and warnings summary on Save
- **AND** the UI SHALL provide an explicit user action to open the Validation section for details
- **AND** the system SHALL prompt the user for confirmation before persisting `humanVerified=true`
- **AND** **WHEN** the user cancels the confirmation
- **THEN** the system SHALL keep `manifest.humanVerified=false`
- **AND** **WHEN** the user confirms
- **THEN** the system SHALL persist `manifest.humanVerified=true`

#### Scenario: Save as Human Verified when validation cannot run

- **GIVEN** a user is auditing a manifest
- **AND** the user has marked the manifest as Human Verified (intent to save `humanVerified=true`)
- **WHEN** the user clicks Save
- **AND** **WHEN** the validation request fails (network/server error)
- **THEN** the UI SHALL display a user-visible validation error message
- **AND** the system SHALL NOT persist `manifest.humanVerified=true`
- **AND** the UI SHOULD provide an explicit user action to retry validation

#### Scenario: Run validation without leaving current audit section

- **WHEN** the user triggers “Run validation” from the audit header
- **THEN** the system SHALL run validation for the manifest
- **AND** the UI SHOULD display a summary of validation results without forcing navigation
- **AND** the UI SHOULD provide an explicit user action to open the Validation section

### Requirement: Manifest list batch actions use consistent scope modals
The web application SHALL present a consistent scope confirmation modal UX for the Manifests list batch actions: Export CSV, Export Excel, Run validation, and Extract.

#### Scenario: Default scope is filtered
- **GIVEN** a user is on the Manifests list page with any selection state
- **WHEN** the user opens Export (CSV/Excel), Run validation, or Extract
- **THEN** the system SHALL default the scope to “All matching current filters”

#### Scenario: Selected-only scope is available when there is a selection
- **GIVEN** a user has selected one or more manifests on the Manifests list page
- **WHEN** the user opens Export (CSV/Excel), Run validation, or Extract
- **THEN** the system SHALL allow switching the scope to “Selected only”

#### Scenario: Selected-only scope is disabled when there is no selection
- **GIVEN** a user has selected zero manifests on the Manifests list page
- **WHEN** the user opens Export (CSV/Excel), Run validation, or Extract
- **THEN** the system SHALL disable “Selected only” scope selection

#### Scenario: Export format selection
- **WHEN** the user opens the Export modal on the Manifests list page
- **THEN** the UI SHALL allow choosing the export format: CSV or Excel (`.xlsx`)

### Requirement: Embedded Cost Dashboard Widget
The web application SHALL embed a cost dashboard widget on existing dashboard pages to summarize usage and spend with multi-currency support.

#### Scenario: Models page shows embedded LLM cost widget
- **WHEN** the user navigates to `/models`
- **THEN** the system SHALL render an embedded cost dashboard widget
- **AND** the widget SHALL display LLM token usage and cost metrics grouped by currency
- **AND** the widget SHALL include a date range filter

#### Scenario: Extractors page shows embedded text cost widget
- **WHEN** the user navigates to `/extractors`
- **THEN** the system SHALL render an embedded cost dashboard widget
- **AND** the widget SHALL display text extraction usage and cost metrics grouped by currency
- **AND** the widget SHALL include a date range filter

#### Scenario: Multi-currency totals are displayed without summing
- **GIVEN** cost data exists in multiple currencies
- **WHEN** the embedded cost dashboard widget renders totals
- **THEN** the UI SHALL display one total per currency code
- **AND** the UI SHALL NOT display a single mixed-currency grand total

### Requirement: Token Cost Dashboard (LLM)
The web application SHALL display LLM token usage and token-based cost metrics in the embedded cost dashboard widget.

#### Scenario: Show token usage by model
- **GIVEN** LLM jobs include stored token usage
- **WHEN** the user views the LLM tab in the cost dashboard
- **THEN** the system SHALL display input tokens, output tokens, and total tokens grouped by model and currency

#### Scenario: Show cost per 1k tokens
- **GIVEN** LLM jobs include stored token usage and cost
- **WHEN** the user views model rows in the LLM tab
- **THEN** the system SHALL display cost per 1k total tokens (and currency code) for each model row

### Requirement: Text Extractor Cost Dashboard (Text)
The web application SHALL display text extraction usage and cost metrics in the embedded cost dashboard widget.

#### Scenario: Show pages and cost per page
- **GIVEN** text extraction jobs include page counts and cost
- **WHEN** the user views the Text tab in the cost dashboard
- **THEN** the system SHALL display pages processed and cost per page grouped by extractor and currency

### Requirement: OCR History Section
The manifest audit page SHALL provide a dedicated OCR history section to review OCR refresh runs separately from extraction history.

#### Scenario: User reviews OCR refresh runs
- **GIVEN** a manifest has one or more OCR refresh jobs
- **WHEN** the user opens the audit page History tab
- **THEN** the system SHALL display an OCR history section listing OCR refresh runs
- **AND** the section SHALL show run status and timestamps
- **AND** the section SHALL NOT be mixed into the extraction history list

### Requirement: User Profile Password Change
The web application SHALL provide a Profile page that allows authenticated users to change their password.

#### Scenario: User opens Profile page
- **GIVEN** an authenticated user
- **WHEN** the user navigates to the Profile page
- **THEN** the system SHALL show the current username and role
- **AND** the system SHALL show a Change Password form

#### Scenario: Password change success
- **GIVEN** an authenticated user on the Profile page
- **WHEN** the user submits the Change Password form with valid inputs
- **THEN** the system SHALL call the backend change-password endpoint
- **AND** the UI SHALL show a success message

#### Scenario: Password change error
- **GIVEN** an authenticated user on the Profile page
- **WHEN** the backend returns an error (e.g. wrong current password)
- **THEN** the UI SHALL show a user-friendly error message

### Requirement: Audit header actions menu and shortcuts
The web application SHALL present audit actions in a compact header and SHALL support keyboard shortcuts for common actions.

#### Scenario: Header merges infrequent actions into Actions menu
- **GIVEN** the user is on the manifest audit page
- **THEN** the header SHALL show Save and Run validation as primary actions
- **AND** the header SHALL provide an "Actions" menu containing Refresh results, Refresh OCR cache, and Extract

#### Scenario: Keyboard shortcuts trigger actions when safe
- **GIVEN** the user is on the manifest audit page
- **AND** focus is not inside a text input/textarea/contenteditable element
- **AND** no modal dialog is open
- **WHEN** the user presses a supported shortcut key
- **THEN** the corresponding action SHALL run (Save, Validation, Refresh results, Refresh OCR cache, Extract)

### Requirement: Refresh OCR cache
The web application SHALL allow users to rebuild the cached OCR result for a manifest.

#### Scenario: Rebuild OCR cache from audit actions
- **GIVEN** the user is on the manifest audit page
- **WHEN** the user selects "Refresh OCR cache"
- **THEN** the system SHALL rebuild and persist the OCR result for that manifest
- **AND** the OCR view SHALL update to reflect the refreshed OCR result

### Requirement: Audit action from manifests list
The web application SHALL provide an Audit action on the manifests list that opens the manifest audit page for a chosen scope.

#### Scenario: Audit filtered results from manifests list
- **GIVEN** the user is viewing the manifests list with filters and sort applied
- **WHEN** the user selects "Audit filtered results"
- **THEN** the system SHALL open the manifest audit page on the first manifest in the current result ordering
- **AND** the audit header SHALL indicate the scope is filtered results

#### Scenario: Audit selected manifests from manifests list
- **GIVEN** the user has selected one or more manifests in the manifests list
- **WHEN** the user selects "Audit selected"
- **THEN** the system SHALL open the manifest audit page on the first selected manifest (deterministic ordering)
- **AND** the audit header SHALL indicate the scope is selected manifests

#### Scenario: Audit all manifests in group from manifests list
- **GIVEN** the user is viewing the manifests list for a group
- **WHEN** the user selects "Audit all in group"
- **THEN** the system SHALL open the manifest audit page on the first manifest in the group (current sort ordering)
- **AND** the audit header SHALL indicate the scope is all manifests in the group

### Requirement: Manifest audit navigation scope and counts
The web application SHALL display the audited manifest’s position within the current navigation scope, and SHALL allow refreshing the scope results.

#### Scenario: Open audit from a filtered manifests list
- **GIVEN** the user is viewing the manifests list with filters and sort applied
- **WHEN** the user opens the manifest audit page from a manifest row/card
- **THEN** the audit header SHALL display `X of N` where `N` reflects the filtered total
- **AND** the audit header SHALL display a scope label indicating filtered results

#### Scenario: Refresh audit navigation scope results
- **GIVEN** the user is on the manifest audit page with a known navigation scope
- **WHEN** the user clicks "Refresh results"
- **THEN** the system SHALL refetch the scope results and totals
- **AND** the audit header `X of N` SHALL update to reflect the refreshed totals

#### Scenario: Page boundary navigation within a known scope
- **GIVEN** the user is auditing a manifest within a known scope
- **WHEN** the user navigates Next/Previous beyond the current page boundary
- **THEN** the system SHALL load the adjacent page within the same scope
- **AND** the system SHALL navigate to the adjacent manifest in that scope

#### Scenario: Deep link audit with unknown scope
- **GIVEN** the user opens the manifest audit page via a deep link without list context
- **THEN** the system SHALL load the manifest details
- **AND** the system SHALL display an "Unknown scope" label (or equivalent)
- **AND** list-based Next/Previous navigation SHALL be disabled

### Requirement: Best-effort scope restore after refresh
The web application SHALL attempt to restore the last-known audit navigation scope after a browser refresh within the same session.

#### Scenario: Refresh the browser while auditing from a list
- **GIVEN** the user opened the manifest audit page from the manifests list
- **WHEN** the user refreshes the browser
- **THEN** the system SHALL attempt to restore the prior navigation scope and display `X of N`
- **AND** if scope restore fails, the system SHALL fall back to an unknown scope state

### Requirement: Live Text Extraction Markdown Updates

The web application SHALL update the displayed text extraction markdown for an in-progress extraction job without requiring a manual page reload.

#### Scenario: Manifest audit page updates during page-by-page extraction

- **GIVEN** a user is viewing a manifest audit/detail page while extraction is running
- **WHEN** the backend completes processing page K of N for text extraction
- **THEN** the UI SHALL update the displayed markdown to include pages `1..K`
- **AND** the UI SHALL preserve stable page separators (e.g. `--- PAGE k ---`)
- **AND** the UI SHALL continue to update as additional pages complete

### Requirement: Manifest Delete Actions
The web application SHALL provide single-manifest and batch delete actions from the Manifests list page with clear destructive UX and confirmation.

#### Scenario: Delete a single manifest from row actions
- **GIVEN** the manifests list page is displayed
- **WHEN** the user opens the row `⋮` actions menu and clicks **Delete**
- **THEN** the system SHALL show a confirmation dialog
- **AND** upon confirmation the system SHALL call `DELETE /api/manifests/:id`
- **AND** upon success the system SHALL refresh the manifests list

#### Scenario: Delete selected manifests from toolbar
- **GIVEN** the manifests list page is displayed
- **AND** the user has selected one or more manifests
- **WHEN** the user clicks the toolbar **Delete…** action
- **THEN** the system SHALL show a scope modal with **Selected** available
- **AND** upon confirmation the system SHALL call `POST /api/groups/:groupId/manifests/delete-bulk`

#### Scenario: Disable filtered-scope delete when no filters
- **GIVEN** the manifests list page is displayed
- **AND** the user has applied no filters
- **WHEN** the user opens the toolbar **Delete…** scope modal
- **THEN** the system SHALL disable the **All matching current filters** scope option
- **AND** the modal SHALL indicate that a filter is required to enable that option

### Requirement: Base Path Hosting
The web application SHALL support being hosted under a configurable base path (example: `/pytoya`) without broken routing, redirects, or static asset URLs.

#### Scenario: Deep link refresh works under base path
- **GIVEN** the web application is deployed under base path `/pytoya`
- **WHEN** a user loads a deep link (example: `/pytoya/projects`) and refreshes the page
- **THEN** the application SHALL load successfully
- **AND** the router SHALL keep the user on the same logical page (`/projects`)

#### Scenario: Auth redirect keeps base path
- **GIVEN** the web application is deployed under base path `/pytoya`
- **AND** the user is unauthenticated
- **WHEN** the user navigates to a protected route (example: `/pytoya/projects`)
- **THEN** the application SHALL redirect to `/pytoya/login?next_url=...`
- **AND** `next_url` SHALL preserve the intended destination under the same base path

### Requirement: Manifest List Filtering UI
The web app SHALL support filtering by schema-driven extracted-data fields and SHOULD avoid invoice-centric filter UI controls when the project schema does not define invoice fields.

#### Scenario: Schema-driven filter UI
- **GIVEN** a project schema defines a set of fields for display (e.g., via `x-table-columns`)
- **WHEN** a user opens the manifests list filters
- **THEN** the UI SHALL present filter controls derived from schema configuration (not invoice-only fields)

