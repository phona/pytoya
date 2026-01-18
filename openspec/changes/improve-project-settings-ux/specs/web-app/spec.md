## ADDED Requirements

### Requirement: Group Navigation
The system SHALL provide clear navigation from project groups to their associated manifests.

#### Scenario: Navigate to manifests from group card
- **WHEN** a user clicks anywhere on a GroupCard
- **THEN** the system SHALL navigate to the manifests page for that group

#### Scenario: Group card shows clickable affordance
- **WHEN** a user hovers over a GroupCard
- **THEN** the system SHALL display a visual indicator (shadow, cursor pointer)

#### Scenario: Group card shows navigation hint
- **WHEN** a GroupCard is rendered
- **THEN** the system SHALL display "View →" or similar text indicating clickability

### Requirement: Group Status Indicators
The system SHALL display manifest status counts on each GroupCard.

#### Scenario: Show status breakdown
- **WHEN** a GroupCard is rendered
- **THEN** the system SHALL display counts for pending, error, and verified manifests

#### Scenario: Color-coded status indicators
- **WHEN** status indicators are displayed
- **THEN** errors SHALL be shown in red, warnings in yellow, verified in green

### Requirement: Settings Dropdown Menu
The system SHALL provide an organized dropdown menu for accessing project settings.

#### Scenario: Access settings dropdown
- **WHEN** a user clicks the "Settings" dropdown trigger on ProjectDetailPage
- **THEN** the system SHALL display a menu with organized sections

#### Scenario: Navigate to basic settings
- **WHEN** a user selects "Edit Name & Description" from settings menu
- **THEN** the system SHALL navigate to the basic settings page or open a modal

#### Scenario: Navigate to model settings
- **WHEN** a user selects "Change Models" from settings menu
- **THEN** the system SHALL navigate to the model settings page or open a modal

#### Scenario: Navigate to schema settings
- **WHEN** a user selects "Edit Schema" from settings menu
- **THEN** the system SHALL navigate to the schema detail page

#### Scenario: Navigate to rules settings
- **WHEN** a user selects "Manage Rules" from settings menu
- **THEN** the system SHALL navigate to the rules management page

### Requirement: Settings Overview Cards
The system SHALL display overview cards for key project settings on the ProjectDetailPage.

#### Scenario: Display settings cards
- **WHEN** a user views ProjectDetailPage
- **THEN** the system SHALL display cards for Schema, Rules, and Validation Scripts

#### Scenario: Settings card shows relevant info
- **WHEN** a settings card is rendered
- **THEN** the system SHALL display counts or summary (e.g., "12 fields", "8 rules")

#### Scenario: Navigate from settings card
- **WHEN** a user clicks a settings card
- **THEN** the system SHALL navigate to the corresponding settings page

### Requirement: Quick Project Creation
The system SHALL provide a simplified project creation flow for MVP use cases.

#### Scenario: Choose create mode
- **WHEN** a user clicks "New Project" on ProjectsPage
- **THEN** the system SHALL prompt to choose between "Quick Create" and "Guided Setup"

#### Scenario: Quick create flow
- **WHEN** a user selects "Quick Create"
- **THEN** the system SHALL require only: name, description (optional), LLM model

#### Scenario: Guided setup flow
- **WHEN** a user selects "Guided Setup"
- **THEN** the system SHALL open the full multi-step wizard

#### Scenario: Skip wizard steps
- **WHEN** a user completes Quick Create
- **THEN** the system SHALL create the project immediately (schema can be added later)

## MODIFIED Requirements

### Requirement: Project Settings Access
Users MUST be able to access and modify project settings through an organized menu interface.

#### Scenario: Access settings from project detail
- **WHEN** a user views ProjectDetailPage
- **THEN** the system SHALL display a "Settings" dropdown menu button

#### Scenario: Settings menu shows organized sections
- **WHEN** the settings menu is opened
- **THEN** the system SHALL display options grouped by: Basic, Models, Schema & Rules, Scripts, Danger Zone

#### Scenario: Navigate to specific setting
- **WHEN** a user selects a settings menu item
- **THEN** the system SHALL navigate to the appropriate settings page or open a focused modal

### Requirement: Project Overview Display
The system SHALL display project information including associated groups, manifests, and quick access to settings.

#### Scenario: Display project with settings overview
- **WHEN** a user views ProjectDetailPage
- **THEN** the system SHALL display: project name, description, group count, manifest count, settings cards

#### Scenario: Settings cards provide quick navigation
- **WHEN** settings cards are displayed
- **THEN** each card SHALL be clickable and navigate to its corresponding settings page

## REMOVED Requirements

### Requirement: Project Wizard Edit Mode
**Reason**: The edit mode is being replaced by dedicated settings pages for better UX. The wizard will remain only for creating new projects.

**Migration**: Users will access settings through the new dropdown menu and dedicated pages instead of the wizard.
