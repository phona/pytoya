## ADDED Requirements

### Requirement: OCR Preview Modal

The web application SHALL provide a modal for viewing cached OCR results.

#### Scenario: Open OCR preview from table

- **GIVEN** user is viewing manifest list
- **WHEN** user clicks [👁️ Preview OCR] button on manifest row
- **THEN** system opens OCR preview modal
- **AND** modal fetches OCR result from `/manifests/:id/ocr`
- **AND** modal shows loading state while fetching

#### Scenario: View OCR result tabs

- **GIVEN** OCR preview modal is open with loaded result
- **WHEN** modal renders
- **THEN** system displays tabs:
  - [📄 Original PDF] - Scaled PDF preview with overlay
  - [📝 Raw Text] - Plain text with line numbers
  - [🏗️ Layout] - Structural analysis (tables, elements)
  - [🔍 Vision Analysis] - LLM caption and detected fields

#### Scenario: Original PDF tab

- **GIVEN** OCR preview modal is open
- **WHEN** user views [📄 Original PDF] tab
- **THEN** system shows:
  - PDF page preview (scaled)
  - OCR quality score badge
  - Page navigation (if multi-page)
  - Quick stats: pages, tokens, processing time
  - Extract Now button

#### Scenario: Raw Text tab

- **GIVEN** OCR preview modal is open
- **WHEN** user views [📝 Raw Text] tab
- **THEN** system shows:
  - Plain text extracted from PDF
  - Line numbers
  - Search input for filtering text
  - Copy All button
  - Download button
  - Toggle for confidence highlighting

#### Scenario: Layout tab

- **GIVEN** OCR preview modal is open
- **WHEN** user views [🏗️ Layout] tab
- **THEN** system shows:
  - Document type detected
  - Layout elements list (headers, tables, key-value pairs, footer)
  - Each element shows type and confidence score
  - Table preview with headers and first few rows
  - Position information for each element

#### Scenario: Vision Analysis tab

- **GIVEN** OCR preview modal is open
- **WHEN** user views [🔍 Vision Analysis] tab
- **THEN** system shows:
  - LLM-generated caption describing document
  - Detected fields table (field, value, confidence)
  - Quality warnings list
  - Copy to Schema button

### Requirement: Quick OCR Peek

The web application SHALL show OCR preview on hover for fast inspection.

#### Scenario: Hover to peek at OCR result

- **GIVEN** user is viewing manifest list
- **WHEN** user hovers over manifest row
- **THEN** after 500ms delay, system shows quick peek popup
- **AND** popup shows:
  - Key detected fields (PO No, Date, Total, etc.)
  - Quality score badge
  - Number of items/rows
  - Low confidence warnings if any

#### Scenario: Quick peek actions

- **GIVEN** quick OCR peek popup is visible
- **WHEN** user clicks [View Full] button
- **THEN** system opens full OCR preview modal

#### Scenario: Dismiss quick peek

- **GIVEN** quick OCR peek popup is visible
- **WHEN** user moves mouse away
- **OR** user presses Escape key
- **THEN** popup is dismissed immediately

### Requirement: Extraction Button in Table

The manifest table SHALL show per-row extraction controls.

#### Scenario: Show Extract button for unextracted manifests

- **GIVEN** manifest has no extraction data
- **WHEN** table renders manifest row
- **THEN** system shows [Extract→] button in actions column
- **AND** button shows estimated cost on hover (~$0.05-0.10)

#### Scenario: Show Re-extract button for extracted manifests

- **GIVEN** manifest has extraction data
- **WHEN** table renders manifest row
- **THEN** system shows [⟳ Re-extract] button in actions column
- **AND** button shows current extraction cost on hover

#### Scenario: Extract button click

- **WHEN** user clicks [Extract→] button
- **THEN** system shows confirmation modal:
  - Document filename
  - OCR quality score
  - Estimated cost
  - Model and prompt selection
  - [Cancel] and [Extract] buttons

### Requirement: Bulk Extraction Confirmation

The web application SHALL show confirmation modal before bulk extraction.

#### Scenario: Confirm bulk extraction

- **GIVEN** user has selected N manifests
- **WHEN** user clicks [Extract Selected (N)] button
- **THEN** system shows confirmation modal with:
  - Number of documents to extract
  - Estimated cost range (min-max)
  - Selected model dropdown
  - Prompt template dropdown
  - Budget warning if approaching limit
  - [Cancel] and [Start Extraction] buttons

#### Scenario: Cost estimate in modal

- **GIVEN** bulk extraction confirmation modal is open
- **WHEN** modal renders
- **THEN** system shows cost breakdown:
  - Estimated tokens per document
  - Min-max total tokens
  - Cost at current model pricing
  - Budget remaining
  - Projected total after extraction

#### Scenario: Start bulk extraction

- **GIVEN** bulk extraction confirmation modal is open
- **WHEN** user confirms and clicks [Start Extraction]
- **THEN** system calls `POST /manifests/extract-bulk`
- **AND** system shows progress toast with job ID
- **AND** system redirects to extraction progress view

### Requirement: Extraction Progress View

The web application SHALL show real-time extraction progress.

#### Scenario: View extraction progress

- **GIVEN** bulk extraction job is running
- **WHEN** user navigates to progress view
- **THEN** system shows:
  - Progress bar (completed/total)
  - Current processing document name
  - Speed indicator (docs/min)
  - ETA
  - Live queue (completed, processing, pending)
  - Accumulated cost so far
  - [Pause] and [Stop] buttons

#### Scenario: WebSocket progress updates

- **GIVEN** user is viewing extraction progress
- **WHEN** WebSocket receives extraction update
- **THEN** progress bar updates
- **AND** cost accumulator updates
- **AND** completed documents move to "done" section

### Requirement: Field Re-extract Dialog

The web application SHALL provide dialog for field-level re-extraction.

#### Scenario: Open re-extract dialog from detail view

- **GIVEN** user is viewing extracted data in detail page
- **WHEN** user clicks [⟳ Re-extract] button next to field
- **THEN** system opens field re-extract dialog
- **AND** dialog fetches relevant OCR context

#### Scenario: Re-extract dialog shows OCR context

- **GIVEN** field re-extract dialog is open
- **WHEN** dialog renders
- **THEN** system shows:
  - Current field value
  - Confidence score
  - "What OCR/LLM saw" section with JSON snippet
  - Custom prompt textarea
  - Model selection dropdown
  - Estimated cost (~$0.01)
  - [Cancel] and [Re-extract] buttons

#### Scenario: Submit field re-extraction

- **GIVEN** field re-extract dialog is open
- **WHEN** user clicks [Re-extract]
- **THEN** system calls `POST /manifests/:id/re-extract-field`
- **AND** system shows loading state
- **AND** upon success, field value updates
- **AND** system shows success toast
- **OR** upon failure, system shows error with retry option

### Requirement: Schema Test Mode

The web application SHALL provide mode for testing extraction schema on samples.

#### Scenario: Enable schema test mode

- **GIVEN** user is viewing manifest list
- **WHEN** user clicks [🧪 Test Schema Mode] button
- **THEN** system enters test mode
- **AND** table shows additional columns:
  - Extraction status per document
  - Field match count (N/10 fields matched)
  - Color-coded rows (green=success, yellow=partial, red=failed)

#### Scenario: Select test documents

- **GIVEN** schema test mode is active
- **WHEN** user selects 1-5 documents for testing
- **THEN** system enables [Extract Selected] button
- **AND** button shows estimated test cost

#### Scenario: View test results summary

- **GIVEN** selected documents have been extracted
- **WHEN** test results are available
- **THEN** system shows summary panel:
  - Success rate percentage
  - Fields by performance (grouped by match rate)
  - Recommendations for schema improvements
  - Round-to-round comparison (if re-testing)
  - [Edit Schema Prompt] and [Re-extract Failed] buttons

#### Scenario: Compare extraction rounds

- **GIVEN** user has extracted test documents multiple times
- **WHEN** user clicks [Compare Runs] button
- **THEN** system shows side-by-side comparison:
  - Round N vs Round N+1
  - Success rate change
  - Field-by-field improvement
  - Total cost accumulated

### Requirement: Extraction Cost Tracker

The web application SHALL show extraction cost tracking.

#### Scenario: Cost tracker widget

- **GIVEN** user is viewing manifest list
- **WHEN** page renders
- **THEN** system shows cost tracker widget:
  - Budget progress bar (spent / total)
  - Remaining budget
  - Current month cost
  - Average cost per document
  - [View Detailed Log] link

#### Scenario: Detailed cost log

- **GIVEN** user clicks [View Detailed Log]
- **WHEN** cost log modal opens
- **THEN** system shows:
  - Chronological list of extractions
  - Each entry shows: filename, cost, model, time ago
  - Total aggregation
  - [Export CSV] button
  - [Set Budget Alert] button

### Requirement: Manifest Table OCR Quality Column

The manifest table SHALL display OCR quality information.

#### Scenario: OCR quality badge in table

- **GIVEN** manifest has cached OCR result
- **WHEN** table renders manifest row
- **THEN** system shows OCR quality badge:
  - Green with checkmark if score ≥ 90
  - Yellow with warning if score 70-89
  - Red with X if score < 70
  - Badge shows score percentage

#### Scenario: OCR not yet processed

- **GIVEN** manifest lacks OCR result
- **WHEN** table renders manifest row
- **THEN** system shows "Processing..." or "Pending" indicator
- **AND** row is grayed out until OCR completes

## ADDED Requirements

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
