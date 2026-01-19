## ADDED Requirements

### Requirement: Semantic Color Tokens
The web application SHALL use shadcn/ui semantic color tokens instead of hard-coded color values.

#### Scenario: Background colors
- **WHEN** a component background is styled
- **THEN** the system SHALL use `bg-background` for page backgrounds
- **AND** the system SHALL use `bg-card` for card/container backgrounds
- **AND** the system SHALL use `bg-muted` for secondary backgrounds
- **AND** the system SHALL NOT use hard-coded values like `bg-white` or `bg-gray-50`

#### Scenario: Text colors
- **WHEN** text is styled with neutral colors
- **THEN** the system SHALL use `text-foreground` for primary text
- **AND** the system SHALL use `text-card-foreground` for card text
- **AND** the system SHALL use `text-muted-foreground` for secondary text
- **AND** the system SHALL NOT use hard-coded values like `text-gray-900` or `text-gray-600`

#### Scenario: Border colors
- **WHEN** a border is styled
- **THEN** the system SHALL use `border-border` for default borders
- **AND** the system SHALL use `border-input` for form input borders
- **AND** the system SHALL NOT use hard-coded values like `border-gray-200` or `border-gray-300`

#### Scenario: Primary/brand colors
- **WHEN** a component uses brand colors
- **THEN** the system SHALL use `bg-primary` for primary button backgrounds
- **AND** the system SHALL use `text-primary` for primary text/links
- **AND** the system SHALL use `hover:bg-primary/90` for hover states
- **AND** the system SHALL NOT use hard-coded indigo values

#### Scenario: Focus states
- **WHEN** a focus state is styled
- **THEN** the system SHALL use `focus:border-ring` for border focus
- **AND** the system SHALL use `focus:ring-ring` for ring focus
- **AND** the system SHALL NOT use hard-coded indigo values

### Requirement: Dark Mode Status Colors
The web application SHALL use CSS custom properties for status badge colors that adapt to dark mode.

#### Scenario: Status color variables
- **WHEN** status badges are displayed
- **THEN** the system SHALL use CSS variables defined in `globals.css`
- **AND** the variables SHALL have different values for light and dark modes
- **AND** status colors SHALL include: completed (green), pending (yellow), processing (blue), failed (red)

#### Scenario: Status badge implementation
- **WHEN** a status badge is rendered
- **THEN** the badge SHALL use `bg-[var(--status-xxx-bg)] text-[var(--status-xxx-text)]`
- **AND** the colors SHALL automatically adapt when dark mode is enabled

### Requirement: Dark Mode Readiness
The web application SHALL be ready for dark mode implementation without requiring component changes.

#### Scenario: Semantic token usage
- **WHEN** dark mode is enabled via the `.dark` class on the root element
- **THEN** all components using semantic tokens SHALL automatically adapt
- **AND** components SHALL display correctly with proper contrast
- **AND** no component changes SHALL be required

#### Scenario: Contrast requirements
- **WHEN** colors are used in either light or dark mode
- **THEN** text SHALL meet WCAG AA contrast requirements (4.5:1 for normal text)
- **AND** interactive elements SHALL have visible focus indicators
