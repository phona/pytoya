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

The manifest list SHALL display manifests with extraction controls and OCR quality.

#### Scenario: Table columns updated

- **WHEN** manifest table renders
- **THEN** system shows columns:
  - Select checkbox
  - Filename
  - Status (ready, extracting, extracted, partial)
  - OCR Quality (badge)
  - Selected schema fields (configurable)
  - Confidence
  - Verified
  - Actions ([Extract→] or [⟳ Re-extract], [👁️ Preview OCR])

#### Scenario: Row status indicators

- **GIVEN** manifest row is rendered
- **WHEN** status is "ready" (OCR done, not extracted)
- **THEN** row shows white/gray background
- **AND** actions show [Extract→] button
- **WHEN** status is "extracting"
- **THEN** row shows blue background
- **AND** actions show progress spinner
- **WHEN** status is "extracted" with all fields
- **THEN** row shows green left border
- **AND** actions show [⟳ Re-extract] button
- **WHEN** status is "partial" (some fields missing)
- **THEN** row shows yellow left border
- **AND** actions show [⟳ Re-extract] button
- **WHEN** status is "failed"
- **THEN** row shows red left border
- **AND** actions show [👁️ View Error] button

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

#### Scenario: Extracted fields with re-extract

- **GIVEN** user is viewing extracted data tab
- **WHEN** field has value
- **THEN** field shows:
  - Value
  - Confidence score
  - [⟳ Re-extract] button
  - [✏️ Edit] button
- **WHEN** user clicks [⟳ Re-extract]
- **THEN** system opens field re-extract dialog with OCR context

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

