## ADDED Requirements

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
