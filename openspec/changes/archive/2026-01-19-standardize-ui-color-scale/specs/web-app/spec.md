## ADDED Requirements

### Requirement: Theme-Aware Neutral Palette
The web application SHALL use semantic, theme-aware Tailwind tokens for neutral surfaces, borders, and text.

#### Scenario: Page backgrounds
- **WHEN** a page background is styled
- **THEN** the system SHALL use `bg-background` for page surfaces
- **AND** the system SHALL use `bg-card` for card and container surfaces

#### Scenario: Text colors
- **WHEN** text is styled with neutral colors
- **THEN** the system SHALL use `text-foreground` for primary text
- **AND** the system SHALL use `text-muted-foreground` for secondary and muted text

#### Scenario: Border colors
- **WHEN** a border is styled with neutral colors
- **THEN** the system SHALL use `border-border` for neutral borders

#### Scenario: Hover states
- **WHEN** a hover state uses neutral colors
- **THEN** the system SHALL use `hover:bg-muted` for subtle hover effects
- **AND** the system SHALL use `hover:text-foreground` for text hover states
