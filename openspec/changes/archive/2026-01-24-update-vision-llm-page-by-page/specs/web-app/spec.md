## ADDED Requirements

### Requirement: Live Text Extraction Markdown Updates

The web application SHALL update the displayed text extraction markdown for an in-progress extraction job without requiring a manual page reload.

#### Scenario: Manifest audit page updates during page-by-page extraction

- **GIVEN** a user is viewing a manifest audit/detail page while extraction is running
- **WHEN** the backend completes processing page K of N for text extraction
- **THEN** the UI SHALL update the displayed markdown to include pages `1..K`
- **AND** the UI SHALL preserve stable page separators (e.g. `--- PAGE k ---`)
- **AND** the UI SHALL continue to update as additional pages complete

