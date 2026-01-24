## ADDED Requirements

### Requirement: Manifest Delete Actions
The web application SHALL provide single-manifest and batch delete actions from the Manifests list page with clear destructive UX and confirmation.

#### Scenario: Delete a single manifest from row actions
- **GIVEN** the manifests list page is displayed
- **WHEN** the user opens the row `⋮` actions menu and clicks **Delete**
- **THEN** the system SHALL show a confirmation dialog
- **AND** upon confirmation the system SHALL call `DELETE /api/manifests/:id`
- **AND** upon success the system SHALL refresh the manifests list

#### Scenario: Delete selected manifests from toolbar
- **GIVEN** the manifests list page is displayed
- **AND** the user has selected one or more manifests
- **WHEN** the user clicks the toolbar **Delete…** action
- **THEN** the system SHALL show a scope modal with **Selected** available
- **AND** upon confirmation the system SHALL call `POST /api/groups/:groupId/manifests/delete-bulk`

#### Scenario: Disable filtered-scope delete when no filters
- **GIVEN** the manifests list page is displayed
- **AND** the user has applied no filters
- **WHEN** the user opens the toolbar **Delete…** scope modal
- **THEN** the system SHALL disable the **All matching current filters** scope option
- **AND** the modal SHALL indicate that a filter is required to enable that option

