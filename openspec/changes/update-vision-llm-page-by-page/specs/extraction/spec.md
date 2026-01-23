## ADDED Requirements

### Requirement: Vision LLM Page-by-Page Text Extraction

When the selected text extractor is `vision-llm` and the input is a multi-page PDF, the system SHALL support extracting Markdown page-by-page and stitching the result into a single Markdown document.

#### Scenario: Page-by-page extraction for PDFs

- **GIVEN** a manifest PDF converts to N page images
- **WHEN** text extraction runs
- **THEN** the system SHALL call the vision LLM once per page image
- **AND** the system SHALL preserve page order in the final Markdown output
- **AND** the system SHALL insert stable page separators (e.g. `--- PAGE k ---`)
- **AND** the system SHALL aggregate token usage and cost across all page calls

#### Scenario: Never send entire PDF to vision LLM

- **GIVEN** a manifest PDF converts to N page images
- **WHEN** text extraction runs using the `vision-llm` extractor
- **THEN** the system SHALL NOT send all page images in a single vision LLM request

