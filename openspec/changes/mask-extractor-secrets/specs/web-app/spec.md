## MODIFIED Requirements

### Requirement: Masked Secret UX
The web app SHALL treat masked secret placeholders as non-revealable and non-copyable values.

#### Scenario: Extractor secrets are rechecked via Test Connection
- **GIVEN** an extractor configuration includes a masked secret placeholder (e.g., `********`)
- **WHEN** the user wants to verify the extractor is configured correctly
- **THEN** the UI SHALL provide “Test Connection” to validate stored credentials
- **AND** the UI SHALL NOT require revealing the stored secret to perform the recheck

