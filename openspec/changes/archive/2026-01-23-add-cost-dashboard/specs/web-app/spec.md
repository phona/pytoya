## ADDED Requirements

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
