## ADDED Requirements

### Requirement: Mobile-First Responsive Layouts
The web application SHALL use mobile-first responsive design patterns with Tailwind breakpoints for all layout components.

#### Scenario: Breakpoint hierarchy
- **WHEN** designing responsive layouts
- **THEN** the system SHALL use mobile as the default (no breakpoint)
- **AND** the system SHALL use `md:` breakpoint for tablet (768px+)
- **AND** the system SHALL use `lg:` breakpoint for desktop (1024px+)
- **AND** the system SHALL apply larger breakpoints progressively (mobile → tablet → desktop)

#### Scenario: Sidebar filters
- **WHEN** a sidebar filter component is displayed on mobile
- **THEN** the system SHALL stack filters vertically at full width
- **AND** the system SHALL provide a collapsible/expandable toggle
- **AND** the system SHALL display filters in a sidebar on desktop (lg: breakpoint)

#### Scenario: Split panel views
- **WHEN** a split panel view (e.g., PDF viewer + form) is displayed
- **THEN** the system SHALL stack panels vertically on mobile
- **AND** the system SHALL display panels side-by-side on desktop
- **AND** each panel SHALL be independently scrollable

#### Scenario: Form grids
- **WHEN** a form uses a grid layout
- **THEN** the system SHALL use single column on mobile
- **AND** the system SHALL use two columns on tablet (md:)
- **AND** the system SHALL use three columns on desktop (lg:)
- **AND** the system SHALL maintain proper field ordering across breakpoints

### Requirement: Flexible Height Layouts
The web application SHALL use flexible height layouts instead of fixed pixel calculations.

#### Scenario: Avoid magic number heights
- **WHEN** a component needs to fill available vertical space
- **THEN** the system SHALL use `flex-1` or `flex-grow` classes
- **AND** the system SHALL NOT use calc() with magic numbers like `calc(100vh-300px)`
- **AND** parent containers SHALL have defined height constraints

#### Scenario: Scrollable content areas
- **WHEN** content overflows the viewport
- **THEN** the system SHALL use `overflow-y-auto` on content containers
- **AND** the system SHALL maintain fixed headers/footers
- **AND** the system SHALL preserve scroll position during navigation
