## ADDED Requirements

### Requirement: Consistent Color Scale
The web application SHALL use the Tailwind `slate` color scale as the primary neutral palette for all UI elements.

#### Scenario: Page backgrounds
- **WHEN** a page background is styled
- **THEN** the system SHALL use `bg-slate-50` for light page backgrounds
- **AND** the system SHALL use `bg-white` for card/container backgrounds

#### Scenario: Text colors
- **WHEN** text is styled with neutral colors
- **THEN** the system SHALL use `text-slate-900` for primary text
- **AND** the system SHALL use `text-slate-600` for secondary text
- **AND** the system SHALL use `text-slate-500` for muted text
- **AND** the system SHALL use `text-slate-400` for disabled text

#### Scenario: Border colors
- **WHEN** a border is styled with neutral colors
- **THEN** the system SHALL use `border-slate-200` for default borders
- **AND** the system SHALL use `border-slate-300` for emphasized borders

#### Scenario: Hover states
- **WHEN** a hover state uses neutral colors
- **THEN** the system SHALL use `hover:bg-slate-50` for subtle hover effects
- **AND** the system SHALL use `hover:text-slate-900` for text hover states
- **AND** the system SHALL use `hover:border-slate-300` for border hover states
