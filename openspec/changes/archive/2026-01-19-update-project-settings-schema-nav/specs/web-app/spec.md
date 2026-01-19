## ADDED Requirements
### Requirement: Project Settings Schema Access
The web application SHALL provide schema and rules access from the project settings dropdown only, without separate settings cards on the project detail page.

#### Scenario: Project settings dropdown entries
- **WHEN** a user opens the project settings dropdown
- **THEN** the menu SHALL include entries for Schema, Rules, and Validation Scripts
- **AND** the Schema entry SHALL open the schema detail view for the project
- **AND** the Rules entry SHALL open the schema detail view with the Rules tab active

#### Scenario: Disabled schema access
- **WHEN** a project does not yet have a schema
- **THEN** the Schema and Rules entries SHALL be disabled
- **AND** the Validation Scripts entry SHALL remain available

### Requirement: Schema Detail Back Navigation
The schema detail page SHALL return the user to the owning project detail page when navigating back.

#### Scenario: Back navigation from schema detail
- **WHEN** a user clicks the back action on the schema detail page
- **THEN** the system SHALL navigate to the related project detail route
