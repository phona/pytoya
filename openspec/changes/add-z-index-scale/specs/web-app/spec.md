## ADDED Requirements

### Requirement: Z-Index Scale
The web application SHALL use a documented z-index scale for all layered elements.

#### Scenario: Z-index hierarchy
- **WHEN** setting z-index values
- **THEN** developers SHALL use values from the documented scale
- **AND** the system SHALL document z-index scale in `docs/WEB_APP.md`

#### Scenario: Z-index scale values
- **WHEN** a component needs layering
- **THEN** the system SHALL use `z-[10]` for dropdowns
- **AND** the system SHALL use `z-[20]` for sticky headers
- **AND** the system SHALL use `z-[30]` for backdrops/overlays
- **AND** the system SHALL use `z-[40]` for modals
- **AND** the system SHALL use `z-[50]` for popovers/sidebars
- **AND** the system SHALL use `z-[60]` for toast notifications

#### Scenario: Z-index documentation
- **WHEN** a z-index value is used in code
- **THEN** the code SHALL include a comment explaining the layer purpose
- **EXAMPLE:** `className="z-[50] /* popover: above overlay */"`

### Requirement: Stacking Order Consistency
The web application SHALL maintain consistent stacking order across all pages.

#### Scenario: Modal over backdrop
- **WHEN** a modal dialog is displayed
- **THEN** the modal SHALL have z-index 40
- **AND** the backdrop SHALL have z-index 30
- **AND** the modal SHALL appear above the backdrop

#### Scenario: Sidebar over content
- **WHEN** the sidebar is opened
- **THEN** the sidebar SHALL have z-index 50
- **AND** the backdrop SHALL have z-index 30
- **AND** the sidebar SHALL appear above all page content

#### Scenario: Dropdown over content
- **WHEN** a dropdown menu is opened
- **THEN** the dropdown SHALL have z-index 10
- **AND** the dropdown SHALL appear above nearby content
- **AND** the dropdown SHALL NOT appear above modals or sidebars
