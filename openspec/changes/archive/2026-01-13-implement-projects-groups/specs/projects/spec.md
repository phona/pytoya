## ADDED Requirements

### Requirement: Project Management
The system SHALL allow users to create, read, update, and delete projects.

#### Scenario: Create project
- **WHEN** authenticated user creates project with name and description
- **THEN** project is saved to database
- **AND** project is visible in projects list

#### Scenario: List projects
- **WHEN** authenticated user navigates to projects page
- **THEN** all user's projects are displayed
- **AND** projects show group count and manifest count

#### Scenario: Update project
- **WHEN** authenticated user edits project name or description
- **THEN** project is updated in database
- **AND** UI reflects changes

#### Scenario: Delete project
- **WHEN** authenticated user deletes project
- **THEN** project and all associated data (groups, manifests) are deleted

### Requirement: Group Management
The system SHALL allow users to create, read, update, and delete groups within projects.

#### Scenario: Create group under project
- **WHEN** authenticated user creates group within a project
- **THEN** group is saved with project_id foreign key
- **AND** group appears in project detail page

#### Scenario: List groups in project
- **WHEN** authenticated user views project detail
- **THEN** all groups for that project are displayed

#### Scenario: Delete group
- **WHEN** authenticated user deletes group
- **THEN** group and all associated manifests are deleted
- **AND** project remains intact
