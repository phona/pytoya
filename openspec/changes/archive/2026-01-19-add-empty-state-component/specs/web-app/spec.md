## ADDED Requirements

### Requirement: Empty State Component
The web application SHALL provide a reusable `EmptyState` component for consistent display of empty data states.

#### Scenario: Empty state with action
- **WHEN** an empty state includes a call-to-action
- **THEN** the system SHALL display an optional icon
- **AND** the system SHALL display a title text
- **AND** the system SHALL display a description text
- **AND** the system SHALL display an action button
- **AND** all elements SHALL be centered and vertically spaced

#### Scenario: Empty state without action
- **WHEN** an empty state is informational only
- **THEN** the system SHALL display title and description
- **AND** the system SHALL NOT display an action button
- **AND** the icon SHALL be optional

#### Scenario: Empty state styling
- **WHEN** an empty state is displayed
- **THEN** the component SHALL use semantic color tokens (bg-background, text-muted-foreground)
- **AND** the icon SHALL use muted colors (text-muted-foreground)
- **AND** the title SHALL use foreground color (text-foreground)
- **AND** the description SHALL use muted color (text-muted-foreground)
- **AND** the component SHALL be responsive on mobile devices

#### Scenario: Empty state accessibility
- **WHEN** an empty state is displayed
- **THEN** the component SHALL have appropriate ARIA attributes
- **AND** the title SHALL be a heading element (h2 or h3)
- **AND** the action button SHALL be keyboard accessible
- **AND** screen readers SHALL announce the empty state message

### Requirement: Consistent Empty State Usage
All pages displaying empty data SHALL use the `EmptyState` component.

#### Scenario: Projects page empty state
- **WHEN** no projects exist
- **THEN** the system SHALL display `EmptyState` with folder icon
- **AND** the title SHALL be "No projects"
- **AND** the description SHALL explain how to get started
- **AND** an action button SHALL link to create project

#### Scenario: Schemas page empty state
- **WHEN** no schemas exist
- **THEN** the system SHALL display `EmptyState` with appropriate icon
- **AND** the description SHALL explain schemas are created within projects

#### Scenario: Manifest list empty state
- **WHEN** no manifests match the current filters
- **THEN** the system SHALL display `EmptyState` with search icon
- **AND** the description SHALL explain no results were found
- **AND** an action button MAY offer to clear filters
