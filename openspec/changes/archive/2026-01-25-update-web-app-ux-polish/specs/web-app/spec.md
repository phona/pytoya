## MODIFIED Requirements

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

