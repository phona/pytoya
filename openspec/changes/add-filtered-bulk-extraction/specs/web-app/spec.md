## ADDED Requirements

### Requirement: Bulk Extraction Action With User Choice

The web application SHALL provide an “Extract…” action that clearly explains side effects and lets the user choose between extracting selected manifests or all manifests matching the current filters.

#### Scenario: Extract selected manifests from list

- **GIVEN** the user has selected one or more manifests in the manifests list
- **WHEN** the user clicks “Extract…”
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

- **GIVEN** the user opens the “Extract…” modal with no explicit behavior overrides
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
- **WHEN** the user clicks “Extract…”
- **THEN** the system SHALL start extraction for the current manifest
