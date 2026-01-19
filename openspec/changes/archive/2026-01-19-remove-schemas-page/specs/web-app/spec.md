## REMOVED Requirements
### Requirement: Global Schemas List Page
The web application SHALL provide a global schemas list page for managing schemas across projects.

#### Scenario: View global schemas list
- **WHEN** a user navigates to `/schemas`
- **THEN** the system SHALL display a list of all schemas
- **AND** the user SHALL be able to create, edit, and delete schemas

#### Scenario: Navigate to schema detail
- **WHEN** a user selects a schema from the list
- **THEN** the system SHALL navigate to the schema detail view

#### Scenario: Empty state for schemas list
- **WHEN** no schemas exist
- **THEN** the system SHALL display an empty state prompt for creating a schema
