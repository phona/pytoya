## ADDED Requirements

### Requirement: Filtered Bulk Extraction

The system SHALL support triggering extraction for all manifests matching a set of manifest list filters, without requiring the client to enumerate manifest IDs across pages.

#### Scenario: Dry-run estimate for filtered extraction

- **WHEN** an authenticated user requests a filtered extraction estimate with `dryRun=true`
- **THEN** the system SHALL return the total matching manifest count
- **AND** the system SHALL return an estimated cost range and currency

#### Scenario: Queue jobs for filtered extraction

- **WHEN** an authenticated user requests filtered extraction with `dryRun=false`
- **THEN** the system SHALL enqueue one extraction job per matching manifest
- **AND** the system SHALL return a batch job identifier and jobIds
- **AND** WebSocket updates SHALL be emitted per manifest as jobs progress and complete

#### Scenario: Default filtered extraction skips completed and processing

- **WHEN** an authenticated user requests filtered extraction without explicit behavior overrides
- **THEN** the system SHALL include only manifests in status `pending` or `failed`
- **AND** the system SHALL skip manifests in status `completed` or `processing`

#### Scenario: Processing manifests require explicit force include

- **GIVEN** the filtered result set includes one or more `processing` manifests
- **WHEN** the request does not explicitly enable “include processing”
- **THEN** the system SHALL skip `processing` manifests
- **AND** **WHEN** the request explicitly enables “include processing”
- **THEN** the system SHALL include `processing` manifests
