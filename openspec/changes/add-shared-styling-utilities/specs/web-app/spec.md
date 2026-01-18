## ADDED Requirements

### Requirement: Shared Styling Utilities
The web application SHALL provide shared utility functions for common styling patterns.

#### Scenario: Status badge classes
- **WHEN** a component displays a status badge
- **THEN** the system SHALL use the `getStatusBadgeClasses()` utility from `@/shared/styles/status-badges`
- **AND** the utility SHALL return consistent Tailwind classes for each status
- **AND** statuses SHALL include: pending (yellow), processing (blue), completed (green), failed (red)

#### Scenario: Class name utilities
- **WHEN** a component needs conditional class names
- **THEN** the system MAY use the `cn()` utility from `@/shared/styles/class-utils`
- **AND** the utility SHALL filter out falsy values
- **AND** the utility SHALL join classes with spaces

#### Scenario: Duplicated styling patterns
- **WHEN** a styling pattern is used in three or more components
- **THEN** the system SHALL extract the pattern into a shared utility
- **AND** the utility SHALL be typed with TypeScript
- **AND** the utility SHALL have unit tests

### Requirement: Consistent Status Colors
The web application SHALL use consistent colors for manifest status indicators.

#### Scenario: Completed status
- **WHEN** a manifest has status "completed"
- **THEN** the system SHALL display green colors (bg-green-100, text-green-700)

#### Scenario: Pending status
- **WHEN** a manifest has status "pending"
- **THEN** the system SHALL display yellow colors (bg-yellow-100, text-yellow-700)

#### Scenario: Processing status
- **WHEN** a manifest has status "processing"
- **THEN** the system SHALL display blue colors (bg-blue-100, text-blue-700)

#### Scenario: Failed status
- **WHEN** a manifest has status "failed"
- **THEN** the system SHALL display red colors (bg-red-100, text-red-700)
